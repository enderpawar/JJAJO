import { useCalendarStore } from '@/stores/calendarStore'
import { format, addDays, isSameDay } from 'date-fns'
import { ko } from 'date-fns/locale'

/**
 * 🎨 TopTimeline: 오늘 중심 날짜 바
 * - 모바일: 5일 표시 (오늘 ±2일), 한 화면에 모두 노출
 * - 데스크톱: 7일 표시 (오늘 ±3일)
 */
export function TopTimeline() {
  const { todos, selectedDate } = useCalendarStore()

  const todayRef = new Date()
  // 모바일 5일 + 데스크톱용 2일(앞뒤) = 7일 유지, 모바일에서는 index 0·6 숨김
  const weekDays = [-3, -2, -1, 0, 1, 2, 3].map((d) => addDays(todayRef, d))
  
  // 오늘인지 확인
  const isToday = (date: Date): boolean => {
    return isSameDay(date, new Date())
  }
  
  // 선택된 날짜인지 확인
  const isSelected = (date: Date): boolean => {
    return selectedDate ? isSameDay(date, selectedDate) : false
  }
  
  const handleDayClick = (date: Date) => {
    useCalendarStore.getState().setSelectedDate(date)
  }
  
  return (
    <section className="h-[130px] min-h-[130px] overflow-hidden box-border flex flex-col justify-center theme-transition bg-theme py-4 px-3 sm:px-4 border-b border-theme">
      <div className="flex flex-col items-center w-full max-w-2xl mx-auto">
        {/* 카드 행: 모바일 5일 한 화면, 데스크톱 7일 */}
        <div className="flex gap-2 md:gap-3 w-full h-[72px] shrink-0 overflow-hidden md:overflow-visible scrollbar-none">
          {weekDays.map((date, index) => {
            const today = isToday(date)
            const selected = isSelected(date)
            const todoCount = todos.filter(t => t.date === format(date, 'yyyy-MM-dd')).length
            const dayLabel = format(date, 'EEE', { locale: ko })
            const titleText = todoCount > 0 ? `${dayLabel} ${date.getDate()}일 · ${todoCount}개 일정` : `${dayLabel} ${date.getDate()}일`
            const isMobileOnly = index === 0 || index === 6

            return (
              <button
                key={index}
                type="button"
                onClick={() => handleDayClick(date)}
                title={titleText}
                className={`
                  touch-target flex flex-col items-center justify-center gap-1 px-1 min-h-0 h-full rounded-[14px]
                  transition-all duration-200 cursor-pointer relative bg-theme border-0 outline-none focus:outline-none theme-transition
                  ${isMobileOnly ? 'hidden md:flex flex-none md:flex-1 md:min-w-0 md:max-w-[96px]' : 'flex-1 min-w-0 md:flex-1 md:max-w-[96px]'}
                  ${today ? 'md:flex-[1.3]' : ''}
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
      </div>
    </section>
  )
}
