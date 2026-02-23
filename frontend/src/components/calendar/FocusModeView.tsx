import { useMemo, useState, useEffect } from 'react'
import { useCalendarStore } from '@/stores/calendarStore'
import { updateSchedule } from '@/services/scheduleService'
import { Clock, CheckCircle, PlayCircle, Target } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/utils/cn'

/** 오늘 현재/다음 일정 1개 선택 (FocusSpotlight와 동일 로직) */
function useFocusTask() {
  const { todos } = useCalendarStore()
  return useMemo(() => {
    const now = new Date()
    const todayStr = format(now, 'yyyy-MM-dd')
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const todayTodos = todos
      .filter((t) => t.date === todayStr && t.status !== 'completed')
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))

    const current = todayTodos.find(
      (t) => (t.startTime ?? '') <= currentTimeStr && (t.endTime ?? '') > currentTimeStr
    )
    const next = todayTodos.find((t) => (t.startTime ?? '') > currentTimeStr)
    return { focusTask: current ?? next ?? null, isCurrent: !!current }
  }, [todos])
}

/** 일정 종료 시각(오늘 기준)까지 남은 초. 이미 지났으면 0 */
function getRemainingSeconds(task: { date: string; endTime?: string }): number {
  if (!task.endTime) return 0
  const now = new Date()
  const [h, m] = task.endTime.split(':').map(Number)
  const end = new Date(now)
  end.setFullYear(parseInt(task.date.slice(0, 4), 10))
  end.setMonth(parseInt(task.date.slice(5, 7), 10) - 1)
  end.setDate(parseInt(task.date.slice(8, 10), 10))
  end.setHours(h, m, 0, 0)
  const diff = Math.floor((end.getTime() - now.getTime()) / 1000)
  return Math.max(0, diff)
}

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

interface FocusModeViewProps {
  onClose?: () => void
  /** 모바일 전체화면 오버레이일 때 상단 닫기 버튼 표시 */
  showCloseButton?: boolean
}

export function FocusModeView({ onClose, showCloseButton }: FocusModeViewProps) {
  const { focusTask, isCurrent } = useFocusTask()
  const { updateTodo } = useCalendarStore()
  const [remainingSeconds, setRemainingSeconds] = useState(0)

  // 1초마다 남은 시간 갱신
  useEffect(() => {
    if (!focusTask?.endTime) {
      setRemainingSeconds(0)
      return
    }
    const tick = () => setRemainingSeconds(getRemainingSeconds(focusTask))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [focusTask?.id, focusTask?.date, focusTask?.endTime])

  const handleComplete = () => {
    if (!focusTask) return
    updateTodo(focusTask.id, { status: 'completed' })
    updateSchedule(focusTask.id, { status: 'completed' }).catch(() => {})
  }

  if (!focusTask) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 theme-transition bg-theme text-theme">
        {showCloseButton && onClose && (
          <div className="absolute right-3 top-3 z-10">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-theme-muted hover:bg-[var(--hover-bg)]"
              aria-label="닫기"
            >
              <span className="text-lg font-medium">✕</span>
            </button>
          </div>
        )}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-20 h-20 rounded-full bg-[var(--hover-bg)] flex items-center justify-center">
            <Target className="w-10 h-10 text-[var(--text-muted)]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-theme">진행 중인 일정이 없어요</h2>
            <p className="text-sm text-theme-muted mt-1">오늘 남은 일정이 없거나 모두 완료되었어요.</p>
          </div>
        </div>
      </div>
    )
  }

  const isOver = remainingSeconds <= 0 && focusTask.endTime

  return (
    <div className="flex flex-1 flex-col theme-transition bg-theme text-theme min-h-0 overflow-auto">
      {showCloseButton && onClose && (
        <div className="shrink-0 flex justify-end p-2">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-theme-muted hover:bg-[var(--hover-bg)]"
            aria-label="닫기"
          >
            <span className="text-lg font-medium">✕</span>
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        {/* 상태 뱃지 */}
        <div
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6',
            isCurrent && !isOver && 'bg-[var(--primary-point)] text-white',
            (!isCurrent || isOver) && 'bg-[var(--hover-bg)] text-theme-muted'
          )}
        >
          {isCurrent && !isOver ? (
            <>
              <PlayCircle className="w-4 h-4" />
              진행 중
            </>
          ) : isOver ? (
            <>종료 시각 지남</>
          ) : (
            <>
              <Clock className="w-4 h-4" />
              다음 일정
            </>
          )}
        </div>

        {/* 타이머: 일정 종료까지 남은 시간 */}
        <div className="text-center mb-2">
          <div
            className={cn(
              'text-5xl sm:text-6xl font-bold tabular-nums tracking-tight',
              isCurrent && !isOver && 'text-[var(--primary-point)]',
              (!isCurrent || isOver) && 'text-theme'
            )}
            aria-live="polite"
          >
            {focusTask.endTime ? formatRemaining(remainingSeconds) : '—'}
          </div>
          <p className="text-sm text-theme-muted mt-2">
            {focusTask.endTime ? (isOver ? '종료 시각이 지났어요' : '남은 시간') : '종료 시각 없음'}
          </p>
        </div>

        {/* 시간대 */}
        <div className="flex items-center gap-2 text-theme-muted text-sm mt-2 mb-6">
          <Clock className="w-4 h-4" />
          <span>
            {focusTask.startTime ?? '—'} ~ {focusTask.endTime ?? '—'}
          </span>
        </div>

        {/* 일정 제목 */}
        <h1 className="text-xl sm:text-2xl font-bold text-theme text-center max-w-md break-words">
          {focusTask.title}
        </h1>
        {focusTask.description && (
          <p className="text-sm text-theme-muted text-center mt-2 max-w-md line-clamp-3">
            {focusTask.description}
          </p>
        )}

        {/* 완료 버튼 (진행 중이거나 종료 시각 지난 경우) */}
        {(isCurrent || isOver) && (
          <button
            type="button"
            onClick={handleComplete}
            className="mt-8 flex items-center justify-center gap-2 px-6 py-3 rounded-neu bg-[var(--primary-point)] text-white font-medium hover:opacity-90 active:scale-[0.98] transition-transform"
          >
            <CheckCircle className="w-5 h-5" />
            완료하기
          </button>
        )}
      </div>
    </div>
  )
}
