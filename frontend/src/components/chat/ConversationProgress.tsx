import { CheckCircle, Circle, Zap } from 'lucide-react'
import { cn } from '@/utils/cn'

interface ConversationProgressProps {
  collectedInfo: {
    goal_type?: string
    current_score?: string
    target_score?: string
    mentioned_deadline?: boolean
    mentioned_hours?: boolean
    mentioned_time_preference?: boolean
    has_constraints?: boolean
  }
  isActive: boolean
  onQuickCreate?: () => void
}

export default function ConversationProgress({ collectedInfo, isActive, onQuickCreate }: ConversationProgressProps) {
  if (!isActive) return null

  const steps = [
    {
      label: '목표',
      completed: !!collectedInfo.goal_type || !!collectedInfo.target_score,
      info: collectedInfo.goal_type ? `${collectedInfo.goal_type} ${collectedInfo.target_score || ''}` : null,
    },
    {
      label: '현재 수준',
      completed: !!collectedInfo.current_score,
      info: collectedInfo.current_score ? `${collectedInfo.current_score}점` : null,
    },
    {
      label: '기한',
      completed: !!collectedInfo.mentioned_deadline,
      info: null,
    },
    {
      label: '가용 시간',
      completed: !!collectedInfo.mentioned_hours || !!collectedInfo.mentioned_time_preference,
      info: null,
    },
  ]

  const completedCount = steps.filter(s => s.completed).length
  const progress = (completedCount / steps.length) * 100
  
  // 최소 정보 (목표 + 기한 or 시간)
  const hasMinimumInfo = (steps[0].completed) && (steps[2].completed || steps[3].completed)

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <h4 className="text-sm font-semibold text-gray-700">목표 상담 진행 중</h4>
        </div>
        <span className="text-xs font-medium text-purple-600">
          {completedCount}/{steps.length} 단계
        </span>
      </div>

      {/* 프로그레스 바 */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3 overflow-hidden">
        <div
          className="bg-gradient-to-r from-purple-500 to-blue-500 h-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 단계별 체크리스트 */}
      <div className="grid grid-cols-2 gap-2">
        {steps.map((step, index) => (
          <div
            key={index}
            className={cn(
              'flex items-center gap-2 text-xs p-2 rounded-md transition-colors',
              step.completed ? 'bg-white/80' : 'bg-transparent'
            )}
          >
            {step.completed ? (
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'font-medium truncate',
                  step.completed ? 'text-gray-700' : 'text-gray-400'
                )}
              >
                {step.label}
              </p>
              {step.info && (
                <p className="text-purple-600 text-[10px] truncate">{step.info}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 빠른 생성 버튼 */}
      {hasMinimumInfo && onQuickCreate && (
        <button
          onClick={onQuickCreate}
          className="w-full mt-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
        >
          <Zap className="w-4 h-4" />
          지금 바로 계획 생성하기
        </button>
      )}
    </div>
  )
}
