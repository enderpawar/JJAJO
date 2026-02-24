import { format, addDays, subDays } from 'date-fns'
import { useApiKeyStore } from '@/stores/apiKeyStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { suggestSchedulePlacement, timeToMinutes, minutesToTime, getAvailableSlotsForDay, excludeMealBlocksFromSlots } from '@/utils/scheduleUtils'

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

function getPlannerScheduleUrl(): string {
  const base = getApiBase()
  return base ? `${base}/api/v1/ai/planner-schedule` : '/api/v1/ai/planner-schedule'
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
    durationMinutes?: number
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

/** 수정/삭제 의도 키워드 - 이 중 하나라도 있으면 edit API만 사용 */
const EDIT_DELETE_KEYWORDS = /삭제|취소|수정|늘려|줄여|바꿔|변경|지워|취소해|삭제해|수정해|바꿔줘|변경해/

/**
 * 순수 일정 추가 의도 여부 (날짜·시간·제목 위주 단일 추가 요청)
 * 수정/삭제 키워드가 없고, 여러 일정 추가 패턴(쉼표/그리고)도 없으면 추가로 간주
 */
function isPureAddIntent(command: string): boolean {
  const trimmed = command.trim()
  if (!trimmed || trimmed.length > 150) return false
  if (EDIT_DELETE_KEYWORDS.test(trimmed)) return false
  // 여러 개 추가 패턴: "회의, 미팅, 점심" / "회의 그리고 미팅"
  if (/,.{2,}|그리고|또\s|및\s/.test(trimmed)) return false
  return true
}

/** 짜조 플래너 의도: 목표·시간량·할일 짜줘 등 */
const JJAJO_PLANNER_KEYWORDS = /짜줘|짜조|플랜|계획|시간\s*공부|시간\s*할|일정\s*잡|오늘\s*할|공부\s*해|해줘/

function isJjajoPlannerIntent(command: string): boolean {
  return JJAJO_PLANNER_KEYWORDS.test(command.trim()) || /\d+\s*시간/.test(command.trim())
}

/** 콤마로 구분된 할일 목록이면 배치 요청 문장으로 감싸서 Gemini가 여러 plan으로 파싱하도록 함 */
function wrapCommaListForPlanner(text: string): string {
  const t = text.trim()
  if (!t.includes(',')) return t
  const parts = t.split(',').map((s) => s.trim()).filter(Boolean)
  if (parts.length < 2) return t
  if (isJjajoPlannerIntent(t)) return t
  return `오늘 할 일을 순서대로 배치해줘: ${t}`
}

export interface JjajoPlannerResult {
  success: true
  plansCount: number
  summary?: string
}
export type SubmitMagicBarResult =
  | { success: true; appliedCount: number }
  | { success: true; plansCount: number; isGhost: true; summary?: string }
  | { success: false; message: string }

export interface SubmitMagicBarOptions {
  editMode?: boolean
  timeRange?: { start: number; end: number }
  /** 짜조 플래너: 한 블록 최대 길이(분). 예: 60 → 60분 단위로 쪼개 배치. */
  blockMaxMinutes?: number
  /** 짜조 플래너: 기본 휴식 길이(분). plan의 breakMinutesAfter가 없을 때 사용. */
  breakMinutesDefault?: number
}

/**
 * 사용자 지정 시간대(시 단위) 안으로 슬롯 클리핑. 슬롯이 구간과 겹치는 부분만 남김.
 */
function filterSlotsByTimeRange(
  slots: Array<{ start: string; end: string }>,
  timeRange: { start: number; end: number }
): Array<{ start: string; end: string }> {
  const rangeStartMin = timeRange.start * 60
  const rangeEndMin = timeRange.end * 60
  const result: Array<{ start: string; end: string }> = []
  for (const slot of slots) {
    const s = timeToMinutes(slot.start)
    const e = timeToMinutes(slot.end)
    const clippedStart = Math.max(s, rangeStartMin)
    const clippedEnd = Math.min(e, rangeEndMin)
    if (clippedEnd > clippedStart) {
      result.push({
        start: minutesToTime(clippedStart),
        end: minutesToTime(clippedEnd),
      })
    }
  }
  return result
}

/**
 * 짜조 플래너 API 호출: 가용 시간대 내에서 일정 제안 → ghostPlans로 설정.
 * timeRange 전달 시 해당 시~시 구간 안의 슬롯만 사용.
 */
export async function requestJjajoPlanner(
  command: string,
  options?: { timeRange?: { start: number; end: number }; blockMaxMinutes?: number; breakMinutesDefault?: number }
): Promise<JjajoPlannerResult | { success: false; message: string }> {
  const { apiKey } = useApiKeyStore.getState()
  if (!apiKey?.trim()) {
    return { success: false, message: '설정에서 Gemini API 키를 먼저 입력해주세요.' }
  }

  const { selectedDate, todos, setGhostPlans } = useCalendarStore.getState()
  const { settings } = useSettingsStore.getState()
  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const now = new Date()
  const isToday = format(now, 'yyyy-MM-dd') === dateStr
  const currentTimeMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : 0
  const rawSlots = getAvailableSlotsForDay(
    dateStr,
    todos,
    isToday ? currentTimeMinutes : 0,
    settings.timeSlotPreferences,
  )
  // 아침·점심·저녁 각 1시간은 무조건 비워두고 플래너 가용 슬롯 계산
  let availableSlots = excludeMealBlocksFromSlots(rawSlots)
  if (options?.timeRange) {
    availableSlots = filterSlotsByTimeRange(availableSlots, options.timeRange)
  }
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  if (availableSlots.length === 0) {
    return { success: false, message: '가용 시간대가 없어요. 오늘 일정을 비워두거나 다른 날을 선택해 주세요.' }
  }

  try {
    const response = await fetch(getPlannerScheduleUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gemini-API-Key': apiKey,
      },
      body: JSON.stringify({
        userText: command.trim(),
        currentTime,
        date: dateStr,
        availableSlots: availableSlots.map((s) => ({ start: s.start, end: s.end })),
        blockMaxMinutes: options?.blockMaxMinutes,
        breakMinutesDefault: options?.breakMinutesDefault,
      }),
      credentials: 'include',
    })

    if (!response.ok) {
      const errText = await response.text()
      let message = '일정을 생성하지 못했어요.'
      try {
        const errJson = JSON.parse(errText) as { message?: string; exceptionClass?: string }
        if (errJson.message) {
          message = errJson.exceptionClass ? `[${errJson.exceptionClass}] ${errJson.message}` : errJson.message
        }
      } catch {
        if (response.status === 401) message = '로그인이 필요해요.'
      }
      return { success: false, message }
    }

    const data: {
      plans?: Array<{ title: string; start: string; end: string; note?: string }>
      summary?: string
    } = await response.json()
    const plans = data.plans ?? []
    if (plans.length === 0) {
      return { success: false, message: '생성된 일정이 없어요. 목표를 조금 더 구체적으로 적어 주세요.' }
    }

    const ghostTodos: Todo[] = plans.map((p, i) => ({
      id: `ghost-${Date.now()}-${i}`,
      title: p.title,
      description: p.note ?? undefined,
      date: dateStr,
      startTime: p.start,
      endTime: p.end,
      status: 'pending' as const,
      priority: 'medium' as const,
      createdBy: 'ai' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isGhost: true,
    }))
    setGhostPlans(ghostTodos)
    return { success: true, plansCount: ghostTodos.length, summary: data.summary ?? undefined }
  } catch (e) {
    const message = e instanceof Error ? e.message : '네트워크 오류가 났어요.'
    return { success: false, message }
  }
}

/**
 * 매직 바 통합 제출: 짜조 모드(editMode)면 플래너 호출 → 고스트 표시, 아니면 기존 parse/edit
 */
export async function submitMagicBarCommand(
  command: string,
  options?: SubmitMagicBarOptions
): Promise<SubmitMagicBarResult> {
  const trimmed = command.trim()
  if (!trimmed) {
    return { success: false, message: '한 줄로 입력해 주세요.' }
  }

  if (options?.editMode) {
    const plannerText = wrapCommaListForPlanner(trimmed)
    const result = await requestJjajoPlanner(plannerText, {
      timeRange: options.timeRange,
      blockMaxMinutes: options.blockMaxMinutes,
      breakMinutesDefault: options.breakMinutesDefault,
    })
    if (result.success) {
      return {
        success: true,
        plansCount: result.plansCount,
        isGhost: true,
        ...(result.summary != null && { summary: result.summary }),
      }
    }
    return { success: false, message: result.message }
  }

  if (isPureAddIntent(trimmed)) {
    const parseResult = await parseAndAddSchedule(trimmed)
    if (parseResult.success) {
      return { success: true, appliedCount: 1 }
    }
  }
  return editScheduleByNaturalLanguage(trimmed)
}

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
      const fallbackMessage =
        data.message ?? '일정 내용을 이해하지 못했어요. 날짜·시간·제목을 명확히 적어주세요. (예: 내일 오후 3시 2시간 회의)'
      return { success: false, message: fallbackMessage }
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
          if (payload?.durationMinutes != null && payload.durationMinutes > 0) return Math.min(480, payload.durationMinutes)
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
