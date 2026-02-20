import { motion } from 'framer-motion'
import { useCalendarStore } from '@/stores/calendarStore'
import { format, addDays, isSameDay } from 'date-fns'
import { ko } from 'date-fns/locale'

/**
 * 🎨 TopTimeline: 오늘 중심 날짜 바 (접기/펼치기는 헤더 중앙 화살표 토글, 부모에서 높이 애니메이션)
 * - 모바일: 5일 표시 (오늘 ±2일), 데스크톱: 7일 표시 (오늘 ±3일)
 */
interface TopTimelineProps {
  isExpanded: boolean
  onCollapse: () => void
}

export function TopTimeline({ isExpanded }: TopTimelineProps) {
  const { todos, selectedDate } = useCalendarStore()

  const todayRef = new Date()
  const weekDays = [-3, -2, -1, 0, 1, 2, 3].map((d) => addDays(todayRef, d))
  
  const isToday = (date: Date): boolean => isSameDay(date, new Date())
  const isSelected = (date: Date): boolean => selectedDate ? isSameDay(date, selectedDate) : false
  const handleDayClick = (date: Date) => useCalendarStore.getState().setSelectedDate(date)

  return (
    <motion.section
      className="min-h-[140px] overflow-visible box-border flex flex-col justify-center theme-transition bg-theme py-4 px-3 sm:px-4 border-b border-theme"
      initial={false}
      animate={{ opacity: isExpanded ? 1 : 0 }}
      transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
    >
      <div className="flex flex-col items-center w-full max-w-2xl mx-auto">
        <div className="flex gap-2 md:gap-3 w-full min-h-[88px] shrink-0 overflow-visible scrollbar-none">
          {weekDays.map((date, index) => {
            const today = isToday(date)
            const selected = isSelected(date)
            const dateStr = format(date, 'yyyy-MM-dd')
            const dayTodos = todos.filter(t => t.date === dateStr)
            const todoCount = dayTodos.length
            const completedCount = dayTodos.filter(t => t.status === 'completed').length
            const completionRate = todoCount > 0 ? Math.round((completedCount / todoCount) * 100) : 0
            const dayLabel = format(date, 'EEE', { locale: ko })
            const titleText = todoCount > 0
              ? `${dayLabel} ${date.getDate()}일 · ${todoCount}개 일정${completedCount > 0 ? ` (${completedCount}개 완료)` : ''}`
              : `${dayLabel} ${date.getDate()}일`
            const isMobileOnly = index === 0 || index === 6

            return (
              <button
                key={index}
                type="button"
                onClick={() => handleDayClick(date)}
                title={titleText}
                className={`
                  touch-target flex flex-col items-center justify-center gap-0.5 px-1 min-h-[88px] rounded-[14px]
                  transition-all duration-200 cursor-pointer relative bg-theme border-0 outline-none focus:outline-none theme-transition
                  ${isMobileOnly ? 'hidden md:flex flex-none md:flex-1 md:min-w-0 md:max-w-[96px]' : 'flex-1 min-w-0 md:flex-1 md:max-w-[96px]'}
                  ${today ? 'md:flex-[1.3]' : ''}
                  ${selected ? 'neu-date-selected' : 'shadow-neu-float-date hover:shadow-neu-inset-hover active:scale-[0.98]'}
                `}
              >
                <span className="text-[11px] md:text-xs font-medium shrink-0 text-theme">
                  {dayLabel}
                </span>
                <span className={`font-bold shrink-0 leading-tight text-theme font-display ${today ? 'text-lg md:text-2xl' : 'text-sm md:text-base'}`}>
                  {format(date, 'd')}
                </span>
                {todoCount > 0 && (
                  <span
                    className="
                      inline-flex shrink-0 items-center justify-center
                      px-2 py-0.5 rounded-full text-[10px] font-semibold
                      border
                      bg-primary-500/10 text-primary-600 border-primary-500/40
                      dark:bg-primary-500/90 dark:text-white dark:border-transparent
                      shadow-sm
                    "
                  >
                    {todoCount}개
                  </span>
                )}
                {selected && todoCount > 0 && (
                  <div className="w-full max-w-[52px] mt-1 flex flex-col items-center gap-0.5 shrink-0">
                    <div className="h-1 w-full rounded-full bg-theme-card overflow-hidden shadow-neu-inset-sm">
                      <div
                        className="h-full bg-primary-500/80 rounded-full transition-all duration-300"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                    <span className="text-[9px] leading-none text-theme-muted">{completionRate}% 완료</span>
                  </div>
                )}
                {today && (
                  <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 md:w-2 md:h-2 bg-primary-500 rounded-full animate-pulse" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </motion.section>
  )
}
