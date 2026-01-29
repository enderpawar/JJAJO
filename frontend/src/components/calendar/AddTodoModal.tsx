import { useState } from 'react'
import { X, Calendar, Clock, AlertCircle } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
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
      alert('제목을 입력해주세요')
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
      alert(`일정 추가 실패: ${e instanceof Error ? e.message : '알 수 없음'}`)
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-notion-sidebar border border-notion-border rounded-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">새 일정 추가</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-notion-hover rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 제목 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              제목 *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="일정 제목을 입력하세요"
              className="input-field"
              required
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              설명
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="일정에 대한 설명을 입력하세요 (선택사항)"
              className="input-field resize-none"
              rows={3}
            />
          </div>

          {/* 날짜 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              날짜 *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="input-field"
              required
            />
          </div>

          {/* 시간 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                시작 시간
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                종료 시간
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          {/* 우선순위 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              우선순위
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as TodoPriority })}
              className="input-field"
            >
              <option value="low">낮음</option>
              <option value="medium">보통</option>
              <option value="high">높음</option>
            </select>
          </div>

          {/* 상태 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              상태
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as TodoStatus })}
              className="input-field"
            >
              <option value="pending">대기</option>
              <option value="in-progress">진행중</option>
              <option value="completed">완료</option>
            </select>
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              취소
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
            >
              추가하기
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
