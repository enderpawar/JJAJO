package com.jjajo.presentation.config;

import com.jjajo.domain.entity.UserEntity;
import com.jjajo.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Security 및 OAuth2 로그인 설정
 *
 * 설계 근거:
 * - Google OAuth2 로그인 성공 시 UserEntity를 upsert하고, 내부 userId를 Security Principal에 포함
 * - /api/** 엔드포인트는 인증을 요구하고, Swagger/H2 콘솔 등 개발 도구는 필요 시 열어둠
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final UserRepository userRepository;
    private final DebugLogFilter debugLogFilter;

    @Value("${app.frontend-origin:http://localhost:5173}")
    private String frontendOrigin;

    /**
     * Security 필터 체인 설정
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeHttpRequests(authorize -> authorize
                .requestMatchers(
                    "/",
                    "/swagger-ui.html",
                    "/swagger-ui/**",
                    "/api-docs/**",
                    "/v3/api-docs/**",
                    "/h2-console/**"
                ).permitAll()
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll()
            )
            .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()))
            .oauth2Login(oauth2 -> oauth2
                .userInfoEndpoint(userInfo -> userInfo
                    .userService(customOAuth2UserService())
                    .oidcUserService(customOidcUserService()))
                .successHandler(redirectToFrontendSuccessHandler())
            )
            .logout(logout -> logout
                .logoutUrl("/logout")
                .logoutSuccessUrl("/")
                .deleteCookies("JSESSIONID")
                .invalidateHttpSession(true)
            )
            .formLogin(Customizer.withDefaults())
            .addFilterBefore(debugLogFilter, AuthorizationFilter.class);

        return http.build();
    }

    /**
     * OAuth2 로그인 성공 시 프론트엔드로 리다이렉트
     */
    @Bean
    public AuthenticationSuccessHandler redirectToFrontendSuccessHandler() {
        return (request, response, authentication) -> {
            String target = frontendOrigin != null ? frontendOrigin : "http://localhost:5173";
            if (!target.endsWith("/")) {
                target = target + "/";
            }
            response.sendRedirect(target);
        };
    }

    /**
     * Google OAuth2 로그인 시 사용자 정보를 조회/저장하는 커스텀 OAuth2UserService
     *
     * - providerId(sub)로 UserEntity를 조회
     * - 없으면 새 UserEntity를 생성(UUID id)
     * - Security Principal에 내부 userId를 포함시켜 이후 서비스/컨트롤러에서 사용 가능하게 함
     */
    @Bean
    public OAuth2UserService<OAuth2UserRequest, OAuth2User> customOAuth2UserService() {
        DefaultOAuth2UserService delegate = new DefaultOAuth2UserService();

        return (OAuth2UserRequest userRequest) -> {
            OAuth2User oAuth2User = delegate.loadUser(userRequest);

            String registrationId = userRequest.getClientRegistration().getRegistrationId();
            if (!"google".equalsIgnoreCase(registrationId)) {
                return oAuth2User;
            }

            Map<String, Object> attributes = oAuth2User.getAttributes();
            String sub = (String) attributes.get("sub");
            String email = (String) attributes.get("email");
            String name = (String) attributes.getOrDefault("name", null);
            String picture = (String) attributes.getOrDefault("picture", null);

            if (sub == null || email == null) {
                // 필수 정보가 없으면 그대로 반환 (추가 방어 로직)
                return oAuth2User;
            }

            Optional<UserEntity> existingUser =
                userRepository.findByProviderAndProviderId(UserEntity.AuthProvider.GOOGLE, sub);

            UserEntity user = existingUser
                .map(u -> updateUserIfChanged(u, email, name, picture))
                .orElseGet(() -> createNewUser(sub, email, name, picture));

            // 기본 ROLE_USER 권한 부여
            List<SimpleGrantedAuthority> authorities =
                List.of(new SimpleGrantedAuthority("ROLE_USER"));

            // 내부 userId를 attributes에 추가하여 컨트롤러/서비스에서 사용하기 쉽게 함
            Map<String, Object> enrichedAttributes = new java.util.HashMap<>(attributes);
            enrichedAttributes.put("userId", user.getId());

            return new DefaultOAuth2User(
                authorities,
                enrichedAttributes,
                "sub"
            );
        };
    }

    /**
     * Google OIDC 로그인 시 사용 (scope에 openid 포함 시).
     * DefaultOidcUser에는 userId가 없으므로, DB 조회 후 userId를 포함한 OidcUser를 반환한다.
     */
    @Bean
    public OAuth2UserService<OidcUserRequest, OidcUser> customOidcUserService() {
        OidcUserService delegate = new OidcUserService();
        return (OidcUserRequest request) -> {
            OidcUser oidcUser = delegate.loadUser(request);
            String registrationId = request.getClientRegistration().getRegistrationId();
            if (!"google".equalsIgnoreCase(registrationId)) {
                return oidcUser;
            }
            String sub = oidcUser.getSubject();
            if (sub == null) {
                return oidcUser;
            }
            String email = oidcUser.getEmail();
            String name = oidcUser.getFullName();
            String picture = oidcUser.getPicture();
            Optional<UserEntity> existingUser =
                userRepository.findByProviderAndProviderId(UserEntity.AuthProvider.GOOGLE, sub);
            UserEntity user = existingUser
                .map(u -> updateUserIfChanged(u, email, name, picture))
                .orElseGet(() -> createNewUser(sub, email != null ? email : "", name, picture));
            return new OidcUserWithUserId(
                oidcUser.getAuthorities(),
                oidcUser.getIdToken(),
                oidcUser.getUserInfo(),
                "sub",
                user.getId());
        };
    }

    private UserEntity createNewUser(String providerId, String email, String name, String picture) {
        UserEntity user = UserEntity.builder()
            .id(UUID.randomUUID().toString())
            .provider(UserEntity.AuthProvider.GOOGLE)
            .providerId(providerId)
            .email(email)
            .name(name)
            .pictureUrl(picture)
            .build();

        return userRepository.save(user);
    }

    private UserEntity updateUserIfChanged(UserEntity user, String email, String name, String picture) {
        boolean changed = false;

        if (email != null && !email.equals(user.getEmail())) {
            user.setEmail(email);
            changed = true;
        }
        if (name != null && !name.equals(user.getName())) {
            user.setName(name);
            changed = true;
        }
        if (picture != null && !picture.equals(user.getPictureUrl())) {
            user.setPictureUrl(picture);
            changed = true;
        }

        return changed ? userRepository.save(user) : user;
    }

    /**
     * 현재 인증된 사용자의 내부 userId를 가져오는 헬퍼 메서드 예시
     * (컨트롤러/서비스에서 SecurityContext를 직접 다루지 않도록 추후 별도 유틸/컴포넌트로 분리 가능)
     */
    public static String extractUserId(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof OAuth2User oAuth2User)) {
            return null;
        }
        Object userId = oAuth2User.getAttributes().get("userId");
        return userId != null ? userId.toString() : null;
    }

    /**
     * 프론트엔드 도메인에서의 쿠키 기반 호출을 허용하기 위한 CORS 설정
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowCredentials(true);
        configuration.setAllowedOrigins(List.of(frontendOrigin));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
