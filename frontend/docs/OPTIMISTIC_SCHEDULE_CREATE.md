# 낙관적 업데이트: 더블클릭 일정 생성

## 목표
더블클릭으로 새 일정을 만들 때, 서버 응답을 기다리지 않고 **즉시** 타임라인에 블록을 표시한 뒤, 백그라운드에서 API를 호출한다.

## 현재 흐름 (비낙관적)
1. 더블클릭 → `createSchedule()` 호출
2. **응답 대기** (네트워크 + DB)
3. 응답 수신 후 `addTodo(created)` → 그때서야 UI 갱신

## 낙관적 흐름
1. 더블클릭 → 블록 시간 계산 (기존과 동일)
2. **즉시** 임시 Todo를 만들어 스토어에 추가 (`addTodo(optimisticTodo)`)
3. UI가 바로 갱신되어 새 블록이 보임
4. **백그라운드**에서 `createSchedule()` 호출
5. **성공 시**: 임시 항목 제거 후 서버에서 받은 실제 Todo 추가  
   `deleteTodo(tempId)` → `addTodo(created)`
6. **실패 시**: 임시 항목 제거 후 에러 표시  
   `deleteTodo(tempId)` → `alert(...)`

## 설계 포인트

### 1. 임시 ID
- 서버 ID는 응답 후에만 알 수 있으므로, 낙관적 항목에는 **클라이언트 전용 임시 ID** 사용.
- 형식: `opt-${Date.now()}-${random}`  
  예: `opt-1738234567890-a3f2k9`
- 요청별로 고유해야 하므로, 각 더블클릭마다 새 ID 생성.

### 2. 낙관적 Todo 형태
- `Todo` 타입과 동일한 필드 사용 (타임라인 렌더링에 필요한 것만 채움).
- `id`: 위 임시 ID
- `title`, `date`, `startTime`, `endTime`, `status`, `priority`, `createdBy`: 더블클릭 시 계산한 값
- `createdAt`, `updatedAt`: 클라이언트 현재 시각 (ISO 문자열)

### 3. 스토어 사용
- **추가 메서드 불필요.** 기존 `addTodo`, `deleteTodo`만 사용.
- 성공 시: `deleteTodo(tempId)` 후 `addTodo(created)`로 **교체**.
- 컴포넌트에서 `tempId`를 클로저로 들고 있다가, 해당 요청의 Promise가 resolve될 때 위 순서로 호출.

### 4. 동시 생성
- 사용자가 짧은 시간에 여러 번 더블클릭해도, 각각 별도 임시 ID로 `addTodo` → 각각 별도 `createSchedule()` 호출.
- 요청 A 성공 → A의 `tempId`만 제거 후 실제 Todo 추가.
- 요청 B 성공 → B의 `tempId`만 제거 후 실제 Todo 추가.
- 실패한 요청만 해당 `tempId` 제거 + 에러 표시.

### 5. UI 구분 (선택)
- 임시 항목을 시각적으로 구분하려면:
  - `id.startsWith('opt-')`로 낙관적 항목 여부 판단.
  - 예: 약간 투명도 적용, 또는 "저장 중…" 라벨.
- 구분 없이 그냥 일반 블록처럼 보여도 됨 (최소 구현).

### 6. 에러 시 UX
- 실패 시: 해당 블록을 스토어에서 제거해 타임라인에서 사라지게 하고, `alert`(또는 토스트)로 실패 안내.
- (선택) 재시도 버튼 등은 2단계에서 고려.

## 구현 위치
- **VerticalTimeline.tsx**의 `handleDoubleClickEmpty` 내부에서:
  1. `optimisticTodo` 생성 (temp id 포함)
  2. `addTodo(optimisticTodo)` 호출
  3. `createSchedule(...)` 호출
  4. `.then(created) => { deleteTodo(tempId); addTodo(created); })`
  5. `.catch(err) => { deleteTodo(tempId); alert(...); })`

스토어/타입 변경 없이, 한 핸들러 안에서 위 순서만 적용하면 된다.
