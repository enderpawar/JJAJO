# Gemini Multimodal Live API 접목 가능성 진단 보고서

## 1. 현재 서비스 개요

### JJAJO (짜조) - AI 기반 일정/목표 플래너

| 구분 | 기술 스택 |
|------|----------|
| **프론트엔드** | React 18, TypeScript, Vite, Zustand, Tailwind |
| **백엔드** | Spring Boot 3.4, Java 17 |
| **AI 엔진** | Google Gemini 2.0 Flash (REST API) |

### 현재 Gemini API 사용 현황

| 어댑터 | 엔드포인트 | 용도 |
|--------|-----------|------|
| `GeminiAdapter` | `GET /v1beta/models` | API 키 검증 |
| `GeminiChatAdapter` | `POST .../generateContent` | 채팅, 웹검색, Function Calling (일정 추가/수정), 짜조 플래너 |
| `GeminiTimetableAdapter` | `POST .../generateContent` | 이미지 + 텍스트 (시간표 파싱) |

- **통신 방식**: REST (WebClient, 동기 `block()`)
- **스트리밍**: 미구현
- **WebSocket**: 미구현

---

## 2. Gemini Multimodal Live API 요약

### 핵심 특징

| 항목 | 내용 |
|------|------|
| **프로토콜** | WebSocket (WSS), 상태 유지 연결 |
| **입력** | 오디오(16-bit PCM 16kHz), 비디오(JPEG 1FPS), 텍스트 |
| **출력** | 오디오(24kHz), 텍스트 |
| **지원 모델** | `gemini-2.0-flash`, `gemini-2.5-flash-native-audio-preview` 등 |
| **기능** | 실시간 음성 대화, VAD, barge-in, Function Calling, 다국어 |

### 구현 패턴

1. **Client-to-Server**: 프론트엔드 → Gemini Live API 직접 WebSocket 연결
2. **Server-to-Server**: 클라이언트 → 백엔드 → Gemini Live API (프록시)

---

## 3. 접목 가능성 진단

### ✅ 호환되는 부분

| 항목 | 평가 |
|------|------|
| **모델** | `gemini-2.0-flash`가 Live API 지원 → 현재 모델 그대로 사용 가능 |
| **Function Calling** | Live API에서 지원 → Magic Bar 일정 추가/수정 로직 재사용 가능 |
| **BYOK (API Key)** | 사용자 API 키 기반 인증 유지 가능 |
| **Spring WebFlux** | WebClient 기반 WebSocket 클라이언트 구현에 활용 가능 |

### ⚠️ 추가 개발이 필요한 부분

| 항목 | 현재 상태 | 필요 작업 |
|------|----------|----------|
| **WebSocket** | 미구현 | 백엔드 WebSocket 서버 + Gemini Live API WebSocket 클라이언트 |
| **오디오 스트리밍** | 없음 | 마이크 입력 → PCM 인코딩 → WebSocket 전송 |
| **오디오 출력** | 없음 | Live API 오디오 응답 → 디코딩 → 스피커 재생 |
| **세션 관리** | REST 요청 단위 | 장기 연결 세션 및 재연결 처리 |

### ❌ 아키텍처 차이

| 구분 | 현재 (generateContent) | Live API |
|------|------------------------|----------|
| **요청-응답** | 단발성 HTTP POST | 지속 WebSocket 연결 |
| **대화 방식** | 텍스트 기반 턴 단위 | 실시간 음성 + 텍스트 |
| **타임아웃** | 30~60초 | 연결 유지 (세션 단위) |

---

## 4. 접목 시나리오별 분석

### 시나리오 A: 음성 기반 Magic Bar (보이스 일정 추가)

**목표**: "내일 오후 3시 팀 회의 추가해줘"를 음성으로 말하면 일정 추가

| 구분 | 평가 |
|------|------|
| **기술적 가능성** | ✅ 가능 |
| **필요 작업** | 1) 백엔드 WebSocket 프록시 2) 프론트 마이크/스피커 UI 3) Function Calling 연동 |
| **난이도** | 중~상 |

### 시나리오 B: 기존 텍스트 채팅에 Live API 적용

**목표**: 현재 텍스트 채팅을 Live API로 전환

| 구분 | 평가 |
|------|------|
| **기술적 가능성** | ⚠️ 제한적 |
| **이유** | Live API는 실시간 음성/비디오용. 텍스트만 쓰면 REST `generateContent`가 더 단순하고 적합 |
| **권장** | 텍스트 채팅은 기존 REST 유지 |

### 시나리오 C: 시간표 이미지 파싱에 Live API 적용

**목표**: `GeminiTimetableAdapter`를 Live API로 대체

| 구분 | 평가 |
|------|------|
| **기술적 가능성** | ❌ 부적합 |
| **이유** | 시간표 파싱은 단발성 이미지+텍스트 요청. Live API는 실시간 스트리밍용 |
| **권장** | 기존 `generateContent` 유지 |

---

## 5. 권장 접근 방식

### 단계별 도입 제안

```
Phase 1: 기존 REST 유지
  - 채팅, 시간표, 플래너: 현재 구조 그대로 사용

Phase 2: 음성 Magic Bar (선택 기능)
  - 새 기능으로 "보이스 Magic Bar" 추가
  - WebSocket 엔드포인트 신설
  - Live API WebSocket 클라이언트 구현
  - Function Calling (add_schedule, apply_schedule_edits) 재사용

Phase 3: 점진적 확장
  - 대화형 플래너 음성 입력
  - 필요 시 barge-in, 감정 톤 등 고급 기능
```

### 백엔드 구현 시 고려사항

1. **WebSocket 의존성**
   - `spring-boot-starter-websocket` 또는 `spring-boot-starter-webflux` + WebSocket 핸들러
   - Java WebSocket 클라이언트 (예: `java-websocket`, `OkHttp` WebSocket)

2. **인증**
   - 기존 `X-Gemini-API-Key` 또는 `X-API-Key`를 WebSocket 핸셰이크에서 검증
   - Ephemeral token 사용 시 추가 구현 필요

3. **리소스**
   - 세션당 1 WebSocket 연결 → 동시 사용자 수에 따른 연결 관리
   - 타임아웃, 재연결, 에러 핸들링 정책 수립

---

## 6. 결론

| 질문 | 답변 |
|------|------|
| **접목 가능한가?** | **예.** 기술적으로 접목 가능 |
| **현재 구조와의 궁합** | REST 기반 채팅/플래너는 그대로 두고, **음성 기능을 추가 모듈로** 도입하는 것이 적합 |
| **우선 적용 후보** | Magic Bar의 **음성 일정 추가** (Function Calling 재사용) |
| **부적합한 부분** | 시간표 이미지 파싱, 단순 텍스트 채팅 → 기존 REST 유지 권장 |

### 요약

- **Gemini Multimodal Live API**는 **실시간 음성/비디오 대화**에 최적화되어 있음.
- JJAJO의 **Magic Bar**와 **Function Calling**과 결합하면 **음성으로 일정 추가/수정** 기능을 구현할 수 있음.
- 기존 REST 기반 채팅·시간표·플래너는 그대로 두고, **음성 Magic Bar**를 별도 기능으로 추가하는 하이브리드 구조를 권장함.
