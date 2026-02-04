import { format, addDays, subDays } from 'date-fns'
import { useApiKeyStore } from '@/stores/apiKeyStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { suggestSchedulePlacement, timeToMinutes, minutesToTime } from '@/utils/scheduleUtils'

/** 타임라인 필터와 맞추기 위해 날짜를 yyyy-MM-dd, 시간을 HH:mm으로 정규화 */
function normalizeDateStr(s: string | undefined): string {
  if (!s || typeof s !== 'string') return format(new Date(), 'yyyy-MM-dd')
  const parts = s.trim().split(/[-/]/).map((p) => p.padStart(2, '0'))
  if (parts.length >= 3) return `${parts[0]}-${parts[1]}-${parts[2]}`
  return s
}
function normalizeTimeStr(s: string | undefined): string {
  if (!s || typeof s !== 'string') return '09:00'
  const parts = s.trim().split(':').map((p) => p.padStart(2, '0'))
  if (parts.length >= 2) return `${parts[0]}:${parts[1]}`
  return s.length === 4 ? `0${s}` : s
}
import { useCalendarStore } from '@/stores/calendarStore'
import { createSchedule, updateSchedule, deleteSchedule } from '@/services/scheduleService'
import { getApiBase } from '@/utils/api'
import type { Todo } from '@/types/calendar'

function getParseScheduleUrl(): string {
  const base = getApiBase()
  return base ? `${base}/api/v1/ai/parse-schedule` : '/api/v1/ai/parse-schedule'
}

function getEditScheduleUrl(): string {
  const base = getApiBase()
  return base ? `${base}/api/v1/ai/edit-schedule` : '/api/v1/ai/edit-schedule'
}

/** API 응답 연산 (백엔드 필드명) */
interface EditOperationResponse {
  type: string
  scheduleId?: string
  updatePayload?: {
    title?: string
    date?: string
    startTime?: string
    endTime?: string
    description?: string
    status?: string
    priority?: string
  }
  addPayload?: {
    title?: string
    date?: string
    startTime?: string
    endTime?: string
    description?: string
  }
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
        description: schedule.description ?? '',
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
        description: schedule.description ?? '',
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

const CONTEXT_DAYS = 7
const MAX_TODOS_CONTEXT = 50

/**
 * 대화형 일정 수정: 자연어 명령을 보내 연산 목록을 받아 스토어와 API에 반영
 */
export async function editScheduleByNaturalLanguage(
  command: string
): Promise<{ success: true; appliedCount: number } | { success: false; message: string }> {
  const { apiKey } = useApiKeyStore.getState()
  if (!apiKey?.trim()) {
    return { success: false, message: '설정에서 Gemini API 키를 먼저 입력해주세요.' }
  }

  const trimmed = command.trim()
  if (!trimmed) {
    return { success: false, message: '수정 명령을 입력해주세요.' }
  }

  const { todos, selectedDate, deleteTodo, updateTodo } = useCalendarStore.getState()
  const fromDate = subDays(selectedDate, CONTEXT_DAYS)
  const toDate = addDays(selectedDate, CONTEXT_DAYS)

  const inRange = todos.filter((t) => {
    if (!t.date) return false
    return t.date >= format(fromDate, 'yyyy-MM-dd') && t.date <= format(toDate, 'yyyy-MM-dd')
  })

  const sorted = [...inRange].sort((a, b) => {
    const d = (a.date || '').localeCompare(b.date || '')
    if (d !== 0) return d
    return (a.startTime || '').localeCompare(b.startTime || '')
  })

  const contextTodos = sorted.slice(0, MAX_TODOS_CONTEXT).map((t, idx) => ({
    order: idx + 1,
    id: t.id,
    title: t.title,
    date: t.date,
    startTime: t.startTime ?? undefined,
    endTime: t.endTime ?? undefined,
  }))

  try {
    const response = await fetch(getEditScheduleUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gemini-API-Key': apiKey,
      },
      body: JSON.stringify({ command: trimmed, todos: contextTodos }),
      credentials: 'include',
    })

    if (!response.ok) {
      const errText = await response.text()
      let message = '명령을 이해하지 못했어요.'
      if (response.status === 404) {
        message = '일정 수정 API를 찾을 수 없어요. 백엔드(Spring)를 재시작한 뒤 다시 시도해 주세요.'
      } else if (response.status === 401) {
        message = '로그인이 필요해요.'
      } else {
        try {
          const errJson = JSON.parse(errText)
          if (errJson.message) message = errJson.message
        } catch {
          // keep default message
        }
      }
      return { success: false, message }
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) {
      return { success: false, message: '서버 응답 형식이 올바르지 않아요. 로그인 후 다시 시도해주세요.' }
    }

    let data: { operations?: EditOperationResponse[]; message?: string }
    try {
      data = await response.json()
    } catch {
      return { success: false, message: '서버 응답을 읽지 못했어요.' }
    }

    const operations = data.operations ?? []
    if (operations.length === 0) {
      return {
        success: false,
        message: data.message ?? '해당하는 일정이 없거나 변경할 내용이 없습니다.',
      }
    }

    const adds = operations.filter((o) => String(o.type).toLowerCase() === 'add')
    const deletes = operations.filter((o) => String(o.type).toLowerCase() === 'delete')
    const updates = operations.filter((o) => String(o.type).toLowerCase() === 'update')

    let appliedDeletes = 0
    let appliedUpdates = 0
    let appliedAdds = 0

    for (const op of deletes) {
      const id = op.scheduleId
      if (!id) continue
      deleteTodo(id)
      appliedDeletes += 1
      try {
        await deleteSchedule(id)
      } catch {
        // 스토어는 이미 반영
      }
    }

    for (const op of updates) {
      const id = op.scheduleId
      const payload = op.updatePayload
      if (!id) continue
      const updatesOnly: Partial<Todo> = {}
      // API가 null/빈 값을 보내면 '기존 값 유지'. 기본값(09:00)으로 덮어쓰지 않음.
      if (payload?.title != null && payload.title !== '') updatesOnly.title = payload.title
      if (payload?.date != null && payload.date !== '') updatesOnly.date = normalizeDateStr(payload.date)
      if (payload?.startTime != null && payload.startTime !== '') updatesOnly.startTime = normalizeTimeStr(payload.startTime)
      if (payload?.endTime != null && payload.endTime !== '') updatesOnly.endTime = normalizeTimeStr(payload.endTime)
      if (payload?.description != null && payload.description !== '') updatesOnly.description = payload.description
      if (payload?.status != null && payload.status !== '') updatesOnly.status = payload.status as Todo['status']
      if (payload?.priority != null && payload.priority !== '') updatesOnly.priority = payload.priority as Todo['priority']
      if (Object.keys(updatesOnly).length === 0) continue
      updateTodo(id, updatesOnly)
      appliedUpdates += 1
      try {
        await updateSchedule(id, updatesOnly)
      } catch {
        // 스토어는 이미 반영
      }
    }

    const dateNorm = (p: typeof adds[0]['addPayload']) => normalizeDateStr(p?.date)
    const startNorm = (p: typeof adds[0]['addPayload']) => normalizeTimeStr(p?.startTime)
    const endNorm = (p: typeof adds[0]['addPayload']) => normalizeTimeStr(p?.endTime)

    const addedTodos: Todo[] = []
    for (const op of adds) {
      const payload = op.addPayload
      if (!payload?.title) continue
      const date = payload?.date ? dateNorm(payload) : format(selectedDate, 'yyyy-MM-dd')

      // A) 시간 미지정이면 선호 시간대+빈 슬롯으로 자동 보완
      let startTime = payload?.startTime ? startNorm(payload) : undefined
      let endTime = payload?.endTime ? endNorm(payload) : undefined

      if (!startTime || !endTime) {
        const { settings } = useSettingsStore.getState()
        const existingForSuggest = useCalendarStore.getState().todos
        const DEFAULT_DURATION_MINUTES = 60

        const durationMinutes = (() => {
          if (startTime && endTime) return Math.max(10, timeToMinutes(endTime) - timeToMinutes(startTime))
          return DEFAULT_DURATION_MINUTES
        })()

        const suggestion = suggestSchedulePlacement(
          date,
          durationMinutes,
          existingForSuggest,
          settings.timeSlotPreferences,
          false
        )

        if (suggestion.suggestion) {
          startTime = suggestion.suggestion.startTime
          endTime = suggestion.suggestion.endTime
        } else if (startTime && !endTime) {
          endTime = minutesToTime(timeToMinutes(startTime) + durationMinutes)
        } else if (!startTime && endTime) {
          startTime = minutesToTime(Math.max(0, timeToMinutes(endTime) - durationMinutes))
        } else {
          // 최후의 기본값
          startTime = '09:00'
          endTime = '10:00'
        }
      }

      if (!startTime || !endTime) continue
      try {
        const saved = await createSchedule({
          title: payload.title,
          description: payload.description ?? '',
          date,
          startTime,
          endTime,
          status: 'pending',
          priority: 'medium',
          createdBy: 'ai',
        })
        addedTodos.push({ ...saved, date: normalizeDateStr(saved.date), startTime: saved.startTime ? normalizeTimeStr(saved.startTime) : startTime, endTime: saved.endTime ? normalizeTimeStr(saved.endTime) : endTime })
        appliedAdds += 1
      } catch {
        addedTodos.push({
          id: `magic-add-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          title: payload.title,
          description: payload.description,
          date,
          startTime,
          endTime,
          status: 'pending',
          priority: 'medium',
          createdBy: 'ai',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        appliedAdds += 1
      }
    }
    if (addedTodos.length > 0) {
      useCalendarStore.getState().addTodos(addedTodos)
    }

    // C) 실제 적용된(스토어 반영된) 건수만 카운트
    const appliedCount = appliedAdds + appliedDeletes + appliedUpdates
    return { success: true, appliedCount }
  } catch (e) {
    const message = e instanceof Error ? e.message : '네트워크 오류가 났어요.'
    return { success: false, message }
  }
}
