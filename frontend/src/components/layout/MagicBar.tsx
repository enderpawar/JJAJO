import { useState, useCallback, useRef } from 'react'
import { Wand2, Loader2, Check, Sparkles, CheckCircle2, RefreshCw, X } from 'lucide-react'
import { submitMagicBarCommand, requestJjajoPlanner } from '@/services/magicBarService'
import { useCalendarStore } from '@/stores/calendarStore'
import { createSchedule, deleteSchedule } from '@/services/scheduleService'

type JjajoTemplateCategory = 'study' | 'workout' | 'coding' | 'rest'

/** 구체적인 예시로 입력 가이드 제공 */
const PLACEHOLDER = '예: 내일 오후 3시 회의, 다음 주 월요일 2시간 스터디'
const JJAJO_PLACEHOLDER = '예: 오늘 6시간 공부 짜줘, 할 일 계획해줘'
const JJAJO_TEMPLATES: Record<JjajoTemplateCategory, string> = {
  study: [
    '오늘 13~23시 공부 플랜 짜줘. ',
    '상황: CS 시험 D-7, 오후(13~17시)에 집중 잘 되고 밤에는 집중이 떨어져. ',
    '해야 할 일: ① 알고리즘 문제 3문제(중요도5, 난이도5) ② CS 이론 복습 2시간(5,4) ③ 기출 풀이 2시간(4,4). ',
    '제약: 고집중 블록(난이도≥4)은 최대 90분, 각 블록 뒤 15분 휴식. 밤 21시 이후에는 난이도≤3 작업만 배치. ',
    '출력: 30분 단위 시각표로 `시간대-활동-세부 목표-예상 피로도(1~5)` 형식으로 정리하고, 맨 위에 최우선 할 일 TOP3도 bullets로 요약해줘.'
  ].join(''),
  workout: [
    '오늘 18~22시 기준으로 운동 중심 플랜 짜줘. ',
    '상황: 주 3회 웨이트를 하는 초보자, 오늘은 하체/유산소 위주로 하고 싶어. ',
    '목표: 부상 없이 체력 기르기, 과훈련 방지. ',
    '구성 희망: 워밍업 → 메인 운동(스쿼트·런지 등) → 코어 → 가벼운 유산소 → 스트레칭. ',
    '제약: 고강도 세트는 연속 40분 이내, 세트 사이 휴식 2~3분, 전체 운동 시간 90분 이내. ',
    '출력: 10~20분 단위 블록으로 `시간대-운동 내용-세트/횟수-난이도(1~5)` 형식으로 짜주고, 과한 부분이 있으면 코멘트로 조정 의견도 적어줘.'
  ].join(''),
  coding: [
    '오늘 14~22시 사이드 프로젝트 코딩 플랜 짜줘. ',
    '상황: 프론트엔드 리팩토링과 버그 수정이 섞여 있고, 깊이 몰입하는 시간은 오후 2~6시가 좋아. ',
    '해야 할 일: ① 매직바 짜조 모드 리팩토링(중요도5, 난이도4) ② 캘린더 버그 3개 수정(4,4) ③ 단위 테스트 보강 1시간(3,3) ④ 문서 정리 1시간(3,2). ',
    '제약: 딥워크 코딩 블록은 90분 이내, 블록 사이 10~15분 휴식. 회의나 가벼운 작업은 에너지 낮은 시간대(저녁)에 배치. ',
    '출력: 60분 이하 블록들로 `시간대-작업-구체 목표(PR 단위)-예상 난이도/피로도(1~5)`를 적고, 맨 아래에 “오늘 반드시 끝낼 것 3개”를 다시 정리해줘.'
  ].join(''),
  rest: [
    '오늘 19~23시 회복/휴식 중심 플랜 짜줘. ',
    '상황: 낮에 과하게 일해서 정신적으로 피곤하고, 내일 아침 일찍 중요한 일이 있어. ',
    '목표: 과로를 더 키우지 않고, 수면의 질을 최대한 올리기. ',
    '희망 활동: 가벼운 산책, 스트레칭, 독서, 일기/리뷰, 내일 준비. ',
    '제약: 카페인·자극적인 콘텐츠는 21시 이후 금지, 디지털 기기는 취침 1시간 전까지만 사용. ',
    '출력: 30분 단위로 `시간대-활동-목적(휴식/정리/준비 등)-수면에 미치는 영향(+)`을 적고, 맨 아래에 오늘을 3줄로 돌아보는 리캡 프롬프트도 만들어줘.'
  ].join(''),
}

const TEMPLATE_OPTIONS: { key: JjajoTemplateCategory; label: string }[] = [
  { key: 'study', label: '공부 템플릿' },
  { key: 'coding', label: '코딩/업무 템플릿' },
  { key: 'workout', label: '운동 템플릿' },
  { key: 'rest', label: '휴식 템플릿' },
]

export default function MagicBar() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<JjajoTemplateCategory | null>(null)
  const [lastPlannerCommand, setLastPlannerCommand] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const ghostPlans = useCalendarStore((s) => s.ghostPlans)
  const { applyGhostPlansReplaceDate, clearGhostPlans, deleteTodo, addTodo } = useCalendarStore()

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

  const handleApplyTemplate = useCallback((category: JjajoTemplateCategory) => {
    setEditMode(true)
    setSelectedTemplateCategory(category)
    setInput(JJAJO_TEMPLATES[category])
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  const handleConfirmGhost = useCallback(async () => {
    const { applied, removed } = applyGhostPlansReplaceDate()
    if (applied.length === 0) return

    for (const todo of removed) {
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
        addTodo(saved)
      } catch {
        // 서버 저장 실패 시, 로컬 opt- 일정은 그대로 유지
      }
    }
    setLastPlannerCommand(null)
    setMessage({ type: 'success', text: `${applied.length}개 일정 확정됨 (해당 날짜 기존 일정은 대체됨)` })
    setTimeout(() => setMessage(null), 3000)
  }, [applyGhostPlansReplaceDate, deleteTodo, addTodo])

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

      {editMode && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="text-theme-muted">짜조 템플릿:</span>
          {TEMPLATE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => handleApplyTemplate(opt.key)}
              className={`inline-flex items-center justify-center px-2 py-1 rounded-neu neu-float-sm transition-all
                ${selectedTemplateCategory === opt.key
                  ? 'bg-primary-500/10 text-primary-500 ring-1 ring-primary-500/40'
                  : 'text-theme-muted hover:shadow-neu-inset-hover hover:text-theme'
                }
              `}
            >
              {opt.label}
            </button>
          ))}
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
