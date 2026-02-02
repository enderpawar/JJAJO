# JJAJO

> 클릭한번으로 일정을 타임라인에 시각화하는 Action-oriented AI Agent

## 🎯 프로젝트 개요

짜조는 사용자의 자연어 명령을 받아 AI가 자율적으로 일정을 계획하고, 실시간으로 사고 과정을 보여주며, 캔버스 UI에 시각화하는 웹앱 플래너입니다.

## 🛠 기술 스택

### Frontend
- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui, Lucide React
- **Canvas**: React Flow
- **Animation**: Framer Motion
- **State Management**: Zustand

### Backend
- **Runtime**: Java 21
- **Framework**: Spring Boot 3.4
- **AI Integration**: Spring AI
- **LLM**: Google Gemini 3.0 Pro
- **Communication**: SSE (Server-Sent Events)

## 🏗 아키텍처

### Clean Architecture 구조

```
JJAJO/
├── backend/                    # Spring Boot 백엔드
│   ├── src/main/java/com/jjajo/
│   │   ├── domain/            # 도메인 레이어 (엔티티, 비즈니스 로직)
│   │   ├── application/       # 애플리케이션 레이어 (유스케이스, 서비스)
│   │   ├── infrastructure/    # 인프라 레이어 (외부 API, DB)
│   │   └── presentation/      # 프레젠테이션 레이어 (컨트롤러, DTO)
│   └── src/main/resources/
├── frontend/                   # React 프론트엔드
│   ├── src/
│   │   ├── components/        # 재사용 가능한 컴포넌트
│   │   ├── pages/            # 페이지 컴포넌트
│   │   ├── stores/           # Zustand 상태 관리
│   │   ├── hooks/            # 커스텀 훅
│   │   ├── services/         # API 통신 서비스
│   │   ├── types/            # TypeScript 타입 정의
│   │   └── utils/            # 유틸리티 함수
└── README.md
```

## 🔐 보안 원칙

### BYOK (Bring Your Own Key)
- 사용자가 자신의 Gemini API Key를 직접 입력
- 프론트엔드: sessionStorage에 임시 저장
- 백엔드: 요청마다 동적으로 Gemini Client 구성
- 서버 DB에 키를 영구 저장하지 않음

## 🚀 주요 기능

1. **API 키 관리**: BYOK 방식의 안전한 키 관리
2. **실시간 Thinking**: AI의 사고 과정을 SSE로 실시간 스트리밍
3. **캔버스 시각화**: React Flow 기반 일정 시각화
4. **Human-in-the-loop**: 사용자 확인 후 최종 실행

## 📝 시작하기

### 백엔드 실행
```bash
cd backend
./mvnw spring-boot:run
```

### 프론트엔드 실행
```bash
cd frontend
npm install
npm run dev
```

## 🎨 UX/UI 원칙

- 정감 가는 한국어 페르소나
- 따뜻한 톤의 메시지
- 직관적인 캔버스 인터랙션

---
