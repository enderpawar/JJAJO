import { motion } from 'framer-motion'
import { useCalendarStore } from '@/stores/calendarStore'
import { format, addDays, isSameDay, startOfDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useRef, useEffect } from 'react'

/**
 * 🎨 TopTimeline: 선택한 날짜가 중앙에 오는 좌우 스크롤 날짜 바
 * - 선택일 ± N일을 렌더하고, 클릭한 날짜를 중앙으로 스크롤
 */
const DAYS_RANGE = 30 // 선택일 기준 앞뒤 30일 (총 61일)

interface TopTimelineProps {
  isExpanded: boolean
  onCollapse: () => void
}

export function TopTimeline({ isExpanded }: TopTimelineProps) {
  const { todos, selectedDate } = useCalendarStore()
  const selectedCardRef = useRef<HTMLButtonElement>(null)

  const centerDate = selectedDate ? startOfDay(selectedDate) : startOfDay(new Date())
  const weekDays = Array.from({ length: DAYS_RANGE * 2 + 1 }, (_, i) =>
    addDays(centerDate, i - DAYS_RANGE)
  )

  useEffect(() => {
    if (!isExpanded) return
    selectedCardRef.current?.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' })
  }, [selectedDate, isExpanded])

  const isToday = (date: Date): boolean => isSameDay(date, new Date())
  const isSelected = (date: Date): boolean => selectedDate ? isSameDay(date, selectedDate) : false
  const handleDayClick = (date: Date) => useCalendarStore.getState().setSelectedDate(date)

  return (
    <motion.section
      className="min-h-[96px] overflow-visible box-border flex flex-col justify-center theme-transition bg-theme py-2.5 sm:py-3 border-b border-theme"
      initial={false}
      animate={{ opacity: isExpanded ? 1 : 0 }}
      transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
    >
      <div
        className="flex gap-3 sm:gap-4 overflow-x-auto overflow-y-hidden px-4 sm:px-5 scrollbar-none scroll-smooth"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          scrollPaddingInline: '12px',
        }}
      >
        {weekDays.map((date) => {
          const today = isToday(date)
          const selected = isSelected(date)
          const dateStr = format(date, 'yyyy-MM-dd')
          const dayTodos = todos.filter(t => t.date === dateStr)
          const todoCount = dayTodos.length
          const completedCount = dayTodos.filter(t => t.status === 'completed').length
          const dayLabel = format(date, 'EEE', { locale: ko })
          const titleText = todoCount > 0
            ? `${dayLabel} ${date.getDate()}일 · ${todoCount}개 일정${completedCount > 0 ? ` (${completedCount}개 완료)` : ''}`
            : `${dayLabel} ${date.getDate()}일`

          return (
            <button
              key={dateStr}
              ref={selected ? selectedCardRef : undefined}
              type="button"
              onClick={() => handleDayClick(date)}
              title={titleText}
              className={`
                top-timeline-card touch-target flex flex-shrink-0 flex-col items-center justify-center gap-1 rounded-neu
                w-16 min-w-16 h-16 min-h-16 box-border
                transition-all duration-200 cursor-pointer relative bg-theme border border-transparent outline-none focus:outline-none theme-transition
                ${selected ? 'neu-date-selected' : 'shadow-neu-float-date hover:shadow-neu-inset-hover active:scale-[0.98]'}
              `}
            >
              <span className="text-[11px] md:text-xs font-medium shrink-0 text-theme">
                {dayLabel}
              </span>
              <span className={`font-bold shrink-0 leading-tight text-theme ${today ? 'text-lg md:text-2xl' : 'text-sm md:text-base'}`}>
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
              {today && (
                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 md:w-2 md:h-2 bg-primary-500 rounded-full animate-pulse" />
              )}
            </button>
          )
        })}
      </div>
    </motion.section>
  )
}
