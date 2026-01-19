import { useGoalStore } from '@/stores/goalStore'
import { Target, Calendar, TrendingUp } from 'lucide-react'
import type { Goal } from '@/types/goal'

export function GoalList() {
  const { getActiveGoals } = useGoalStore()
  const activeGoals = getActiveGoals()

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return 'bg-green-500'
    if (progress >= 50) return 'bg-blue-500'
    if (progress >= 25) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getStatusLabel = (status: Goal['status']) => {
    switch (status) {
      case 'not_started':
        return '시작 전'
      case 'on_track':
        return '진행 중'
      case 'at_risk':
        return '주의 필요'
      case 'delayed':
        return '지연됨'
      default:
        return status
    }
  }

  const getStatusColor = (status: Goal['status']) => {
    switch (status) {
      case 'on_track':
        return 'bg-green-100 text-green-700'
      case 'at_risk':
        return 'bg-orange-100 text-orange-700'
      case 'delayed':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getDaysUntilDeadline = (deadline: string) => {
    const today = new Date()
    const deadlineDate = new Date(deadline)
    const diffTime = deadlineDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (activeGoals.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">
          설정된 목표가 없습니다
        </p>
        <p className="text-gray-400 text-xs mt-1">
          새 목표를 만들어 체계적으로 달성해보세요
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {activeGoals.map((goal) => {
        const progress =
          goal.estimatedHours > 0
            ? (goal.completedHours / goal.estimatedHours) * 100
            : 0
        const daysLeft = getDaysUntilDeadline(goal.deadline)

        return (
          <div
            key={goal.id}
            className="bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition-shadow duration-200 border border-gray-100"
          >
            {/* 헤더 */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-900 text-lg">
                    {goal.title}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      goal.status
                    )}`}
                  >
                    {getStatusLabel(goal.status)}
                  </span>
                </div>
                {goal.description && (
                  <p className="text-sm text-gray-600">{goal.description}</p>
                )}
              </div>
            </div>

            {/* 진행률 바 */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600">
                  진행률
                </span>
                <span className="text-xs font-bold text-gray-900">
                  {progress.toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(
                    progress
                  )}`}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>

            {/* 통계 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">D-{daysLeft}</p>
                  <p className="text-xs font-medium text-gray-900">
                    {new Date(goal.deadline).toLocaleDateString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">완료</p>
                  <p className="text-xs font-medium text-gray-900">
                    {goal.completedHours}/{goal.estimatedHours}h
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">우선순위</p>
                  <p className="text-xs font-medium text-gray-900">
                    {goal.priority === 'high'
                      ? '높음'
                      : goal.priority === 'medium'
                      ? '보통'
                      : '낮음'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
