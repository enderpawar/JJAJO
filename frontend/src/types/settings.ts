export type TimeSlotPeriod = 'dawn' | 'morning' | 'afternoon' | 'evening'

export interface TimeSlotPreference {
  period: TimeSlotPeriod
  startHour: number // 0-23
  endHour: number // 0-23
  priority: number // 1-4 (1이 최우선)
  enabled: boolean
}

export interface UserSettings {
  timeSlotPreferences: TimeSlotPreference[]
  workStartTime: string // "09:00"
  workEndTime: string // "18:00"
  breakDuration: number // minutes
}

export const DEFAULT_TIME_SLOTS: TimeSlotPreference[] = [
  {
    period: 'dawn',
    startHour: 0,
    endHour: 6,
    priority: 4,
    enabled: false,
  },
  {
    period: 'morning',
    startHour: 6,
    endHour: 12,
    priority: 1,
    enabled: true,
  },
  {
    period: 'afternoon',
    startHour: 12,
    endHour: 18,
    priority: 2,
    enabled: true,
  },
  {
    period: 'evening',
    startHour: 18,
    endHour: 24,
    priority: 3,
    enabled: true,
  },
]

export const TIME_SLOT_LABELS: Record<TimeSlotPeriod, string> = {
  dawn: '새벽 (00:00-06:00)',
  morning: '오전 (06:00-12:00)',
  afternoon: '오후 (12:00-18:00)',
  evening: '저녁 (18:00-24:00)',
}
