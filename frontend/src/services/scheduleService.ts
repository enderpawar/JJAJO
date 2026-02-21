import { format } from 'date-fns'
import { getApiBase, apiRequest } from '@/utils/api'
import { sendDebugIngest } from '@/utils/debugIngest'
import type { Todo } from '@/types/calendar'

function getSchedulesApiBase(): string {
  const base = getApiBase()
  return base ? `${base}/api/v1/schedules` : '/api/v1/schedules'
}

/** API 일정 응답 → Todo 타입 정규화 */
export function scheduleFromApi(item: Record<string, unknown>): Todo {
  const status = String(item.status ?? 'pending').toLowerCase().replace(/-/g, '_') as Todo['status']
  const priority = String(item.priority ?? 'medium').toLowerCase() as Todo['priority']
  const createdBy = (item.createdBy === 'ai' ? 'ai' : 'user') as Todo['createdBy']
  return {
    id: String(item.id ?? ''),
    title: String(item.title ?? ''),
    description: item.description != null ? String(item.description) : undefined,
    date: String(item.date ?? ''),
    endDate: item.endDate != null && String(item.endDate).trim() !== '' && item.endDate !== item.date ? String(item.endDate) : undefined,
    startTime: item.startTime != null ? String(item.startTime) : undefined,
    endTime: item.endTime != null ? String(item.endTime) : undefined,
    status: ['pending', 'in_progress', 'completed', 'cancelled'].includes(status) ? status : 'pending',
    priority: priority === 'high' || priority === 'low' ? priority : 'medium',
    createdBy,
    createdAt: String(item.createdAt ?? new Date().toISOString()),
    updatedAt: String(item.updatedAt ?? new Date().toISOString()),
  }
}

/** 현재 사용자 일정 목록 조회 */
export async function getSchedules(): Promise<Todo[]> {
  const data = await apiRequest<unknown>(getSchedulesApiBase())
  const list = Array.isArray(data) ? data : []
  return list.map((item: Record<string, unknown>) => scheduleFromApi(item))
}

/** 일정 생성 (원격 DB 저장). id는 서버에서 부여됨. */
export async function createSchedule(
  todo: Pick<Todo, 'title' | 'description' | 'date' | 'endDate' | 'startTime' | 'endTime' | 'status' | 'priority' | 'createdBy'>
): Promise<Todo> {
  const schedulesUrl = getSchedulesApiBase()
  sendDebugIngest({
    location: 'scheduleService.ts:createSchedule',
    message: 'createSchedule entry',
    data: { schedulesUrl, hasCredentials: true },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    hypothesisId: 'A',
  })
  const body: Record<string, unknown> = {
    title: todo.title,
    description: todo.description ?? '',
    date: todo.date,
    startTime: todo.startTime ?? '',
    endTime: todo.endTime ?? '',
    status: todo.status ?? 'pending',
    priority: todo.priority ?? 'medium',
    createdBy: todo.createdBy ?? 'user',
  }
  if (todo.endDate != null && todo.endDate.trim() !== '') {
    body.endDate = todo.endDate
  }
  const item = await apiRequest<Record<string, unknown>>(schedulesUrl, {
    method: 'POST',
    body,
  })
  sendDebugIngest({
    location: 'scheduleService.ts:createSchedule',
    message: 'createSchedule response',
    data: { success: true },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    hypothesisId: 'A',
  })
  return scheduleFromApi(item)
}

/** 일정 수정 */
export async function updateSchedule(id: string, updates: Partial<Pick<Todo, 'title' | 'description' | 'date' | 'endDate' | 'startTime' | 'endTime' | 'status' | 'priority'>>): Promise<Todo> {
  const item = await apiRequest<Record<string, unknown>>(`${getSchedulesApiBase()}/${id}`, {
    method: 'PUT',
    body: updates,
  })
  return scheduleFromApi(item)
}

/** 일정 삭제 */
export async function deleteSchedule(id: string): Promise<void> {
  await apiRequest<void>(`${getSchedulesApiBase()}/${id}`, {
    method: 'DELETE',
    parseJson: false,
  })
}

/** 현재 사용자 일정 전체 삭제 (서버 DB 반영) */
export async function deleteAllSchedules(): Promise<void> {
  await apiRequest<void>(getSchedulesApiBase(), {
    method: 'DELETE',
    parseJson: false,
  })
}

export interface DailyScheduleRequest {
  goalId?: string
  goalTitle: string
  goalDescription?: string
  estimatedHours: number
  priority: 'high' | 'medium' | 'low'
  targetDate: Date
  workStartTime?: string
  workEndTime?: string
  breakDuration?: number
}

export interface ScheduleItem {
  startTime: string
  endTime: string
  title: string
  description: string
  type: 'work' | 'break' | 'meal'
  priority: string
  energyLevel: string
}

export interface DailyScheduleResponse {
  schedule: ScheduleItem[]
  summary: {
    totalWorkBlocks: number
    totalBreaks: number
    bufferTime: string
    completionProbability: string
  }
  conflicts: Array<{
    time: string
    existingTask: string
    newTask: string
    suggestion: string
  }>
}

/**
 * AI 하루 일정 생성
 */
export const generateDailySchedule = async (
  request: DailyScheduleRequest
): Promise<DailyScheduleResponse> => {
  const url = '/api/schedule/generate-daily'
  const payload = {
    ...request,
    targetDate: format(request.targetDate, 'yyyy-MM-dd'),
  }

  return apiRequest<DailyScheduleResponse>(url, {
    method: 'POST',
    body: payload,
  })
}
