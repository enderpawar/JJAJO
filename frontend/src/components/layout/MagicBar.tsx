import { useState, useCallback } from 'react'
import { Wand2, Loader2, Check, Sparkles } from 'lucide-react'
import { submitMagicBarCommand } from '@/services/magicBarService'

/** 구체적인 예시로 입력 가이드 제공 */
const PLACEHOLDER = '예: 내일 오후 3시 회의, 다음 주 월요일 2시간 스터디'

export default function MagicBar() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editMode, setEditMode] = useState(false)

  const submit = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || loading) return

    setLoading(true)
    setMessage(null)

    // 순수 추가는 parse-schedule 우선, 수정/삭제는 edit-schedule
    const result = await submitMagicBarCommand(trimmed)

    setLoading(false)
    if (result.success) {
      setInput('')
      if ('appliedCount' in result) {
        setMessage({ type: 'success', text: `${result.appliedCount}개 일정 적용됨` })
      }
      setTimeout(() => setMessage(null), 3000)
    } else {
      setMessage({ type: 'error', text: result.message })
    }
  }, [input, loading])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  const hasValue = input.trim().length > 0

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-3">
      <div
        className={`
          flex items-center gap-3 rounded-neu neu-inset theme-transition
          ${message?.type === 'error'
            ? 'ring-2 ring-red-400/30'
            : ''
          }
          focus-within:ring-2 focus-within:ring-primary-500/15
        `}
      >
        {/* 마법봉: 클릭 시 대화 모드 토글 - 활성화 시 주황 포인트 */}
        <button
          type="button"
          onClick={() => setEditMode((prev) => !prev)}
          className={`
            touch-target flex-shrink-0 flex items-center justify-center min-w-[44px] min-h-[44px] w-10 h-10 rounded-neu transition-all duration-200
            ${editMode
              ? 'neu-date-selected text-primary-500'
              : 'neu-float-sm text-theme-muted hover:text-theme hover:shadow-neu-inset-hover active:scale-[0.98]'
            }
          `}
          aria-pressed={editMode}
          aria-label={editMode ? '대화형 수정 모드 (끄려면 클릭)' : '대화형 수정 모드 (켜려면 클릭)'}
        >
          <Wand2 className="w-5 h-5" strokeWidth={1.8} />
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDER}
          disabled={loading}
          className="flex-1 min-w-0 py-3 pr-2 bg-transparent text-theme placeholder:text-theme-muted text-sm outline-none disabled:opacity-60 theme-transition"
          aria-label="일정 추가·수정·삭제"
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
    </div>
  )
}
