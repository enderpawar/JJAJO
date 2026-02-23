import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ListTodo, Plus, Settings, Target, Copy, CalendarDays, RotateCcw, Trash2, X } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
import { cn } from '@/utils/cn'
import { hapticLight } from '@/utils/haptic'

interface BottomNavProps {
  isFocusOpen?: boolean
  onOpenFocus?: () => void
  onCloseFocus?: () => void
  onSwitchToWeekView?: () => void
  onAddSchedule?: () => void
  onOpenSettings?: () => void
  /** 롱프레스 원형 메뉴용 */
  onOpenImportTimetable?: () => void
  onCopyPreviousDay?: () => void
  onResetDayConfirm?: () => void
  /** 롱프레스: 헤더 currentMonth 기준 해당 월 일정만 비우기 */
  onClearMonthConfirm?: () => void
}

const TAB_HEIGHT = 56

export const BOTTOM_NAV_HEIGHT = TAB_HEIGHT

export default function BottomNav({
  isFocusOpen = false,
  onOpenFocus,
  onCloseFocus,
  onSwitchToWeekView,
  onAddSchedule,
  onOpenSettings,
  onOpenImportTimetable,
  onCopyPreviousDay,
  onResetDayConfirm,
  onClearMonthConfirm,
}: BottomNavProps) {
  const { viewMode, setViewMode } = useCalendarStore()

  const fabRef = useRef<HTMLButtonElement | null>(null)
  const [radialOpen, setRadialOpen] = useState(false)
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [fabCenter, setFabCenter] = useState<{ x: number; y: number } | null>(null)
  const holdTimeoutRef = useRef<number | null>(null)
  const isTouchingRef = useRef(false)
  const startTouchRef = useRef<{ x: number; y: number } | null>(null)
  const touchStartTimeRef = useRef<number | null>(null)
  const hasDraggedOutRef = useRef(false)

  useEffect(() => {
    return () => {
      if (holdTimeoutRef.current != null) {
        clearTimeout(holdTimeoutRef.current)
      }
    }
  }, [])

  // radial 열린 동안 touchmove는 passive: false로 document에 등록해 스크롤 막고 드래그 선택만 처리
  useEffect(() => {
    if (!radialOpen || !fabCenter) return
    const handleDocTouchMove = (e: TouchEvent) => {
      if (!isTouchingRef.current) return
      const touch = e.touches[0]
      if (!touch) return
      if (e.cancelable) {
        e.preventDefault()
      }
      const dx = touch.clientX - fabCenter.x
      const dy = fabCenter.y - touch.clientY
      const distance = Math.hypot(dx, dy)
      if (distance > 40) {
        hasDraggedOutRef.current = true
      }
      const id = getNearestActionIdForHighlight(touch.clientX, touch.clientY)
      setActiveAction(id)
    }
    document.addEventListener('touchmove', handleDocTouchMove, { passive: false })
    return () => document.removeEventListener('touchmove', handleDocTouchMove)
  }, [radialOpen, fabCenter])

  const handleCalendar = () => {
    onCloseFocus?.()
    setViewMode('month')
  }

  const handleTodo = () => {
    onCloseFocus?.()
    onSwitchToWeekView?.()
    setViewMode('week')
  }

  const handleFocus = () => {
    onOpenFocus?.()
  }

  const handleSettings = () => {
    onCloseFocus?.()
    onOpenSettings?.()
  }

  /** 롱프레스 시 + 버튼 기준 5방향: UX 친화적인 30° 간격 (30°, 60°, 90°, 120°, 150°) */
  const radialActions: {
    id: string
    label: string
    shortLabel: string
    icon: typeof Plus
    angleDeg: number
    handler: () => void
  }[] = [
    { id: 'copyPrev', label: '어제 일정 가져오기', shortLabel: '어제 가져오기', icon: Copy, angleDeg: 30, handler: () => onCopyPreviousDay?.() },
    { id: 'importTimetable', label: '시간표 불러오기', shortLabel: '시간표 불러오기', icon: CalendarDays, angleDeg: 60, handler: () => onOpenImportTimetable?.() },
    { id: 'add', label: '새 일정 추가', shortLabel: '새 일정', icon: Plus, angleDeg: 90, handler: () => onAddSchedule?.() },
    { id: 'resetDay', label: '이 날 일정 비우기', shortLabel: '이 날 비우기', icon: RotateCcw, angleDeg: 120, handler: () => onResetDayConfirm?.() },
    { id: 'clearMonth', label: '월간 일정 비우기', shortLabel: '월간 비우기', icon: Trash2, angleDeg: 150, handler: () => onClearMonthConfirm?.() },
  ]

  const openRadial = () => {
    if (!fabRef.current) return
    const rect = fabRef.current.getBoundingClientRect()
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    setFabCenter(center)
    setRadialOpen(true)
    setActiveAction(null)
    hapticLight()
  }

  const closeRadial = () => {
    setRadialOpen(false)
    setActiveAction(null)
  }

  const cancelHoldTimeout = () => {
    if (holdTimeoutRef.current != null) {
      clearTimeout(holdTimeoutRef.current)
      holdTimeoutRef.current = null
    }
  }

  const RADIUS = 138
  const MENU_CENTER_OFFSET_Y = 14
  const X_BUTTON_HIT_PX = 26
  const SUB_BUTTON_HIT_PX = 38

  const getNearestActionId = (pointX: number, pointY: number): string | null => {
    if (!fabCenter) return null
    const menuCenterY = fabCenter.y - MENU_CENTER_OFFSET_Y
    const dx = pointX - fabCenter.x
    const dy = menuCenterY - pointY
    const distFromCenter = Math.hypot(dx, dy)
    if (distFromCenter < X_BUTTON_HIT_PX) {
      return null
    }
    for (const action of radialActions) {
      const rad = (action.angleDeg * Math.PI) / 180
      const bx = Math.cos(rad) * RADIUS
      const by = Math.sin(rad) * RADIUS
      const distToButton = Math.hypot(dx - bx, dy - by)
      if (distToButton < SUB_BUTTON_HIT_PX) {
        return action.id
      }
    }
    return null
  }

  /** 드래그 중 강조용: 히트 반경 무시하고 가장 가까운 버튼 반환 (실행은 getNearestActionId로만) */
  const getNearestActionIdForHighlight = (pointX: number, pointY: number): string | null => {
    if (!fabCenter) return null
    const menuCenterY = fabCenter.y - MENU_CENTER_OFFSET_Y
    const dx = pointX - fabCenter.x
    const dy = menuCenterY - pointY
    const distFromCenter = Math.hypot(dx, dy)
    if (distFromCenter < X_BUTTON_HIT_PX) return null
    let nearestId: string | null = null
    let minDist = Infinity
    for (const action of radialActions) {
      const rad = (action.angleDeg * Math.PI) / 180
      const bx = Math.cos(rad) * RADIUS
      const by = Math.sin(rad) * RADIUS
      const d = Math.hypot(dx - bx, dy - by)
      if (d < minDist) {
        minDist = d
        nearestId = action.id
      }
    }
    return nearestId
  }

  const triggerRadialAction = (id: string | null) => {
    if (!id) return
    const action = radialActions.find((a) => a.id === id)
    if (!action) return
    action.handler()
    hapticLight()
  }

  const handleFabTouchStart: React.TouchEventHandler<HTMLButtonElement> = (e) => {
    isTouchingRef.current = true
    const touch = e.touches[0]
    startTouchRef.current = { x: touch.clientX, y: touch.clientY }
    touchStartTimeRef.current = Date.now()
    hasDraggedOutRef.current = false
    cancelHoldTimeout()
    holdTimeoutRef.current = window.setTimeout(() => {
      openRadial()
    }, 420)
  }

  const handleFabTouchMove: React.TouchEventHandler<HTMLButtonElement> = (e) => {
    if (!isTouchingRef.current) return
    const touch = e.touches[0]
    // radial 열리기 전: 손가락이 많이 움직이면 롱프레스 취소 (preventDefault 불필요)
    if (!radialOpen && startTouchRef.current) {
      const dx = touch.clientX - startTouchRef.current.x
      const dy = touch.clientY - startTouchRef.current.y
      const moveDist = Math.hypot(dx, dy)
      if (moveDist > 12) cancelHoldTimeout()
      return
    }
    // radial 열린 후: document의 passive: false 리스너에서 preventDefault + activeAction 갱신 처리
  }

  const handleFabTouchEnd: React.TouchEventHandler<HTMLButtonElement> = (e) => {
    const wasRadialOpen = radialOpen
    isTouchingRef.current = false
    cancelHoldTimeout()
    if (wasRadialOpen) {
      const touch = e.changedTouches[0]
      if (touch) {
        const id = getNearestActionId(touch.clientX, touch.clientY)
        if (id != null && hasDraggedOutRef.current) {
          triggerRadialAction(id)
        }
      }
      closeRadial()
    } else {
      const startedAt = touchStartTimeRef.current
      const duration = startedAt != null ? Date.now() - startedAt : 0
      // 아주 짧은 탭(예: 200ms 미만)만 새 일정 추가로 처리하고,
      // 롱프레스 시도였다가 뗀 경우에는 아무 동작도 하지 않도록 한다.
      if (duration > 0 && duration < 200) {
        onAddSchedule?.()
      }
    }
    startTouchRef.current = null
    touchStartTimeRef.current = null
  }

  const handleFabTouchCancel: React.TouchEventHandler<HTMLButtonElement> = () => {
    isTouchingRef.current = false
    cancelHoldTimeout()
    closeRadial()
    startTouchRef.current = null
  }

  const tabs = [
    {
      id: 'calendar' as const,
      label: '캘린더',
      icon: Calendar,
      active: viewMode === 'month' && !isFocusOpen,
      onClick: handleCalendar,
    },
    {
      id: 'todo' as const,
      label: '할일',
      icon: ListTodo,
      active: viewMode === 'week' && !isFocusOpen,
      onClick: handleTodo,
    },
    {
      id: 'focus' as const,
      label: '포커스',
      icon: Target,
      active: isFocusOpen,
      onClick: handleFocus,
    },
    {
      id: 'settings' as const,
      label: '설정',
      icon: Settings,
      active: false,
      onClick: handleSettings,
    },
  ]

  return (
    <nav
      className="fixed left-0 right-0 z-40 flex items-stretch theme-transition border-t border-[var(--border-color)] bg-[var(--card-bg)] select-none"
      style={{
        bottom: 20,
        paddingBottom: 'env(safe-area-inset-bottom)',
        minHeight: TAB_HEIGHT,
      }}
      role="tablist"
      aria-label="하단 메뉴"
    >
      {tabs.slice(0, 2).map(({ id, label, icon: Icon, active, onClick }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={active}
          aria-label={label}
          onClick={onClick}
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-[2px] py-2 min-h-[44px] transition-colors duration-200 btn-ghost-tap',
            active
              ? 'text-[var(--primary-point)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          )}
        >
          <Icon
            className={cn('w-6 h-6 shrink-0', active && 'drop-shadow-sm')}
            strokeWidth={active ? 2.5 : 2}
          />
          <span className="text-[11px] font-medium tabular-nums">{label}</span>
        </button>
      ))}
      {/* 중앙 FAB: 일정 추가 + 롱프레스 원형 메뉴 */}
      <div className="flex flex-1 items-center justify-center pb-1">
        <button
          type="button"
          ref={fabRef}
          onClick={(e) => {
            if (radialOpen) {
              e.preventDefault()
              e.stopPropagation()
              return
            }
            onAddSchedule?.()
          }}
          onTouchStart={handleFabTouchStart}
          onTouchMove={handleFabTouchMove}
          onTouchEnd={handleFabTouchEnd}
          onTouchCancel={handleFabTouchCancel}
          className={cn(
            'relative flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all duration-300 ease-out touch-manipulation btn-ghost-tap',
            radialOpen
              ? 'bg-white text-[var(--primary-point)]'
              : 'bg-[var(--primary-point)] text-white hover:opacity-95 active:scale-95'
          )}
          aria-label={radialOpen ? '메뉴 닫기' : '일정 추가'}
        >
          <span className="relative flex items-center justify-center w-7 h-7">
            <Plus
              className={cn(
                'absolute w-7 h-7 transition-all duration-300 ease-out',
                radialOpen ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
              )}
              strokeWidth={2.5}
            />
            <X
              className={cn(
                'absolute w-7 h-7 transition-all duration-300 ease-out',
                radialOpen ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-0 opacity-0'
              )}
              strokeWidth={2.5}
            />
          </span>
        </button>
      </div>
      {radialOpen && fabCenter && typeof document !== 'undefined' && document.body &&
        createPortal(
          <div className="fixed inset-0 z-50 pointer-events-none select-none">
            <div
              className="absolute"
              style={{
                left: fabCenter.x,
                top: fabCenter.y - 28,
              }}
            >
              <div className="relative">
                {radialActions.map((action) => {
                  const rad = (action.angleDeg * Math.PI) / 180
                  const x = Math.cos(rad) * RADIUS
                  const y = -Math.sin(rad) * RADIUS
                  const isActive = activeAction === action.id
                  const Icon = action.icon
                  return (
                    <div
                      key={action.id}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center"
                      aria-hidden
                    >
                      <div
                        className={cn(
                          'flex flex-col items-center justify-center animate-radial-spring-pop',
                          isActive && 'scale-[1.05]'
                        )}
                        style={{
                          '--radial-x': `${x}px`,
                          '--radial-y': `${y}px`,
                          animationDelay: '0ms',
                        } as CSSProperties}
                      >
                        <div
                          className={cn(
                            'flex items-center justify-center w-11 h-11 shrink-0 rounded-full border shadow-md bg-[var(--card-bg)] text-[var(--text-main)] border-[var(--border-color)]',
                            isActive &&
                              'bg-[var(--primary-point)] text-white border-[var(--primary-point)] shadow-[0_6px_16px_rgba(0,0,0,0.25)]'
                          )}
                          title={action.label}
                        >
                          <Icon className="w-5 h-5 shrink-0" strokeWidth={isActive ? 2.5 : 2} aria-hidden />
                        </div>
                        <span
                          className="text-[10px] font-medium leading-tight text-center whitespace-nowrap text-[var(--text-main)] mt-1.5"
                          style={{
                            transform: 'translate(calc(var(--radial-x) * 0.08), calc(var(--radial-y) * 0.08))',
                          }}
                        >
                          {action.shortLabel}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>,
          document.body
        )
      }

      {tabs.slice(2).map(({ id, label, icon: Icon, active, onClick }) => (
        <button
          key={id}
          type="button"
          role={id === 'settings' ? 'button' : 'tab'}
          aria-selected={id === 'settings' ? undefined : active}
          aria-label={label}
          onClick={onClick}
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-[2px] py-2 min-h-[44px] transition-colors duration-200 btn-ghost-tap',
            active
              ? 'text-[var(--primary-point)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          )}
        >
          <Icon
            className={cn('w-6 h-6 shrink-0', active && 'drop-shadow-sm')}
            strokeWidth={active ? 2.5 : 2}
          />
          <span className="text-[11px] font-medium tabular-nums">{label}</span>
        </button>
      ))}
    </nav>
  )
}
