import { useState, useCallback, useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import { Wand2, Loader2, Check, Sparkles, CheckCircle2, RefreshCw, X } from 'lucide-react'
import { submitMagicBarCommand, requestJjajoPlanner, type SubmitMagicBarOptions } from '@/services/magicBarService'
import { useCalendarStore } from '@/stores/calendarStore'
import { createSchedule, deleteSchedule } from '@/services/scheduleService'
import { hapticLight, hapticSuccess, hapticWarn } from '@/utils/haptic'

export interface TemplateParams {
  start: number
  end: number
  blockMax: number
  breakMin: number
}

const PLACEHOLDER = '추가할 일정을 문장으로 입력해보세요. 예: 내일 오후 3시 회의, 다음 주 월요일 2시간 스터디'
const JJAJO_PLACEHOLDER =
  '오늘 할 일과 시간을 자연스럽게 적어보세요. 예: 알고리즘 문제 3시간 하고 그다음에 백엔드 작업 3시간 할 거야'

export interface MagicBarProps {
  /** 모바일 슬라이드업 시트 등에서 열릴 때 입력창 포커스 */
  autoFocus?: boolean
  /** 일정 추가/적용 성공 시 호출 (모바일 시트 닫기 등) */
  onSuccess?: () => void
}

export interface MagicBarHandle {
  focus: () => void
}

const MagicBar = forwardRef<MagicBarHandle, MagicBarProps>(function MagicBar({ autoFocus, onSuccess }, ref) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editMode, setEditMode] = useState(false)
  /** 짜조 모드에서 사용. 시간대/블록/휴식 기본값 */
  const [jjajoParams, setJjajoParams] = useState<TemplateParams>({ start: 13, end: 23, blockMax: 60, breakMin: 15 })
  const [lastPlannerCommand, setLastPlannerCommand] = useState<string | null>(null)
  const [lastPlannerSummary, setLastPlannerSummary] = useState<string | null>(null)
  /** 재생성 시 동일한 timeRange 및 블록/휴식 설정 유지 */
  const [lastPlannerOptions, setLastPlannerOptions] = useState<{
    timeRange?: { start: number; end: number }
    blockMaxMinutes?: number
    breakMinutesDefault?: number
  } | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const ghostPlans = useCalendarStore((s) => s.ghostPlans)
  const { applyGhostPlansReplaceDate, clearGhostPlans, deleteTodo, addTodo } = useCalendarStore()

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus()
    },
  }), [])

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => inputRef.current?.focus(), 100)
      return () => clearTimeout(t)
    }
  }, [autoFocus])

  const submit = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || loading) return

    setLoading(true)
    setMessage(null)

    const options: SubmitMagicBarOptions = editMode
      ? {
          editMode: true,
          timeRange: { start: jjajoParams.start, end: jjajoParams.end },
          blockMaxMinutes: jjajoParams.blockMax,
          breakMinutesDefault: jjajoParams.breakMin,
        }
      : { editMode }
    const result = await submitMagicBarCommand(trimmed, options)

    setLoading(false)
    if (result.success) {
      setInput('')
      setShowCelebration(true)
      hapticSuccess()
      setTimeout(() => setShowCelebration(false), 600)
      setTimeout(() => onSuccess?.(), 400)
      if ('isGhost' in result && result.isGhost && 'plansCount' in result) {
        setLastPlannerCommand(trimmed)
        setLastPlannerOptions(
          editMode && options.timeRange
            ? {
                timeRange: options.timeRange,
                blockMaxMinutes: options.blockMaxMinutes,
                breakMinutesDefault: options.breakMinutesDefault,
              }
            : null
        )
        setLastPlannerSummary(
          result && 'summary' in result && typeof result.summary === 'string' ? result.summary : null
        )
        setMessage({ type: 'success', text: `짜조가 ${result.plansCount}개 일정을 제안했어요. 확정하거나 수정해 보세요.` })
      } else if ('appliedCount' in result) {
        setMessage({ type: 'success', text: `${result.appliedCount}개 일정 적용됨` })
      }
      setTimeout(() => setMessage(null), 3000)
    } else {
      setMessage({ type: 'error', text: result.message })
    }
  }, [input, loading, editMode, jjajoParams])

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
    const { applied, removed } = applyGhostPlansReplaceDate()
    if (applied.length === 0) return

    const toDeleteOnServer = removed.filter((t) => t.id && !t.id.startsWith('opt-'))
    for (const todo of toDeleteOnServer) {
      if (!todo.id) continue
      try {
        await deleteSchedule(todo.id)
      } catch {
        // 서버 삭제 실패 시에도 프론트에서는 제거된 상태 유지
      }
    }

    for (const todo of applied) {
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
        addTodo({ ...saved, clientKey: todo.id })
      } catch {
        // 서버 저장 실패 시, 로컬 opt- 일정은 그대로 유지
      }
    }
    setLastPlannerCommand(null)
    setLastPlannerOptions(null)
    setShowCelebration(true)
    hapticSuccess()
    setTimeout(() => setShowCelebration(false), 600)
    setMessage({ type: 'success', text: `${applied.length}개 일정 확정됨 (해당 날짜 기존 일정은 대체됨)` })
    setTimeout(() => setMessage(null), 3000)
  }, [applyGhostPlansReplaceDate, deleteTodo, addTodo])

  const handleCancelGhost = useCallback(() => {
    hapticWarn()
    clearGhostPlans()
    setLastPlannerCommand(null)
    setLastPlannerSummary(null)
    setLastPlannerOptions(null)
  }, [clearGhostPlans])

  const handleRegenerateGhost = useCallback(async () => {
    if (!lastPlannerCommand?.trim()) return
    hapticLight()
    setLoading(true)
    setMessage(null)
    clearGhostPlans()
    const result = await requestJjajoPlanner(lastPlannerCommand, lastPlannerOptions ?? undefined)
    setLoading(false)
    if (result.success) {
      hapticSuccess()
      setMessage({ type: 'success', text: `다시 ${result.plansCount}개 일정 제안했어요.` })
      setTimeout(() => setMessage(null), 3000)
    } else {
      setMessage({ type: 'error', text: result.message })
    }
  }, [lastPlannerCommand, lastPlannerOptions, clearGhostPlans])

  return (
    <div ref={containerRef} className="w-full max-w-2xl mx-auto px-4 py-3 relative">
      {showCelebration && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10" aria-hidden>
          <div className="celebration-check flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 animate-celebration-bounce" />
          </div>
        </div>
      )}
      {editMode && (
        <p className="text-[11px] font-medium text-primary-500 mb-1.5 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" />
          할 일만 적으면 짜조가 시간을 배치해줄게요
        </p>
      )}
      <div
        className={`
          flex items-center gap-3 rounded-tool bg-theme-card border border-[var(--border-color)] theme-transition
          ${message?.type === 'error'
            ? 'ring-2 ring-red-400/30'
            : ''
          }
          ${editMode ? 'ring-2 ring-primary-500/40 animate-[pulse_1.5s_ease-in-out_1]' : ''}
          focus-within:ring-2 focus-within:ring-primary-500/15
        `}
      >
        {/* 마법봉: 클릭 시 짜조 모드 토글 + 입력 포커스 (네온 테두리는 입력 전체에만 적용) */}
        <button
          type="button"
          onClick={handleWandClick}
          className={`
            touch-target flex-shrink-0 flex items-center justify-center min-w-[44px] min-h-[44px] w-10 h-10 rounded-full transition-all duration-200
            ${editMode
              ? 'text-primary-500'
              : 'text-theme-muted hover:text-theme active:scale-[0.98]'
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
            touch-target flex-shrink-0 flex items-center justify-center gap-2 min-w-[44px] min-h-[44px] px-4 py-2.5 rounded-tool font-medium text-sm
            ${hasValue && !loading
              ? 'btn-action-press bg-primary-500 text-white hover:bg-primary-600 active:scale-[0.98] disabled:transform-none'
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

      {editMode && (
        <div className="mt-2 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-theme-muted">
            <span className="inline-flex items-center gap-1 shrink-0">
              <span>시간대</span>
              <input
                type="number"
                min={0}
                max={23}
                value={jjajoParams.start}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(23, Number(e.target.value) || 0))
                  setJjajoParams({ ...jjajoParams, start: v })
                }}
                className="w-10 rounded px-1 py-0.5 text-center bg-theme-bg border border-theme-border text-theme"
                aria-label="시작 시"
              />
              <span>~</span>
              <input
                type="number"
                min={0}
                max={24}
                value={jjajoParams.end}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(24, Number(e.target.value) || 0))
                  setJjajoParams({ ...jjajoParams, end: v })
                }}
                className="w-10 rounded px-1 py-0.5 text-center bg-theme-bg border border-theme-border text-theme"
                aria-label="끝 시"
              />
              <span>시</span>
            </span>
            <span className="inline-flex items-center gap-1 shrink-0">
              <span>블록</span>
              <input
                type="number"
                min={15}
                max={180}
                step={15}
                value={jjajoParams.blockMax}
                onChange={(e) => {
                  const v = Math.max(15, Math.min(180, Number(e.target.value) || 60))
                  setJjajoParams({ ...jjajoParams, blockMax: v })
                }}
                className="w-12 rounded px-1 py-0.5 text-center bg-theme-bg border border-theme-border text-theme"
                aria-label="블록 분"
              />
              <span>분</span>
            </span>
            <span className="inline-flex items-center gap-1 shrink-0">
              <span>휴식</span>
              <input
                type="number"
                min={0}
                max={30}
                step={5}
                value={jjajoParams.breakMin}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(30, Number(e.target.value) || 0))
                  setJjajoParams({ ...jjajoParams, breakMin: v })
                }}
                className="w-10 rounded px-1 py-0.5 text-center bg-theme-bg border border-theme-border text-theme"
                aria-label="휴식 분"
              />
              <span>분</span>
            </span>
          </div>
        </div>
      )}

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
        <div className="mt-3 space-y-2 animate-fadeIn">
          {lastPlannerSummary && (
            <p className="text-xs text-theme-muted text-center px-2 py-1.5 rounded-tool bg-theme-bg/80 border border-theme-border/50">
              📌 {lastPlannerSummary}
            </p>
          )}
          <div className="flex items-center justify-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleConfirmGhost}
            className="touch-target flex items-center gap-2 px-4 py-2 rounded-tool bg-primary-500 text-white font-medium text-sm hover:bg-primary-600 active:scale-[0.98] transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            확정
          </button>
          <button
            type="button"
            onClick={handleRegenerateGhost}
            disabled={loading || !lastPlannerCommand}
            className="touch-target flex items-center gap-2 px-4 py-2 rounded-tool neu-float-sm text-theme font-medium text-sm hover:shadow-neu-inset-hover active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            다시 생성
          </button>
          <button
            type="button"
            onClick={handleCancelGhost}
            className="touch-target flex items-center gap-2 px-4 py-2 rounded-tool neu-float-sm text-theme-muted font-medium text-sm hover:shadow-neu-inset-hover active:scale-[0.98] transition-all"
          >
            <X className="w-4 h-4" />
            취소
          </button>
          </div>
        </div>
      )}
    </div>
  )
})

export default MagicBar
