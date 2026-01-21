# 짜조(JJAJO) - AI 기반 자동 일정 플래너 개발기

> Spring Boot + React로 만드는 나만의 AI 계획 컨설턴트

## 🚀 프로젝트 소개

**짜조(Jja-jo)**는 AI가 자동으로 일정을 계획하고 관리해주는 플래너 애플리케이션입니다. 사용자의 목표와 일정을 입력하면, AI가 최적의 일정을 제안하고, 충돌을 감지하며, 실시간으로 계획을 조정해줍니다.

## 💡 왜 이 프로젝트를 시작했나?

### 1. Spring 실전 적용의 필요성
Spring을 공부하면서 많은 개념들을 배웠지만, 실제 프로젝트에 적용할 기회가 부족했습니다. 이론으로만 알고 있던 Clean Architecture, Spring AI, SSE 통신 등을 직접 구현해보고 싶었습니다.

### 2. 일상의 불편함 해결
매일 아침 플래너를 작성하는 것이 너무 번거로웠습니다. 
- "오늘 뭐 해야 하지?" 
- "이 일은 몇 시에 할까?" 
- "시간이 겹치는데 어떻게 조정하지?"

이런 고민들을 AI가 대신 해결해주면 어떨까 하는 생각에서 시작했습니다.

### 3. 개인 비서가 필요하다!
마치 개인 비서나 계획 컨설턴트처럼, 내 목표를 이해하고 체계적으로 일정을 설계해주는 서비스가 필요했습니다. 그것도 데스크톱과 모바일에서 모두 간편하게 사용할 수 있는 형태로요.

## 🛠 기술 스택

### Frontend
- **React 18 + TypeScript**: 타입 안정성과 최신 React 기능 활용
- **Tailwind CSS**: 빠른 스타일링과 반응형 디자인
- **Framer Motion**: 부드러운 애니메이션과 드래그 앤 드롭
- **Zustand**: 간단하고 직관적인 상태 관리
- **Vite**: 빠른 개발 환경
- **date-fns**: 날짜/시간 유틸리티

### Backend
- **Java 21**: 최신 LTS 버전의 성능과 기능
- **Spring Boot 3.4**: 안정적인 백엔드 프레임워크
- **Spring AI**: AI 통합을 위한 Spring 생태계
- **Google Gemini 3.0 Pro**: 강력한 AI 모델
- **SSE (Server-Sent Events)**: 실시간 AI 응답 스트리밍

### 아키텍처
- **Clean Architecture**: 도메인 중심의 계층화된 구조
- **Hexagonal Architecture**: 포트와 어댑터 패턴 적용

## 🏗 아키텍처 설계

### Clean Architecture 적용기

프로젝트의 핵심은 **유지보수 가능하고 테스트하기 쉬운 구조**를 만드는 것이었습니다.

```
backend/src/main/java/com/jjajo/
├── domain/              # 핵심 비즈니스 로직 (의존성 없음)
│   └── model/          # Goal, Milestone, ScheduleConflict 등
├── application/         # 유스케이스와 비즈니스 규칙
│   ├── port/in/        # 인바운드 포트 (유스케이스 인터페이스)
│   └── service/        # 비즈니스 로직 구현
├── infrastructure/      # 외부 시스템 연동
│   └── gemini/         # Gemini API 어댑터
└── presentation/        # 사용자 인터페이스
    ├── controller/     # REST API 엔드포인트
    ├── dto/           # 데이터 전송 객체
    └── config/        # CORS, 보안 설정
```

**왜 Clean Architecture?**
- 비즈니스 로직이 프레임워크나 외부 API에 의존하지 않음
- 테스트가 쉬움 (Mock 객체로 외부 의존성 대체 가능)
- AI 모델을 Gemini에서 다른 것으로 바꾸기 쉬움

## 💻 주요 기능

### 1. AI 기반 목표 계획 수립
사용자가 입력한 목표를 분석하여 구체적인 마일스톤과 일정을 자동으로 생성합니다.

**구현 포인트:**
```java
@Service
public class GoalPlanningService {
    private final ChatClient chatClient;
    
    public Flux<String> planGoal(Goal goal) {
        String prompt = buildPlanningPrompt(goal);
        return chatClient.prompt()
            .user(prompt)
            .stream()
            .content();  // SSE로 실시간 스트리밍
    }
}
```

### 2. 스케줄 충돌 감지
새로운 일정이 기존 일정과 겹치는지 자동으로 감지하고 해결 방안을 제시합니다.

**구현 포인트:**
```java
@Service
public class ConflictDetectionService {
    public List<ScheduleConflict> detectConflicts(
        ScheduleRequest newSchedule, 
        List<ScheduleRequest> existingSchedules
    ) {
        // 시간 겹침 감지 로직
        // AI를 활용한 해결 방안 제시
    }
}
```

### 3. 실시간 AI 채팅
일정에 대해 자유롭게 질문하고, AI가 즉시 답변하며 일정을 조정할 수 있습니다.

**구현 포인트:**
- SSE를 통한 실시간 스트리밍
- 프론트엔드에서 Zustand로 채팅 상태 관리

### 4. 스마트 제안 시스템
사용자의 패턴을 분석하여 최적의 시간대와 작업 순서를 제안합니다.

## 🎯 개발 과정에서 배운 것들

### 1. Spring AI의 강력함
Spring AI는 AI 통합을 정말 쉽게 만들어줍니다. ChatClient 인터페이스만으로 복잡한 AI 통신을 간단하게 처리할 수 있었습니다.

```java
ChatClient chatClient = ChatClient.builder(chatModel)
    .defaultOptions(
        GeminiChatOptions.builder()
            .withTemperature(0.7)
            .withMaxTokens(2000)
            .build()
    )
    .build();
```

### 2. SSE (Server-Sent Events)의 활용
AI 응답을 실시간으로 스트리밍하여 사용자 경험을 크게 개선했습니다. WebFlux의 Flux를 사용하여 자연스러운 구현이 가능했습니다.

```java
@GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
public Flux<String> streamResponse() {
    return aiService.generateResponse()
        .delayElements(Duration.ofMillis(50)); // 자연스러운 타이핑 효과
}
```

### 3. Clean Architecture의 실전 적용
- **도메인 레이어**: 순수한 Java 객체로 비즈니스 규칙 표현
- **포트와 어댑터**: 외부 의존성을 인터페이스로 추상화
- **의존성 역전**: 고수준 모듈이 저수준 모듈에 의존하지 않음

처음에는 과하다고 느껴졌지만, 코드가 커질수록 이 구조의 장점이 명확해졌습니다.

### 4. TypeScript + Zustand 조합
React에서 타입 안전성을 유지하면서도 간단한 상태 관리가 가능했습니다.

```typescript
interface CalendarStore {
  todos: Todo[];
  addTodo: (todo: Todo) => void;
  updateTodo: (id: string, updates: Partial<Todo>) => void;
  deleteTodo: (id: string) => void;
}

const useCalendarStore = create<CalendarStore>((set) => ({
  todos: [],
  addTodo: (todo) => set((state) => ({ 
    todos: [...state.todos, todo] 
  })),
  // ...
}));
```

### 5. CORS와 보안 설정
로컬 개발 환경에서 프론트엔드(5173)와 백엔드(8080)를 분리하면서 CORS 문제를 해결하는 과정에서 많이 배웠습니다.

## 🚧 개발 중 마주친 챌린지

### Challenge 1: AI 응답 일관성
Gemini가 때때로 일관되지 않은 형식으로 응답하는 문제가 있었습니다.

**해결 방법:**
- 프롬프트 엔지니어링으로 응답 형식 구체화
- JSON Schema를 활용한 구조화된 응답 요청
- 예외 처리 강화

### Challenge 2: 실시간 스트리밍과 상태 관리
SSE로 받은 데이터를 React 상태와 동기화하는 것이 복잡했습니다.

**해결 방법:**
- Zustand의 subscribe 기능 활용
- 스트리밍 중간 상태 표시
- 에러 핸들링 강화

### Challenge 3: 날짜/시간 처리
다양한 날짜 형식과 시간대 처리가 복잡했습니다.

**해결 방법:**
- 백엔드에서 ISO 8601 형식 통일
- 프론트엔드에서 `dateUtils` 유틸리티 작성
- LocalDateTime vs ZonedDateTime 적절히 활용

## 📊 프로젝트 현황

### 완료된 기능 ✅
- [x] API 키 검증 시스템
- [x] AI 기반 목표 계획 수립
- [x] 스케줄 충돌 감지
- [x] 실시간 AI 채팅
- [x] 캘린더 UI
- [x] 목표 및 마일스톤 관리
- [x] AI 제안 시스템

### 향후 개발 계획 🚀
- [ ] 사용자 인증 및 데이터 영속성 (Spring Security + JPA)
- [ ] 모바일 반응형 UI 개선
- [ ] 알림 기능 (Push Notification)
- [ ] 협업 기능 (공유 캘린더)
- [ ] 데이터 분석 대시보드 (생산성 통계)
- [ ] PWA 지원 (오프라인 사용 가능)
- [ ] 다국어 지원
- [ ] 테마 커스터마이징

## 🎓 배운 교훈

### 1. "완벽한 설계는 없다"
Clean Architecture를 적용하면서 처음부터 완벽한 구조를 만들려고 했습니다. 하지만 개발하면서 계속 리팩토링하고 개선하는 과정이 더 중요하다는 것을 배웠습니다.

### 2. "AI는 도구일 뿐"
AI가 모든 것을 해결해주지 않습니다. 좋은 프롬프트 설계, 에러 처리, 사용자 경험 설계가 더 중요합니다.

### 3. "사용자 경험이 최우선"
아무리 좋은 기술을 써도, 사용자가 불편하면 의미가 없습니다. SSE로 실시간 스트리밍을 구현한 것도 "기다리는 느낌"을 줄이기 위해서였습니다.

### 4. "문서화의 중요성"
코드를 작성하면서 README와 주석을 꼼꼼히 작성했더니, 나중에 코드를 다시 볼 때 훨씬 이해하기 쉬웠습니다.

## 💬 마치며

처음에는 "Spring 공부한 걸 써먹자"는 단순한 생각으로 시작했지만, 프로젝트를 진행하면서 정말 많은 것을 배웠습니다. 

특히 **실제로 내가 쓸 서비스**를 만들다 보니, 더 열심히 고민하고 더 나은 방법을 찾으려고 노력하게 되었습니다.

아직 완성된 것은 아니지만, 매일 조금씩 개선해나가고 있습니다. 앞으로 데이터베이스 연동, 배포, 그리고 실제 사용자 테스트를 통해 더욱 발전시킬 예정입니다.

**"내가 만든 AI 비서가 내 하루를 계획해준다"** - 이 비전을 현실로 만들어가는 과정이 정말 즐겁습니다. 🚀

---

## 🔗 링크

- **GitHub Repository**: [여기에 GitHub 링크 추가]
- **Demo Video**: [여기에 데모 영상 링크 추가]
- **Live Demo**: [배포 후 링크 추가]

## 📝 기술 블로그 시리즈 (예정)

1. **Spring AI로 AI 기능 5분 만에 통합하기**
2. **Clean Architecture 실전 적용기: 이론과 실제의 차이**
3. **SSE로 실시간 AI 스트리밍 구현하기**
4. **React + TypeScript + Zustand로 타입 안전한 상태 관리**
5. **Gemini API 프롬프트 엔지니어링 팁**

---

**읽어주셔서 감사합니다! 궁금한 점이나 피드백이 있으시면 댓글로 남겨주세요. 😊**

#SpringBoot #React #AI #Gemini #TypeScript #CleanArchitecture #플래너 #사이드프로젝트
