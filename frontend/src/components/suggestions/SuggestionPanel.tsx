import { useSuggestionStore } from '@/stores/suggestionStore'
import { SuggestionCard } from './SuggestionCard'
import { Lightbulb } from 'lucide-react'

export function SuggestionPanel() {
  const { getActiveSuggestions } = useSuggestionStore()
  const activeSuggestions = getActiveSuggestions()

  // 우선순위 순으로 정렬
  const sortedSuggestions = [...activeSuggestions].sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  const handleActionClick = (actionType: string, data: any) => {
    console.log('Action clicked:', actionType, data)
    // TODO: 실제 액션 처리 로직 구현
  }

  if (sortedSuggestions.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">
          현재 제안 사항이 없습니다
        </p>
        <p className="text-gray-400 text-xs mt-1">
          일정이 추가되면 AI가 자동으로 분석하고 제안을 드립니다
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <Lightbulb className="w-6 h-6 text-primary-500" />
        <h3 className="text-xl font-bold text-gray-900">
          AI 제안 ({sortedSuggestions.length})
        </h3>
      </div>

      <div className="space-y-4">
        {sortedSuggestions.map((suggestion) => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            onActionClick={handleActionClick}
          />
        ))}
      </div>
    </div>
  )
}
