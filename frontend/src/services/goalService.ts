import { getApiBase } from '@/utils/api'
import { useApiKeyStore } from '@/stores/apiKeyStore'
import type { Goal } from '@/types/goal'
import type { Todo } from '@/types/calendar'

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

/**
 * 목표 관리 서비스
 */
export const goalService = {
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
}
