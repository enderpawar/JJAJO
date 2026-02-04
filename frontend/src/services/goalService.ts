import { getApiBase } from '@/utils/api'
import { useApiKeyStore } from '@/stores/apiKeyStore'
import type { Goal } from '@/types/goal'

function getGoalsApiBase(): string {
  const base = getApiBase()
  return base ? `${base}/api/v1/goals` : '/api/v1/goals'
}

interface GoalCreationResult {
  goal: Goal
  schedules: Array<{
    title: string
    description?: string
    date: string
    startTime?: string
    endTime?: string
    priority: string
  }>
  aiAnalysis: string
  totalHours: number
  sessionsPerWeek: number
  curriculum: string
}

export interface SimpleGoalCreateParams {
  title: string
  deadline: string
  description?: string
}

/**
 * 목표 관리 서비스
 */
export const goalService = {
  /**
   * 목표 단순 생성 (제목 + 마감일)
   */
  async createGoal(params: SimpleGoalCreateParams): Promise<Goal> {
    const url = getGoalsApiBase()
    const method = 'POST'
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: params.title.trim(),
        deadline: params.deadline,
        description: params.description?.trim() || undefined,
      }),
      credentials: 'include',
    })
    if (!response.ok) {
      const msg = await response.text()
      if (response.status === 401) {
        throw new Error('로그인이 필요합니다.')
      }
      throw new Error(msg || '목표 등록에 실패했습니다.')
    }
    const contentType = response.headers.get('Content-Type') ?? ''
    if (!contentType.includes('application/json')) {
      throw new Error('서버가 JSON이 아닌 응답을 반환했습니다. 로그인 상태를 확인해 주세요.')
    }
    const data = await response.json()
    return data as Goal
  },

  /**
   * 목표 수정 (제목/마감일/설명)
   */
  async updateGoal(id: string, params: SimpleGoalCreateParams): Promise<Goal> {
    const url = `${getGoalsApiBase()}/${encodeURIComponent(id)}`
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: params.title.trim(),
        deadline: params.deadline,
        description: params.description?.trim() || undefined,
      }),
      credentials: 'include',
    })

    if (!response.ok) {
      const msg = await response.text()
      if (response.status === 401) {
        throw new Error('로그인이 필요합니다.')
      }
      if (response.status === 403) {
        throw new Error('수정 권한이 없습니다.')
      }
      if (response.status === 404) {
        throw new Error('존재하지 않는 목표입니다.')
      }
      throw new Error(msg || '목표 수정에 실패했습니다.')
    }

    const contentType = response.headers.get('Content-Type') ?? ''
    if (!contentType.includes('application/json')) {
      throw new Error('서버가 JSON이 아닌 응답을 반환했습니다. 로그인 상태를 확인해 주세요.')
    }
    const data = await response.json()
    return data as Goal
  },

  /**
   * AI를 활용한 목표 생성 및 계획 수립
   */
  async createGoalWithAI(goalDescription: string): Promise<GoalCreationResult> {
    const { apiKey } = useApiKeyStore.getState()
    
    if (!apiKey) {
      throw new Error('API 키가 설정되지 않았습니다')
    }

    const response = await fetch(`${getGoalsApiBase()}/create-with-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gemini-API-Key': apiKey,
      },
      body: JSON.stringify({
        goalDescription,
      }),
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('목표 생성 실패')
    }

    const data: GoalCreationResult = await response.json()
    return data
  },

  /**
   * 목표 삭제
   */
  async deleteGoal(id: string): Promise<void> {
    const url = `${getGoalsApiBase()}/${encodeURIComponent(id)}`
    const response = await fetch(url, {
      method: 'DELETE',
      credentials: 'include',
    })

    if (!response.ok) {
      const msg = await response.text()
      if (response.status === 401) {
        throw new Error('로그인이 필요합니다.')
      }
      if (response.status === 403) {
        throw new Error('삭제 권한이 없습니다.')
      }
      if (response.status === 404) {
        throw new Error('이미 삭제되었거나 존재하지 않는 목표입니다.')
      }
      throw new Error(msg || '목표 삭제에 실패했습니다.')
    }
  },
}
