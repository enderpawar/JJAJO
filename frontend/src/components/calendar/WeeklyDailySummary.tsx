import { useMemo } from 'react'
import { useCalendarStore } from '@/stores/calendarStore'
import { format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns'
import { cn } from '@/utils/cn'

function toMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

function durationMinutes(t: { startTime?: string; endTime?: string }): number {
  if (!t.startTime || !t.endTime) return 0
  return Math.max(0, toMinutes(t.endTime) - toMinutes(t.startTime))
}

export function WeeklyDailySummary() {
  const todos = useCalendarStore((s) => s.todos)
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  const { dayStats, weekStats } = useMemo(() => {
    const weekStart = startOfWeek(today, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
    const weekInterval = { start: weekStart, end: weekEnd }

    const dayTodos = todos.filter((t) => t.date === todayStr && t.status !== 'cancelled')
    const weekTodos = todos.filter((t) => {
      try {
        const d = new Date(t.date + 'T12:00:00')
        return isWithinInterval(d, weekInterval) && t.status !== 'cancelled'
      } catch {
        return false
      }
    })

    const dayCompleted = dayTodos.filter((t) => t.status === 'completed').length
    const dayTotal = dayTodos.length
    const dayMinutes = dayTodos.reduce((acc, t) => acc + durationMinutes(t), 0)

    const weekCompleted = weekTodos.filter((t) => t.status === 'completed').length
    const weekTotal = weekTodos.length
    const weekMinutes = weekTodos.reduce((acc, t) => acc + durationMinutes(t), 0)

    return {
      dayStats: {
        completed: dayCompleted,
        total: dayTotal,
        minutes: dayMinutes,
      },
      weekStats: {
        completed: weekCompleted,
        total: weekTotal,
        minutes: weekMinutes,
      },
    }
  }, [todos, todayStr])

  const dayHours = (dayStats.minutes / 60).toFixed(1)
  const weekHours = (weekStats.minutes / 60).toFixed(1)

  return (
    <div
      className={cn(
        'rounded-xl border border-black/8 dark:border-white/10',
        'bg-theme-card/50 dark:bg-theme-card/30',
        'px-4 py-3'
      )}
    >
      <div className="grid grid-cols-2 gap-3">
        {/* 오늘 */}
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-theme-muted uppercase tracking-wide mb-1">오늘</p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-lg font-semibold text-theme tabular-nums">
              {dayStats.completed}/{dayStats.total}
            </span>
            <span className="text-xs text-theme-muted">완료</span>
            {dayStats.minutes > 0 && (
              <span className="text-xs text-theme-muted tabular-nums">· {dayHours}h</span>
            )}
          </div>
        </div>
        {/* 이번 주 */}
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-theme-muted uppercase tracking-wide mb-1">이번 주</p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-lg font-semibold text-theme tabular-nums">
              {weekStats.completed}/{weekStats.total}
            </span>
            <span className="text-xs text-theme-muted">완료</span>
            {weekStats.minutes > 0 && (
              <span className="text-xs text-theme-muted tabular-nums">· {weekHours}h</span>
            )}
          </div>
        </div>
      </div>
      {weekStats.total > 0 && (
        <div className="mt-2 pt-2 border-t border-black/6 dark:border-white/8">
          <div className="h-1.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary-500/70 dark:bg-primary-400/70 transition-all duration-300"
              style={{
                width: `${weekStats.total ? (weekStats.completed / weekStats.total) * 100 : 0}%`,
              }}
            />
          </div>
          <p className="text-[10px] text-theme-muted mt-1">
            주간 완료율 {weekStats.total ? Math.round((weekStats.completed / weekStats.total) * 100) : 0}%
            {weekStats.minutes > 0 && ` · 총 ${weekHours}시간`}
          </p>
        </div>
      )}
      {dayStats.total === 0 && weekStats.total === 0 && (
        <p className="text-xs text-theme-muted mt-1">이번 주 일정을 추가해 보세요</p>
      )}
    </div>
  )
}
