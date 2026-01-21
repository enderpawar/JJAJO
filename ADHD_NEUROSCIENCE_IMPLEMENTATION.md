# 🧠 ADHD 신경과학 기반 시스템 설계 문서

## 📚 **학술적 근거**

### 1. Implementation Intentions (실행 의도 전략)
**연구자**: 피터 골위처(Peter Gollwitzer) 교수
**핵심**: If-Then 구조의 자동화된 계획 수립

#### 연구 결과
- ADHD 환자는 막연한 목표보다 특정 상황(Trigger)과 특정 행동(Action)을 미리 연결해두었을 때 **실행률이 2-3배 향상**
- "뭐 할래?"(오픈엔드) vs "오후 3시가 되면, 코딩을 시작하시겠어요?"(If-Then)
- 전두엽 부담 감소로 실행 장벽 제거

#### JJAJO 적용
```typescript
// ❌ Before (오픈엔드 질문)
"무엇을 하고 싶으신가요?"

// ✅ After (If-Then 구조)
"만약 오후 3시가 되면(Trigger), 코딩을 시작하시겠어요?(Action)"
```

**구현 위치**: 
- `backend/src/main/java/com/jjajo/application/service/ConversationalGoalService.java:179-230`
- AI 프롬프트에 If-Then 템플릿 내장

---

### 2. External Scaffolding (외적 보조 장치)
**연구자**: 러셀 바클리(Russell Barkley) 박사 - ADHD 세계적 권위자
**핵심**: 작업 기억(Working Memory) 약점 보완

#### 연구 결과
- ADHD는 내부 작업 기억이 약함 → **모든 계획은 외부화**되어야 함
- 머릿속 계획은 ADHD에게는 "존재하지 않는 계획"
- 시각적 단서(Visual Cues)가 즉각적으로 주어져야 실행 가능

#### JJAJO 적용
```typescript
// 🎯 현재 작업 화면 상단 고정
<CurrentTaskSticky />
  - 현재 진행 중인 작업 표시
  - 실시간 타이머 (mm:ss)
  - 진행률 게이지 (%)
  - 원형 프로그레스 바
```

**구현 위치**:
- `frontend/src/components/calendar/CurrentTaskSticky.tsx`
- `frontend/src/pages/MainPage.tsx:101` (최상단 고정)

**시각적 효과**:
- 화면 최상단에 **항상 표시** (Sticky)
- 오렌지 그라디언트 배경으로 **시선 집중**
- 남은 시간을 **초 단위**로 표시

---

### 3. Task Chunking (작업 분해) + Immediate Reward (즉각적 보상)
**연구 배경**: 보상 지연 장애(Delay Aversion)
**핵심**: 큰 목표 → 위협 인식 → 회피 반응

#### 연구 결과
- ADHD는 거대한 목표를 "위협"으로 인식 → 도파민 시스템 마비
- **10분 단위 작은 작업** + **즉각적 피드백** = 지속 가능한 몰입
- 각 작은 단위 완료 시 도파민 분비 → 다음 단계로 자연스러운 전환

#### JJAJO 적용
```typescript
// ❌ Before (1시간 코딩)
{
  title: "코딩",
  duration: 60분
}

// ✅ After (10분 단위 분해)
[
  { title: "코딩 - 준비하기", duration: 5분 },
  { title: "코딩 - 시작하기", duration: 10분 },
  { title: "코딩 - 집중하기", duration: 20분 },
  { title: "코딩 - 마무리하기", duration: 10분 }
]
```

**구현 위치**:
- `frontend/src/components/chat/AiChatPanel.tsx:122-175` (자동 작업 분해)
- `frontend/src/components/feedback/DopamineFeedback.tsx` (즉각적 피드백)

**즉각적 피드백 시스템**:
```typescript
// 🎉 작업 완료 시 즉시 축하 애니메이션
- "🎉 완료! 멋져요!"
- "🔥 3연속 완료! 불타오른다!"
- 파티클 효과 + 바운스 애니메이션
- 콤보 시스템 (연속 완료 시 보상 강화)
```

---

## 🎯 **핵심 용어 (면접/발표용)**

### 1. Executive Function Deficit (실행 기능 결함)
- ADHD의 본질: 의지의 문제 ❌, 뇌 시스템 문제 ⭕
- 전두엽 도파민 회로 약화 → 계획, 실행, 모니터링 장애
- **JJAJO의 역할**: 외장형 전두엽 (External Prefrontal Cortex)

### 2. Time Blindness (시간 왜곡)
- ADHD는 시간의 흐름을 체감하지 못함
- "나중에"는 존재하지 않음 → **"지금 바로"만 존재**
- **JJAJO 해결책**: 실시간 타이머, 시각적 진행률

### 3. Cognitive Load Reduction (인지 부하 감소)
- 선택지가 많으면 → 결정 마비 → 회피
- **JJAJO 전략**: 3가지 이내 선택지, If-Then 자동 연결

### 4. Dopamine-Driven Motivation (도파민 기반 동기부여)
- ADHD는 도파민 부족 → 장기 목표 동기부여 불가
- **JJAJO 해결책**: 10분마다 작은 성취, 즉각적 축하

---

## 📊 **구현 범위**

| 전략 | 학술적 근거 | 구현 위치 | 완료 |
|------|------------|----------|------|
| If-Then 구조 | 피터 골위처 교수 | `ConversationalGoalService.java` | ✅ |
| External Scaffolding | 러셀 바클리 박사 | `CurrentTaskSticky.tsx` | ✅ |
| Task Chunking | 보상 지연 장애 연구 | `AiChatPanel.tsx` | ✅ |
| Immediate Feedback | 도파민 시스템 연구 | `DopamineFeedback.tsx` | ✅ |

---

## 🧪 **테스트 시나리오**

### 시나리오 1: If-Then 구조 테스트
```
입력: "토익 공부하고 싶어"
AI: "언제 시작하시겠어요?"
     [⚡ 지금 바로] [🌅 내일 아침] [🌙 오늘 저녁]

사용자: "지금 바로"
AI: ✅ "토익 공부" 일정이 작은 단위로 등록되었어요!
    • 14:00 토익 공부 - 준비하기 (5분)
    • 14:05 토익 공부 - 시작하기 (10분)
    • 14:15 토익 공부 - 집중하기 (20분)
    • 14:35 토익 공부 - 마무리하기 (10분)
```

### 시나리오 2: External Scaffolding 확인
```
1. 위 일정 등록 후
2. 화면 최상단에 "지금 하는 중: 토익 공부 - 준비하기" 표시
3. 남은 시간: 4:32 (실시간 카운트다운)
4. 진행률: ███████░░░ 75%
```

### 시나리오 3: 즉각적 피드백
```
1. "토익 공부 - 준비하기" 완료 체크
2. 🎉 화면 중앙에 축하 애니메이션
   "🎉 완료! 멋져요!"
   ""토익 공부 - 준비하기" 완료!"
3. 파티클 효과 + 바운스 애니메이션
4. 3개 연속 완료 시:
   "🔥 3연속 완료! 불타오른다!"
   "콤보를 유지하세요! 🚀"
```

---

## 🎓 **학술 인용 (References)**

### 논문
1. Gollwitzer, P. M. (1999). **Implementation intentions: Strong effects of simple plans**. *American Psychologist*, 54(7), 493-503.
2. Barkley, R. A. (1997). **ADHD and the nature of self-control**. New York: Guilford Press.
3. Sonuga-Barke, E. J. (2002). **Psychological heterogeneity in AD/HD—a dual pathway model of behaviour and cognition**. *Behavioural Brain Research*, 130(1-2), 29-36.

### 핵심 개념
- **Working Memory Deficit** (작업 기억 결함)
- **Delay Aversion** (지연 혐오)
- **Executive Function Theory** (실행 기능 이론)
- **Dopamine Dysregulation** (도파민 조절 장애)

---

## 💡 **면접/발표 시 강조점**

### "왜 이 프로젝트를 만들었나요?"
> "ADHD 환자는 전두엽 도파민 회로 약화로 인해 계획 수립과 실행에 어려움을 겪습니다. 
> JJAJO는 피터 골위처 교수의 Implementation Intentions 이론과 러셀 바클리 박사의 
> External Scaffolding 개념을 적용하여, AI가 **'외장형 전두엽'** 역할을 수행하도록 
> 설계된 신경과학 기반 플래너입니다."

### "핵심 차별점은?"
> "기존 플래너는 '계획을 세워라'고 요구하지만, ADHD에게는 계획 수립 자체가 장벽입니다. 
> JJAJO는 **If-Then 구조**로 의사결정 부담을 제거하고, **10분 단위 작업 분해**로 
> 실행 장벽을 낮추며, **즉각적 도파민 피드백**으로 지속 가능한 동기부여를 제공합니다."

### "기술적 도전은?"
> "단순히 일정을 저장하는 것이 아니라, AI가 사용자의 **인지 부하를 실시간으로 감지**하고, 
> **작업 기억 한계를 보완**하며, **도파민 시스템을 자극**하는 복합적인 시스템 설계가 
> 핵심이었습니다. Spring AI와 Gemini API를 활용한 실시간 대화형 플래닝, 
> Zustand를 이용한 즉각적 UI 반응, SSE 기반 스트리밍 응답 등을 구현했습니다."

---

## 🚀 **향후 발전 방향**

### Phase 1 (현재 완료) ✅
- If-Then 구조 프롬프트
- 시각적 타이머 & 고정 작업 표시
- 자동 작업 분해 (10분 단위)
- 즉각적 도파민 피드백

### Phase 2 (향후 계획)
- [ ] **음성 입력** ("토익 공부, 지금 바로")
- [ ] **스마트 추천** (과거 패턴 학습)
- [ ] **웨어러블 연동** (스마트워치 진동 알림)
- [ ] **게임화** (레벨 시스템, 배지, 리더보드)

### Phase 3 (연구 확장)
- [ ] **뇌파 연동** (집중도 실시간 측정)
- [ ] **약물 복용 시간 최적화** (메타 분석 기반)
- [ ] **수면 패턴 연계** (일정 자동 조정)

---

## 📝 **결론**

JJAJO는 단순한 일정 관리 앱이 아닌, **ADHD 신경과학 연구를 실제 소프트웨어로 구현**한 
치료적 도구(Therapeutic Tool)입니다. 

피터 골위처, 러셀 바클리 등 세계적 연구자들의 이론을 바탕으로, 
**Executive Function Deficit, Time Blindness, Cognitive Load, Dopamine Dysregulation** 
문제를 종합적으로 해결하는 "외장형 전두엽" 시스템입니다.

이는 **UX 개선**을 넘어, **신경학적 장애를 보완하는 공학적 접근**입니다.

---

**작성일**: 2026-01-21  
**버전**: 1.0  
**작성자**: JJAJO 개발팀
