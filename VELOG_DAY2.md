# 짜조(JJAJO) 개발일지 Day 2 - 드래그 앤 드롭 버그와의 전쟁

> **"왜 카드가 제자리로 안 돌아올까?"** - 3시간의 디버깅 끝에 찾은 Framer Motion의 비밀

## 📅 개발 일자
2026년 1월 21일

## 🎯 오늘의 목표
- ✅ 수직 타임라인에 드래그 앤 드롭 기능 구현
- ✅ AI 추천 일정 시스템 (Shadow Planner) 구현
- ✅ 대화형 목표 설정 백엔드 API 완성
- ⚠️ **드래그 후 카드 위치 버그 해결** (예상 30분 → 실제 3시간)

## 🐛 발견: "카드가 이상한 곳에 있어요"

### 문제 발생 상황

오전에 VerticalTimeline 컴포넌트에 드래그 앤 드롭 기능을 추가했습니다. Framer Motion의 `drag` 속성을 사용해서 시간 블록을 드래그로 이동할 수 있게 만들었죠.

```tsx
<motion.div
  key={task.id}
  drag="y"
  dragElastic={0}
  dragMomentum={false}
  animate={{ x: 0, y: 0 }} // 드래그 후 원위치로!
  onDragEnd={(event, info) => {
    const newStartTime = pixelToTime(startPixel + info.offset.y)
    updateTodo(task.id, { startTime: newStartTime })
  }}
>
```

**기대한 동작:**
1. 카드를 드래그
2. 드롭하면 새로운 시간에 배치
3. CSS `top` 속성이 업데이트되어 정확한 위치로 이동

**실제 동작:**
```
사용자: 21:50 카드를 드래그해서 22:00로 이동
시스템: CSS top은 2183.33px (22:00 위치) ✅
       하지만 화면에는 2200px에 표시됨 ❌
       차이: +17px 😱
```

카드가 **항상 조금씩 아래로 치우쳐** 있었습니다. 처음엔 "계산 오류겠지"라고 생각했지만...

---

## 🔍 1단계: 문제 인식 및 재현

### 재현 방법
1. 일정 카드를 아무 곳으로나 드래그
2. 드롭
3. Chrome DevTools로 요소 검사
4. `transform: translateY(17px)` 발견!

### 가설 수립
> "Framer Motion이 드래그 후 transform을 제대로 리셋하지 않는 것 같다."

### 검증 방법
```tsx
// 콘솔에 transform 값 출력
onDragEnd={(event, info) => {
  console.log('Drag offset:', info.offset.y)  // ✅ 17px
  console.log('Final position:', info.point.y) // ✅ 정확
  
  // 업데이트 후 DOM 확인
  setTimeout(() => {
    const element = document.querySelector(`[data-task-id="${task.id}"]`)
    const styles = window.getComputedStyle(element!)
    console.log('CSS top:', styles.top)        // ✅ 2183.33px (정확!)
    console.log('Transform:', styles.transform) // ❌ translateY(17px) 잔류!
  }, 100)
}
```

**결과:**
- CSS `top` 속성: **정확함** ✅
- `transform: translateY()`: **드래그 offset이 그대로 남아있음** ❌

---

## 🧪 2단계: 원인 분석 - Framer Motion의 작동 원리

### Framer Motion의 드래그 메커니즘

Framer Motion은 드래그를 구현할 때 **두 가지 방법**을 사용합니다:

1. **드래그 중:** `transform: translate(x, y)` 사용 (부드러운 애니메이션)
2. **드래그 후:** 원래 위치로 되돌리거나 `animate` 속성으로 제어

### 문제의 핵심

```tsx
// 내가 작성한 코드
<motion.div
  style={{ top: `${startPixel}px` }} // CSS로 위치 지정
  animate={{ x: 0, y: 0 }}            // transform을 0으로 리셋하려 했지만...
  drag="y"
/>
```

**Framer Motion의 내부 동작:**
```
1. 드래그 시작: transform: translateY(0)
2. 드래그 중:   transform: translateY(17px)
3. 드래그 종료: onDragEnd 실행
4. React 리렌더링: top: 2183.33px (새 위치)
5. animate 실행: transform: translateY(0) 시도
   → 하지만 이미 translateY(17px)가 적용된 상태!
   → animate가 제대로 작동하지 않음 ❌
```

### 왜 `animate={{ x: 0, y: 0 }}`가 작동하지 않을까?

Framer Motion 공식 문서를 뒤져본 결과:

> **"When using `drag`, the element's layout position and transform can conflict. If both CSS position and transform are used, prefer using `dragConstraints` and `dragElastic={0}` to prevent transform accumulation."**

즉, **CSS 위치 속성 (`top`)과 `transform`을 동시에 사용하면 충돌**이 발생합니다!

---

## 💡 3단계: 해결 방법 탐색

### 시도 1: `animate` 강화 ❌

```tsx
animate={{ 
  x: 0, 
  y: 0,
  transition: { duration: 0 } // 즉시 리셋
}}
```

**결과:** 여전히 작동하지 않음. `animate`가 이미 적용된 `transform`을 덮어쓰지 못함.

---

### 시도 2: `dragElastic={0}` + `dragMomentum={false}` ❌

```tsx
dragElastic={0}
dragMomentum={false}
```

**결과:** 드래그 중 부드러움은 개선되었지만, 드롭 후 `translateY`는 여전히 남음.

---

### 시도 3: `onDragEnd`에서 `transform` 직접 제거 ⚠️

```tsx
onDragEnd={() => {
  const element = document.querySelector(`[data-task-id="${task.id}"]`)
  element!.style.transform = 'none'
}}
```

**결과:** 작동은 하지만 **안티패턴**. React의 선언적 렌더링을 깨뜨림.

---

### 시도 4: 컴포넌트 완전 언마운트/재마운트 🤔

```tsx
const [remountKey, setRemountKey] = useState(0)

onDragEnd={() => {
  updateTodo(...)
  setRemountKey(prev => prev + 1) // 강제 재렌더링
})

<motion.div key={`${task.id}-${remountKey}`}>
```

**결과:** 작동함! 하지만 **매번 드래그할 때마다 key 변경**은 오버헤드가 큼.

---

### ✅ 최종 해결책: `key`를 시간 정보와 결합

**핵심 아이디어:**
> "어차피 `startTime`이 바뀌면 위치가 바뀌는데, 그럼 **key에 시간 정보를 포함**시켜서 시간이 바뀔 때만 재렌더링하면 되지 않을까?"

```tsx
// BEFORE
<motion.div
  key={task.id} // 같은 task면 절대 재렌더링 안 됨
  animate={{ x: 0, y: 0 }} // ❌ 작동하지 않음
/>

// AFTER
<motion.div
  key={`${task.id}-${task.startTime}-${task.endTime}`} // ✅ 시간 변경 시 재렌더링
  // animate 제거 (불필요)
/>
```

### 작동 원리

1. 사용자가 카드를 드래그 (21:50 → 22:00)
2. `onDragEnd`에서 `startTime: "22:00"` 업데이트
3. React가 `key` 변경 감지: `task-1-21:50-22:30` → `task-1-22:00-22:30`
4. **기존 컴포넌트 완전 제거 + 새 컴포넌트 생성**
5. Framer Motion의 모든 `transform` 상태가 초기화됨
6. 새로운 `top: 2183.33px` 위치에 **정확하게** 렌더링 ✅

---

## 📊 성능 비교

### Before (animate 사용)
- 드래그 후 위치 오류: **100%**
- 디버깅 시간: **3시간**
- 코드 복잡도: ⭐⭐⭐

### After (key 변경)
- 드래그 후 위치 오류: **0%** ✅
- 재렌더링 오버헤드: 미미함 (카드 개수가 많지 않음)
- 코드 복잡도: ⭐ (오히려 간결해짐)

---

## 🧠 배운 교훈

### 1. Framer Motion의 한계 이해

Framer Motion은 강력하지만, **CSS position과 transform을 함께 사용할 때 충돌**이 발생할 수 있습니다. 공식 문서의 경고를 항상 확인해야 합니다.

### 2. React의 철학 활용

> **"상태가 바뀌면 UI도 바뀐다."**

억지로 DOM을 직접 조작하려 하지 말고, **React의 key 메커니즘**을 활용하면 더 깔끔하게 해결됩니다.

### 3. 디버깅은 가설 검증의 과정

```
1. 문제 인식 (카드 위치 오류)
   ↓
2. 가설 수립 (transform이 남아있다)
   ↓
3. 검증 (DevTools + console.log)
   ↓
4. 원인 파악 (Framer Motion의 작동 원리)
   ↓
5. 해결책 탐색 (4가지 시도)
   ↓
6. 최적 솔루션 선택 (key 활용)
```

이 과정을 체계적으로 거치면 **복잡한 버그도 반드시 해결됩니다.**

### 4. 문서를 읽어라 (RTFM)

Framer Motion 공식 문서에 이미 **"drag와 CSS position을 함께 쓸 때 주의"**라는 경고가 있었습니다. 처음부터 꼼꼼히 읽었다면 3시간을 아낄 수 있었을 거예요. 😅

---

## 🎨 추가 개선 사항

### 1. 드래그 프리뷰 추가

카드를 드래그하는 동안 **새로운 시간을 크게 표시**하여 사용자 경험 개선:

```tsx
{dragPreview && dragPreview.taskId === task.id && (
  <div className="absolute inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center">
    <div className="text-5xl font-black text-white animate-pulse">
      {dragPreview.startTime}
    </div>
    <div className="text-2xl text-white/70">~</div>
    <div className="text-4xl font-bold text-white/90">
      {dragPreview.endTime}
    </div>
  </div>
)}
```

### 2. 10분 단위 스냅

드래그 후 시간이 **10분 단위로 자동 반올림**:

```tsx
const pixelToTime = (pixel: number): string => {
  const totalMinutes = (pixel / 100) * 60
  let hours = Math.floor(totalMinutes / 60)
  let minutes = Math.round(totalMinutes % 60)
  
  // 10분 단위로 반올림
  minutes = Math.round(minutes / 10) * 10
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}
```

### 3. 시각적 피드백

```tsx
whileDrag={{ 
  scale: 1.05, 
  zIndex: 100,
  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
  cursor: "grabbing"
}}
```

---

## 📈 오늘의 성과

### 백엔드
- ✅ **JPA 엔티티 설계** (Goal, Milestone, Conversation, Message)
- ✅ **Repository 계층 완성** (Spring Data JPA 활용)
- ✅ **대화형 목표 설정 API** (`/api/v1/conversations/chat`, `/create-goal`)
- ✅ **Swagger/OpenAPI 문서화** (http://localhost:8080/swagger-ui.html)

### 프론트엔드
- ✅ **수직 타임라인 드래그 앤 드롭** (버그 수정 완료!)
- ✅ **AI Shadow Planner** (빈 시간에 AI 추천 표시)
- ✅ **Focus Spotlight** (현재 일정 거대 카드)
- ✅ **Top Timeline** (주간 히트맵)
- ✅ **대화형 UI 컴포넌트** (ConversationProgress, QuickReplyButtons)
- ✅ **로딩 인디케이터** (단계별 진행 상황 표시)

### 학습
- ✅ Framer Motion의 내부 작동 원리
- ✅ React key의 강력한 활용법
- ✅ CSS transform vs position의 충돌 이슈
- ✅ 체계적인 디버깅 프로세스

---

## 🚀 내일 할 일

### 백엔드
- [ ] **JPA 영속성 컨텍스트 이해** (N+1 문제 방지)
- [ ] **트랜잭션 관리** (@Transactional 적용)
- [ ] **예외 처리 전략** (ControllerAdvice)

### 프론트엔드
- [ ] **드래그 앤 드롭 성능 최적화** (메모이제이션)
- [ ] **반응형 디자인** (모바일 대응)
- [ ] **테스트 코드 작성** (Vitest + React Testing Library)

### 통합
- [ ] **대화형 목표 생성 플로우 완성**
- [ ] **AI 추천 일정 백엔드 연동**
- [ ] **실시간 동기화** (WebSocket 고려)

---

## 💬 마치며

오늘 하루는 **한 줄의 버그와 3시간 싸운 날**이었습니다. 처음엔 좌절했지만, 체계적으로 접근하니 **근본 원인을 찾고 더 나은 해결책**을 발견할 수 있었습니다.

특히 **React의 key 메커니즘을 활용한 강제 재렌더링**이라는 아이디어는, 단순히 버그를 고친 것을 넘어 **React의 철학을 이해하는 계기**가 되었습니다.

> "상태가 바뀌면 UI도 바뀐다. 그리고 key가 바뀌면 컴포넌트가 새로 태어난다."

면접에서 이 경험을 이야기한다면, 단순히 "버그를 고쳤다"가 아니라:

1. **문제를 정확히 인식**하고
2. **가설을 수립**하여
3. **체계적으로 검증**하며
4. **여러 해결책을 시도**하고
5. **최적의 방법을 선택**한

**완벽한 엔지니어링 프로세스**를 보여줄 수 있을 것 같습니다. 💪

---

## 📚 참고 자료

- [Framer Motion - Drag Documentation](https://www.framer.com/motion/gestures/#drag)
- [React - Keys and Reconciliation](https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key)
- [CSS Transform vs Position Performance](https://www.paulirish.com/2012/why-moving-elements-with-translate-is-better-than-posabs-topleft/)
- [Spring Data JPA Best Practices](https://spring.io/guides/gs/accessing-data-jpa/)

---

**읽어주셔서 감사합니다! 내일은 더 나은 코드로 찾아뵙겠습니다. 🚀**

#React #FramerMotion #Debugging #TroubleShooting #SpringBoot #JPA #개발일지 #짜조
