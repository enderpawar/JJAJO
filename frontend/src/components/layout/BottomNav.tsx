import { Calendar, ListTodo, Plus, Settings, Target } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
import { cn } from '@/utils/cn'

interface BottomNavProps {
  /** 포커스 모드 열림 여부 (하단 탭 활성 표시용) */
  isFocusOpen?: boolean
  /** 포커스 탭 클릭 시 */
  onOpenFocus?: () => void
  /** 다른 탭으로 이동 시 포커스 닫기 */
  onCloseFocus?: () => void
  onSwitchToWeekView?: () => void
  /** 중앙 FAB 클릭 시 일정 추가 플로우 (모바일 입력 시트 등) */
  onAddSchedule?: () => void
  /** 설정 버튼 클릭 시 */
  onOpenSettings?: () => void
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
}: BottomNavProps) {
  const { viewMode, setViewMode } = useCalendarStore()

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
      className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch theme-transition border-t border-[var(--border-color)] bg-[var(--card-bg)]"
      style={{
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
      {/* 중앙 FAB: 일정 추가 */}
      <div className="flex flex-1 items-center justify-center pb-1">
        <button
          type="button"
          onClick={onAddSchedule}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--primary-point)] text-white shadow-lg hover:opacity-95 active:scale-95 transition-all btn-ghost-tap"
          aria-label="일정 추가"
        >
          <Plus className="w-7 h-7" strokeWidth={2.5} />
        </button>
      </div>
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
