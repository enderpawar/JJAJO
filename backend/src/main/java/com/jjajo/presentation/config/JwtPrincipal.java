package com.jjajo.presentation.config;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.util.Collection;
import java.util.Collections;
import java.util.Map;

/**
 * JWT 기반 인증 시 SecurityContext에 설정되는 Principal.
 * OAuth2User를 구현해 UserController, SecurityConfig.extractUserId 등에서 동일하게 사용.
 */
public record JwtPrincipal(
        String userId,
        String email,
        String name,
        String pictureUrl
) implements OAuth2User {

    @Override
    public Map<String, Object> getAttributes() {
        return Map.of(
                "userId", userId,
                "email", email != null ? email : "",
                "name", name != null ? name : "",
                "picture", pictureUrl != null ? pictureUrl : ""
        );
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"));
    }

    @Override
    public String getName() {
        return name != null ? name : email != null ? email : userId;
    }
}
