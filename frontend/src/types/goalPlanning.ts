export type QuestionType = 'SLIDER' | 'YESNO' | 'TIME_PICKER'

export interface Question {
  id: string
  questionText: string
  type: QuestionType
  options: Record<string, any>
  rationale: string
}

export interface QuestionGenerationRequest {
  goalTitle: string
  goalDescription?: string
}

export interface PlanGenerationRequest {
  goalTitle: string
  goalDescription?: string
  deadline: string // ISO date string
  answers: Record<string, any>
}

export interface LearningResource {
  type: 'book' | 'course' | 'video' | 'article'
  title: string
  url?: string
  description: string
  platform: string
}

export interface Milestone {
  title: string
  description: string
  targetDate: string
  estimatedHours: number
  orderIndex: number
  learningStage: '기초' | '기본' | '심화'
  keyTopics: string[]
}

export interface ScheduleRecommendation {
  date: string
  startTime: string
  endTime: string
  title: string
  description: string
  type: string
  priority: string
  energyLevel: string
  resources: LearningResource[]
}

export interface PlanResponse {
  milestones: Milestone[]
  schedules: ScheduleRecommendation[]
  strategy: string
  differentiator: string
}

export interface RoadmapStyle {
  styleId: 'intensive' | 'solid' | 'practical'
  styleName: string
  description: string
  targetAudience: string
  totalWeeks: number
  weeklyHours: number
  features: string[]
  difficulty: 'high' | 'medium' | 'low'
}

export interface ResourceOption {
  optionId: string
  type: 'book' | 'course' | 'video'
  title: string
  description: string
  pros: string
  cons: string
  url: string
  platform: string
  recommended: boolean
}

export interface WeekOptions {
  weekNumber: number
  weekTheme: string
  resourceOptions: ResourceOption[]
}

export interface RoadmapOptionsRequest {
  goalTitle: string
  goalDescription?: string
  answers: Record<string, any>
}

export interface GoalSummary {
  goalAnalysis: string
  estimatedWeeks: number
  difficultyLevel: 'high' | 'medium' | 'low'
  keyRecommendations: string[]
  learningApproach: string
  estimatedHoursPerWeek: number
  motivationalMessage: string
}
