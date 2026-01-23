# 🤖 AI 하루 일정 자동 생성 기능

## 📋 개요

**"목표 → 버튼 클릭 → AI가 하루 일정 완성"**

사용자가 목표를 입력하고 버튼 하나만 클릭하면, AI(Gemini)가 ADHD 친화적인 하루 일정을 자동으로 생성합니다.

---

## 🎯 주요 기능

### 1. **원클릭 플래닝**
- 목표 제목, 설명, 예상 시간만 입력
- "✨ AI가 하루 일정 짜기" 버튼 클릭
- 3-5초 내 완성된 일정 생성

### 2. **ADHD 친화적 원칙 적용**
- ✅ 작은 단위로 쪼개기 (최대 90분 블록)
- ✅ 필수 휴식 시간 (45-90분 작업 후 15분 휴식)
- ✅ 에너지 매칭 (어려운 작업 → 오전, 쉬운 작업 → 오후)
- ✅ 버퍼 추가 (예상보다 20% 더 긴 시간)
- ✅ 점심시간 자동 확보 (12:00-13:00)

### 3. **자동 타임라인 추가**
- 생성된 일정이 자동으로 타임라인에 추가됨
- 드래그로 시간 조정 가능
- 각 블록별 타입 구분 (작업/휴식/식사)

---

## 🏗️ 시스템 구조

### **Frontend**
```
GoalModal
  ↓ 목표 입력 + "AI 일정 생성" 버튼
scheduleService.ts
  ↓ API 호출
DailyScheduleController (Backend)
```

### **Backend**
```
DailyScheduleController
  ↓ 요청 수신
DailyScheduleGenerationService
  ↓ 프롬프트 생성
GeminiAdapter
  ↓ AI 호출
JSON 파싱
  ↓ 응답 반환
```

---

## 📁 파일 구조

### **Frontend**
```
frontend/src/
├── components/goals/
│   └── GoalModal.tsx              # "AI 일정 생성" 버튼 추가
└── services/
    └── scheduleService.ts         # AI API 호출 서비스
```

### **Backend**
```
backend/src/main/java/com/jjajo/
├── application/service/
│   └── DailyScheduleGenerationService.java  # AI 일정 생성 로직
├── presentation/
│   ├── controller/
│   │   └── DailyScheduleController.java     # REST API
│   └── dto/
│       ├── DailyScheduleRequest.java        # 요청 DTO
│       └── DailyScheduleResponse.java       # 응답 DTO
└── infrastructure/gemini/
    └── GeminiAdapter.java                   # Gemini API 연동
```

---

## 🔧 API 명세

### **POST /api/schedule/generate-daily**

#### Request
```json
{
  "goalId": "goal-123",
  "goalTitle": "프로젝트 기획서 작성",
  "goalDescription": "Q3 신규 프로젝트 기획",
  "estimatedHours": 4,
  "priority": "high",
  "targetDate": "2026-01-23",
  "workStartTime": "09:00",
  "workEndTime": "18:00",
  "breakDuration": 15
}
```

#### Response
```json
{
  "schedule": [
    {
      "startTime": "09:00",
      "endTime": "10:30",
      "title": "프로젝트 기획서 작성 (1/4)",
      "description": "목차 구성 및 개요 작성",
      "type": "work",
      "priority": "high",
      "energyLevel": "high"
    },
    {
      "startTime": "10:30",
      "endTime": "10:45",
      "title": "휴식",
      "description": "스트레칭 및 워터 브레이크",
      "type": "break",
      "priority": "medium",
      "energyLevel": "medium"
    },
    ...
  ],
  "summary": {
    "totalWorkBlocks": 4,
    "totalBreaks": 3,
    "bufferTime": "1.5시간",
    "completionProbability": "85%"
  },
  "conflicts": []
}
```

---

## 🚀 사용 방법

### 1. **목표 생성 모달 열기**
```typescript
// MainPage.tsx 또는 어디서든
<button onClick={() => setIsGoalModalOpen(true)}>
  새 목표 만들기
</button>
```

### 2. **목표 정보 입력**
- 제목: "프로젝트 기획서 작성"
- 설명: "Q3 신규 프로젝트 기획"
- 마감일: 2026-01-25
- 예상 시간: 4시간
- 우선순위: 높음

### 3. **AI 일정 생성 버튼 클릭**
```typescript
// GoalModal.tsx
<button onClick={handleGenerateSchedule}>
  ✨ AI가 하루 일정 짜기
</button>
```

### 4. **자동으로 타임라인에 추가**
- 생성된 일정이 타임라인에 자동 추가
- 각 블록을 드래그하여 시간 조정 가능

---

## 🎨 Gemini 프롬프트 전략

### **핵심 원칙**
1. **구체적 지시**: "ADHD 친화적"이라는 명확한 방향 제시
2. **제약사항 명시**: 블록 크기, 휴식 규칙, 점심시간
3. **출력 형식 강제**: JSON만 출력하도록 지시
4. **예시 제공**: 출력 형식 예시 포함

### **프롬프트 구조**
```
당신은 ADHD 환자를 위한 일정 계획 전문가입니다.

### 목표
[목표 정보]

### 제약사항
[시간 제약]

### ADHD 친화적 원칙
[6가지 원칙]

### 출력 형식 (JSON만)
[JSON 예시]
```

---

## 🔮 향후 개선 계획

### **Phase 2: 충돌 처리 (다음 단계)**
- [ ] 기존 일정과 충돌 감지
- [ ] 자동 조정 제안
- [ ] 사용자 선택 옵션

### **Phase 3: 미리보기 모달**
- [ ] 생성된 일정 미리보기
- [ ] 수정/조정 기능
- [ ] 적용 전 확인

### **Phase 4: 개인화**
- [ ] 사용자 에너지 패턴 학습
- [ ] 선호 작업 시간 저장
- [ ] 템플릿 기능

### **Phase 5: 고급 기능**
- [ ] 여러 날에 걸친 일정 생성
- [ ] 마일스톤 자동 분할
- [ ] 진행률 기반 재조정

---

## 🐛 트러블슈팅

### **문제: AI 응답이 JSON이 아닌 경우**
```java
// DailyScheduleGenerationService.java
private String extractJSON(String aiResponse) {
    // ```json ... ``` 또는 { ... } 형식 추출
    int jsonStart = aiResponse.indexOf("{");
    int jsonEnd = aiResponse.lastIndexOf("}");
    
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
        return aiResponse.substring(jsonStart, jsonEnd + 1);
    }
    
    return aiResponse;
}
```

### **문제: CORS 오류**
```java
// WebConfig.java에 엔드포인트 추가
@Override
public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/**")
        .allowedOrigins("http://localhost:5173")
        .allowedMethods("*");
}
```

### **문제: Gemini API 응답 느림**
- 타임아웃 설정: 10초
- 로딩 상태 표시
- 재시도 로직 추가

---

## 📊 테스트

### **Frontend 테스트**
```bash
cd frontend
npm run dev
# http://localhost:5173 접속
# 목표 생성 → AI 일정 생성 버튼 클릭
```

### **Backend 테스트**
```bash
cd backend
./mvnw spring-boot:run
# http://localhost:8080 실행

# API 테스트
curl -X POST http://localhost:8080/api/schedule/generate-daily \
  -H "Content-Type: application/json" \
  -d '{
    "goalTitle": "테스트 목표",
    "estimatedHours": 4,
    "priority": "high",
    "targetDate": "2026-01-23"
  }'
```

---

## 🎉 완성!

이제 사용자는:
1. 목표만 입력하고
2. 버튼 하나 클릭하면
3. AI가 완벽한 하루 일정을 짜줍니다!

**ADHD 유저를 위한 최고의 생산성 도구** 🚀
