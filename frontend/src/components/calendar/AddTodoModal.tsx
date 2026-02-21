import { useState, useEffect } from 'react'
import { X, Calendar, Clock } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
import { useToastStore } from '@/stores/toastStore'
import { createSchedule } from '@/services/scheduleService'
import { formatDate } from '@/utils/dateUtils'
import type { TodoPriority, TodoStatus } from '@/types/calendar'

interface AddTodoModalProps {
  isOpen: boolean
  onClose: () => void
  defaultDate?: Date
}

export default function AddTodoModal({ isOpen, onClose, defaultDate }: AddTodoModalProps) {
  const { addTodo } = useCalendarStore()
  const { addToast } = useToastStore()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: defaultDate ? formatDate(defaultDate) : formatDate(new Date()),
    startTime: '',
    endTime: '',
    priority: 'medium' as TodoPriority,
    status: 'pending' as TodoStatus,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      addToast('제목을 입력해주세요')
      return
    }
    try {
      const saved = await createSchedule({
        title: formData.title,
        description: formData.description || undefined,
        date: formData.date,
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
      startTime: '',
      endTime: '',
      priority: 'medium',
      status: 'pending',
    })
    onClose()
  }

  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/60 backdrop-blur-sm theme-transition">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-theme-card border border-black/8 dark:border-white/10 shadow-xl theme-transition">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-black/6 dark:border-white/10">
          <h2 className="text-lg font-bold text-theme tracking-tight">새 일정 추가</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] p-2 rounded-xl text-theme-muted hover:text-theme hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
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
              className="input-field rounded-xl px-4 py-3 text-theme border-0 focus:ring-2 focus:ring-primary-500/30 focus:ring-offset-0"
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
              className="input-field resize-none rounded-xl px-4 py-3 text-theme border-0 focus:ring-2 focus:ring-primary-500/30 focus:ring-offset-0"
              rows={3}
            />
          </div>

          {/* 날짜 */}
          <div>
            <label className="block text-sm font-semibold text-theme mb-2">
              <Calendar className="w-4 h-4 inline mr-1.5 text-theme-muted" aria-hidden />
              날짜 *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="input-field rounded-xl px-4 py-3 text-theme border-0 focus:ring-2 focus:ring-primary-500/30 focus:ring-offset-0"
              required
            />
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
                className="input-field rounded-xl px-4 py-3 text-theme border-0 focus:ring-2 focus:ring-primary-500/30 focus:ring-offset-0"
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
                className="input-field rounded-xl px-4 py-3 text-theme border-0 focus:ring-2 focus:ring-primary-500/30 focus:ring-offset-0"
              />
            </div>
          </div>

          {/* 버튼 — DayDetailPanel 하단 버튼과 동일한 톤 */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-w-0 py-3.5 rounded-2xl text-sm font-medium text-theme border border-black/10 dark:border-white/10 bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 min-w-0 py-3.5 rounded-2xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 dark:hover:bg-primary-400 shadow-[0_4px_14px_rgba(255,140,0,0.22)] hover:shadow-[0_6px_20px_rgba(255,140,0,0.32)] dark:shadow-[0_4px_14px_rgba(255,149,0,0.2)] dark:hover:shadow-[0_6px_20px_rgba(255,149,0,0.28)] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-color)] active:scale-[0.98]"
            >
              추가하기
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
