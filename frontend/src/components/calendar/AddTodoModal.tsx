import { useState, useEffect, useRef } from 'react'
import { X, Calendar, Clock } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
import { useToastStore } from '@/stores/toastStore'
import { createSchedule } from '@/services/scheduleService'
import { formatDate, formatDateWithDay } from '@/utils/dateUtils'
import { cn } from '@/utils/cn'
import type { TodoPriority, TodoStatus } from '@/types/calendar'

interface AddTodoModalProps {
  isOpen: boolean
  onClose: () => void
  defaultDate?: Date
  /** 'sheet'면 오버레이 없이 폼만 렌더; 'card'면 모바일 슬라이드업 카드; 'panel'이면 PC 우측 패널 내장용(오버레이 없음) */
  variant?: 'modal' | 'sheet' | 'card' | 'panel'
}

export default function AddTodoModal({ isOpen, onClose, defaultDate, variant = 'modal' }: AddTodoModalProps) {
  const isCardLike = variant === 'card' || variant === 'modal'
  const isPanel = variant === 'panel'
  const { addTodo, selectedDate } = useCalendarStore()
  const { addToast } = useToastStore()
  const titleInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: formatDate(new Date()),
    endDate: '' as string,
    startTime: '',
    endTime: '',
    priority: 'medium' as TodoPriority,
    status: 'pending' as TodoStatus,
  })

  // 모달이 열릴 때마다 시작일을 캘린더 선택일(또는 defaultDate)로 반영
  useEffect(() => {
    if (!isOpen) return
    const baseDate = defaultDate ?? selectedDate ?? new Date()
    setFormData(prev => ({ ...prev, date: formatDate(baseDate) }))
  }, [isOpen, defaultDate, selectedDate])

  // 모바일 카드: 시트가 올라온 뒤 '새 일정' 입력창 자동 포커스 → 키보드 자동 올라옴
  useEffect(() => {
    if (!isOpen || variant !== 'card') return
    const t = setTimeout(() => titleInputRef.current?.focus(), 400)
    return () => clearTimeout(t)
  }, [isOpen, variant])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      addToast('제목을 입력해주세요')
      return
    }
    try {
      const endDate =
        formData.endDate && formData.endDate >= formData.date ? formData.endDate : undefined
      const saved = await createSchedule({
        title: formData.title,
        description: formData.description || undefined,
        date: formData.date,
        endDate,
        startTime: formData.startTime || undefined,
        endTime: formData.endTime || undefined,
        status: formData.status,
        priority: formData.priority,
        createdBy: 'user',
      })
      addTodo(saved)
    } catch (e) {
      console.error('일정 추가 실패:', e)
      addToast(`일정 추가 실패: ${e instanceof Error ? e.message : '알 수 없음'}`)
      return
    }
    setFormData({
      title: '',
      description: '',
      date: formatDate(new Date()),
      endDate: '',
      startTime: '',
      endTime: '',
      priority: 'medium',
      status: 'pending',
    })
    onClose()
  }

  useEffect(() => {
    if (!isOpen || variant !== 'modal') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isOpen, variant])

  if (!isOpen) return null

  /** 모바일용: 위아래 좁은 플랜카드 (자동 포커스, 큰 터치 영역, 하단 고정 저장 버튼) */
  const compactCardContent = variant === 'card' && (
    <div
      className="w-full overflow-hidden bg-theme-card theme-transition rounded-t-[20px] rounded-b-lg border border-t-0 border-black/8 dark:border-white/10 shadow-[var(--shadow-float)] min-w-0 flex flex-col"
      style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 날짜 헤더 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/6 dark:border-white/10 shrink-0">
        <span className="text-sm font-semibold text-theme tracking-tight">
          {formatDateWithDay(defaultDate ?? selectedDate ?? new Date())}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="btn-icon-tap flex items-center justify-center w-9 h-9 rounded-md text-theme-muted hover:text-theme hover:bg-black/5 dark:hover:bg-white/10"
          aria-label="닫기"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
        <div className="flex items-stretch gap-0 overflow-hidden border-b border-black/8 dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03]">
          <div className="w-1 shrink-0 self-stretch bg-primary-500 dark:bg-primary-400" aria-hidden />
          <div className="flex-1 min-w-0 flex flex-col gap-3 py-3 px-4">
            <input
              ref={titleInputRef}
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="새 일정"
              className="w-full min-h-[44px] px-3 py-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-theme text-theme text-base font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
              required
            />
            {/* 날짜: 터치 시 네이티브 휠/달력 팝업 — 터치 영역 확대 */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-theme-muted shrink-0">날짜</span>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="min-h-[44px] flex-1 min-w-0 px-3 py-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-theme text-theme text-sm"
                title="시작일"
              />
              <input
                type="date"
                value={formData.endDate}
                min={formData.date}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                placeholder="종료일"
                className="min-h-[44px] w-[120px] px-3 py-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-theme text-theme text-sm placeholder:text-theme-muted/70"
                title="종료일 (여러 날 일정)"
              />
            </div>
            {/* 시간: 터치 시 네이티브 시간 휠 — 터치 영역 확대 */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-theme-muted shrink-0">시간</span>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="min-h-[44px] flex-1 min-w-0 px-3 py-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-theme text-theme text-sm"
              />
              <span className="text-theme-muted">~</span>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="min-h-[44px] flex-1 min-w-0 px-3 py-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-theme text-theme text-sm"
              />
            </div>
          </div>
        </div>
        {/* 시트 하단 고정: 가로로 긴 저장 버튼 강조 */}
        <div
          className="shrink-0 flex gap-3 p-4 pt-3 border-t border-black/6 dark:border-white/10 bg-theme-card"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost-tap min-h-[48px] px-5 rounded-xl text-sm font-medium text-theme-muted border border-black/10 dark:border-white/10"
          >
            취소
          </button>
          <button
            type="submit"
            className="btn-action-press flex-1 min-h-[48px] rounded-xl text-base font-semibold text-white bg-primary-button shadow-[var(--shadow-float-sm)] hover:shadow-[var(--shadow-float)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
          >
            저장
          </button>
        </div>
      </form>
    </div>
  )

  const formContent = variant === 'card' ? compactCardContent : (
    <div
      className={cn(
        'w-full overflow-y-auto bg-theme-card theme-transition',
        variant === 'sheet' && 'rounded-t-[20px] max-h-[85vh]',
        isPanel && 'h-full flex flex-col border-0 shadow-none rounded-none',
        isCardLike && !isPanel && 'max-w-md max-h-[90vh] rounded-lg border border-black/8 dark:border-white/10 shadow-[var(--shadow-float)]'
      )}
      onClick={variant === 'modal' ? (e) => e.stopPropagation() : undefined}
    >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-black/6 dark:border-white/10">
          <h2 id="add-todo-modal-title" className="text-lg font-bold text-theme tracking-tight">새 일정 추가</h2>
          <button
            type="button"
            onClick={onClose}
            className="btn-icon-tap flex items-center justify-center min-w-[44px] min-h-[44px] p-2 rounded-md text-theme-muted hover:text-theme hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 제목 */}
          <div>
            <label className="block text-sm font-semibold text-theme mb-2">
              제목 *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="일정 제목을 입력하세요"
              className="input-field rounded-tool px-4 py-3 text-theme border-0 focus:ring-2 focus:ring-primary-500/30 focus:ring-offset-0"
              required
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-normal text-theme-muted mb-2">
              설명
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="일정에 대한 설명을 입력하세요 (선택사항)"
              className="input-field resize-none rounded-tool px-4 py-3 text-theme border-0 focus:ring-2 focus:ring-primary-500/30 focus:ring-offset-0"
              rows={3}
            />
          </div>

          {/* 날짜 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-theme mb-2">
                <Calendar className="w-4 h-4 inline mr-1.5 text-theme-muted" aria-hidden />
                시작일 *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="input-field rounded-tool px-4 py-3 text-theme border-0 focus:ring-2 focus:ring-primary-500/30 focus:ring-offset-0 w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-normal text-theme-muted mb-2">
                종료일 (선택, 여러 날 일정)
              </label>
              <input
                type="date"
                value={formData.endDate}
                min={formData.date}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="input-field rounded-tool px-4 py-3 text-theme border-0 focus:ring-2 focus:ring-primary-500/30 focus:ring-offset-0 w-full"
              />
            </div>
          </div>

          {/* 시간 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-theme mb-2">
                <Clock className="w-4 h-4 inline mr-1.5 text-theme-muted" aria-hidden />
                시작 시간
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="input-field rounded-tool px-4 py-3 text-theme border-0 focus:ring-2 focus:ring-primary-500/30 focus:ring-offset-0"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-theme mb-2">
                종료 시간
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="input-field rounded-tool px-4 py-3 text-theme border-0 focus:ring-2 focus:ring-primary-500/30 focus:ring-offset-0"
              />
            </div>
          </div>

          {/* 버튼 — DayDetailPanel 하단 버튼과 동일한 톤 */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost-tap flex-1 min-w-0 py-3.5 rounded-md text-sm font-medium text-theme border border-black/10 dark:border-white/10 bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
            >
              취소
            </button>
            <button
              type="submit"
              className="btn-action-press flex-1 min-w-0 py-3.5 rounded-md text-sm font-semibold text-white bg-primary-button shadow-[var(--shadow-float-sm)] hover:shadow-[var(--shadow-float)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-button)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-color)] active:scale-[0.98]"
            >
              추가하기
            </button>
          </div>
        </form>
    </div>
  )

  if (variant === 'sheet' || variant === 'card' || variant === 'panel') return formContent

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/60 backdrop-blur-sm theme-transition cursor-default"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-todo-modal-title"
    >
      {formContent}
    </div>
  )
}
