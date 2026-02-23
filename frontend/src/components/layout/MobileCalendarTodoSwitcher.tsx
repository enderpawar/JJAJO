import { type ReactNode } from 'react'

type ViewMode = 'month' | 'week'

interface MobileCalendarTodoSwitcherProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  calendarPanel: ReactNode
  todoPanel: ReactNode
}

/**
 * 모바일 전용: 캘린더(월간) ↔ 할일(주간) 전환
 * - 전환은 하단 탭/헤더 세그먼트로만 가능 (스와이프 전환 없음)
 * - 캘린더 내부에서의 좌우 스와이프는 MainPage에서 월 이동으로 사용
 */
export default function MobileCalendarTodoSwitcher({
  viewMode,
  onViewModeChange: _onViewModeChange,
  calendarPanel,
  todoPanel,
}: MobileCalendarTodoSwitcherProps) {
  const pageIndex = viewMode === 'month' ? 0 : 1
  const baseTranslatePercent = pageIndex * -50

  return (
    <div className="flex-1 min-h-0 overflow-hidden">
      <div
        className="flex h-full will-change-transform"
        style={{
          width: '200%',
          transform: `translate3d(${baseTranslatePercent}%, 0, 0)`,
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div className="w-1/2 h-full min-h-0 flex flex-col shrink-0 overflow-hidden">
          {calendarPanel}
        </div>
        <div className="w-1/2 h-full min-h-0 flex flex-col shrink-0 overflow-hidden">
          {todoPanel}
        </div>
      </div>
    </div>
  )
}
