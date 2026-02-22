import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react'
import { hapticLight } from '@/utils/haptic'

const SWIPE_THRESHOLD_PX = 60
const DRAG_RESISTANCE = 0.4

type ViewMode = 'month' | 'week'

interface MobileCalendarTodoSwitcherProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  calendarPanel: ReactNode
  todoPanel: ReactNode
}

/**
 * 모바일 전용: 캘린더(월간) ↔ 할일(주간) 좌우 스와이프로 페이지 전환
 * - 왼쪽: 캘린더(month), 오른쪽: 할일(week)
 * - 스와이프 왼쪽 → 할일, 스와이프 오른쪽 → 캘린더
 */
export default function MobileCalendarTodoSwitcher({
  viewMode,
  onViewModeChange,
  calendarPanel,
  todoPanel,
}: MobileCalendarTodoSwitcherProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dragOffset, setDragOffset] = useState(0)
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const isSwipeGestureRef = useRef<boolean | null>(null)
  const pageIndexRef = useRef(0)

  const pageIndex = viewMode === 'month' ? 0 : 1
  pageIndexRef.current = pageIndex
  const baseTranslatePercent = pageIndex * -50

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX
    startYRef.current = e.touches[0].clientY
    isSwipeGestureRef.current = null
    setDragOffset(0)
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const currentX = e.touches[0].clientX
    const currentY = e.touches[0].clientY
    const deltaX = currentX - startXRef.current
    const deltaY = currentY - startYRef.current

    if (isSwipeGestureRef.current === null) {
      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)
      isSwipeGestureRef.current = absX > absY && absX > 8
    }
    if (!isSwipeGestureRef.current) return
    e.preventDefault()

    const container = containerRef.current
    const width = container?.offsetWidth ?? window.innerWidth
    const maxDrag = width * DRAG_RESISTANCE
    const pageIdx = pageIndexRef.current
    let offset = deltaX
    if (pageIdx === 0) {
      offset = Math.max(-maxDrag, Math.min(0, deltaX))
    } else {
      offset = Math.max(0, Math.min(maxDrag, deltaX))
    }
    setDragOffset(offset)
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    return () => el.removeEventListener('touchmove', handleTouchMove)
  }, [handleTouchMove])

  const handleTouchEnd = useCallback(() => {
    if (!isSwipeGestureRef.current) {
      setDragOffset(0)
      return
    }
    const threshold = SWIPE_THRESHOLD_PX
    if (dragOffset < -threshold && pageIndex === 0) {
      onViewModeChange('week')
      hapticLight()
    } else if (dragOffset > threshold && pageIndex === 1) {
      onViewModeChange('month')
      hapticLight()
    }
    setDragOffset(0)
  }, [dragOffset, pageIndex, onViewModeChange])

  const handleTouchCancel = useCallback(() => {
    setDragOffset(0)
    isSwipeGestureRef.current = null
  }, [])

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 overflow-hidden touch-pan-y"
      style={{ touchAction: 'pan-y' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      <div
        className="flex h-full will-change-transform"
        style={{
          width: '200%',
          transform: `translate3d(calc(${baseTranslatePercent}% + ${dragOffset}px), 0, 0)`,
          transition: dragOffset !== 0 ? 'none' : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
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
