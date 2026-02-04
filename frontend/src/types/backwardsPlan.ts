import type { TimeSlotPreference, WeekdayCode } from '@/types/settings'

export interface BackwardsPlanPayload {
  goalText: string
  /** 목표 마감일(YYYY-MM-DD). 목표 화면에서 실행 시 전달 */
  deadline?: string
  /** 목표 전체 총 투자 시간(시간). 목표 화면에서 실행 시 전달 */
  totalHours?: number | null
  /** 사용자 지정 일당 투자 시간(시간). 없으면 시간대 설정으로 계산 */
  preferredDailyHours?: number | null
  todos: BackwardsPlanTodoSummary[]
  timeSlotPreferences: TimeSlotPreference[]
  workStartTime: string
  workEndTime: string
  breakDuration: number
  daysOff: WeekdayCode[]
}

export interface BackwardsPlanTodoSummary {
  id: string
  title: string
  date: string
  startTime: string
  endTime: string
  durationMinutes?: number
}

export interface BackwardsPlanResult {
  summary: string
  daysRemaining: number
  totalHours: number
  recommendedDailyHours: number
  planDays: PlanDay[]
  conflicts: PlanConflict[]
}

export interface PlanDay {
  date: string
  plannedHours: number
  blocks: PlanBlock[]
}

export interface PlanBlock {
  startTime?: string
  endTime?: string
  title: string
  description?: string
  priority?: string
}

export interface PlanConflict {
  date: string
  reason: string
  resolvedTo?: string
}
