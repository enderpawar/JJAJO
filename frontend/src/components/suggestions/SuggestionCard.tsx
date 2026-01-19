import { AlertCircle, CheckCircle, Info, Zap } from 'lucide-react'
import type { Suggestion } from '@/types/suggestion'
import { useSuggestionStore } from '@/stores/suggestionStore'

interface SuggestionCardProps {
  suggestion: Suggestion
  onActionClick?: (actionType: string, data: any) => void
}

export function SuggestionCard({ suggestion, onActionClick }: SuggestionCardProps) {
  const { dismissSuggestion } = useSuggestionStore()

  const getPriorityColor = () => {
    switch (suggestion.priority) {
      case 'urgent':
        return 'bg-red-50 border-red-200'
      case 'high':
        return 'bg-orange-50 border-orange-200'
      case 'medium':
        return 'bg-blue-50 border-blue-200'
      case 'low':
        return 'bg-gray-50 border-gray-200'
    }
  }

  const getPriorityIcon = () => {
    switch (suggestion.priority) {
      case 'urgent':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case 'high':
        return <Zap className="w-5 h-5 text-orange-500" />
      case 'medium':
        return <Info className="w-5 h-5 text-blue-500" />
      case 'low':
        return <CheckCircle className="w-5 h-5 text-gray-500" />
    }
  }

  const getPriorityLabel = () => {
    switch (suggestion.priority) {
      case 'urgent':
        return '긴급'
      case 'high':
        return '높음'
      case 'medium':
        return '보통'
      case 'low':
        return '낮음'
    }
  }

  const getTypeLabel = () => {
    switch (suggestion.type) {
      case 'conflict_resolution':
        return '일정 충돌'
      case 'schedule_optimization':
        return '일정 최적화'
      case 'goal_progress':
        return '목표 진행'
      case 'time_management':
        return '시간 관리'
      case 'wellbeing':
        return '웰빙'
      case 'productivity':
        return '생산성'
      case 'reminder':
        return '리마인더'
    }
  }

  const handleAction = (actionType: string, data: any) => {
    if (onActionClick) {
      onActionClick(actionType, data)
    }
    if (actionType === 'DISMISS') {
      dismissSuggestion(suggestion.id)
    }
  }

  return (
    <div
      className={`rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-md ${getPriorityColor()}`}
    >
      {/* 헤더 */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0 mt-1">{getPriorityIcon()}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-gray-600 uppercase">
              {getTypeLabel()}
            </span>
            <span className="text-xs px-2 py-0.5 bg-white rounded-full font-medium">
              {getPriorityLabel()}
            </span>
          </div>
          <h3 className="font-bold text-gray-900 text-lg">{suggestion.title}</h3>
        </div>
      </div>

      {/* 설명 */}
      <p className="text-gray-700 text-sm leading-relaxed mb-4">
        {suggestion.description}
      </p>

      {/* 액션 버튼들 */}
      {suggestion.actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestion.actions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleAction(action.actionType, action.actionData)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                action.actionType === 'DISMISS'
                  ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  : 'bg-primary-500 text-white hover:bg-primary-600 shadow-sm hover:shadow-md'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* 타임스탬프 */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          {new Date(suggestion.createdAt).toLocaleString('ko-KR')}
        </p>
      </div>
    </div>
  )
}
