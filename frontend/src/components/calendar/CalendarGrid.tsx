import { useRef, useEffect, useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
import { formatDate, getCalendarDays, isSameDay } from '@/utils/dateUtils'
import { cn } from '@/utils/cn'
import type { Todo } from '@/types/calendar'

const EVENT_BLOCK_COLORS = [
  'bg-[#FF6D00]',      // 주황 (하이라이트 통일)
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

/** 주당 표시할 이벤트 행 수 — 일정 개수와 관계없이 날짜 영역 높이 일관 유지 */
const MAX_EVENT_ROWS_PER_WEEK = 2
const ROW_HEIGHT_PX = 22
/** 이벤트 영역 항상 표시할 행 수(이벤트 2행 + 더보기 1행 여유) */
const FIXED_EVENT_ROW_COUNT = 3

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
  const { currentMonth, selectedDate, setSelectedDate, getTodosByDate, todos } = useCalendarStore()
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
          const allEventRows = buildWeekEventRows(weekDates, getTodosByDate, multiSegments)
          const eventRows = allEventRows.slice(0, MAX_EVENT_ROWS_PER_WEEK)
          const hiddenCount = allEventRows.length > MAX_EVENT_ROWS_PER_WEEK
            ? allEventRows.slice(MAX_EVENT_ROWS_PER_WEEK).flat().filter((c) => c !== null && c !== 'multi-continue').length
            : 0
          const hiddenPerDay = [0, 0, 0, 0, 0, 0, 0]
          if (allEventRows.length > MAX_EVENT_ROWS_PER_WEEK) {
            for (const row of allEventRows.slice(MAX_EVENT_ROWS_PER_WEEK)) {
              for (let col = 0; col < 7; col++) {
                const cell = row[col]
                if (cell === null || cell === 'multi-continue') continue
                if (cell.type === 'single') hiddenPerDay[col] += 1
                else hiddenPerDay[cell.segment.startCol] += 1
              }
            }
          }
          return (
            <div key={`${weekIndex}-${allEventRows.length}-${hiddenCount}`} className="flex flex-col gap-1 sm:gap-0.5">
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
                        'btn-ghost-tap relative overflow-hidden aspect-square min-h-[44px] flex flex-col items-center justify-center rounded-tool',
                        isSelected && 'calendar-date-selected',
                        !isSelected && 'hover:bg-gray-50 dark:hover:bg-white/5'
                      )}
                    >
                      <span
                        className={cn(
                          'text-[20px] sm:text-lg tabular-nums shrink-0 flex items-center justify-center w-9 h-9 rounded-tool font-semibold transition-colors',
                          isToday && !isSelected && 'calendar-today-badge',
                          !isSelected && !isToday && dayOfWeek === 0 && 'text-orange-500',
                          !isSelected && !isToday && dayOfWeek === 6 && 'text-blue-500',
                          !isSelected && !isToday && dayOfWeek !== 0 && dayOfWeek !== 6 && 'text-gray-600 dark:text-gray-400'
                        )}
                      >
                        {date.getDate()}
                      </span>
                    </button>
                  )
                })}
              </div>
              {/* 이벤트 영역: 고정 높이로 주별 블록 높이 일관 유지 */}
              <div
                className="grid grid-cols-7 gap-x-0.5 gap-y-1.5 sm:gap-y-1"
                style={{ gridTemplateRows: `repeat(${FIXED_EVENT_ROW_COUNT}, ${ROW_HEIGHT_PX}px)` }}
              >
                {eventRows.map((row, rowIndex) =>
                  row.map((cell, colIndex) => {
                    if (cell === 'multi-continue') return null
                    const gridCol = cell === null ? colIndex + 1 : cell.type === 'multi' ? undefined : colIndex + 1
                    const gridColSpan = cell !== null && cell.type === 'multi' ? `${cell.segment.startCol + 1} / ${cell.segment.endCol + 1}` : undefined
                    const style = {
                      gridRow: rowIndex + 1,
                      ...(gridColSpan ? { gridColumn: gridColSpan } : gridCol !== undefined ? { gridColumn: gridCol } : {}),
                    }
                    if (cell === null) {
                      return <div key={`${rowIndex}-${colIndex}`} className="min-h-[22px]" style={style} aria-hidden />
                    }
                    if (cell.type === 'single') {
                      return (
                        <div
                          key={`${rowIndex}-${colIndex}`}
                          className={cn(
'min-h-[22px] rounded-tool px-1.5 py-1 flex items-center gap-1 text-[12px] sm:text-sm font-medium text-white overflow-hidden',
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
                          'min-h-[22px] rounded-tool px-1.5 py-1 flex items-center gap-1 text-[12px] sm:text-sm font-medium text-white overflow-hidden',
                          segment.colorClass
                        )}
                        style={style}
                        title={segment.todo.startTime && segment.todo.endTime ? `${segment.todo.title} (${segment.todo.startTime}–${segment.todo.endTime})` : segment.todo.title}
                      >
                        {segment.todo.createdBy === 'ai' && <Sparkles className="w-3 h-3 shrink-0 opacity-90" />}
                        {segment.todo.startTime && segment.todo.endTime && (
                          <span className="shrink-0 opacity-90 text-[11px] sm:text-[12px]">{segment.todo.startTime}–{segment.todo.endTime}</span>
                        )}
                        <span className="truncate min-w-0 block">{segment.todo.title}</span>
                      </div>
                    )
                  })
                ).flat().filter(Boolean)}
                {hiddenPerDay.map((count, dayCol) =>
                  count > 0 ? (
                    <div
                      key={`more-${dayCol}`}
                      className="min-h-[22px] flex items-center justify-center text-[12px] sm:text-sm text-theme-muted font-medium"
                      style={{ gridRow: FIXED_EVENT_ROW_COUNT, gridColumn: dayCol + 1 }}
                    >
                      +{count}건 더
                    </div>
                  ) : (
                    <div key={`more-${dayCol}`} className="min-h-[22px]" style={{ gridRow: FIXED_EVENT_ROW_COUNT, gridColumn: dayCol + 1 }} aria-hidden />
                  )
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
