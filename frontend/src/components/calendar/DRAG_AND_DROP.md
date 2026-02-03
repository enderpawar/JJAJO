# 타임라인 드래그 앤 드롭 — 구현 명세 (AI 수정 시 준수 사항)

이 문서는 **VerticalTimeline**에서 일정 카드를 드래그하여 시간을 변경하는 기능의 동작 방식을 정의합니다.  
AI가 해당 컴포넌트를 수정할 때 이 명세를 반드시 유지해야 하며, **공식·호출 순서·의존성을 임의로 바꾸면 드래그 앤 드롭이 깨질 수 있습니다.**

---

## 1. 구현 위치

- **파일**: `frontend/src/components/calendar/VerticalTimeline.tsx`
- **역할**: 24시간 수직 타임라인에서 일정 블록을 **Y축(세로)으로만** 드래그하여 시작/종료 시간을 변경하고, 로컬 상태 + 백엔드 API에 반영

---

## 2. 좌표계 (시간 ↔ 픽셀)

타임라인은 **당일 00:00 = 0px**, **24:00 = 2400px** 인 하나의 좌표계를 사용합니다.

### 2.1 상수 (변경 금지)

- `HOUR_HEIGHT = 100` → 1시간당 100px
- `TIMELINE_HEIGHT = 2400` → 24 × 100 (당일 전체 높이)

### 2.2 timeToPixels(timeStr: string): number

- **의미**: `"HH:mm"` 문자열을 타임라인 상의 **top 픽셀**로 변환
- **공식**: `(h * 60 + m) / 60 * 100` = `h * 100 + (m / 60) * 100`
  - 예: `"00:00"` → 0, `"01:30"` → 150, `"20:00"` → 2000
- **용도**: 카드의 `style.top`, `height` 계산 및 드래그 시 범위 클램핑

### 2.3 pixelToTime(pixel: number): string

- **의미**: 픽셀 위치를 **10분 단위로 스냅**한 `"HH:mm"` 문자열로 변환
- **공식** (요약):
  1. `totalMinutes = (pixel / 100) * 60`
  2. `hours = floor(totalMinutes / 60)`, `minutes = round(totalMinutes % 60)`
  3. **10분 단위 스냅**: `minutes = round(minutes / 10) * 10` (0, 10, 20, …, 50)
  4. `minutes === 60`이면 `hours += 1`, `minutes = 0`
  5. `hours >= 24`이면 `hours = 23`, `minutes = 50` (23:50 상한)
- **용도**: 드래그 프리뷰·드롭 시 최종 `startTime` / `endTime` 계산

**주의**: `timeToPixels`와 `pixelToTime`은 **같은 HOUR_HEIGHT(100)** 기준으로 쌍을 이룹니다. 한쪽만 바꾸면 드래그 후 시간이 어긋납니다.

---

## 3. 드래그 앤 드롭 플로우

### 3.1 사용 라이브러리

- **Framer Motion** (`motion.div`)  
  - `drag="y"`: Y축만 드래그 (X 드래그 비활성화 유지)
  - `dragElastic={0}`, `dragMomentum={false}`: 스냅/관성 없이 손가락 위치 그대로 사용

### 3.2 상태 및 ref

- `dragPreview: { taskId, startTime, endTime } | null`  
  - 드래그 중 카드 위에 표시할 **예정 시간** (10분 단위 문자열)
- `isDraggingRef.current: boolean`  
  - 드래그 중인지 여부. **편집 버튼 클릭**에서 “클릭인지 드래그인지” 구분용으로 사용 (드래그 종료 시 클릭으로 처리되지 않도록)

### 3.3 onDragStart

- `isDraggingRef.current = true`  
  - 이후 드롭까지 유지; `onDragEnd`에서 한 번만 `false`로 되돌림

### 3.4 onDrag(_, info)

- **목적**: 드래그 중 실시간 프리뷰
- **계산**:
  - `newStartPixel = startPixel + info.offset.y`  
    - `startPixel = timeToPixels(task.startTime)`, 블록 높이 = `endPixel - startPixel`
  - 클램핑: `newStartPixel = max(0, min(timelineHeight - (endPixel - startPixel), newStartPixel))`
- **표시**: `setDragPreview({ taskId, startTime: pixelToTime(newStartPixel), endTime: pixelToTime(newStartPixel + (endPixel - startPixel)) })`  
  - **동일한 픽셀 공식**으로 10분 단위 시간 표시

### 3.5 onDragEnd(_, info)

- `setDragPreview(null)` 로 프리뷰 제거
- **위치 계산** (onDrag와 동일 공식):
  - `newStartPixel = max(0, min(timelineHeight - (endPixel - startPixel), startPixel + info.offset.y))`
  - `newEndPixel = newStartPixel + (endPixel - startPixel)`
- **유효성**:
  - `newStartPixel < 0` 또는 `newEndPixel > timelineHeight` 이면 **아무 것도 하지 않고** `isDraggingRef.current = false` 후 return
- **반영 순서 (바꾸지 말 것)**:
  1. `newStart = pixelToTime(newStartPixel)`, `newEnd = pixelToTime(newEndPixel)`
  2. **먼저** 로컬 상태: `updateTodo(task.id, { startTime: newStart, endTime: newEnd })`
  3. **이어서** API: `updateSchedule(task.id, { startTime: newStart, endTime: newEnd }).catch(() => {})`  
     - 실패 시 사용자 알림은 선택 사항이지만, **updateTodo는 이미 호출된 상태**로 두는 것이 현재 동작(낙관적 업데이트)과 같음
- 마지막에 `setTimeout(() => { isDraggingRef.current = false }, 100)` 로 플래그 해제

---

## 4. 데이터 의존성

- **calendarStore**: `updateTodo(id, { startTime, endTime })`  
  - `VerticalTimeline`은 `useCalendarStore()`에서 `updateTodo`를 사용. 시그니처를 바꾸지 말 것.
- **scheduleService**: `updateSchedule(id, { startTime, endTime })`  
  - 백엔드에 동일 시간으로 반영. `id`는 기존 일정 id (임시 id `opt-*`가 아닌 경우만 API 호출 의미 있음).
- **일정 블록**은 `startTime`/`endTime`이 있는 것만 타임라인에 표시되며, 드래그 가능한 카드는 이 데이터로만 그려집니다.

---

## 5. 수정 시 금지·주의 사항

1. **timeToPixels / pixelToTime 공식**  
   - 상수 `HOUR_HEIGHT = 100`, `TIMELINE_HEIGHT = 2400`와 맞춰 두었으므로, 한쪽만 바꾸거나 단위를 바꾸지 말 것.
2. **드래그 축**  
   - `drag="y"` 유지. `drag="x"` 추가나 `drag={true}`로 자유 드래그로 바꾸면 “세로 타임라인에서 시간만 변경” 의미가 깨짐.
3. **onDragEnd 반영 순서**  
   - 반드시 `updateTodo` → `updateSchedule` 순서. 순서가 바뀌면 UI와 서버 상태가 어긋날 수 있음.
4. **클램핑 범위**  
   - `newStartPixel`은 `[0, timelineHeight - (endPixel - startPixel)]` 안에 두어야 하며, 이 범위를 넘을 때는 **드롭 시 아무 동작도 하지 않도록** 해야 함.
5. **isDraggingRef**  
   - 편집 버튼/메뉴의 클릭 핸들러에서 `if (!isDraggingRef.current)` 체크로 “드래그로 인한 클릭”을 무시하고 있음. 이 ref를 제거하거나 드래그 중에 true로 두는 로직을 바꾸지 말 것.
6. **key**  
   - `motion.div`의 `key`는 `task.id` + `startTime` + `endTime` 조합 등으로, 드래그 후 시간이 바뀌면 리마운트되어 애니메이션/포커스가 초기화될 수 있음. 필요 시 시간 변경 후에도 일관된 key 정책 유지.

---

## 6. 요약 체크리스트 (AI 수정 후 검증용)

- [ ] `timeToPixels` / `pixelToTime` 공식 및 10분 스냅이 그대로인가?
- [ ] `drag="y"`, `dragElastic={0}`, `dragMomentum={false}` 가 유지되는가?
- [ ] `onDragEnd`에서 `updateTodo` → `updateSchedule` 순서가 유지되는가?
- [ ] `newStartPixel` / `newEndPixel` 클램핑과 “범위 밖이면 무시” 로직이 있는가?
- [ ] `isDraggingRef`가 `onDragStart`에서 true, `onDragEnd`에서 false로 설정되는가?
- [ ] `dragPreview`가 드래그 중에만 설정되고 `onDragEnd`에서 null로 초기화되는가?

위 항목이 유지되면 “드래그 앤 드롭으로 타임라인에 일정을 배치/이동” 기능은 기존과 동일하게 동작합니다.
