import { useState, useCallback, useRef } from 'react'
import { Wand2, Loader2, Check, Sparkles, CheckCircle2, RefreshCw, X } from 'lucide-react'
import { submitMagicBarCommand, requestJjajoPlanner } from '@/services/magicBarService'
import { useCalendarStore } from '@/stores/calendarStore'
import { createSchedule } from '@/services/scheduleService'

/** 구체적인 예시로 입력 가이드 제공 */
const PLACEHOLDER = '예: 내일 오후 3시 회의, 다음 주 월요일 2시간 스터디'
const JJAJO_PLACEHOLDER = '예: 오늘 6시간 공부 짜줘, 할 일 계획해줘'

export default function MagicBar() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [lastPlannerCommand, setLastPlannerCommand] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const ghostPlans = useCalendarStore((s) => s.ghostPlans)
  const { confirmGhostPlans, clearGhostPlans, deleteTodo, addTodo } = useCalendarStore()

  const submit = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || loading) return

    setLoading(true)
    setMessage(null)

    const result = await submitMagicBarCommand(trimmed, { editMode })

    setLoading(false)
    if (result.success) {
      setInput('')
      if ('isGhost' in result && result.isGhost && 'plansCount' in result) {
        setLastPlannerCommand(trimmed)
        setMessage({ type: 'success', text: `짜조가 ${result.plansCount}개 일정을 제안했어요. 확정하거나 수정해 보세요.` })
      } else if ('appliedCount' in result) {
        setMessage({ type: 'success', text: `${result.appliedCount}개 일정 적용됨` })
      }
      setTimeout(() => setMessage(null), 3000)
    } else {
      setMessage({ type: 'error', text: result.message })
    }
  }, [input, loading, editMode])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  const hasValue = input.trim().length > 0

  const handleWandClick = useCallback(() => {
    setEditMode((prev) => !prev)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  const handleConfirmGhost = useCallback(async () => {
    const confirmed = confirmGhostPlans()
    if (confirmed.length === 0) return
    for (const todo of confirmed) {
      try {
        const saved = await createSchedule({
          title: todo.title,
          description: todo.description ?? '',
          date: todo.date,
          startTime: todo.startTime ?? undefined,
          endTime: todo.endTime ?? undefined,
          status: 'pending',
          priority: 'medium',
          createdBy: 'ai',
        })
        deleteTodo(todo.id)
        addTodo(saved)
      } catch {
        addTodo(todo)
      }
    }
    setLastPlannerCommand(null)
    setMessage({ type: 'success', text: `${confirmed.length}개 일정 확정됨` })
    setTimeout(() => setMessage(null), 3000)
  }, [confirmGhostPlans, deleteTodo, addTodo])

  const handleCancelGhost = useCallback(() => {
    clearGhostPlans()
    setLastPlannerCommand(null)
  }, [clearGhostPlans])

  const handleRegenerateGhost = useCallback(async () => {
    if (!lastPlannerCommand?.trim()) return
    setLoading(true)
    setMessage(null)
    clearGhostPlans()
    const result = await requestJjajoPlanner(lastPlannerCommand)
    setLoading(false)
    if (result.success) {
      setMessage({ type: 'success', text: `다시 ${result.plansCount}개 일정 제안했어요.` })
      setTimeout(() => setMessage(null), 3000)
    } else {
      setMessage({ type: 'error', text: result.message })
    }
  }, [lastPlannerCommand, clearGhostPlans])

  return (
    <div ref={containerRef} className="w-full max-w-2xl mx-auto px-4 py-3">
      <div
        className={`
          flex items-center gap-3 rounded-neu neu-inset theme-transition
          ${message?.type === 'error'
            ? 'ring-2 ring-red-400/30'
            : ''
          }
          ${editMode ? 'ring-2 ring-primary-500/40 animate-[pulse_1.5s_ease-in-out_1]' : ''}
          focus-within:ring-2 focus-within:ring-primary-500/15
        `}
      >
        {/* 마법봉: 클릭 시 짜조 모드 토글 + 테두리 강조 + 입력 포커스 */}
        <button
          type="button"
          onClick={handleWandClick}
          className={`
            touch-target flex-shrink-0 flex items-center justify-center min-w-[44px] min-h-[44px] w-10 h-10 rounded-neu transition-all duration-200
            ${editMode
              ? 'neu-date-selected text-primary-500 ring-2 ring-primary-500/50'
              : 'neu-float-sm text-theme-muted hover:text-theme hover:shadow-neu-inset-hover active:scale-[0.98]'
            }
          `}
          aria-pressed={editMode}
          aria-label={editMode ? '짜조 모드 (끄려면 클릭)' : '짜조 모드 (켜려면 클릭)'}
        >
          <Wand2 className="w-5 h-5" strokeWidth={1.8} />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={editMode ? JJAJO_PLACEHOLDER : PLACEHOLDER}
          disabled={loading}
          className="flex-1 min-w-0 py-3 pr-2 bg-transparent text-theme placeholder:text-theme-muted text-sm outline-none disabled:opacity-60 theme-transition"
          aria-label="일정 추가·수정·짜조 계획"
        />

        <button
          type="button"
          onClick={submit}
          disabled={loading || !hasValue}
          className={`
            touch-target flex-shrink-0 flex items-center justify-center gap-2 min-w-[44px] min-h-[44px] px-4 py-2.5 rounded-neu font-medium text-sm
            transition-all duration-200
            ${hasValue && !loading
              ? 'bg-primary-500 text-white hover:bg-primary-600 active:scale-[0.98]'
              : 'neu-float-sm text-theme-muted cursor-not-allowed'
            }
            ${loading ? 'bg-primary-500/80 text-white cursor-wait' : ''}
          `}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="w-4 h-4" aria-hidden />
          )}
          <span className="hidden sm:inline">{loading ? '처리 중' : editMode ? '적용' : '추가'}</span>
        </button>
      </div>

      {message && (
        <div
          role="alert"
          className={`
            mt-2 flex items-center gap-2 text-xs animate-fadeIn
            ${message.type === 'success' ? 'text-emerald-400' : 'text-red-400'}
          `}
        >
          {message.type === 'success' ? (
            <Check className="w-3.5 h-3.5 flex-shrink-0 text-emerald-500" />
          ) : null}
          <span>{message.text}</span>
        </div>
      )}

      {/* 고스트 일정이 있을 때만 플로팅 액션 바 */}
      {ghostPlans.length > 0 && (
        <div className="mt-3 flex items-center justify-center gap-2 flex-wrap animate-fadeIn">
          <button
            type="button"
            onClick={handleConfirmGhost}
            className="touch-target flex items-center gap-2 px-4 py-2 rounded-neu bg-primary-500 text-white font-medium text-sm hover:bg-primary-600 active:scale-[0.98] transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            확정
          </button>
          <button
            type="button"
            onClick={handleRegenerateGhost}
            disabled={loading || !lastPlannerCommand}
            className="touch-target flex items-center gap-2 px-4 py-2 rounded-neu neu-float-sm text-theme font-medium text-sm hover:shadow-neu-inset-hover active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            다시 생성
          </button>
          <button
            type="button"
            onClick={handleCancelGhost}
            className="touch-target flex items-center gap-2 px-4 py-2 rounded-neu neu-float-sm text-theme-muted font-medium text-sm hover:shadow-neu-inset-hover active:scale-[0.98] transition-all"
          >
            <X className="w-4 h-4" />
            취소
          </button>
        </div>
      )}
    </div>
  )
}
