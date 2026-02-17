import { getApiBase, apiRequest } from '@/utils/api'
import type { FixedScheduleCandidate } from '@/types/timetable'
import type { Todo } from '@/types/calendar'
import { scheduleFromApi } from '@/services/scheduleService'

function getTimetablesBase(): string {
  const base = getApiBase()
  return base ? `${base}/api/v1/timetables` : '/api/v1/timetables'
}

export interface UploadTimetableOptions {
  language?: string
  weekStartDay?: string
}

/**
 * 시간표 이미지 업로드 → Gemini Vision 파싱 결과 가져오기.
 */
export async function uploadTimetableImage(
  file: File,
  apiKey: string,
  options: UploadTimetableOptions = {}
): Promise<FixedScheduleCandidate[]> {
  const url = `${getTimetablesBase()}/parse`
  const form = new FormData()
  form.append('image', file)
  if (options.language) form.append('language', options.language)
  if (options.weekStartDay) form.append('weekStartDay', options.weekStartDay)

  return apiRequest<FixedScheduleCandidate[]>(url, {
    method: 'POST',
    body: form,
    headers: {
      'X-Gemini-API-Key': apiKey,
    },
  })
}

export interface FixedScheduleSavePayload {
  startDate: string
  endDate: string
  items: FixedScheduleCandidate[]
}

/**
 * 파싱된 고정 일정 후보를 주간 반복 일정으로 저장하고,
 * 생성된 일정 목록(Todo 형태)을 반환한다.
 */
export async function saveFixedSchedules(payload: FixedScheduleSavePayload): Promise<Todo[]> {
  const url = `${getTimetablesBase()}/fixed-schedules`
  const data = await apiRequest<unknown[]>(url, {
    method: 'POST',
    body: payload,
  })
  const list = Array.isArray(data) ? data : []
  return list.map((item) => scheduleFromApi(item as Record<string, unknown>))
}

