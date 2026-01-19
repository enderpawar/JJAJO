import { useState } from 'react'
import { X } from 'lucide-react'
import type { GoalFormData, GoalPriority, GoalCategory } from '@/types/goal'
import { useGoalStore } from '@/stores/goalStore'

interface GoalModalProps {
  isOpen: boolean
  onClose: () => void
}

export function GoalModal({ isOpen, onClose }: GoalModalProps) {
  const { addGoal } = useGoalStore()

  const [formData, setFormData] = useState<GoalFormData>({
    title: '',
    description: '',
    deadline: '',
    priority: 'medium',
    category: 'personal',
    estimatedHours: 10,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const newGoal = {
      id: `goal-${Date.now()}`,
      ...formData,
      status: 'not_started' as const,
      milestones: [],
      completedHours: 0,
    }

    addGoal(newGoal)
    onClose()

    // 폼 초기화
    setFormData({
      title: '',
      description: '',
      deadline: '',
      priority: 'medium',
      category: 'personal',
      estimatedHours: 10,
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-2xl font-bold text-gray-900">새 목표 만들기</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 제목 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              목표 제목 *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="input-field"
              placeholder="예: TOEIC 800점 달성하기"
              required
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              설명
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="input-field resize-none"
              rows={4}
              placeholder="목표에 대한 세부 설명을 입력하세요"
            />
          </div>

          {/* 마감일 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              마감일 *
            </label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) =>
                setFormData({ ...formData, deadline: e.target.value })
              }
              className="input-field"
              required
            />
          </div>

          {/* 카테고리 & 우선순위 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                카테고리
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    category: e.target.value as GoalCategory,
                  })
                }
                className="input-field"
              >
                <option value="work">업무</option>
                <option value="study">학습</option>
                <option value="health">건강</option>
                <option value="personal">개인</option>
                <option value="hobby">취미</option>
                <option value="other">기타</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                우선순위
              </label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: e.target.value as GoalPriority,
                  })
                }
                className="input-field"
              >
                <option value="high">높음</option>
                <option value="medium">보통</option>
                <option value="low">낮음</option>
              </select>
            </div>
          </div>

          {/* 예상 시간 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              예상 소요 시간 (시간)
            </label>
            <input
              type="number"
              value={formData.estimatedHours}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  estimatedHours: parseInt(e.target.value) || 0,
                })
              }
              className="input-field"
              min="1"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              목표 달성에 필요한 총 시간을 입력하세요
            </p>
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              취소
            </button>
            <button type="submit" className="btn-primary">
              목표 생성
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
