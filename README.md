# 짜조 (Jja-jo) — AI Autonomous Agent Planner

> 자연어 명령으로 일정을 계획하고, AI가 전략을 수립하며, 캔버스에 시각화하는 Action-oriented AI Agent

---

## 1. 프로젝트 개요

짜조는 사용자의 자연어 명령을 받아 AI가 자율적으로 일정을 계획하고, 실시간으로 사고 과정을 보여주며, 캔버스 UI에 시각화하는 플래너 애플리케이션입니다.  
이 문서는 **엔지니어링 관점**에서 기술 선택 이유와 시스템 아키텍처, 특히 백엔드의 **Spring Boot 보안(OIDC)** 과 **비동기 로깅** 설계를 중심으로 정리합니다.

---

## 2. 기술 선택 이유 (왜 이 스택인가)

### 2.1 백엔드

| 선택 | 이유 |
|------|------|
| **Spring Boot 3.4 + OAuth2/OIDC** | Google 로그인을 **세션·쿠키 기반**으로 통합하고, 인증 후 **Principal에 내부 userId**를 넣어 `/api/**` 전역에서 사용자 식별을 일관되게 하기 위해. OAuth2와 OIDC(openid scope)를 모두 지원해 클라이언트 유연성을 확보. |
| **Spring Security 필터 체인** | `/api/**`는 인증 필수, Swagger/H2 콘솔은 개발용으로 permit. CORS는 프론트 오리진만 허용하고 `credentials: true`로 쿠키 기반 호출을 가능하게 함. |
| **JPA + H2 / PostgreSQL** | 로컬은 H2 in-memory로 즉시 기동, 프로덕션은 `application-prod.yml`로 PostgreSQL 전환. `open-in-view: false`로 트랜잭션 경계를 명확히 함. |
| **Spring AI + WebClient·Gemini** | Spring AI BOM(Vertex AI Gemini)과 별도로 **BYOK**를 위해 WebClient로 Gemini REST API 직접 호출. 사용자 키를 서버에 저장하지 않고 요청마다 전달하는 구조. |
| **Logback 비동기 로깅** | 요청 처리 스레드가 파일 I/O에서 블로킹되지 않도록 `AsyncAppender`로 디버그/추적 로그를 큐에 넣고 별도 스레드에서 파일에 기록. 상세 내용은 §4.2. |

### 2.2 프론트엔드

| 선택 | 이유 |
|------|------|
| **React 18 + TypeScript** | 컴포넌트 재사용과 타입 안전성, 팀 협업 시 유지보수성을 위해. |
| **Vite** | 빠른 HMR과 ESM 기반 빌드로 개발 경험 향상. 프록시로 `/api` → 백엔드 8080 전달. |
| **Zustand** | 전역 상태(캘린더, 목표, 채팅, 설정 등)를 경량으로 관리하고, 불필요한 리렌더 최소화. |
| **Tailwind CSS** | 유틸리티 기반으로 디자인 일관성 유지, `index.css`·`tailwind.config.js`에서 테마 확장. |
| **Framer Motion** | 목표 카드, 플래너 UI 등에 부드러운 애니메이션을 적용해 UX 개선. |

---

## 3. 시스템 아키텍처

### 3.1 전체 구성

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Browser (React SPA, Vite dev 5173 / Cloudflare Pages)                   │
│  - credentials: 'include' → 쿠키(JSESSIONID) 전송                        │
│  - /api/* → 백엔드 오리진 또는 같은 도메인 프록시                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Backend (Spring Boot 8080 / Railway·Render)                             │
│  - SecurityFilterChain: CORS → OAuth2/OIDC 로그인 → /api/** 인증          │
│  - DebugLogFilter(비prod): /api 요청 시 인증 상태를 비동기 로거로 기록     │
│  - Controller → Service → Port(UseCase) / Adapter(Gemini, DB)           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              PostgreSQL         Gemini API     Logback
              (prod)              (BYOK)        (ASYNC_DEBUG → 파일)
```

### 3.2 백엔드 레이어 구조 (Clean Architecture 스타일)

```
backend/src/main/java/com/jjajo/
├── domain/                 # 엔티티, 도메인 모델, 리포지토리 인터페이스
│   ├── entity/             # User, Goal, Schedule, Conversation, Message, Milestone
│   ├── model/               # Goal, Milestone, ScheduleRequest, ApiKeyValidation 등
│   └── repository/          # UserRepository, GoalRepository, ScheduleRepository 등
├── application/            # 유스케이스·애플리케이션 서비스
│   ├── port/
│   │   ├── in/              # ProcessAiChatUseCase, ValidateApiKeyUseCase
│   │   └── out/             # GeminiPort (LLM 호출 추상화)
│   └── service/             # AiChat, GoalPlanning, ConversationalGoal, Schedule, Suggestion 등
├── infrastructure/          # 외부 연동 구현
│   └── gemini/              # GeminiAdapter, GeminiChatAdapter (WebClient → Gemini API)
├── presentation/            # HTTP 진입점·설정
│   ├── config/              # SecurityConfig, OidcUserWithUserId, DebugLogFilter, CORS
│   ├── controller/          # REST 컨트롤러 (Schedule, Goal, AiChat, User 등)
│   └── dto/                 # 요청/응답 DTO
└── JjajoApplication.java
```

- **인증 흐름**: Google OAuth2/OIDC 로그인 → `customOAuth2UserService` / `customOidcUserService`에서 `UserEntity` 조회·upsert → **Principal에 `userId` 주입** (`OidcUserWithUserId` 또는 `DefaultOAuth2User` attributes). 컨트롤러는 `SecurityConfig.extractUserId(authentication)`으로 사용자 식별.

### 3.3 프론트엔드 구조

```
frontend/src/
├── components/     # calendar, chat, goals, layout, settings, suggestions, feedback
├── pages/          # AuthPage, MainPage, ApiKeyPage
├── services/       # api 호출 래퍼 (goalService, scheduleService, aiChatService 등)
├── stores/         # Zustand (calendarStore, goalStore, chatStore, settingsStore 등)
├── types/          # API·도메인 타입 (goal, calendar, chat, settings 등)
└── utils/          # getApiBase, normalizeGoalFromApi, dateUtils, cn 등
```

- **인증**: `AuthPage`에서 `/api/me`로 로그인 여부 확인(`credentials: 'include'`). 미인증 시 Google 로그인은 `{backendOrigin}/oauth2/authorization/google`로 리다이렉트, 로그인 성공 시 백엔드가 `frontend-origin`으로 리다이렉트.

---

## 4. 백엔드 핵심 설계: 보안(OIDC)과 비동기 로깅

### 4.1 Spring Boot 보안 설정 (OIDC)

- **목표**: Google 로그인 후 **세션 기반 인증**으로 `/api/**`를 보호하고, 모든 API에서 **내부 userId**를 쓰기 쉽게 하는 것.
- **구성**:
  - **OAuth2 Client**: `application.yml`의 `spring.security.oauth2.client.registration.google` (scope: `openid`, `profile`, `email`). 리다이렉트 URI는 `{baseUrl}/login/oauth2/code/{registrationId}`.
  - **Custom User Loader**:
    - **OAuth2**: `customOAuth2UserService`에서 Google `sub`로 `UserEntity` 조회·생성 후, `DefaultOAuth2User`의 attributes에 `userId` 추가.
    - **OIDC**: `customOidcUserService`에서 동일 로직 후 **`OidcUserWithUserId`** 로 감싸서 `getAttributes()`에 `userId` 포함. (DefaultOidcUser는 커스텀 속성 지원이 없어 래퍼 사용.)
  - **성공 후 처리**: `AuthenticationSuccessHandler`에서 `app.frontend-origin`(또는 기본 `http://localhost:5173`)으로 리다이렉트해 SPA로 복귀.
  - **CORS**: `CorsConfiguration`에서 `allowCredentials(true)`, `allowedOrigins(frontendOrigin)`으로 쿠키 기반 요청만 허용.
- **정리**: OIDC를 쓰는 이유는 **OpenID Connect 표준**으로 ID 토큰·사용자 정보를 일관되게 다루고, Principal에 **내부 userId**를 넣어 DB 조회와 API 권한 검사에 활용하기 위함입니다.

### 4.2 비동기 로깅 시스템

- **목표**: 요청 처리 스레드가 **파일 I/O에 블로킹되지 않도록** 디버그/추적 로그를 비동기로 기록.
- **구성**:
  - **Logback** (`logback-spring.xml`):
    - `com.jjajo.debug` 전용 **RollingFileAppender** (`FILE_DEBUG`): 한 줄에 JSON 메시지, 일별 롤링.
    - **AsyncAppender** (`ASYNC_DEBUG`): `queueSize=512`, `discardingThreshold=0`, 하위에 `FILE_DEBUG` 연결. 로그 이벤트를 큐에 넣고 별도 스레드가 파일에 기록.
    - `com.jjajo.debug` 로거는 `additivity="false"`로 루트로 전파하지 않고 `ASYNC_DEBUG`만 사용.
  - **DebugLogFilter** (`@Profile("!prod")`): `/api` 요청 시 SecurityContext의 인증 여부·principal 타입·userId·쿠키 존재 여부를 JSON으로 만들어 `DEBUG_LOG.debug(...)` 호출. 이 로거가 `com.jjajo.debug`이므로 **비동기로 파일에만** 기록되고, 요청 스레드는 I/O에서 대기하지 않음.
  - 일부 컨트롤러(예: `ScheduleController`)에서도 동일한 `com.jjajo.debug` 로거로 진입 시점 payload를 기록할 수 있음.
- **운영**: `prod` 프로필에서는 `DebugLogFilter` 빈이 없어 해당 필터는 등록되지 않으며, 로그 파일 경로는 `DEBUG_LOG_PATH`(기본값 `user.dir/.cursor/debug.log`)로 설정 가능.

---

## 5. Engineering Challenges & AI Collaboration

최근 **PR #5**에서 Cursor/Copilot의 코드 리뷰를 통해 두 가지 중요한 이슈가 발견되었고, Spring Profile과 Logback AsyncAppender 도입으로 **시스템 안정성**과 **성능**을 개선했다.

### 5.1 발견된 이슈

| 심각도 | 이슈 | 내용 |
|--------|------|------|
| **High** | 운영 환경 기동 오류 | 프로덕션 배포 시 디버그용 컴포넌트(DebugLogFilter)가 필터 체인에 항상 등록되어, 운영 환경에서 기대하지 않는 의존성·리소스 접근으로 인한 **기동 실패** 또는 불필요한 동작이 발생할 수 있음. |
| **Medium** | 동기식 파일 I/O에 의한 성능 저하 | `/api` 요청마다 디버그 로그를 **동기적으로** 파일에 기록하면, 요청 처리 스레드가 디스크 I/O에서 블로킹되어 **지연 시간 증가** 및 **처리량 저하**가 발생함. |

단순히 “디버그 로그를 끄자”가 아니라, **개발 환경에서는 추적 가능성을 유지하면서** 운영 환경 기동을 안정화하고, 로그 기록이 **요청 스레드를 블로킹하지 않도록** 설계를 바꾸는 것이 목표였다.

### 5.2 해결 1: Spring Profile로 운영 환경 기동 안정화

- **조치**: `DebugLogFilter`에 **`@Profile("!prod")`** 를 적용하여, **prod 프로필이 활성화된 경우 해당 빈을 생성하지 않음**.
- **SecurityConfig 연동**: `DebugLogFilter`는 Security 필터 체인에 **선택적으로** 포함되어야 하므로, `SecurityConfig`에서는 `Optional<DebugLogFilter>`로 주입하고 `@Autowired(required = false)`로 받음. 필터 체인 구성 시 `debugLogFilter.ifPresent(f -> http.addFilterBefore(f, AuthorizationFilter.class))`로 **빈이 있을 때만** 필터를 추가함.
- **엔지니어링 관점**:  
  - **환경 분리**: “개발/스테이징용 관찰 코드”와 “운영용 최소 구성”을 프로필로 명시적으로 분리함.  
  - **운영 부담 제거**: prod에서는 디버그 필터가 아예 로드되지 않아, 해당 필터나 그 의존성(로거, 파일 경로 등)으로 인한 기동 오류 가능성을 제거함.  
  - **단일 코드베이스 유지**: 조건문 제거가 아니라 **빈 등록 조건**만 바꿔서, 로컬/스테이징에서는 기존처럼 디버그 추적이 가능함.

그 결과, **운영 환경(prod)에서는 DebugLogFilter가 등록되지 않아 기동이 안정화**되고, 배포 실패 위험이 줄어든다.

### 5.3 해결 2: Logback AsyncAppender로 비동기 로깅 및 성능 개선

- **조치**: `logback-spring.xml`에서 `com.jjajo.debug` 로거가 **파일에 직접 쓰지 않고**, **AsyncAppender**를 거치도록 구성함.  
  - `FILE_DEBUG`: RollingFileAppender(일별 롤링, JSON 한 줄). 실제 디스크 쓰기 수행.  
  - `ASYNC_DEBUG`: `ch.qos.logback.classic.AsyncAppender`, `queueSize=512`, 하위에 `FILE_DEBUG` 연결.  
  - `com.jjajo.debug` 로거는 `additivity="false"`로 루트로 전파하지 않고 **`ASYNC_DEBUG`만** 사용.
- **동작**: `DEBUG_LOG.debug(...)` 호출 시 로그 이벤트는 **내부 큐**에 넣고 즉시 반환됨. **별도 워커 스레드**가 큐에서 이벤트를 꺼내 `FILE_DEBUG`로 전달해 파일에 기록함. 따라서 **요청 스레드는 파일 I/O에서 블로킹되지 않음**.
- **엔지니어링 관점**:  
  - **지연 시간**: 요청 처리 경로에서 디스크 I/O 대기 제거 → **응답 지연 감소**.  
  - **처리량**: 스레드가 I/O 대기 없이 다음 요청을 처리할 수 있어 **동시 처리 능력 향상**.  
  - **버퍼링**: `queueSize=512`로 짧은 트래픽 폭증 시에도 이벤트 유실 정책(`discardingThreshold`)과 함께 조정 가능.  
  - **관찰 가능성 유지**: 개발/스테이징에서는 여전히 `com.jjajo.debug` 로그가 파일에 기록되므로, 디버깅·추적은 그대로 활용 가능함.

그 결과, **동기식 파일 I/O에 의한 성능 저하를 제거**하고, 로그 기록은 비동기로만 수행되도록 정리했다.

### 5.4 정리

| 도입 요소 | 목적 | 효과 |
|-----------|------|------|
| **Spring Profile `!prod`** | 디버그 전용 컴포넌트를 운영 환경에서 제외 | 운영 기동 안정화(High 심각도 이슈 해소) |
| **Logback AsyncAppender** | 디버그 로그를 요청 스레드가 아닌 백그라운드에서 기록 | 동기 I/O 제거로 지연·처리량 개선(성능 이슈 해소) |

코드 수정만이 아니라 **프로필 기반 환경 분리**와 **비동기 로깅 파이프라인**을 도입해, 안정성과 성능을 함께 개선한 사례로 정리할 수 있다.

---

## 6. Verification & Reliability

AI를 **도구**로 쓰되, **결과물에 대한 책임**은 사람이 지는 구조를 위해 **자동 검증(JUnit5)** 과 **Human-in-the-loop(사용자 최종 검수)** 를 명시적으로 두었다.

### 6.1 JUnit5로 검증하는 핵심 로직

백엔드에서는 **대화형 목표 설정 서비스**라는 핵심 플로우를 JUnit5 단위 테스트로 검증한다.

| 검증 대상 | 내용 |
|-----------|------|
| **대화 시작·이어가기** | 새 대화 생성, 기존 대화에 메시지 추가, ConversationRepository 저장 호출 검증 |
| **정보 수집 → 목표 생성 준비** | 충분한 정보 수집 후 `READY_TO_CREATE` 상태 전환, `isReadyToCreateGoal()` true 검증 |
| **대화로부터 목표 생성** | AI 응답(JSON) 파싱 후 Goal·Milestone 저장, 대화 상태 `COMPLETED` 전환, `goalRepository.save` 호출 검증 |
| **엣지 케이스** | 존재하지 않는 대화 ID로 목표 생성 시 `IllegalArgumentException`, 이미 완료된 대화로 재생성 시 `IllegalStateException` 발생 검증 |
| **Repository 계층** | save 호출 시 `userId`, `status`, 메시지 개수 등 엔티티 상태 검증 |

- **테스트 스타일**: Mockito로 외부 의존성(Gemini, Repository) 격리, AssertJ로 가독성 높은 assertion, Given-When-Then 및 `@DisplayName`으로 시나리오 명시.
- **실행**: `backend`에서 `./mvnw test`로 실행. CI에서는 빌드 검증 위주로 동작하며, 로컬·PR 단계에서 테스트 실행을 권장한다.

즉, **AI가 생성한 계획을 저장하는 서비스 로직**은 단위 테스트로 동작이 보장되고, 리팩터링·AI 제안 반영 후에도 회귀를 빠르게 확인할 수 있다.

### 6.2 Human-in-the-loop: 사용자 최종 검수

AI가 **제안**만 하고, **실제 반영(목표·일정 생성)** 은 사용자가 명시적으로 승인한 뒤에만 수행되도록 설계했다.

- **플로우**: 대화형 상담에서 AI가 “목표 생성 준비 완료”를 판단하면, 프론트엔드는 **확인 카드**(제목·설명·주 회차·예상 일수 등 미리보기)를 보여준다. 사용자는 **「이대로 만들기」** 또는 **「다른 방식으로 할게요」** 를 선택한다.
- **승인 시**: 사용자가 「이대로 만들기」를 누르면 그때 `createGoalFromConversation`(또는 빠른 모드 시 `createGoalWithAI`)이 호출되어 목표·일정이 저장된다.
- **거절 시**: 「다른 방식으로 할게요」 선택 시에는 목표 생성 API를 호출하지 않고, 대화만 이어간다.

따라서 **AI 출력이 자동으로 DB에 반영되지 않고**, 사용자의 한 번 더 확인이라는 게이트를 거친다. 잘못된 제안이 그대로 반영되는 일을 줄이고, “제안은 AI, 결정은 사람”이라는 책임 경계를 분명히 한다.

### 6.3 정리: AI를 도구로 쓰되 결과물에 책임진다

- **자동 검증**: JUnit5로 핵심 비즈니스 로직(대화 → 목표 생성, 예외 케이스, 저장 계약)을 테스트해, AI 보조로 수정한 코드도 회귀 없이 동작하는지 확인한다.
- **Human-in-the-loop**: AI가 만든 계획은 **미리보기 + 사용자 승인** 이후에만 반영되며, 거절 시에는 저장하지 않는다.

이렇게 **검증(테스트)** 과 **검수(사용자 승인)** 를 둠으로써, AI를 생산성 도구로 활용하면서도 **최종 결과물에 대한 책임**은 사람이 지는 구조를 문서화했다.

---

## 7. 주요 기능 요약

- **인증**: Google OAuth2/OIDC, 세션·쿠키, Principal에 userId 주입.
- **BYOK**: 사용자 Gemini API 키를 프론트에서 전달, 백엔드는 저장하지 않고 요청 시점에만 사용.
- **목표·일정**: 대화형 상담으로 목표 수립, AI 계획 생성, 일정 CRUD 및 충돌 탐지.
- **AI 채팅**: Gemini 기반 어시스턴트·컨설턴트 API.

---

## 8. 로컬 실행

### 백엔드

```bash
cd backend
# GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET 설정 후 (backend/GOOGLE_OAUTH_SETUP.md 참고)
./mvnw spring-boot:run
```

### 프론트엔드

```bash
cd frontend
npm install
npm run dev
```

- 브라우저: `http://localhost:5173` → 로그인 후 `/app`에서 플래너 사용.
- API: `http://localhost:8080` (Swagger: `/swagger-ui.html`).

---

## 9. 참고 문서

- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) — Cloudflare Pages, Railway/Render, PostgreSQL 배포
- [backend/GOOGLE_OAUTH_SETUP.md](backend/GOOGLE_OAUTH_SETUP.md) — Google OAuth 클라이언트 설정
- [backend/GEMINI_API_SETUP.md](backend/GEMINI_API_SETUP.md) — Gemini API 키 및 BYOK

---

이 README는 **엔지니어링 중심**으로 “왜 이 기술을 쓰는지”와 **시스템 아키텍처**, 그리고 백엔드의 **Spring Boot 보안(OIDC)** 과 **비동기 로깅** 설계를 강조한 초안입니다. 기능별 상세는 코드와 API 문서(Swagger)를 참고하면 됩니다.
