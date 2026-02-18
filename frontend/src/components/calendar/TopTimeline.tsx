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
  
  // 각 날짜별 일정 밀도 계산 (0-1 scale)
  const getDensity = (date: Date): number => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const dayTodos = todos.filter(t => t.date === dateStr)
    
    if (dayTodos.length === 0) return 0
    if (dayTodos.length >= 10) return 1
    
    return dayTodos.length / 10
  }
  
  // 밀도에 따른 색상 계산 (다크 테마 친화적 - 따뜻한 톤)
  const getHeatmapColor = (density: number): string => {
    if (density === 0) return 'bg-[#252525]'
    if (density < 0.3) return 'bg-primary-500/20'
    if (density < 0.6) return 'bg-primary-500/40'
    if (density < 0.8) return 'bg-primary-500/60'
    return 'bg-primary-500/80'
  }
  
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
    <section className="h-[130px] min-h-[130px] overflow-hidden box-border flex flex-col bg-transparent border-b border-[#373737] py-3">
      <div className="flex-1 min-h-0 flex flex-col items-center px-3 sm:px-4">
        {/* 카드 행: 모바일 5일 한 화면, 데스크톱 7일 */}
        <div className="flex gap-1 md:gap-2 w-full max-w-2xl h-[72px] shrink-0 overflow-hidden md:overflow-visible scrollbar-none">
          {weekDays.map((date, index) => {
            const density = getDensity(date)
            const heatmapColor = getHeatmapColor(density)
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
                  touch-target flex flex-col items-center justify-center gap-0.5 px-0.5 min-h-0 h-full rounded-lg
                  transition-all duration-300 cursor-pointer relative
                  ${isMobileOnly ? 'hidden md:flex flex-none md:flex-1 md:min-w-0 md:max-w-[100px]' : 'flex-1 min-w-0 md:flex-1 md:max-w-[100px]'}
                  ${today ? 'md:flex-[1.4]' : ''} hover:brightness-110
                  ${selected ? 'bg-primary-500/25 ring-2 ring-inset ring-primary-500/50' : today ? 'bg-transparent hover:bg-white/5' : heatmapColor}
                `}
              >
                <span className={`text-[10px] md:text-xs font-medium shrink-0 ${today ? 'text-white' : 'text-white/90'}`}>
                  {dayLabel}
                </span>
                <span className={`font-bold shrink-0 leading-tight ${today ? 'text-white text-lg md:text-2xl' : 'text-white/95 text-sm md:text-lg'}`}>
                  {format(date, 'd')}
                </span>
                {todoCount > 0 && (
                  <span className={`hidden md:inline-flex shrink-0 items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    today ? 'bg-notion-text/20 text-white' : 'bg-notion-text/10 text-white'
                  }`}>
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
