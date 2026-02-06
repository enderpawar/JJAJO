# 짜조(JJAJO) 개발일지 Day 3 - OAuth 리다이렉션 지옥에서 탈출하기

> **"OAuth 404? 아니면 ERR_TOO_MANY_REDIRECTS? 리다이렉션 URL 하나가 모든 걸 망친다"** - 배포 환경에서만 발생하는 OAuth 버그와의 5시간 사투

## 📅 개발 일자
2026년 2월 5일

## 🎯 오늘의 목표
- ✅ 프로덕션 환경에서 Google OAuth 로그인 안정화
- ✅ 404 에러 핸들링 전략 수립
- ✅ CORS 설정 통일 및 정규화
- ✅ 세션 쿠키 크로스 오리진 전달 문제 해결
- ⚠️ **리다이렉션 URL 불일치로 인한 OAuth 실패** (예상 1시간 → 실제 5시간)

---

## 🔥 문제 발견: "로컬에선 되는데 배포하면 안 돼요"

### 초기 증상

프로덕션 환경(Render + Cloudflare Pages)에 배포 후 Google 로그인 버튼을 클릭했을 때:

```
1. 사용자: "Google로 로그인" 클릭
2. 시스템: /oauth2/authorization/google 호출
3. Google: "redirect_uri_mismatch" 에러 반환 ❌
```

**로컬 환경:**
```
✅ http://localhost:8080/login/oauth2/code/google
   → Google Console에 등록됨
   → 정상 작동
```

**프로덕션 환경:**
```
❌ http://jjajo-backend.onrender.com/login/oauth2/code/google
   → Google이 받은 실제 URI
   → Google Console에 미등록
   → redirect_uri_mismatch 발생
```

### 더 큰 문제 발견

리다이렉션 URI를 수정하고 나니 이번엔 **무한 리다이렉션**:

```
1. OAuth 성공
2. 백엔드가 프론트엔드로 리다이렉션 시도
3. 하지만 실제로는 백엔드 자신에게 리다이렉션
4. 다시 OAuth 성공...
5. 무한 반복 💥
```

Chrome Console:
```
ERR_TOO_MANY_REDIRECTS
jjajo-backend.onrender.com/oauth2/authorization/google 
→ jjajo-backend.onrender.com/
→ jjajo-backend.onrender.com/oauth2/authorization/google
→ jjajo-backend.onrender.com/
→ ...
```

---

## 🔍 1단계: 문제 인식 및 재현

### 가설 수립

1. **가설 1:** Spring Boot가 프록시(Render) 뒤에서 `redirect_uri`를 잘못 생성
2. **가설 2:** `FRONTEND_ORIGIN` 환경변수가 제대로 주입되지 않음
3. **가설 3:** 프로토콜(http vs https)이 프록시 환경에서 달라짐

### 검증을 위한 디버깅 전략

**Step 1: 실제 사용되는 `redirect_uri` 로깅**

```java
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class OAuthRedirectUriLoggingFilter extends OncePerRequestFilter {
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                   HttpServletResponse response,
                                   FilterChain filterChain) {
        String path = request.getRequestURI();
        if (!path.startsWith("/oauth2/authorization/")) {
            filterChain.doFilter(request, response);
            return;
        }
        
        // Spring이 baseUrl을 계산하는 방식 그대로 재현
        String scheme = request.getScheme();
        String xProto = request.getHeader("X-Forwarded-Proto");
        String effectiveScheme = (xProto != null) ? xProto : scheme;
        
        String serverName = request.getServerName();
        String xHost = request.getHeader("X-Forwarded-Host");
        String effectiveHost = (xHost != null) ? xHost : serverName;
        
        int port = request.getServerPort();
        String xPort = request.getHeader("X-Forwarded-Port");
        int effectivePort = (xPort != null) ? Integer.parseInt(xPort) : port;
        
        String baseUrl = effectiveScheme + "://" + effectiveHost 
                       + (effectivePort != 80 && effectivePort != 443 
                          ? ":" + effectivePort : "");
        String redirectUri = baseUrl + "/login/oauth2/code/google";
        
        log.info("계산된 redirect_uri: {}", redirectUri);
        log.info("X-Forwarded-Proto: {}, X-Forwarded-Host: {}", xProto, xHost);
    }
}
```

**결과:**
```
❌ 계산된 redirect_uri: http://jjajo-backend.onrender.com/login/oauth2/code/google
   X-Forwarded-Proto: (null)
   X-Forwarded-Host: (null)
```

**원인 발견!**
> Render는 `X-Forwarded-*` 헤더를 전달하지만, **Spring Boot가 기본적으로 이를 무시**함!

---

## 🧪 2단계: 원인 분석 - Spring Boot의 프록시 처리

### Spring Boot의 `X-Forwarded-*` 헤더 처리 메커니즘

Spring Boot는 보안상의 이유로 **기본적으로 `X-Forwarded-*` 헤더를 신뢰하지 않아요.**

```yaml
# application.yml (기본 상태)
server:
  # forward-headers-strategy가 없으면 X-Forwarded-* 무시!
```

### 프록시 환경에서의 문제

```
[사용자 브라우저] 
  ↓ HTTPS 요청
[Render 프록시]
  ↓ HTTP 요청 + X-Forwarded-Proto: https
[Spring Boot 앱]
  ↓ request.getScheme() → "http" ❌
  ↓ redirect_uri → http://... (잘못된 프로토콜!)
```

### `forward-headers-strategy` 설정의 중요성

Spring Boot 공식 문서:
> **"When running behind a proxy, you should configure `server.forward-headers-strategy` to `FRAMEWORK` or `NATIVE` to correctly resolve the original client's protocol, host, and port."**

---

## 💡 3단계: 해결 방법 탐색

### 시도 1: `forward-headers-strategy` 활성화 ✅

```yaml
# application.yml
server:
  forward-headers-strategy: framework  # X-Forwarded-* 헤더 신뢰
```

**결과:**
```
✅ 계산된 redirect_uri: https://jjajo-backend.onrender.com/login/oauth2/code/google
   X-Forwarded-Proto: https
   X-Forwarded-Host: jjajo-backend.onrender.com
```

**Google Console에 등록:**
```
승인된 리디렉션 URI:
✅ https://jjajo-backend.onrender.com/login/oauth2/code/google
```

**진전!** 하지만 이제 새로운 문제...

---

### 문제 2: OAuth 성공 후 무한 리다이렉션

OAuth는 성공했지만, 성공 후 핸들러에서 프론트엔드로 리다이렉션할 때:

```java
// SecurityConfig.java
@Bean
public AuthenticationSuccessHandler redirectToFrontendSuccessHandler() {
    return (request, response, authentication) -> {
        String target = frontendOrigin != null ? frontendOrigin : "http://localhost:5173";
        response.sendRedirect(target);  // 🤔 이게 문제?
    };
}
```

**환경변수 확인:**
```bash
# Render 환경변수
FRONTEND_ORIGIN=jjajo.pages.dev  # ❌ 스킴(https://)이 없음!
```

**`response.sendRedirect()` 동작:**
```java
// 상대 URL 판별 로직 (Tomcat 내부)
if (!url.startsWith("http://") && !url.startsWith("https://")) {
    // 상대 URL로 간주 → 백엔드 호스트 뒤에 붙임
    return request.getScheme() + "://" + request.getServerName() + "/" + url;
}
```

**실제 발생한 일:**
```
1. OAuth 성공
2. target = "jjajo.pages.dev"
3. sendRedirect("jjajo.pages.dev")
4. Tomcat: "스킴 없네? 상대 URL이구나!"
5. 실제 리다이렉션: https://jjajo-backend.onrender.com/jjajo.pages.dev
6. 404 → 다시 OAuth 시작...
```

---

### 시도 2: Frontend Origin 정규화 유틸리티 ✅

**핵심 아이디어:**
> "환경변수에 스킴이 없으면 자동으로 `https://`를 붙이자!"

```java
// FrontendOriginNormalizer.java
public final class FrontendOriginNormalizer {
    
    /**
     * 스킴 없는 URL을 https://로 변환
     * @param frontendOrigin 원본 URL (예: "jjajo.pages.dev")
     * @return 절대 URL (예: "https://jjajo.pages.dev")
     */
    public static String toAbsoluteUrl(String frontendOrigin) {
        if (frontendOrigin == null || frontendOrigin.isEmpty()) {
            return "http://localhost:5173";
        }
        
        String s = frontendOrigin.trim();
        if (!s.startsWith("http://") && !s.startsWith("https://")) {
            s = "https://" + s;  // 기본적으로 HTTPS 가정
        }
        
        return s.replaceAll("/+$", "");  // 끝의 슬래시 제거
    }
}
```

**적용:**
```java
// SecurityConfig.java
@Bean
public AuthenticationSuccessHandler redirectToFrontendSuccessHandler() {
    return (request, response, authentication) -> {
        String target = FrontendOriginNormalizer.toAbsoluteUrl(frontendOrigin);
        response.sendRedirect(target + "/");  // ✅ 이제 절대 URL!
    };
}

// CORS 설정도 통일
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOrigins(List.of(
        FrontendOriginNormalizer.toAbsoluteUrl(frontendOrigin)
    ));
    // ...
}
```

**결과:**
```
✅ OAuth 성공
✅ https://jjajo.pages.dev/ 로 정확히 리다이렉션
✅ 무한 루프 해결!
```

---

### 문제 3: Form Login으로 인한 404 혼란

OAuth는 해결했지만, 이제 일반 사용자가 잘못된 URL에 접근할 때:

```
사용자: https://jjajo-backend.onrender.com/some-random-page 접근
Spring Security: Form Login 활성화 → /login 페이지 찾음
시스템: /login이 없음 → Whitelabel Error Page 표시 😱
```

**문제의 근본 원인:**
```java
// SecurityConfig.java (Before)
.formLogin(Customizer.withDefaults());  // ❌ 기본 로그인 폼 활성화
```

Spring Security는 인증되지 않은 요청을 `/login` 페이지로 리다이렉션하려 시도하지만, **우리는 로그인 폼이 없어요** (OAuth만 사용).

---

### 시도 3: Form Login 비활성화 + 커스텀 404 핸들러 ✅

**Step 1: Form Login 제거**
```java
// SecurityConfig.java
.formLogin(form -> form.disable());  // ✅ Form Login 완전 비활성화
```

**Step 2: 404 발생 시 예외 던지기**
```yaml
# application.yml
spring:
  mvc:
    throw-exception-if-no-handler-found: true  # 404 → NoHandlerFoundException
```

**Step 3: 전역 예외 핸들러**
```java
@ControllerAdvice
public class GlobalErrorHandler {
    
    @Value("${app.frontend-origin:http://localhost:5173}")
    private String frontendOrigin;
    
    @ExceptionHandler(NoHandlerFoundException.class)
    public Object handleNoHandlerFound(NoHandlerFoundException ex, 
                                      HttpServletRequest request) {
        String path = request.getRequestURI();
        String accept = request.getHeader("Accept");
        
        // API 요청인지 브라우저 요청인지 구분
        boolean isApiRequest = path.startsWith("/api") 
                            || accept.contains(MediaType.APPLICATION_JSON_VALUE);
        
        if (isApiRequest) {
            // API 요청 → JSON 404 응답
            return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", "Not Found", "path", path));
        }
        
        // 브라우저 요청 → 프론트엔드로 리다이렉션
        String target = FrontendOriginNormalizer.toAbsoluteUrl(frontendOrigin) + "/";
        return ResponseEntity
            .status(HttpStatus.FOUND)
            .location(URI.create(target))
            .build();
    }
}
```

**동작 흐름:**
```
[브라우저 → /some-wrong-url]
  ↓ 404 발생
[GlobalErrorHandler]
  ↓ 브라우저 요청 감지
[리다이렉션 → https://jjajo.pages.dev/]
  ↓ 프론트엔드의 라우터가 처리
[React Router → 적절한 페이지 표시]
```

---

### 문제 4: 세션 쿠키가 크로스 오리진에서 전달되지 않음

OAuth 성공 후 `/api/auth/me`를 호출했는데:

```
Request:
  Cookie: JSESSIONID=xxx
  Origin: https://jjajo.pages.dev

Response:
  401 Unauthorized
```

**원인:**
```yaml
# application.yml (기본값)
server:
  servlet:
    session:
      cookie:
        same-site: lax  # 기본값: 크로스 오리진에서 쿠키 전달 안 됨!
        secure: false   # HTTP에서도 쿠키 전달 (보안 취약)
```

### `SameSite` 쿠키 속성 이해하기

| SameSite 값 | 크로스 오리진 전달 | HTTPS 필요 | 용도 |
|------------|------------------|-----------|------|
| `Strict` | ❌ 절대 안 됨 | ❌ | 최고 보안 |
| `Lax` (기본) | ⚠️ GET만 가능 | ❌ | 일반적인 케이스 |
| `None` | ✅ 모든 요청 | ✅ 필수! | API 백엔드 |

**우리의 상황:**
```
프론트엔드: https://jjajo.pages.dev (Origin A)
백엔드:    https://jjajo-backend.onrender.com (Origin B)
          ↑ 다른 오리진 → SameSite=None 필요!
```

---

### 시도 4: 프로덕션 환경에 `SameSite=None` 설정 ✅

```yaml
# application-prod.yml
server:
  servlet:
    session:
      cookie:
        same-site: none   # ✅ 크로스 오리진 허용
        secure: true      # ✅ HTTPS만 허용 (보안 유지)
```

**주의사항:**
- `SameSite=None`은 **반드시 `Secure=true`와 함께** 사용해야 함
- HTTPS가 아닌 환경에서는 작동하지 않음
- 로컬 개발 환경은 `application-local.yml`에서 별도 설정

```yaml
# application-local.yml (로컬 개발용)
server:
  servlet:
    session:
      cookie:
        same-site: lax    # 로컬에선 lax로 충분
        secure: false     # HTTP 허용
```

---

## 📊 최종 아키텍처

### OAuth 인증 플로우 (최종 버전)

```
[사용자] 
  ↓ 1. "Google로 로그인" 클릭
[프론트엔드: jjajo.pages.dev]
  ↓ 2. window.location.href = "https://backend.../oauth2/authorization/google"
[백엔드: jjajo-backend.onrender.com]
  ↓ 3. OAuthRedirectUriLoggingFilter: redirect_uri 계산 및 로깅
  ↓    → "https://jjajo-backend.onrender.com/login/oauth2/code/google"
  ↓ 4. Google로 리다이렉션
[Google OAuth Consent Screen]
  ↓ 5. 사용자 동의 후 redirect_uri로 콜백
[백엔드: /login/oauth2/code/google]
  ↓ 6. OAuth2LoginAuthenticationFilter: 토큰 검증
  ↓ 7. CustomOAuth2UserService: 사용자 정보 조회 및 저장
  ↓ 8. AuthenticationSuccessHandler 실행
  ↓    → target = FrontendOriginNormalizer.toAbsoluteUrl("jjajo.pages.dev")
  ↓    → "https://jjajo.pages.dev/"
  ↓ 9. 세션 쿠키 설정 (SameSite=None; Secure)
[프론트엔드: jjajo.pages.dev]
  ↓ 10. /api/auth/me 호출 (쿠키 포함)
[백엔드]
  ↓ 11. 세션 검증 성공 → 사용자 정보 반환
[프론트엔드]
  ✅ 12. 로그인 완료!
```

---

## 🧠 배운 교훈

### 1. 프록시 환경에서는 항상 `X-Forwarded-*` 헤더를 고려하기

**안티패턴:**
```yaml
# ❌ 프록시 헤더 무시 → 잘못된 redirect_uri
server:
  # forward-headers-strategy 미설정
```

**올바른 패턴:**
```yaml
# ✅ 프록시 헤더 신뢰 → 올바른 HTTPS URL 생성
server:
  forward-headers-strategy: framework
```

### 2. 환경변수는 항상 검증하고 정규화하기

**안티패턴:**
```java
// ❌ 환경변수를 그대로 사용
String target = frontendOrigin;  // "jjajo.pages.dev" → 상대 URL로 처리됨
response.sendRedirect(target);
```

**올바른 패턴:**
```java
// ✅ 정규화 후 사용
String target = FrontendOriginNormalizer.toAbsoluteUrl(frontendOrigin);
response.sendRedirect(target);  // "https://jjajo.pages.dev" → 절대 URL
```

### 3. 디버깅을 위한 로깅 인프라 구축하기

디버깅 필터를 통해 **실시간으로 문제를 파악**할 수 있었어요:

```java
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class OAuthRedirectUriLoggingFilter extends OncePerRequestFilter {
    // redirect_uri 계산 과정을 모두 로깅
    // 프로덕션 배포 후에도 문제 원인을 즉시 파악 가능
}
```

**교훈:**
> "보이지 않는 건 디버깅할 수 없어요. 핵심 값을 로깅하세요."

### 4. 브라우저 vs API 요청을 구분하기

**올바른 404 처리:**
```java
boolean isApiRequest = path.startsWith("/api") 
                    || accept.contains("application/json");

if (isApiRequest) {
    return JSON_404;  // API는 JSON 응답
} else {
    return REDIRECT_TO_FRONTEND;  // 브라우저는 프론트엔드로
}
```

이를 통해 **사용자 경험**과 **개발자 경험** 모두 개선됐어요:
- 사용자: 404 페이지 대신 프론트엔드 라우터가 처리
- 개발자: API 호출 실패는 명확한 JSON 응답

### 5. 크로스 오리진 쿠키 전달은 까다로워요

**체크리스트:**
- [ ] `SameSite=None` 설정
- [ ] `Secure=true` 설정 (HTTPS 필수)
- [ ] CORS `allowCredentials=true`
- [ ] 프론트엔드에서 `credentials: 'include'` 옵션

**하나라도 빠지면 쿠키 전달 실패!**

---

## 🎨 추가 개선 사항

### 1. 디버깅 API 엔드포인트

배포 후 설정 확인을 위한 디버깅 API:

```java
@RestController
@RequestMapping("/debug")
public class OAuthDebugController {
    
    @GetMapping("/oauth-redirect-uri")
    public ResponseEntity<Map<String, String>> oauthRedirectUri(HttpServletRequest request) {
        String redirectUri = computeRedirectUri(request);  // Spring과 동일한 로직
        return ResponseEntity.ok(Map.of(
            "redirect_uri", redirectUri,
            "hint", "이 URL을 Google Console에 등록하세요"
        ));
    }
    
    @GetMapping("/frontend-origin")
    public ResponseEntity<Map<String, String>> frontendOrigin() {
        return ResponseEntity.ok(Map.of(
            "frontend_origin_raw", frontendOrigin,
            "frontend_origin_normalized", 
                FrontendOriginNormalizer.toAbsoluteUrl(frontendOrigin),
            "hint", "스킴 없이 입력해도 https://로 자동 변환됩니다"
        ));
    }
}
```

**사용 예:**
```bash
curl https://jjajo-backend.onrender.com/debug/oauth-redirect-uri
# → Google Console에 등록해야 할 정확한 URI 확인

curl https://jjajo-backend.onrender.com/debug/frontend-origin
# → 리다이렉션 타겟 확인
```

### 2. Profile별 설정 분리

```
application.yml          # 공통 설정
application-local.yml    # 로컬 개발 (SameSite=lax)
application-prod.yml     # 프로덕션 (SameSite=none, Secure=true)
```

**자동 프로필 감지:**
```yaml
# application.yml
spring:
  profiles:
    active: ${SPRING_PROFILES_ACTIVE:local}  # 기본값 local
```

### 3. 구조화된 로깅

```java
Map<String, Object> logData = Map.of(
    "timestamp", System.currentTimeMillis(),
    "sessionId", "oauth-debug",
    "location", "OAuthRedirectUriLoggingFilter",
    "message", "redirect_uri computed",
    "data", Map.of(
        "scheme", effectiveScheme,
        "host", effectiveHost,
        "port", effectivePort,
        "redirectUri", redirectUri
    )
);
log.info(new ObjectMapper().writeValueAsString(logData));
```

**장점:**
- 로그를 JSON으로 파싱 가능
- 시계열 분석 용이
- 문제 발생 시 빠른 원인 파악

---

## 📈 오늘의 성과

### 백엔드
- ✅ **프록시 환경 대응** (`forward-headers-strategy: framework`)
- ✅ **리다이렉션 URL 정규화** (`FrontendOriginNormalizer`)
- ✅ **Form Login 제거** (OAuth 전용)
- ✅ **전역 404 핸들러** (브라우저/API 구분)
- ✅ **세션 쿠키 보안 설정** (SameSite=None, Secure)
- ✅ **디버깅 API 엔드포인트** (`/debug/oauth-redirect-uri`, `/debug/frontend-origin`)
- ✅ **구조화된 로깅** (JSON 포맷)

### 인프라
- ✅ **환경변수 검증 및 정규화**
- ✅ **프로필별 설정 분리** (local/prod)
- ✅ **CORS 설정 통일**

### 학습
- ✅ Spring Boot의 프록시 헤더 처리 메커니즘
- ✅ `X-Forwarded-Proto/Host/Port`의 역할
- ✅ `SameSite` 쿠키 속성의 이해
- ✅ `response.sendRedirect()`의 상대/절대 URL 처리
- ✅ OAuth 2.0 리다이렉션 플로우의 세부 동작

---

## 🚀 내일 할 일

### 백엔드
- [ ] **세션 저장소를 Redis로 전환** (스케일 아웃 대비)
- [ ] **JWT 토큰 기반 인증 도입 고려** (Stateless 아키텍처)
- [ ] **API Rate Limiting** (악의적 요청 방지)

### 프론트엔드
- [ ] **OAuth 로딩 인디케이터** (리다이렉션 중 사용자 피드백)
- [ ] **에러 바운더리** (OAuth 실패 시 사용자 친화적 메시지)
- [ ] **세션 만료 처리** (자동 재로그인 유도)

### 모니터링
- [ ] **OAuth 성공/실패율 추적**
- [ ] **리다이렉션 시간 측정**
- [ ] **세션 지속 시간 분석**

---

## 💬 마치며

오늘 하루는 **"로컬에선 되는데 배포하면 안 되는"** 전형적인 프로덕션 버그와 싸운 날이었어요. 

특히 **프록시 환경에서의 URL 생성**과 **크로스 오리진 쿠키 전달**은, 단순히 코드를 작성하는 것을 넘어 **HTTP 프로토콜과 브라우저 보안 정책에 대한 깊은 이해**를 요구했어요.

### 핵심 교훈

1. **환경의 차이를 인지하기**
   - 로컬: 단일 오리진, HTTP, 프록시 없음
   - 프로덕션: 다중 오리진, HTTPS, 프록시 존재

2. **디버깅 인프라를 먼저 구축하기**
   - 문제가 발생했을 때 "추측"이 아닌 "확인"할 수 있어야 해요
   - 로깅 필터, 디버깅 API는 투자 대비 효과 최고

3. **표준을 따르되, 현실을 반영하기**
   - `forward-headers-strategy`는 표준
   - 하지만 환경변수 검증은 현실적 필요성

이 경험은 면접에서:
> "프로덕션 환경에서 발생한 OAuth 버그를 어떻게 해결했나요?"

라는 질문에 대한 완벽한 답변이 될 것 같아요. 단순히 "고쳤다"가 아니라:

1. **문제를 체계적으로 재현**하고
2. **근본 원인을 분석**하며
3. **여러 해결책을 비교**하고
4. **최적의 방법을 선택**한

**완벽한 문제 해결 프로세스**를 보여줄 수 있거든요. 💪

---

## 📚 참고 자료

- [Spring Boot - Running Behind a Front-end Proxy Server](https://docs.spring.io/spring-boot/docs/current/reference/html/howto.html#howto.webserver.use-behind-a-proxy-server)
- [MDN - SameSite Cookie Attribute](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
- [RFC 6749 - OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749)
- [Spring Security - OAuth 2.0 Login](https://docs.spring.io/spring-security/reference/servlet/oauth2/login/core.html)
- [Understanding CORS and Credentials](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS#credentials)

---

## 🔧 코드 요약

### 1. 프록시 헤더 활성화
```yaml
server:
  forward-headers-strategy: framework
```

### 2. Frontend Origin 정규화
```java
public static String toAbsoluteUrl(String origin) {
    if (!origin.startsWith("http")) {
        return "https://" + origin;
    }
    return origin;
}
```

### 3. 크로스 오리진 세션 쿠키
```yaml
server:
  servlet:
    session:
      cookie:
        same-site: none
        secure: true
```

### 4. 전역 404 핸들러
```java
@ExceptionHandler(NoHandlerFoundException.class)
public Object handleNotFound(HttpServletRequest request) {
    if (isApiRequest(request)) {
        return JSON_404;
    }
    return REDIRECT_TO_FRONTEND;
}
```

---

**읽어주셔서 감사합니다! 내일은 더 안정적인 시스템으로 찾아뵙겠습니다. 🚀**

#SpringBoot #OAuth #CORS #Debugging #ProxyServer #SameSiteCookie #개발일지 #짜조
