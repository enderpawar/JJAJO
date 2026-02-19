import { format } from 'date-fns'
import type { Todo } from '@/types/calendar'
import type { TimeSlotPreference } from '@/types/settings'

export interface TimeSlot {
  startTime: string // "09:00"
  endTime: string // "10:30"
  durationMinutes: number
}

export interface ScheduleConflict {
  hasConflict: boolean
  conflictingTodos: Todo[]
}

/**
 * 시간 문자열을 분(minutes)으로 변환
 * "09:30" -> 570
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * 분(minutes)을 시간 문자열로 변환
 * 570 -> "09:30"
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

/**
 * 특정 날짜의 기존 일정 조회
 */
export function getTodosForDate(todos: Todo[], date: string): Todo[] {
  return todos.filter((todo) => todo.date === date)
}

/**
 * 특정 날짜의 빈 시간대(가용 슬롯) 목록. [start분, end분] → { start: "HH:mm", end: "HH:mm" }
 * - 오늘인 경우 현재 시각 이전은 제외
 * - 시간대 우선순위 설정이 있으면, 활성화된(timeSlotPreferences.enabled) 구간과 교집합만 사용
 */
export function getAvailableSlotsForDay(
  date: string,
  todos: Todo[],
  currentTimeMinutes?: number,
  timeSlotPreferences?: TimeSlotPreference[],
): Array<{ start: string; end: string }> {
  const dayEndMinutes = 24 * 60
  const dateTodos = getTodosForDate(todos, date).filter((t) => t.startTime && t.endTime && !t.isGhost)
  const intervals = dateTodos
    .map((t) => ({ start: timeToMinutes(t.startTime!), end: timeToMinutes(t.endTime!) }))
    .sort((a, b) => a.start - b.start)
  const merged: Array<{ start: number; end: number }> = []
  for (const { start, end } of intervals) {
    if (merged.length === 0) {
      merged.push({ start, end })
      continue
    }
    const last = merged[merged.length - 1]
    if (start <= last.end) {
      last.end = Math.max(last.end, end)
    } else {
      merged.push({ start, end })
    }
  }
  const gaps: Array<{ start: number; end: number }> = []
  let prevEnd = currentTimeMinutes ?? 0
  for (const { start, end } of merged) {
    if (start > prevEnd) gaps.push({ start: prevEnd, end: start })
    prevEnd = end
  }
  if (prevEnd < dayEndMinutes) gaps.push({ start: prevEnd, end: dayEndMinutes })

  // 시간대 우선순위 설정을 반영: 활성화된 슬롯과 교집합만 남김
  let filtered = gaps
  if (timeSlotPreferences && timeSlotPreferences.length > 0) {
    const enabled = sortTimeSlotsByPriority(timeSlotPreferences)
    const ranges = enabled.map((slot) => ({
      start: slot.startHour * 60,
      end: slot.endHour * 60,
    }))
    if (ranges.length > 0) {
      const intersected: Array<{ start: number; end: number }> = []
      for (const gap of gaps) {
        for (const r of ranges) {
          const s = Math.max(gap.start, r.start)
          const e = Math.min(gap.end, r.end)
          if (e > s) intersected.push({ start: s, end: e })
        }
      }
      filtered = intersected
    }
  }

  return filtered.map((g) => ({
    start: minutesToTime(g.start),
    end: minutesToTime(g.end),
  }))
}

/**
 * 시간대 우선순위에 따라 정렬
 */
export function sortTimeSlotsByPriority(
  timeSlots: TimeSlotPreference[]
): TimeSlotPreference[] {
  return [...timeSlots]
    .filter((slot) => slot.enabled)
    .sort((a, b) => a.priority - b.priority)
}

/**
 * 두 시간 슬롯이 겹치는지 확인
 */
export function hasTimeOverlap(
  start1Minutes: number,
  end1Minutes: number,
  start2Minutes: number,
  end2Minutes: number
): boolean {
  return start1Minutes < end2Minutes && end1Minutes > start2Minutes
}

/**
 * 특정 시간대에 기존 일정과 충돌이 있는지 확인
 */
export function checkConflicts(
  startTime: string,
  endTime: string,
  existingTodos: Todo[]
): ScheduleConflict {
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)

  const conflictingTodos = existingTodos.filter((todo) => {
    if (!todo.startTime || !todo.endTime) return false

    const todoStartMinutes = timeToMinutes(todo.startTime)
    const todoEndMinutes = timeToMinutes(todo.endTime)

    return hasTimeOverlap(startMinutes, endMinutes, todoStartMinutes, todoEndMinutes)
  })

  return {
    hasConflict: conflictingTodos.length > 0,
    conflictingTodos,
  }
}

/**
 * 비어있는 시간 슬롯 찾기 (우선순위 시간대 고려 + 현재 시간 이후만)
 */
export function findAvailableTimeSlots(
  date: string,
  durationMinutes: number,
  existingTodos: Todo[],
  timeSlotPreferences: TimeSlotPreference[],
  allowConflicts: boolean = false
): TimeSlot[] {
  const availableSlots: TimeSlot[] = []
  const sortedPreferences = sortTimeSlotsByPriority(timeSlotPreferences)
  const dateTodos = getTodosForDate(existingTodos, date)

  // 현재 시간 계산 (오늘 날짜인 경우에만)
  const now = new Date()
  const today = format(now, 'yyyy-MM-dd')
  const isToday = date === today
  const currentMinutesOfDay = isToday ? now.getHours() * 60 + now.getMinutes() : 0

  // 우선순위별로 시간대 검색
  for (const preference of sortedPreferences) {
    const startMinutes = preference.startHour * 60
    const endMinutes = preference.endHour * 60

    // 해당 시간대 내에서 빈 슬롯 찾기
    // 오늘인 경우: 현재 시간 이후부터 시작
    let currentMinutes = isToday ? Math.max(startMinutes, currentMinutesOfDay + 10) : startMinutes // 10분 여유

    while (currentMinutes + durationMinutes <= endMinutes) {
      const slotStartTime = minutesToTime(currentMinutes)
      const slotEndTime = minutesToTime(currentMinutes + durationMinutes)

      const conflict = checkConflicts(slotStartTime, slotEndTime, dateTodos)

      if (!conflict.hasConflict || allowConflicts) {
        availableSlots.push({
          startTime: slotStartTime,
          endTime: slotEndTime,
          durationMinutes,
        })

        // 충돌을 허용하지 않는 경우, 첫 번째 가능한 슬롯만 반환
        if (!allowConflicts) {
          return availableSlots
        }
      }

      // 충돌이 있는 경우, 충돌하는 일정 이후로 이동
      if (conflict.hasConflict && !allowConflicts) {
        const maxEndTime = Math.max(
          ...conflict.conflictingTodos.map((todo) =>
            todo.endTime ? timeToMinutes(todo.endTime) : 0
          )
        )
        currentMinutes = Math.max(maxEndTime, isToday ? currentMinutesOfDay + 10 : maxEndTime)
      } else {
        // 30분 단위로 이동
        currentMinutes += 30
      }
    }
  }

  return availableSlots
}

/**
 * 작업을 여러 날로 분할
 */
export function splitTaskIntoMultipleDays(
  startDate: string,
  totalMinutes: number,
  dailyMaxMinutes: number,
  existingTodos: Todo[],
  timeSlotPreferences: TimeSlotPreference[]
): TimeSlot[][] {
  const result: TimeSlot[][] = []
  let remainingMinutes = totalMinutes
  let currentDate = startDate

  // 최대 14일까지 분할
  for (let day = 0; day < 14 && remainingMinutes > 0; day++) {
    const dailyDuration = Math.min(remainingMinutes, dailyMaxMinutes)
    const slots = findAvailableTimeSlots(
      currentDate,
      dailyDuration,
      existingTodos,
      timeSlotPreferences,
      false
    )

    if (slots.length > 0) {
      result.push(slots)
      remainingMinutes -= dailyDuration
    }

    // 다음 날로 이동
    const dateObj = new Date(currentDate)
    dateObj.setDate(dateObj.getDate() + 1)
    currentDate = format(dateObj, 'yyyy-MM-dd')
  }

  return result
}

/**
 * 일정 배치 가능 여부 확인 및 제안
 */
export function suggestSchedulePlacement(
  date: string,
  durationMinutes: number,
  existingTodos: Todo[],
  timeSlotPreferences: TimeSlotPreference[],
  allowMultipleDays: boolean = false
): {
  canPlace: boolean
  suggestion: TimeSlot | null
  needsMultipleDays: boolean
  multipleDaySchedule?: TimeSlot[][]
  conflicts?: ScheduleConflict
} {
  // 단일 날짜에 배치 시도
  const availableSlots = findAvailableTimeSlots(
    date,
    durationMinutes,
    existingTodos,
    timeSlotPreferences,
    false
  )

  if (availableSlots.length > 0) {
    return {
      canPlace: true,
      suggestion: availableSlots[0],
      needsMultipleDays: false,
    }
  }

  // 충돌 확인 (강제 배치 시)
  const conflictSlots = findAvailableTimeSlots(
    date,
    durationMinutes,
    existingTodos,
    timeSlotPreferences,
    true
  )

  if (conflictSlots.length > 0) {
    const firstSlot = conflictSlots[0]
    const conflicts = checkConflicts(firstSlot.startTime, firstSlot.endTime, existingTodos)

    return {
      canPlace: false,
      suggestion: firstSlot,
      needsMultipleDays: false,
      conflicts,
    }
  }

  // 여러 날로 분할 제안
  if (allowMultipleDays) {
    const dailyMaxMinutes = 240 // 4시간
    const multipleDaySchedule = splitTaskIntoMultipleDays(
      date,
      durationMinutes,
      dailyMaxMinutes,
      existingTodos,
      timeSlotPreferences
    )

    return {
      canPlace: false,
      suggestion: null,
      needsMultipleDays: true,
      multipleDaySchedule,
    }
  }

  return {
    canPlace: false,
    suggestion: null,
    needsMultipleDays: false,
  }
}
