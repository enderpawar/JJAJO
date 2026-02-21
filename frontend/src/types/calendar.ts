/**
 * 캘린더 및 일정 관련 타입 정의
 */

export type TodoStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled'

export type TodoPriority = 'low' | 'medium' | 'high'

export interface Todo {
  id: string
  /** React key 안정화용(복사 직후 드래그 유지). 서버 id로 교체돼도 동일 노드 유지 */
  clientKey?: string
  title: string
  description?: string
  date: string // YYYY-MM-DD (시작일)
  /** 종료일(포함). 없으면 당일 일정, 있으면 여러 날에 걸친 일정 */
  endDate?: string // YYYY-MM-DD
  startTime?: string // HH:mm
  endTime?: string // HH:mm
  status: TodoStatus
  priority: TodoPriority
  createdBy: 'user' | 'ai'
  createdAt: string
  updatedAt: string
  /** 짜조 고스트 일정 여부. true면 미확정 미리보기용 */
  isGhost?: boolean
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
