import { useMemo } from 'react'
import { useCalendarStore } from '@/stores/calendarStore'
import { format, startOfWeek, addDays, isSameDay } from 'date-fns'
import { ko } from 'date-fns/locale'

/**
 * 🎨 TopTimeline: Weekly Heatmap Bar
 * 
 * Concept: "Simplicity within Complexity"
 * - 7개의 Column으로 구성된 주간 히트맵
 * - 텍스트 대신 컬러 게이지로 일정 밀도 표현
 * - 10vh 고정 높이
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
    <div className="h-[10vh] min-h-[80px] bg-transparent border-b border-[#373737]">
      <div className="container mx-auto px-6 h-full flex items-center justify-center">
        {/* 7개의 히트맵 컬럼 - ADHD 친화적: 오늘 중심 */}
        <div className="flex gap-3 h-full py-4 max-w-4xl w-full">
          {weekDays.map((date, index) => {
            const density = getDensity(date)
            const heatmapColor = getHeatmapColor(density)
            const today = isToday(date)
            const selected = isSelected(date)
            const todoCount = todos.filter(t => t.date === format(date, 'yyyy-MM-dd')).length
            
            return (
              <button
                key={index}
                onClick={() => handleDayClick(date)}
                className={`
                  transition-all duration-300 cursor-pointer rounded-lg
                  relative overflow-hidden
                  ${today 
                    ? 'flex-[2]' 
                    : 'flex-1 hover:brightness-110'}
                  ${selected ? 'bg-primary-500/25 ring-2 ring-primary-500/50' : today ? 'bg-transparent hover:bg-white/5' : heatmapColor}
                `}
              >
                {/* 날짜 레이블 */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                  <div className={`text-xs font-medium ${today ? 'text-white' : 'text-white/90'}`}>
                    {format(date, 'EEE', { locale: ko })}
                  </div>
                  <div className={`font-bold ${today ? 'text-white text-3xl' : 'text-white/95 text-xl'}`}>
                    {format(date, 'd')}
                  </div>
                  
                  {/* 일정 개수 - 오늘만 명확하게 표시 */}
                  {todoCount > 0 && (
                    <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      today 
                        ? 'bg-notion-text/20 text-white' 
                        : 'bg-notion-text/10 text-white'
                    }`}>
                      {todoCount}개
                    </div>
                  )}
                </div>
                
                {/* 오늘 펄스 효과 */}
                {today && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 rounded-full animate-pulse" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
