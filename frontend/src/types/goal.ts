/**
 * 목표 관련 타입 정의
 */

export type GoalPriority = 'high' | 'medium' | 'low'
export type GoalStatus = 'not_started' | 'on_track' | 'at_risk' | 'delayed' | 'completed' | 'cancelled'
export type GoalCategory = 'work' | 'study' | 'health' | 'personal' | 'hobby' | 'other'

export interface Milestone {
  id: string
  goalId: string
  title: string
  description?: string
  targetDate: string
  completed: boolean
  completedDate?: string
  estimatedHours: number
}

export interface Goal {
  id: string
  userId?: string
  title: string
  description?: string
  deadline: string
  priority: GoalPriority
  status: GoalStatus
  milestones: Milestone[]
  category: GoalCategory
  estimatedHours: number
  completedHours: number
}

export interface GoalFormData {
  title: string
  description: string
  deadline: string
  priority: GoalPriority
  category: GoalCategory
  estimatedHours: number
}
