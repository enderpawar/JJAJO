export type TimetableDayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'

/**
 * 시간표 이미지에서 추출된 고정 일정 후보 (백엔드 공통 스키마와 1:1 매핑).
 */
export interface FixedScheduleCandidate {
  title: string
  dayOfWeek: TimetableDayOfWeek | string
  startTime: string
  endTime: string
  location?: string
  notes?: string
  source?: string
}

