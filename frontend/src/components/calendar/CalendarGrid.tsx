import { useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
import { formatDate, formatYearMonth, getCalendarDays, isSameDay } from '@/utils/dateUtils'
import { cn } from '@/utils/cn'

const WEEK_STARTS_MONDAY = true

interface CalendarGridProps {
  onDateSelect?: () => void
  onDateDoubleClick?: () => void
  onDateLongPress?: (date: Date) => void
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
  const days = getCalendarDays(year, month, WEEK_STARTS_MONDAY)

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

  const weekDays = WEEK_STARTS_MONDAY ? ['월', '화', '수', '목', '금', '토', '일'] : ['일', '월', '화', '수', '목', '금', '토']

  /** 일정 제목을 셀 안에서 쓸 수 있도록 짧게 자름 (한 줄 스택용, 한글 기준 약 5글자) */
  const truncateTitle = (title: string, maxLen = 5) => {
    const t = (title || '').trim()
    if (!t) return ''
    return t.length <= maxLen ? t : t.slice(0, maxLen) + '·'
  }

  return (
    <div
      className={cn(
        'flex flex-col',
        allowFullHeight ? 'min-h-0 flex-1' : ''
      )}
    >
      {/* 월 네비게이션 — 심플: 화살표 + 연월만 */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-2 -m-2 rounded-full text-theme-muted hover:text-theme hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          title="이전 달"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-lg font-semibold text-theme tabular-nums">
          {formatYearMonth(currentMonth)}
        </span>
        <button
          type="button"
          onClick={handleNextMonth}
          className="p-2 -m-2 rounded-full text-theme-muted hover:text-theme hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          title="다음 달"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 요일 — 투명도로 날짜보다 뒤에 보이게 */}
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-[11px] font-medium text-theme-muted py-1 opacity-50">
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 — 숫자만, 선택/오늘/일정 유무만 표시 */}
      <div className="grid grid-cols-7 gap-px">
        {days.map((date) => {
          const isCurrentMonthDay = date.getMonth() === month
          if (!isCurrentMonthDay) {
            return <div key={`empty-${date.getTime()}`} className="aspect-square min-h-[40px]" aria-hidden />
          }
          const dateStr = formatDate(date)
          const dateTodos = getTodosByDate(dateStr).filter((t) => t.status !== 'cancelled')
          const isSelected = isSameDay(date, selectedDate)
          const isToday = dateStr === formatDate(new Date())
          const hasEvents = dateTodos.length > 0

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => handleDateClick(date)}
              onTouchStart={() => onDateLongPress && startLongPress(date, true)}
              onTouchEnd={endLongPress}
              onTouchCancel={endLongPress}
              onMouseDown={() => {
                if (!touchActiveRef.current) onDateLongPress && startLongPress(date, false)
              }}
              onMouseUp={endLongPress}
              onMouseLeave={endLongPress}
              title={onDateLongPress ? '길게 누르면 일정 추가' : dateTodos.map((t) => t.title).join(', ') || undefined}
              className={cn(
                'aspect-square min-h-[40px] flex flex-col items-center justify-start pt-0.5 rounded-xl transition-colors',
                'text-theme',
                isSelected && 'bg-primary-500/15 text-primary-600 dark:text-primary-400 font-semibold ring-1 ring-primary-500/30',
                !isSelected && 'hover:bg-black/5 dark:hover:bg-white/5',
                isToday && !isSelected && 'font-semibold'
              )}
            >
              <span
                className={cn(
                  'text-[13px] sm:text-sm tabular-nums shrink-0 flex items-center justify-center w-8 h-8 rounded-full',
                  isToday && !isSelected && 'bg-primary-500/25 dark:bg-primary-500/30 text-primary-600 dark:text-primary-400'
                )}
              >
                {date.getDate()}
              </span>
              {hasEvents && (
                <span className="mt-0.5 px-0.5 w-full min-h-0 flex-1 flex flex-col items-stretch justify-start gap-0 overflow-hidden min-w-0">
                  {dateTodos.slice(0, 2).map((t) => (
                    <span
                      key={t.id}
                      className="text-[9px] sm:text-[10px] text-theme-muted leading-tight truncate text-left w-full shrink-0"
                      title={t.title}
                    >
                      {truncateTitle(t.title)}
                    </span>
                  ))}
                  {dateTodos.length > 2 && (
                    <span className="text-[9px] sm:text-[10px] text-theme-muted/80 leading-tight truncate text-left w-full shrink-0">
                      +{dateTodos.length - 2}
                    </span>
                  )}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
