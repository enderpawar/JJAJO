import { useState, useCallback } from 'react'
import { Wand2, Loader2, Check, Sparkles } from 'lucide-react'
import { parseAndAddSchedule } from '@/services/magicBarService'

const PLACEHOLDER = '한 줄로 일정 추가 (예: 내일 오후 3시부터 2시간 동안 팀 프로젝트 회의)'

export default function MagicBar() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const submit = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || loading) return

    setLoading(true)
    setMessage(null)

    const result = await parseAndAddSchedule(trimmed)

    setLoading(false)
    if (result.success) {
      setInput('')
      setMessage({ type: 'success', text: `"${result.todo.title}" 추가됨` })
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
          flex items-center gap-3 rounded-xl border transition-all duration-200
          bg-notion-sidebar/90 backdrop-blur-sm
          ${message?.type === 'error'
            ? 'border-red-500/40 shadow-[0_0_0_1px_rgba(239,68,68,0.2)]'
            : 'border-notion-border hover:border-notion-muted/50'
          }
          focus-within:border-primary-500/50 focus-within:shadow-[0_0_0_2px_rgba(255,107,0,0.15)]
        `}
      >
        {/* 아이콘 영역: 부드러운 강조 */}
        <div
          className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-primary-500/10 text-primary-500"
          aria-hidden
        >
          <Wand2 className="w-5 h-5" strokeWidth={1.8} />
        </div>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDER}
          disabled={loading}
          className="flex-1 min-w-0 py-3 pr-2 bg-transparent text-notion-text placeholder:text-notion-muted/80 text-sm outline-none disabled:opacity-60 placeholder:transition-opacity focus:placeholder:opacity-60"
          aria-label="한 줄로 일정 추가"
        />

        <button
          type="button"
          onClick={submit}
          disabled={loading || !hasValue}
          className={`
            flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm
            transition-all duration-200
            ${hasValue && !loading
              ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-sm hover:shadow'
              : 'bg-notion-hover text-notion-muted cursor-not-allowed'
            }
            ${loading ? 'bg-primary-500/80 text-white cursor-wait' : ''}
          `}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="w-4 h-4" aria-hidden />
          )}
          <span className="hidden sm:inline">{loading ? '처리 중' : '추가'}</span>
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
