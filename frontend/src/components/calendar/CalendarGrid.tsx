import { useRef, useEffect, useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
import { formatDate, getCalendarDays, isSameDay } from '@/utils/dateUtils'
import { cn } from '@/utils/cn'
import type { Todo } from '@/types/calendar'

const EVENT_BLOCK_COLORS = [
  'bg-[#FF8C00]',      // 주황
  'bg-purple-500',     // 보라
  'bg-emerald-400',    // 연두
  'bg-amber-300',      // 노랑
  'bg-red-400',        // 빨강
  'bg-sky-400',        // 하늘
]

const WEEK_STARTS_MONDAY = false

interface CalendarGridProps {
  onDateSelect?: () => void
  onDateDoubleClick?: () => void
  onDateLongPress?: (date: Date) => void
  allowFullHeight?: boolean
}

const DOUBLE_TAP_MS = 450
const LONG_PRESS_MS = 500

/** 여러 날에 걸친 일정의 주별 세그먼트 (한 주 안에서 startCol~endCol, endCol은 exclusive) */
function getMultiDaySegmentsForWeek(
  weekDates: Date[],
  todos: Todo[],
  month: number,
  year: number
): { todo: Todo; startCol: number; endCol: number; colorClass: string }[] {
  const firstDayStr = formatDate(new Date(year, month, 1))
  const lastDayStr = formatDate(new Date(year, month + 1, 0))
  const multiDay = todos.filter(
    (t) => t.status !== 'cancelled' && t.endDate && t.endDate > t.date && t.endDate >= firstDayStr && t.date <= lastDayStr
  )
  const out: { todo: Todo; startCol: number; endCol: number; colorClass: string }[] = []
  multiDay.forEach((todo, idx) => {
    const end = todo.endDate!
    let startCol = -1
    let endCol = -1
    for (let c = 0; c < weekDates.length; c++) {
      const dateStr = formatDate(weekDates[c])
      if (todo.date <= dateStr && dateStr <= end) {
        if (startCol === -1) startCol = c
        endCol = c
      }
    }
    if (startCol >= 0 && endCol >= 0) {
      out.push({
        todo,
        startCol,
        endCol: endCol + 1,
        colorClass: EVENT_BLOCK_COLORS[idx % EVENT_BLOCK_COLORS.length],
      })
    }
  })
  return out
}

type CellSlot = null | 'multi-continue' | { type: 'single'; todo: Todo; colorClass: string } | { type: 'multi'; segment: { todo: Todo; startCol: number; endCol: number; colorClass: string } }

/**
 * 주의 날짜 7개와 단일/멀티 일정을 배치 순서(createdAt)대로 한 그리드에 배치한 행 배열 반환.
 * 멀티데이도 맨 밑이 아니라 순서대로 들어감.
 */
function buildWeekEventRows(
  weekDates: Date[],
  getTodosByDate: (dateStr: string) => Todo[],
  multiSegments: { todo: Todo; startCol: number; endCol: number; colorClass: string }[]
): CellSlot[][] {
  const COLS = 7
  type Item = { kind: 'single'; dayIndex: number; todo: Todo; createdAt: string } | { kind: 'multi'; startCol: number; endCol: number; todo: Todo; colorClass: string; createdAt: string }
  const items: Item[] = []

  weekDates.forEach((date, dayIndex) => {
    const dateStr = formatDate(date)
    getTodosByDate(dateStr)
      .filter((t) => t.status !== 'cancelled' && (!t.endDate || t.endDate === t.date))
      .forEach((todo) => {
        items.push({ kind: 'single', dayIndex, todo, createdAt: todo.createdAt })
      })
  })
  multiSegments.forEach((seg) => {
    items.push({
      kind: 'multi',
      startCol: seg.startCol,
      endCol: seg.endCol,
      todo: seg.todo,
      colorClass: seg.colorClass,
      createdAt: seg.todo.createdAt,
    })
  })

  items.sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  const grid: CellSlot[][] = []

  function findFirstFreeRow(singleCol?: number, multiSpan?: { start: number; end: number }): number {
    let r = 0
    while (true) {
      if (r >= grid.length) return r
      const row = grid[r]
      if (singleCol !== undefined) {
        const cell = row[singleCol]
        if (cell === null || cell === 'multi-continue') return r
      } else if (multiSpan) {
        let free = true
        for (let c = multiSpan.start; c < multiSpan.end; c++) {
          const cell = row[c]
          if (cell !== null && cell !== 'multi-continue') {
            free = false
            break
          }
        }
        if (free) return r
      }
      r++
    }
  }

  items.forEach((item, itemIndex) => {
    const colorClass = EVENT_BLOCK_COLORS[itemIndex % EVENT_BLOCK_COLORS.length]
    if (item.kind === 'single') {
      const r = findFirstFreeRow(item.dayIndex)
      while (grid.length <= r) grid.push(Array(COLS).fill(null))
      grid[r][item.dayIndex] = { type: 'single', todo: item.todo, colorClass }
    } else {
      const r = findFirstFreeRow(undefined, { start: item.startCol, end: item.endCol })
      while (grid.length <= r) grid.push(Array(COLS).fill(null))
      grid[r][item.startCol] = {
        type: 'multi',
        segment: { todo: item.todo, startCol: item.startCol, endCol: item.endCol, colorClass },
      }
      for (let c = item.startCol + 1; c < item.endCol; c++) grid[r][c] = 'multi-continue'
    }
  })

  return grid
}

export default function CalendarGrid({ onDateSelect, onDateDoubleClick, onDateLongPress, allowFullHeight }: CalendarGridProps) {
  const { currentMonth, selectedDate, setCurrentMonth, setSelectedDate, getTodosByDate, todos } = useCalendarStore()
  const lastClickedDateRef = useRef<string>('')
  const lastClickedTimeRef = useRef<number>(0)
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFiredRef = useRef(false)
  const touchActiveRef = useRef(false)
  const [rippleCell, setRippleCell] = useState<string | null>(null)
  const [rippleKey, setRippleKey] = useState(0)

  useEffect(() => () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
      longPressTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!rippleCell) return
    const t = setTimeout(() => setRippleCell(null), 520)
    return () => clearTimeout(t)
  }, [rippleCell, rippleKey])

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const days = getCalendarDays(year, month, WEEK_STARTS_MONDAY)

  const weekRows = useMemo(() => {
    const rows: Date[][] = []
    for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7))
    return rows
  }, [days])


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
    setRippleCell(dateStr)
    setRippleKey((k) => k + 1)
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
  const weekDayColors = [
    'text-orange-500',   // 일
    'text-gray-600',    // 월
    'text-gray-600',    // 화
    'text-gray-600',    // 수
    'text-gray-600',    // 목
    'text-gray-600',    // 금
    'text-blue-500',    // 토
  ]

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
      {/* 요일 헤더 — 일 주황, 토 파랑, 나머지 회색 */}
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map((day, i) => (
          <div key={day} className={cn('text-center text-[11px] font-medium py-1', weekDayColors[i])}>
            {day}
          </div>
        ))}
      </div>

      {/* 주 단위: 날짜 행 + 배치 순서(createdAt)대로 단일/멀티 일정 행 */}
      <div className="flex flex-col gap-0.5 sm:gap-1">
        {weekRows.map((weekDates, weekIndex) => {
          const multiSegments = getMultiDaySegmentsForWeek(weekDates, todos, month, year)
          const eventRows = buildWeekEventRows(weekDates, getTodosByDate, multiSegments)
          return (
            <div key={weekIndex} className="flex flex-col gap-1 sm:gap-0.5">
              {/* 날짜 행 — 이벤트와 겹치지 않도록 아래쪽 여백 확보 */}
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                {weekDates.map((date) => {
                  const isCurrentMonthDay = date.getMonth() === month
                  const dateStr = formatDate(date)
                  const allOnDay = getTodosByDate(dateStr).filter((t) => t.status !== 'cancelled')
                  const isSelected = isSameDay(date, selectedDate)
                  const isToday = dateStr === formatDate(new Date())
                  const dayOfWeek = date.getDay()

                  if (!isCurrentMonthDay) {
                    return <div key={`empty-${date.getTime()}`} className="aspect-square min-h-[44px] rounded-tool" aria-hidden />
                  }

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
                      title={onDateLongPress ? '길게 누르면 일정 추가' : allOnDay.map((t) => t.title).join(', ') || undefined}
                      className={cn(
                        'relative overflow-hidden aspect-square min-h-[44px] flex flex-col items-center justify-center rounded-tool transition-colors',
                        isSelected && 'ring-2 ring-[var(--primary-point)] ring-inset bg-[var(--primary-gradient-subtle)]',
                        !isSelected && 'hover:bg-gray-50 dark:hover:bg-white/5'
                      )}
                    >
                      {rippleCell === dateStr && (
                        <span key={rippleKey} className="ripple-effect" aria-hidden />
                      )}
                      <span
                        className={cn(
                          'text-[13px] sm:text-sm tabular-nums shrink-0 flex items-center justify-center w-7 h-7 rounded-full',
                          isToday && 'bg-blue-500 text-white font-semibold',
                          !isToday && dayOfWeek === 0 && 'text-orange-500',
                          !isToday && dayOfWeek === 6 && 'text-blue-500',
                          !isToday && dayOfWeek !== 0 && dayOfWeek !== 6 && 'text-gray-600 dark:text-gray-400'
                        )}
                      >
                        {date.getDate()}
                      </span>
                    </button>
                  )
                })}
              </div>
              {/* 이벤트 행: 단일/멀티를 createdAt 순으로 배치, 날짜와·서로 겹치지 않도록 행 높이·간격 확보 */}
              {eventRows.length > 0 && (
                <div className="grid grid-cols-7 gap-x-0.5 gap-y-1.5 sm:gap-y-1 auto-rows-[minmax(22px,auto)]">
                  {eventRows.map((row, rowIndex) =>
                    row.map((cell, colIndex) => {
                      if (cell === 'multi-continue') return null
                      const gridCol = cell === null ? colIndex + 1 : cell.type === 'multi' ? undefined : colIndex + 1
                      const gridColSpan = cell !== null && cell.type === 'multi' ? `${cell.segment.startCol + 1} / ${cell.segment.endCol + 1}` : undefined
                      const style = gridColSpan ? { gridColumn: gridColSpan } : gridCol !== undefined ? { gridColumn: gridCol } : undefined
                      if (cell === null) {
                        return <div key={`${rowIndex}-${colIndex}`} className="min-h-[22px]" style={style} aria-hidden />
                      }
                      if (cell.type === 'single') {
                        return (
                          <div
                            key={`${rowIndex}-${colIndex}`}
                            className={cn(
                              'min-h-[22px] rounded-tool px-1.5 py-1 flex items-center gap-1 text-[10px] sm:text-xs font-medium text-white overflow-hidden',
                              cell.colorClass
                            )}
                            style={style}
                            title={cell.todo.createdBy === 'ai' ? `짜조 제안: ${cell.todo.title}` : cell.todo.title}
                          >
                            {cell.todo.createdBy === 'ai' && <Sparkles className="w-3 h-3 shrink-0 opacity-90" />}
                            <span className="truncate min-w-0 block">{truncateTitle(cell.todo.title, 5)}</span>
                          </div>
                        )
                      }
                      const { segment } = cell
                      return (
                        <div
                          key={`${rowIndex}-${colIndex}`}
                          className={cn(
                            'min-h-[22px] rounded-tool px-1.5 py-1 flex items-center gap-1 text-[10px] sm:text-xs font-medium text-white overflow-hidden',
                            segment.colorClass
                          )}
                          style={style}
                          title={segment.todo.startTime && segment.todo.endTime ? `${segment.todo.title} (${segment.todo.startTime}–${segment.todo.endTime})` : segment.todo.title}
                        >
                          {segment.todo.createdBy === 'ai' && <Sparkles className="w-3 h-3 shrink-0 opacity-90" />}
                          {segment.todo.startTime && segment.todo.endTime && (
                            <span className="shrink-0 opacity-90 text-[9px] sm:text-[10px]">{segment.todo.startTime}–{segment.todo.endTime}</span>
                          )}
                          <span className="truncate min-w-0 block">{segment.todo.title}</span>
                        </div>
                      )
                    })
                  ).flat().filter(Boolean)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
