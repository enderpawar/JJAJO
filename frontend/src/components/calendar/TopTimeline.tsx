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
  const { todos, currentMonth, selectedDate } = useCalendarStore()
  
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
  
  // 밀도에 따른 색상 계산 (오렌지 그라디언트)
  const getHeatmapColor = (density: number): string => {
    if (density === 0) return 'bg-gray-100'
    if (density < 0.3) return 'bg-primary-100'
    if (density < 0.6) return 'bg-primary-300'
    if (density < 0.8) return 'bg-primary-500'
    return 'bg-primary-600'
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
    <div className="h-[10vh] min-h-[80px] bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 h-full flex items-center gap-2">
        {/* 주간 레이블 */}
        <div className="text-sm font-bold text-gray-700 w-20">
          Week {format(weekStart, 'w', { locale: ko })}
        </div>
        
        {/* 7개의 히트맵 컬럼 */}
        <div className="flex-1 flex gap-2 h-full py-3">
          {weekDays.map((date, index) => {
            const density = getDensity(date)
            const heatmapColor = getHeatmapColor(density)
            const today = isToday(date)
            const selected = isSelected(date)
            
            return (
              <button
                key={index}
                onClick={() => handleDayClick(date)}
                className={`
                  flex-1 rounded-lg transition-all duration-300 cursor-pointer
                  hover:scale-105 hover:shadow-lg relative overflow-hidden
                  ${heatmapColor}
                  ${today ? 'ring-2 ring-primary-500 ring-offset-2' : ''}
                  ${selected ? 'ring-2 ring-purple-500 ring-offset-2' : ''}
                `}
              >
                {/* 날짜 레이블 (상단 작게) */}
                <div className="absolute top-1 left-0 right-0 text-center">
                  <div className="text-[10px] font-medium text-gray-600">
                    {format(date, 'EEE', { locale: ko })}
                  </div>
                  <div className={`text-lg font-bold ${density > 0.5 ? 'text-white' : 'text-gray-800'}`}>
                    {format(date, 'd')}
                  </div>
                </div>
                
                {/* 일정 개수 표시 (하단) */}
                <div className="absolute bottom-1 left-0 right-0 text-center">
                  <div className={`text-xs font-medium ${density > 0.5 ? 'text-white' : 'text-gray-600'}`}>
                    {todos.filter(t => t.date === format(date, 'yyyy-MM-dd')).length}개
                  </div>
                </div>
                
                {/* 오늘 표시 */}
                {today && (
                  <div className="absolute top-0 right-0 w-2 h-2 bg-primary-500 rounded-full m-1" />
                )}
              </button>
            )
          })}
        </div>
        
        {/* 범례 */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>낮음</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded bg-gray-100" />
            <div className="w-3 h-3 rounded bg-primary-100" />
            <div className="w-3 h-3 rounded bg-primary-300" />
            <div className="w-3 h-3 rounded bg-primary-500" />
            <div className="w-3 h-3 rounded bg-primary-600" />
          </div>
          <span>높음</span>
        </div>
      </div>
    </div>
  )
}
