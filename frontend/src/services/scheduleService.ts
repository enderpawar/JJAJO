import { format } from 'date-fns'

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
  // #region agent log
  const url = 'http://localhost:8080/api/schedule/generate-daily'
  const payload = {
    ...request,
    targetDate: format(request.targetDate, 'yyyy-MM-dd'),
  }
  
  fetch('http://127.0.0.1:7242/ingest/c9d906fa-5b17-40c8-b459-d69598c84aac',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scheduleService.ts:57',message:'Sending request to backend',data:{url,payload},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/c9d906fa-5b17-40c8-b459-d69598c84aac',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scheduleService.ts:72',message:'Response received',data:{status:response.status,ok:response.ok,statusText:response.statusText},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3,H5'})}).catch(()=>{});
  // #endregion

  if (!response.ok) {
    throw new Error(`일정 생성 실패: ${response.statusText}`)
  }

  return response.json()
}
