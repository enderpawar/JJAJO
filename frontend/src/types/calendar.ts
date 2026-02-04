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

/** 대화형 일정 수정 API 응답 연산 1건 */
export interface EditScheduleOperation {
  type: 'update' | 'delete'
  id: string
  updates?: Partial<Todo>
}
