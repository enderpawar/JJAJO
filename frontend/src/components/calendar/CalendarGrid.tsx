import { useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
import { formatDate, formatYearMonth, getCalendarDays, isSameDay } from '@/utils/dateUtils'
import { cn } from '@/utils/cn'

interface CalendarGridProps {
  /** 날짜 클릭 시 호출 (데스크톱 등에서 선택일 영역 포커스용) */
  onDateSelect?: () => void
  /** 날짜 더블클릭/더블탭 시 호출 (모바일 모달에서 해당일 일정 패널 열기) */
  onDateDoubleClick?: () => void
  /** 날짜 롱프레스 시 호출 (해당 날짜로 일정 추가 모달 열기 등) */
  onDateLongPress?: (date: Date) => void
  /** true면 높이 제한 완화, 모달 내부 스크롤로 한 달 전체 표시 */
  allowFullHeight?: boolean
}

const DOUBLE_TAP_MS = 450
const LONG_PRESS_MS = 500

export default function CalendarGrid({ onDateSelect, onDateDoubleClick, onDateLongPress, allowFullHeight }: CalendarGridProps) {
  const { currentMonth, selectedDate, setCurrentMonth, setSelectedDate, getTodosByDate } = useCalendarStore()
  const lastClickedDateRef = useRef<string>('')
  const lastClickedTimeRef = useRef<number>(0)
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFiredRef = useRef(false)
  const touchActiveRef = useRef(false)

  useEffect(() => () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
      longPressTimeoutRef.current = null
    }
  }, [])

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const days = getCalendarDays(year, month)
  
  const handlePrevMonth = () => {
    const newDate = new Date(currentMonth)
    newDate.setMonth(newDate.getMonth() - 1)
    setCurrentMonth(newDate)
  }
  
  const handleNextMonth = () => {
    const newDate = new Date(currentMonth)
    newDate.setMonth(newDate.getMonth() + 1)
    setCurrentMonth(newDate)
  }
  
  const handleDateClick = (date: Date) => {
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false
      return
    }
    const dateStr = formatDate(date)
    const now = Date.now()
    const lastTime = lastClickedTimeRef.current
    const isDouble = lastTime > 0 && dateStr === lastClickedDateRef.current && now - lastTime < DOUBLE_TAP_MS

    if (isDouble) {
      setSelectedDate(date)
      onDateDoubleClick?.()
      lastClickedDateRef.current = ''
      lastClickedTimeRef.current = 0
      return
    }
    lastClickedDateRef.current = dateStr
    lastClickedTimeRef.current = now
    setSelectedDate(date)
    if (!onDateDoubleClick) onDateSelect?.()
  }

  const clearLongPress = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
      longPressTimeoutRef.current = null
    }
  }

  const startLongPress = (date: Date, fromTouch: boolean) => {
    if (fromTouch) touchActiveRef.current = true
    clearLongPress()
    longPressFiredRef.current = false
    longPressTimeoutRef.current = setTimeout(() => {
      longPressTimeoutRef.current = null
      longPressFiredRef.current = true
      setSelectedDate(date)
      onDateLongPress?.(date)
    }, LONG_PRESS_MS)
  }

  const endLongPress = () => {
    clearLongPress()
    if (touchActiveRef.current) {
      setTimeout(() => { touchActiveRef.current = false }, 400)
    }
  }
  
  const weekDays = ['일', '월', '화', '수', '목', '금', '토']
  
  return (
    <div
      className={cn(
        'neu-float p-4 sm:p-6 flex flex-col h-full',
        allowFullHeight ? 'min-h-0 flex-1 overflow-auto max-h-none' : 'max-h-[50vh] sm:max-h-[60vh] xl:max-h-[750px]'
      )}
    >
      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="neu-btn touch-target flex items-center justify-center min-w-[44px] min-h-[44px] p-2 rounded-neu"
          title="이전 달"
        >
          <ChevronLeft className="w-5 h-5 text-theme-muted" />
        </button>
        
        <h2 className="text-xl font-bold text-theme">
          {formatYearMonth(currentMonth)}
        </h2>
        
        <button
          type="button"
          onClick={handleNextMonth}
          className="neu-btn touch-target flex items-center justify-center min-w-[44px] min-h-[44px] p-2 rounded-neu"
          title="다음 달"
        >
          <ChevronRight className="w-5 h-5 text-theme-muted" />
        </button>
      </div>
      
      {/* 요일 헤더 - 모바일에서 gap 축소 */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 flex-shrink-0">
        {weekDays.map((day, index) => (
          <div
            key={day}
            className={cn(
              'text-center text-xs font-semibold py-1',
              index === 0 ? 'text-red-500/90' : index === 6 ? 'text-primary-500/90' : 'text-theme-muted'
            )}
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* 날짜 그리드 - 해당 월 일자만 표시, 이전/다음 달 칸은 빈 칸 */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 flex-1 min-h-0">
        {days.map((date) => {
          const isCurrentMonthDay = date.getMonth() === month
          if (!isCurrentMonthDay) {
            return (
              <div
                key={`empty-${date.getTime()}`}
                className="w-full min-h-[44px] rounded-neu border border-[var(--calendar-cell-border)] bg-transparent"
                aria-hidden
              />
            )
          }
          const dateStr = formatDate(date)
          const dateTodos = getTodosByDate(dateStr)
          const isSelected = isSameDay(date, selectedDate)
          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => handleDateClick(date)}
              onTouchStart={() => {
                if (onDateLongPress) startLongPress(date, true)
              }}
              onTouchEnd={endLongPress}
              onTouchCancel={endLongPress}
              onMouseDown={() => {
                if (touchActiveRef.current) return
                onDateLongPress && startLongPress(date, false)
              }}
              onMouseUp={endLongPress}
              onMouseLeave={endLongPress}
              title={onDateLongPress ? '클릭: 선택 · 길게 누르기: 일정 추가' : undefined}
              className={cn(
                'calendar-date-cell w-full h-full min-h-[44px] p-1.5 sm:p-2 rounded-neu theme-transition',
                'relative flex flex-col items-center justify-center bg-theme-card',
                'text-theme',
                isSelected ? 'neu-date-selected' : 'neu-float-sm hover:shadow-neu-inset-hover active:scale-[0.98]'
              )}
            >
              <div className="text-[10px] sm:text-xs font-medium">{date.getDate()}</div>
              {dateTodos.length > 0 && (
                <div className="flex gap-0.5 justify-center mt-0.5 min-h-[14px] items-center shrink-0">
                  {dateTodos.slice(0, 3).map((todo, index) => (
                    <div
                      key={`${todo.id}-${index}`}
                      className="w-1.5 h-1.5 rounded-full bg-primary-500"
                    />
                  ))}
                  {dateTodos.length > 3 && (
                    <span className="text-[10px] text-theme-muted ml-0.5">+</span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
