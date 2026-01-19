/**
 * 캘린더 및 일정 관련 타입 정의
 */

export type TodoStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled'

export type TodoPriority = 'low' | 'medium' | 'high'

export interface Todo {
  id: string
  title: string
  description?: string
  date: string // YYYY-MM-DD
  startTime?: string // HH:mm
  endTime?: string // HH:mm
  status: TodoStatus
  priority: TodoPriority
  createdBy: 'user' | 'ai'
  createdAt: string
  updatedAt: string
}

export interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  todos: Todo[]
}

export type ViewMode = 'month' | 'week'
