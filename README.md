<div align="center">

# 짜조 (JJAJO)

### 말만 하면, AI가 일정을 짜줘요

[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.4-6DB33F?style=for-the-badge&logo=springboot)](https://spring.io/projects/spring-boot)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Powered by Gemini](https://img.shields.io/badge/Powered_by-Gemini_AI-8E75B2?style=for-the-badge)](https://ai.google.dev/)

**목표를 대화로 설계하고, 자연어 한 줄로 일정을 추가하며, 캔버스에서 드래그로 조정하는 AI 액션 플래너**

[왜 짜조인가요?](#-왜-짜조인가요) • [주요 기능](#-주요-기능) • [화면 소개](#-화면-소개) • [시작하기](#-시작하기) • [기술 스택](#-기술-스택)

</div>

---

## 💡 왜 짜조인가요?

기존 캘린더 앱들은 **입력의 번거로움**을 해결하지 못했습니다.

> "내일 오후 3시" → 날짜 선택 → 시간 선택 → 제목 입력 → 저장

짜조는 이 과정을 **문장 하나**로 끝냅니다.

<table>
<tr>
<td width="33%" align="center">
<h3>🗣️ 말하듯 입력</h3>
<p>날짜 선택기, 시간 피커 없이<br>"내일 오후 3시 팀 미팅"만 입력하면<br>AI가 파싱해서 바로 추가합니다</p>
</td>
<td width="33%" align="center">
<h3>🎯 대화로 목표 설계</h3>
<p>"3개월 안에 토익 900" 한 마디에<br>AI가 주차별 학습 계획을<br>역방향으로 설계해 줍니다</p>
</td>
<td width="33%" align="center">
<h3>🔑 내 키로, 내 데이터만</h3>
<p>구독료 없이 무료 Gemini API 키로<br>AI 기능을 사용합니다<br>키는 서버에 저장되지 않습니다</p>
</td>
</tr>
</table>

---

## ✨ 짜조만의 차별점

### 다른 캘린더와 무엇이 다른가요?

| | 구글 캘린더 | 노션 | 짜조 |
|---|---|---|---|
| 일정 입력 방식 | 폼 입력 | 폼 입력 | **자연어 한 줄** |
| 목표 관리 | ❌ | 수동 작성 | **AI 대화로 설계** |
| 역방향 계획 | ❌ | ❌ | **마감일 → 오늘 자동 배치** |
| AI 일정 제안 | ❌ | ❌ | **빈 시간에 Shadow 추천** |
| 대화로 수정 | ❌ | ❌ | **"내일 회의 30분 뒤로"** |
| API 키 방식 | — | — | **BYOK (구독료 0원)** |

---

## 🚀 주요 기능

<table>
<tr>
<td width="50%">

### 🪄 매직 바 (Magic Bar)

자연어로 일정을 추가·수정·삭제합니다.

- `내일 오후 3시 회의` → 자동 파싱 후 추가
- `다음 주 월요일 2시간 스터디` → AI가 시간 해석
- `오늘 회의 취소해줘` → 대화형 수정 모드로 삭제
- `오전 미팅 1시간 뒤로 밀어줘` → 기존 일정 수정

### 🎯 대화형 목표 설계

AI와 **여러 번 대화**하면서 목표를 구체화합니다.

- AI가 먼저 맥락을 파악 ("현재 실력은?", "하루 몇 시간?")
- 주차별 마일스톤을 자동 생성
- "이대로 만들기" / "다른 방법으로 할게요" 선택 구조
- **최종 결정은 항상 사용자**가

### 📅 역방향 계획 (Backwards Plan)

마감일에서 거꾸로 밀어 현실적인 일정을 배치합니다.

- 목표 마감일 → AI가 역산하여 일정 분배
- 기존 일정과 충돌 감지 후 빈 슬롯에 자동 배치
- 주당 가용 시간 설정에 맞춰 조정

</td>
<td width="50%">

### 📊 세 가지 뷰로 보기

**세로 타임라인**: 오늘 중심으로 시간대별 일정 시각화  
**주간 히트맵**: 요일별 밀도를 한눈에 확인  
**월간 캘린더**: 달력 뷰에서 날짜 클릭으로 상세 보기

### 🖱️ 드래그 앤 드롭

- 일정을 드래그해서 다른 시간대로 이동
- **10분 단위 스냅** — 정확한 시간에 착지
- 드래그 중 실시간 시간 미리보기 표시
- 모바일: 터치 드래그 지원

### ⚡ 낙관적 UI 업데이트

서버 응답을 기다리지 않고 **즉시** 화면에 반영합니다.  
더블클릭 → 바로 블록 생성 → 백그라운드에서 서버 저장

### 🔮 AI Shadow Planner

타임라인의 빈 시간에 AI가 **추천 일정**을 옅게 표시합니다.  
수락하면 바로 확정 일정으로 전환됩니다.

</td>
</tr>
</table>

---

## 🖥️ 화면 소개

### 화면 구조

```
┌─────────────────────────────────────────────────────────────┐
│  [로고]  짜조        [월간 캘린더] [설정] [로그아웃]           │  ← Header
├─────────────────────────────────────────────────────────────┤
│  [주간 히트맵]  Mon Tue Wed Thu Fri Sat Sun                   │  ← TopTimeline
├─────────────────────────────────────────────────────────────┤
│  [🪄] [예: 내일 오후 3시 회의...        ] [적용]              │  ← Magic Bar
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  09:00  ───  일정 A  ────────────────────                   │
│  10:00       일정 B  ────────                               │  ← Vertical Timeline
│  14:00            일정 C  ─────────────────────────        │     (오늘 중심 주간)
│  ...                                                        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [목표 & 역방향 계획]  목표 카드 · 마일스톤 · Backwards Plan  │  ← Goals Section
└─────────────────────────────────────────────────────────────┘
```

### 주요 화면

<details>
<summary><b>🪄 매직 바 — 자연어 일정 입력 (클릭하여 펼치기)</b></summary>

헤더 아래 항상 고정된 입력창입니다.

- 한국어·영어 자연어로 일정 입력
- Gemini AI가 날짜·시간·제목을 파싱
- 모호한 표현도 해석 ("이번 주 중으로" → 가장 적합한 날 자동 선택)
- 입력 후 타임라인·캘린더에 **즉시 반영**
- 수정 모드: "오늘 회의 제목 바꿔줘" 같은 지시로 기존 일정 변경

</details>

<details>
<summary><b>📅 세로 타임라인 — 드래그 앤 드롭 일정 관리 (클릭하여 펼치기)</b></summary>

오늘을 기준으로 좌우로 날짜를 이동할 수 있는 주간 뷰입니다.

- 픽셀 단위 높이 = 시간 단위, 직관적인 배치
- **더블클릭** → 빈 슬롯에 즉시 새 일정 생성 (낙관적 UI)
- **드래그** → 시간 이동, 10분 단위 스냅
- 드래그 중 거대한 시간 표시로 시각적 피드백
- Focus Spotlight: 현재 진행 중인 일정을 크게 강조 표시
- AI Shadow: 빈 시간에 추천 일정 옅게 오버레이

</details>

<details>
<summary><b>🎯 목표 & 역방향 계획 — AI 대화형 목표 설계 (클릭하여 펼치기)</b></summary>

AI와 여러 번 대화하며 현실적인 계획을 수립합니다.

**대화 흐름 예시:**
```
사용자: 3개월 안에 토익 900 달성하고 싶어
AI: 좋습니다! 현재 토익 점수는 어느 정도인가요?
사용자: 750점 정도요
AI: 하루 중 공부에 쓸 수 있는 시간은 얼마나 되나요?
사용자: 퇴근 후 2시간 정도
AI: [주차별 목표와 마일스톤 제안]
사용자: 이대로 만들기
→ 역방향으로 일정이 캘린더에 자동 배치됩니다
```

</details>

<details>
<summary><b>🗓️ 월간 캘린더 — 달력 뷰 (클릭하여 펼치기)</b></summary>

헤더의 달력 아이콘으로 열 수 있는 전체 월간 뷰입니다.

- 날짜 클릭 → 해당 날의 일정 목록과 상세 패널 열기
- 날짜별 일정 밀도를 색상으로 표시
- 모달 없이 바텀 시트로 자연스럽게 전환 (모바일 최적화)
- 날짜에서 새 일정 추가 가능

</details>

---

## 🏗️ 기술 스택

<div align="center">

| 카테고리 | 기술 | 설명 |
|----------|------|------|
| **Frontend** | ![React](https://img.shields.io/badge/React-18-61DAFB?logo=react) | 최신 React 18 + TypeScript |
| **Build Tool** | ![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite) | 초고속 HMR과 최적화 빌드 |
| **상태 관리** | ![Zustand](https://img.shields.io/badge/Zustand-4-FF6B35) | 간결한 전역 상태 관리 |
| **애니메이션** | ![Framer Motion](https://img.shields.io/badge/Framer_Motion-11-FF0055) | 드래그 앤 드롭 & 트랜지션 |
| **스타일** | ![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3-38BDF8?logo=tailwindcss) | 유틸리티 퍼스트 CSS |
| **Backend** | ![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.4-6DB33F?logo=springboot) | Java 17 기반 REST API |
| **AI** | ![Gemini](https://img.shields.io/badge/Gemini_2.0_Flash-8E75B2) | Google 생성형 AI (BYOK) |
| **인증** | ![Google OAuth](https://img.shields.io/badge/Google_OAuth2-4285F4?logo=google) | OIDC 기반 소셜 로그인 |
| **DB** | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql) | H2(로컬) / PostgreSQL(운영) |
| **배포** | ![Cloudflare](https://img.shields.io/badge/Cloudflare_Pages-F38020?logo=cloudflare) | 프론트 CDN 배포 |

</div>

### 아키텍처

```
frontend/src/
├── components/
│   ├── calendar/         # VerticalTimeline, CalendarGrid, MagicBar, DayDetailPanel ...
│   ├── layout/           # Header, BottomNav, MagicBar, Toast
│   └── onboarding/       # PlannerTour (첫 방문 가이드)
├── pages/                # AuthPage, MainPage, ApiKeyPage
├── stores/               # calendarStore, settingsStore, apiKeyStore ...
├── services/             # API 호출 레이어
├── hooks/                # 커스텀 훅
└── utils/                # 날짜·시간 유틸리티

backend/src/main/java/com/jjajo/
├── domain/               # 핵심 비즈니스 로직 (의존성 없음)
│   ├── entity/           # Goal, Milestone, Conversation, Message
│   └── repository/       # Spring Data JPA
├── application/          # 유스케이스 & 서비스
│   ├── port/in/          # 인바운드 포트 인터페이스
│   └── service/          # GoalPlanningService, ConflictDetectionService ...
├── infrastructure/       # 외부 시스템 연동
│   └── gemini/           # Gemini API 어댑터
└── presentation/         # REST 컨트롤러, DTO, CORS 설정
```

---

## 🔒 보안 설계

### BYOK (Bring Your Own Key)

짜조는 사용자의 **Gemini API 키를 서버에 저장하지 않습니다**.

- 키는 브라우저 `sessionStorage`/`localStorage`에만 보관
- API 호출 시 클라이언트 → Gemini 직접 요청 또는 헤더 경유
- 서버 DB에는 키가 기록되지 않으므로 유출 위험 없음
- 무료 Gemini API Tier로 충분히 사용 가능 (신용카드 불필요)

### Google OAuth2 / OIDC

- Spring Security + Google OAuth2 클라이언트
- 세션·쿠키 기반 인증, `Principal`의 `userId`로 데이터 식별
- 개인 정보는 Google 계정 정보만 사용 (이메일, 프로필)

---

## 🚀 시작하기

### 사전 준비

- Node.js 20+
- Java 17+
- Google Cloud Console OAuth 클라이언트 (소셜 로그인)
- Google AI Studio API 키 (AI 기능)

### 1. 백엔드 실행

```bash
cd backend
# .env 또는 환경 변수 설정 (backend/.env.example 참고)
# GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET 필수
./mvnw spring-boot:run
```

> `http://localhost:8080` — Swagger UI: `http://localhost:8080/swagger-ui.html`

상세 설정: [backend/GOOGLE_OAUTH_SETUP.md](backend/GOOGLE_OAUTH_SETUP.md)

### 2. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

> 브라우저에서 `http://localhost:5173` 접속 → Google 로그인 → `/app`에서 플래너 사용

### 3. Gemini API 키 설정

1. [Google AI Studio](https://aistudio.google.com/app/apikey) 접속
2. **무료 API 키 발급** (신용카드 불필요)
3. 앱 첫 로그인 후 API 키 입력 화면에서 등록
4. 이후 설정 페이지에서 언제든 변경 가능

상세 설정: [backend/GEMINI_API_SETUP.md](backend/GEMINI_API_SETUP.md)

---

## ☁️ 배포

| 서비스 | 역할 |
|--------|------|
| **Cloudflare Pages** | React SPA 정적 호스팅 |
| **Railway / Render** | Spring Boot 백엔드 |
| **Neon / Supabase** | PostgreSQL 관리형 DB |

배포 전 로컬 빌드 검증:

```powershell
# Windows
.\scripts\verify-build.ps1
```

```bash
# Mac/Linux
./scripts/verify-build.sh
```

전체 배포 가이드: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

---

## 📖 개발 기록

- [VELOG_POST.md](VELOG_POST.md) — 프로젝트 기획 및 기술 스택 선택기
- [VELOG_DAY2.md](VELOG_DAY2.md) — Framer Motion 드래그 버그 3시간 디버깅 기록
- [frontend/docs/OPTIMISTIC_SCHEDULE_CREATE.md](frontend/docs/OPTIMISTIC_SCHEDULE_CREATE.md) — 낙관적 UI 업데이트 설계
- [backend/IMPLEMENTATION_SUMMARY.md](backend/IMPLEMENTATION_SUMMARY.md) — 대화형 AI 상담 시스템 구현 보고

---

## 🗺️ 로드맵

### 완료 ✅
- [x] Google OAuth 소셜 로그인
- [x] 매직 바 자연어 파싱
- [x] 세로 타임라인 드래그 앤 드롭 (10분 단위 스냅)
- [x] 낙관적 UI 업데이트 (더블클릭 즉시 생성)
- [x] 주간 히트맵 (TopTimeline)
- [x] 월간 캘린더 뷰
- [x] 대화형 목표 설계 & 마일스톤
- [x] 역방향 계획 (Backwards Plan)
- [x] AI Shadow Planner
- [x] Focus Spotlight (현재 일정 강조)
- [x] BYOK (서버 무저장 API 키)
- [x] 모바일 반응형 UI + BottomNav
- [x] 온보딩 투어 (PlannerTour)
- [x] Cloudflare Pages + Railway/Render 배포 파이프라인
- [x] CI (GitHub Actions 빌드 검증)

### 예정 🚀
- [ ] 알림 기능 (Push Notification)
- [ ] 공유 캘린더 (협업)
- [ ] 생산성 통계 대시보드
- [ ] PWA 지원 (오프라인)
- [ ] 반복 일정

---

## 📚 참고 문서

- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) — Cloudflare Pages, Railway/Render, PostgreSQL 배포
- [backend/GOOGLE_OAUTH_SETUP.md](backend/GOOGLE_OAUTH_SETUP.md) — Google OAuth 클라이언트 설정
- [backend/GEMINI_API_SETUP.md](backend/GEMINI_API_SETUP.md) — Gemini API 키 및 BYOK 안내
- [backend/API_SPECIFICATION.md](backend/API_SPECIFICATION.md) — REST API 전체 명세
- [backend/TEST_SCENARIOS.md](backend/TEST_SCENARIOS.md) — 테스트 시나리오

---

<div align="center">

**"말하면 AI가 짜준다. 짜조."**

*일정 관리가 번거로운 모든 분들을 위해 만들었습니다.*

</div>
