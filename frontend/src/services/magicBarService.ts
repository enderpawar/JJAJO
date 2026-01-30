import { useApiKeyStore } from '@/stores/apiKeyStore'
import { useCalendarStore } from '@/stores/calendarStore'
import { createSchedule } from '@/services/scheduleService'
import { getApiBase } from '@/utils/api'
import type { Todo } from '@/types/calendar'

function getParseScheduleUrl(): string {
  const base = getApiBase()
  return base ? `${base}/api/v1/ai/parse-schedule` : '/api/v1/ai/parse-schedule'
}

export interface ParsedSchedule {
  title: string
  description?: string
  date: string
  startTime?: string
  endTime?: string
  priority: string
}

/**
 * 매직 바: 한 줄 자연어로 일정 파싱 후 DB 저장 및 Zustand 반영
 * Gemini Function Calling으로 title, date, startTime, duration 추출
 */
export async function parseAndAddSchedule(command: string): Promise<{ success: true; todo: Todo } | { success: false; message: string }> {
  const { apiKey } = useApiKeyStore.getState()

  if (!apiKey?.trim()) {
    return { success: false, message: '설정에서 Gemini API 키를 먼저 입력해주세요.' }
  }

  const trimmed = command.trim()
  if (!trimmed) {
    return { success: false, message: '한 줄로 일정을 입력해주세요.' }
  }

  try {
    const response = await fetch(getParseScheduleUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gemini-API-Key': apiKey,
      },
      body: JSON.stringify({ command: trimmed }),
      credentials: 'include',
    })

    if (!response.ok) {
      const errText = await response.text()
      let message = '일정을 이해하지 못했어요.'
      try {
        const errJson = JSON.parse(errText)
        if (errJson.message) message = errJson.message
      } catch {
        if (response.status === 401) message = '로그인이 필요해요.'
      }
      return { success: false, message }
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) {
      return { success: false, message: '로그인이 필요하거나 서버 응답 형식이 올바르지 않아요. 로그인 후 다시 시도해주세요.' }
    }

    let schedule: ParsedSchedule
    try {
      schedule = await response.json()
    } catch {
      return { success: false, message: '서버 응답을 읽지 못했어요. 로그인 후 다시 시도해주세요.' }
    }
    const { addTodo } = useCalendarStore.getState()

    try {
      const saved = await createSchedule({
        title: schedule.title,
        description: schedule.description ?? '한 줄 명령으로 추가한 일정',
        date: schedule.date,
        startTime: schedule.startTime ?? undefined,
        endTime: schedule.endTime ?? undefined,
        status: 'pending',
        priority: (schedule.priority as 'low' | 'medium' | 'high') || 'medium',
        createdBy: 'ai',
      })
      addTodo(saved)
      return { success: true, todo: saved }
    } catch {
      const newTodo: Todo = {
        id: `magic-${Date.now()}`,
        title: schedule.title,
        description: schedule.description ?? '한 줄 명령으로 추가한 일정',
        date: schedule.date,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        status: 'pending',
        priority: (schedule.priority as 'low' | 'medium' | 'high') || 'medium',
        createdBy: 'ai',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      addTodo(newTodo)
      return { success: true, todo: newTodo }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : '네트워크 오류가 났어요.'
    return { success: false, message }
  }
}
