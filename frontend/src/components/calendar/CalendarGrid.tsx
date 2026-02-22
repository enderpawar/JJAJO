import { useMemo } from 'react'
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
  allowFullHeight?: boolean
}

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

/** 주 단위 정렬·색 할당과 동일하게, 해당 날짜에 닿는 일정의 색상만 반환 (그리드와 완전 일치) */
function getEventColorsForDayInWeek(
  weekDates: Date[],
  dateStr: string,
  getTodosByDate: (dateStr: string) => Todo[],
  multiSegments: { todo: Todo; startCol: number; endCol: number; colorClass: string }[]
): string[] {
  type Item = { kind: 'single'; dayIndex: number; todo: Todo; createdAt: string } | { kind: 'multi'; startCol: number; endCol: number; todo: Todo; createdAt: string }
  const items: Item[] = []
  weekDates.forEach((date, dayIndex) => {
    const dStr = formatDate(date)
    getTodosByDate(dStr)
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
      createdAt: seg.todo.createdAt,
    })
  })
  items.sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  const colIndex = weekDates.findIndex((d) => formatDate(d) === dateStr)
  if (colIndex === -1) return []

  const colors: string[] = []
  items.forEach((item, idx) => {
    let touches = false
    if (item.kind === 'single') touches = item.dayIndex === colIndex
    else touches = item.startCol <= colIndex && colIndex < item.endCol
    if (touches) colors.push(EVENT_BLOCK_COLORS[idx % EVENT_BLOCK_COLORS.length])
  })
  return colors.slice(0, 4)
}

/** 해당 날짜에 캘린더 그리드와 동일한 순서·색상으로 일정별 색상 맵 반환 (DayDetailPanel 등에서 사용) */
export function getEventColorMapForDay(
  dateStr: string,
  currentMonth: Date,
  getTodosByDate: (dateStr: string) => Todo[],
  todos: Todo[]
): Map<string, string> {
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const days = getCalendarDays(year, month, WEEK_STARTS_MONDAY)
  const weekRows: Date[][] = []
  for (let i = 0; i < days.length; i += 7) weekRows.push(days.slice(i, i + 7))
  const weekRow = weekRows.find((row) => row.some((d) => formatDate(d) === dateStr))
  if (!weekRow) return new Map()
  const multiSegments = getMultiDaySegmentsForWeek(weekRow, todos, month, year)
  type Item = { kind: 'single'; dayIndex: number; todo: Todo; createdAt: string } | { kind: 'multi'; startCol: number; endCol: number; todo: Todo; createdAt: string }
  const items: Item[] = []
  weekRow.forEach((date, dayIndex) => {
    const dStr = formatDate(date)
    getTodosByDate(dStr)
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
      createdAt: seg.todo.createdAt,
    })
  })
  items.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const colIndex = weekRow.findIndex((d) => formatDate(d) === dateStr)
  if (colIndex === -1) return new Map()
  const map = new Map<string, string>()
  items.forEach((item, idx) => {
    let touches = false
    if (item.kind === 'single') touches = item.dayIndex === colIndex
    else touches = item.startCol <= colIndex && colIndex < item.endCol
    if (touches) {
      const todo = item.kind === 'single' ? item.todo : item.todo
      map.set(todo.id, EVENT_BLOCK_COLORS[idx % EVENT_BLOCK_COLORS.length])
    }
  })
  return map
}

export default function CalendarGrid({ onDateSelect, allowFullHeight }: CalendarGridProps) {
  const { currentMonth, selectedDate, setSelectedDate, getTodosByDate, todos } = useCalendarStore()

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const days = getCalendarDays(year, month, WEEK_STARTS_MONDAY)

  const weekRows = useMemo(() => {
    const rows: Date[][] = []
    for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7))
    return rows
  }, [days])

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    onDateSelect?.()
  }

  const weekDays = ['일', '월', '화', '수', '목', '금', '토']
  const weekDayColors = [
    'text-orange-500',       // 일
    'text-gray-700 dark:text-gray-300',   // 월 — 배경에 묻히지 않도록 채도 강화
    'text-gray-700 dark:text-gray-300',   // 화
    'text-gray-700 dark:text-gray-300',   // 수
    'text-gray-700 dark:text-gray-300',   // 목
    'text-gray-700 dark:text-gray-300',   // 금
    'text-blue-500',        // 토
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
      {/* 요일 헤더 — 캘린더 본체에 가깝게, 폰트 축소해 숫자가 주인공이 되도록 */}
      <div className="grid grid-cols-7 gap-1 mb-1.5 calendar-weekday-row">
        {weekDays.map((day, i) => (
          <div key={day} className={cn('text-center text-[10px] font-medium py-0.5 text-theme-muted', weekDayColors[i])}>
            {day}
          </div>
        ))}
      </div>

      {/* 주 단위: 날짜 행 + 배치 순서(createdAt)대로 단일/멀티 일정 행 — 행 간격 1.5배 */}
      <div className="flex flex-col gap-3">
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
            <div key={`${weekIndex}-${allEventRows.length}-${hiddenCount}`} className="flex flex-col gap-3">
              {/* 날짜 행 — 연한 그리드선으로 터치 영역 시각화, 요일과 열 정렬 */}
              <div className="grid grid-cols-7 gap-0 calendar-date-grid">
                {weekDates.map((date) => {
                  const isCurrentMonthDay = date.getMonth() === month
                  const dateStr = formatDate(date)
                  const allOnDay = getTodosByDate(dateStr).filter((t) => t.status !== 'cancelled')
                  const isSelected = isSameDay(date, selectedDate)
                  const isToday = dateStr === formatDate(new Date())
                  const dayOfWeek = date.getDay()
                  /** 그리드와 동일한 주 단위 정렬·색 할당으로 일치 (22–24일 보라 멀티데이 → 보라 바) */
                  const eventColorsForDay = getEventColorsForDayInWeek(weekDates, dateStr, getTodosByDate, multiSegments)

                  if (!isCurrentMonthDay) {
                    return <div key={`empty-${date.getTime()}`} className="aspect-square min-h-[48px] calendar-date-cell-empty" aria-hidden />
                  }

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      data-date={dateStr}
                      onClick={() => handleDateClick(date)}
                      title={allOnDay.map((t) => t.title).join(', ') || undefined}
                      style={isSelected ? { borderRadius: '14px' } : undefined}
                      className={cn(
                        'btn-ghost-tap relative overflow-hidden aspect-square min-h-[48px] flex flex-col items-stretch justify-between calendar-date-cell pt-1.5 pb-1 px-1.5',
                        isSelected && 'calendar-date-selected calendar-date-selected-rounded',
                        isToday && 'calendar-date-today',
                        !isSelected && 'hover:bg-gray-50 dark:hover:bg-white/5'
                      )}
                    >
                      {/* 숫자: 오늘=포인트 색, 그 외 요일별 색상 */}
                      <div className="flex items-center justify-start shrink-0">
                        <span
                          className={cn(
                            'text-[22px] sm:text-xl tabular-nums transition-colors',
                            isToday && 'text-[var(--primary-point)] font-semibold',
                            !isToday && dayOfWeek === 0 && 'text-orange-500 font-semibold',
                            !isToday && dayOfWeek === 6 && 'text-blue-500 font-semibold',
                            !isToday && dayOfWeek !== 0 && dayOfWeek !== 6 && 'text-gray-700 dark:text-gray-300 font-semibold'
                          )}
                          aria-label={isToday ? '오늘' : undefined}
                        >
                          {date.getDate()}
                        </span>
                      </div>
                      {/* 일정 인디케이터: 우측 하단 작은 점으로 숫자를 가리지 않음 */}
                      {eventColorsForDay.length > 0 && (
                        <div className="absolute bottom-1.5 right-1.5 flex gap-0.5 flex-row-reverse" aria-hidden>
                          {eventColorsForDay.slice(0, 4).map((colorClass, i) => (
                            <span
                              key={i}
                              className={cn('w-1.5 h-1.5 rounded-full shrink-0', colorClass)}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
              {/* 이벤트 영역: 행 간격 1.5배 유지, 열은 gap-1로 가독성 확보 */}
              <div
                className="grid grid-cols-7 gap-1 gap-y-1.5 sm:gap-y-1"
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
'min-h-[22px] rounded-sm px-1.5 py-1 flex items-center gap-1 text-[12px] sm:text-sm font-medium text-white overflow-hidden',
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
                          'min-h-[22px] rounded-sm px-1.5 py-1 flex items-center gap-1 text-[12px] sm:text-sm font-medium text-white overflow-hidden',
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
