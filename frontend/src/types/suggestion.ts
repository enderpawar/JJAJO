/**
 * AI 제안 관련 타입 정의
 */

export type SuggestionType =
  | 'conflict_resolution'
  | 'schedule_optimization'
  | 'goal_progress'
  | 'time_management'
  | 'wellbeing'
  | 'productivity'
  | 'reminder'

export type SuggestionPriority = 'urgent' | 'high' | 'medium' | 'low'

export interface SuggestionAction {
  label: string
  actionType: string
  actionData?: any
}

export interface Suggestion {
  id: string
  userId?: string
  type: SuggestionType
  priority: SuggestionPriority
  title: string
  description: string
  actions: SuggestionAction[]
  createdAt: string
  dismissed: boolean
  relatedGoalId?: string
  relatedScheduleId?: string
}
