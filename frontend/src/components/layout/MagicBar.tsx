import { useState, useCallback, useRef } from 'react'
import { Wand2, Loader2, Check, Sparkles, CheckCircle2, RefreshCw, X, BookOpen, Code, Dumbbell, Coffee } from 'lucide-react'
import { submitMagicBarCommand, requestJjajoPlanner } from '@/services/magicBarService'
import { useCalendarStore } from '@/stores/calendarStore'
import { createSchedule, deleteSchedule } from '@/services/scheduleService'

type JjajoTemplateCategory = 'study' | 'workout' | 'coding' | 'rest'

export interface TemplateParams {
  start: number
  end: number
  blockMax: number
  breakMin: number
}

const DEFAULT_TEMPLATE_PARAMS: Record<JjajoTemplateCategory, TemplateParams> = {
  study: { start: 13, end: 23, blockMax: 90, breakMin: 15 },
  workout: { start: 18, end: 22, blockMax: 60, breakMin: 10 },
  coding: { start: 14, end: 22, blockMax: 90, breakMin: 10 },
  rest: { start: 19, end: 23, blockMax: 60, breakMin: 0 },
}

const JJAJO_TEMPLATE_STRINGS: Record<JjajoTemplateCategory, string> = {
  study: [
    '오늘 {{start}}~{{end}}시 공부 플랜 짜줘. ',
    '상황: 시험/과제가 있고, 오후에 집중이 잘 되고 밤에는 집중이 떨어져. ',
    '해야 할 일: (사용자가 적은 목표 또는) ① 고난이도 과제 ② 이론 복습 ③ 기출/연습. ',
    '제약: 고집중 블록은 최대 {{blockMax}}분, 각 블록 뒤 {{breakMin}}분 휴식. 밤 21시 이후에는 난이도 낮은 작업만 배치. ',
    '출력: 30분 단위로 시간대-활동-세부 목표-예상 피로도(1~5) 형식으로 정리하고, summary에 오늘 최우선 할 일 2~3가지를 한 줄로 요약해줘.'
  ].join(''),
  workout: [
    '오늘 {{start}}~{{end}}시 운동 플랜 짜줘. ',
    '상황: 주 3회 웨이트 초보자, 하체/유산소 위주로 하고 싶어. ',
    '목표: 부상 없이 체력 기르기, 과훈련 방지. ',
    '구성 희망: 워밍업 → 메인 운동(스쿼트·런지 등) → 코어 → 가벼운 유산소 → 스트레칭. ',
    '제약: 고강도 세트는 {{blockMax}}분 이내, 세트 사이 휴식 {{breakMin}}분, 전체 90분 이내. ',
    '출력: 10~20분 단위 블록으로 시간대-운동 내용-세트/횟수-난이도(1~5) 형식으로 짜주고, summary에 오늘 운동 목표 한 줄 요약해줘.'
  ].join(''),
  coding: [
    '오늘 {{start}}~{{end}}시 사이드 프로젝트/업무 코딩 플랜 짜줘. ',
    '상황: 리팩토링·버그 수정·신규 개발이 섞여 있고, 깊이 몰입하는 시간은 오후가 좋아. ',
    '해야 할 일: (사용자가 적은 목표 또는) ① 핵심 리팩토링 ② 버그 수정 ③ 테스트/문서. ',
    '제약: 딥워크 블록은 {{blockMax}}분 이내, 블록 사이 {{breakMin}}분 휴식. 가벼운 작업은 저녁에 배치. ',
    '출력: 60분 이하 블록으로 시간대-작업-구체 목표(PR 단위)-난이도/피로도(1~5) 적고, summary에 오늘 반드시 끝낼 것 2~3가지 한 줄로 요약해줘.'
  ].join(''),
  rest: [
    '오늘 {{start}}~{{end}}시 회복/휴식 플랜 짜줘. ',
    '상황: 낮에 과하게 일해서 피곤하고, 내일 아침 중요한 일이 있어. ',
    '목표: 과로를 더 키우지 않고, 수면의 질을 올리기. ',
    '희망 활동: 가벼운 산책, 스트레칭, 독서, 일기/리뷰, 내일 준비. ',
    '제약: 카페인·자극 콘텐츠 21시 이후 금지, 디지털 기기는 취침 1시간 전까지만. ',
    '출력: 30분 단위로 시간대-활동-목적(휴식/정리/준비)-수면 영향(+) 적고, summary에 오늘 회복 목표 한 줄 요약해줘.'
  ].join(''),
}

function fillTemplate(category: JjajoTemplateCategory, params: TemplateParams): string {
  const raw = JJAJO_TEMPLATE_STRINGS[category]
  return raw
    .replace(/\{\{start\}\}/g, String(params.start))
    .replace(/\{\{end\}\}/g, String(params.end))
    .replace(/\{\{blockMax\}\}/g, String(params.blockMax))
    .replace(/\{\{breakMin\}\}/g, String(params.breakMin))
}

const PLACEHOLDER = '말만 하면 짜조가 일정 짜줄게요. 예: 내일 오후 3시 회의, 다음 주 월요일 2시간 스터디'
const JJAJO_PLACEHOLDER = "할 일을 쉼표로 구분해서 넣어주세요. 예: 과제, 오답노트, 이론 복습 → 짜조가 시간 배치해줄게요"

const TEMPLATE_OPTIONS: { key: JjajoTemplateCategory; label: string; icon: typeof BookOpen; color: string }[] = [
  { key: 'study', label: '공부 템플릿', icon: BookOpen, color: 'blue' },
  { key: 'coding', label: '코딩/업무 템플릿', icon: Code, color: 'indigo' },
  { key: 'workout', label: '운동 템플릿', icon: Dumbbell, color: 'emerald' },
  { key: 'rest', label: '휴식 템플릿', icon: Coffee, color: 'teal' },
]

export default function MagicBar() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<JjajoTemplateCategory | null>(null)
  const [lastPlannerCommand, setLastPlannerCommand] = useState<string | null>(null)
  const [lastPlannerSummary, setLastPlannerSummary] = useState<string | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const ghostPlans = useCalendarStore((s) => s.ghostPlans)
  const { applyGhostPlansReplaceDate, clearGhostPlans, deleteTodo, addTodo } = useCalendarStore()

  const submit = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || loading) return

    setLoading(true)
    setMessage(null)

    const result = await submitMagicBarCommand(trimmed, {
      editMode,
      templateCategory: selectedTemplateCategory ?? undefined,
    })

    setLoading(false)
    if (result.success) {
      setInput('')
      setShowCelebration(true)
      setTimeout(() => setShowCelebration(false), 600)
      if ('isGhost' in result && result.isGhost && 'plansCount' in result) {
        setLastPlannerCommand(trimmed)
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
  }, [input, loading, editMode, selectedTemplateCategory])

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

  const [templateParams, setTemplateParams] = useState<TemplateParams | null>(null)

  const handleApplyTemplate = useCallback((category: JjajoTemplateCategory) => {
    setEditMode(true)
    setSelectedTemplateCategory(category)
    const params = DEFAULT_TEMPLATE_PARAMS[category]
    setTemplateParams(params)
    setInput(fillTemplate(category, params))
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  const applyTemplateParams = useCallback(
    (category: JjajoTemplateCategory, params: TemplateParams) => {
      setInput(fillTemplate(category, params))
    },
    []
  )

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
        addTodo(saved)
      } catch {
        // 서버 저장 실패 시, 로컬 opt- 일정은 그대로 유지
      }
    }
    setLastPlannerCommand(null)
    setShowCelebration(true)
    setTimeout(() => setShowCelebration(false), 600)
    setMessage({ type: 'success', text: `${applied.length}개 일정 확정됨 (해당 날짜 기존 일정은 대체됨)` })
    setTimeout(() => setMessage(null), 3000)
  }, [applyGhostPlansReplaceDate, deleteTodo, addTodo])

  const handleCancelGhost = useCallback(() => {
    clearGhostPlans()
    setLastPlannerCommand(null)
    setLastPlannerSummary(null)
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
          flex items-center gap-3 rounded-tool neu-inset theme-transition
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
            touch-target flex-shrink-0 flex items-center justify-center min-w-[44px] min-h-[44px] w-10 h-10 rounded-tool transition-all duration-200
            bg-theme-card border border-[var(--border-color)]
            ${editMode
              ? 'text-primary-500 border-primary-500/50 ring-2 ring-primary-500/30'
              : 'text-theme-muted hover:text-theme hover:border-[var(--text-muted)]/40 hover:bg-black/[0.03] dark:hover:bg-white/[0.06] active:scale-[0.98]'
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
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="text-theme-muted">짜조 템플릿:</span>
            {TEMPLATE_OPTIONS.map((opt) => {
              const Icon = opt.icon
              const isSelected = selectedTemplateCategory === opt.key
              const colorMap = {
                blue: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-500/40' },
                indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', ring: 'ring-indigo-500/40' },
                emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-500/40' },
                teal: { bg: 'bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400', ring: 'ring-teal-500/40' },
              } as const
              const c = colorMap[opt.color as keyof typeof colorMap] ?? colorMap.blue
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleApplyTemplate(opt.key)}
                  className={`group inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-tool neu-float-sm transition-all duration-200
                    hover:scale-[1.02] active:scale-[0.98]
                    ${isSelected ? `${c.bg} ${c.text} ring-1 ${c.ring}` : 'text-theme-muted hover:shadow-neu-inset-hover hover:text-theme'}
                  `}
                >
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 group-hover:rotate-6 ${isSelected ? c.text : ''}`} />
                  {opt.label}
                </button>
              )
            })}
          </div>
          {selectedTemplateCategory && templateParams && (
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-theme-muted">
              <span>시간대</span>
              <input
                type="number"
                min={0}
                max={23}
                value={templateParams.start}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(23, Number(e.target.value) || 0))
                  const next = { ...templateParams, start: v }
                  setTemplateParams(next)
                  applyTemplateParams(selectedTemplateCategory, next)
                }}
                className="w-10 rounded px-1 py-0.5 text-center bg-theme-bg border border-theme-border text-theme"
              />
              <span>~</span>
              <input
                type="number"
                min={0}
                max={24}
                value={templateParams.end}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(24, Number(e.target.value) || 0))
                  const next = { ...templateParams, end: v }
                  setTemplateParams(next)
                  applyTemplateParams(selectedTemplateCategory, next)
                }}
                className="w-10 rounded px-1 py-0.5 text-center bg-theme-bg border border-theme-border text-theme"
              />
              <span>시</span>
              <span className="ml-1">블록</span>
              <input
                type="number"
                min={15}
                max={180}
                step={15}
                value={templateParams.blockMax}
                onChange={(e) => {
                  const v = Math.max(15, Math.min(180, Number(e.target.value) || 60))
                  const next = { ...templateParams, blockMax: v }
                  setTemplateParams(next)
                  applyTemplateParams(selectedTemplateCategory, next)
                }}
                className="w-12 rounded px-1 py-0.5 text-center bg-theme-bg border border-theme-border text-theme"
              />
              <span>분</span>
              <span className="ml-1">휴식</span>
              <input
                type="number"
                min={0}
                max={30}
                step={5}
                value={templateParams.breakMin}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(30, Number(e.target.value) || 0))
                  const next = { ...templateParams, breakMin: v }
                  setTemplateParams(next)
                  applyTemplateParams(selectedTemplateCategory, next)
                }}
                className="w-10 rounded px-1 py-0.5 text-center bg-theme-bg border border-theme-border text-theme"
              />
              <span>분</span>
            </div>
          )}
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
}
