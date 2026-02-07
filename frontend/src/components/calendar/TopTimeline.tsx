import { useMemo } from 'react'
import { useCalendarStore } from '@/stores/calendarStore'
import { format, startOfWeek, addDays, isSameDay } from 'date-fns'
import { ko } from 'date-fns/locale'

/**
 * 🎨 TopTimeline: Weekly Heatmap Bar
 * - 7개 날짜 카드가 한 줄에 들어가며, 영역 높이 안에서만 표시되도록 고정 높이 사용
 */
export function TopTimeline() {
  const { todos, selectedDate } = useCalendarStore()
  
  // 현재 주의 시작일 계산
  const weekStart = useMemo(() => {
    return startOfWeek(selectedDate || new Date(), { weekStartsOn: 0 })
  }, [selectedDate])
  
  // 7일간의 날짜 배열 생성
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  }, [weekStart])
  
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
      <div className="flex-1 min-h-0 flex flex-col items-center px-3 sm:px-6">
        {/* 카드 행: flex-1 제거, 고정 높이 72px만 사용 → 버튼이 100px로 늘어나지 않음 */}
        <div className="flex gap-1 md:gap-3 w-full max-w-4xl h-[72px] shrink-0 overflow-x-auto snap-x snap-mandatory md:overflow-visible md:snap-none scrollbar-none">
          {weekDays.map((date, index) => {
            const density = getDensity(date)
            const heatmapColor = getHeatmapColor(density)
            const today = isToday(date)
            const selected = isSelected(date)
            const todoCount = todos.filter(t => t.date === format(date, 'yyyy-MM-dd')).length
            const dayLabel = format(date, 'EEE', { locale: ko })
            const titleText = todoCount > 0 ? `${dayLabel} ${date.getDate()}일 · ${todoCount}개 일정` : `${dayLabel} ${date.getDate()}일`

            return (
              <button
                key={index}
                type="button"
                onClick={() => handleDayClick(date)}
                title={titleText}
                className={`
                  touch-target flex-none snap-center min-w-[44px] md:min-w-0 w-full h-full max-h-full min-h-0
                  flex flex-col items-center justify-center gap-0.5
                  transition-all duration-300 cursor-pointer rounded-lg
                  relative
                  md:flex-1 ${today ? 'md:flex-[2]' : ''} hover:brightness-110
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
