import { getApiBase, apiRequest, ApiError } from '@/utils/api'
import type { Goal } from '@/types/goal'

function getGoalsApiBase(): string {
  const base = getApiBase()
  return base ? `${base}/api/v1/goals` : '/api/v1/goals'
}

function mapGoalApiError(e: unknown, fallback: string): never {
  if (e instanceof ApiError) {
    if (e.statusCode === 403) throw new Error('수정 권한이 없습니다.')
    if (e.statusCode === 404) throw new Error('존재하지 않는 목표입니다.')
    throw new Error(e.responseText || e.message || fallback)
  }
  throw e
}

function mapDeleteApiError(e: unknown, fallback: string): never {
  if (e instanceof ApiError) {
    if (e.statusCode === 403) throw new Error('삭제 권한이 없습니다.')
    if (e.statusCode === 404) throw new Error('이미 삭제되었거나 존재하지 않는 목표입니다.')
    throw new Error(e.responseText || e.message || fallback)
  }
  throw e
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
    try {
      return await apiRequest<Goal>(getGoalsApiBase(), {
        method: 'POST',
        body: {
          title: params.title.trim(),
          deadline: params.deadline,
          description: params.description?.trim() || undefined,
        },
      })
    } catch (e) {
      if (e instanceof ApiError) throw new Error(e.responseText || e.message || '목표 등록에 실패했습니다.')
      throw e
    }
  },

  /**
   * 목표 수정 (제목/마감일/설명)
   */
  async updateGoal(id: string, params: SimpleGoalCreateParams): Promise<Goal> {
    try {
      return await apiRequest<Goal>(`${getGoalsApiBase()}/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: {
          title: params.title.trim(),
          deadline: params.deadline,
          description: params.description?.trim() || undefined,
        },
      })
    } catch (e) {
      mapGoalApiError(e, '목표 수정에 실패했습니다.')
    }
  },

  /**
   * 목표 삭제
   */
  async deleteGoal(id: string): Promise<void> {
    try {
      await apiRequest<void>(`${getGoalsApiBase()}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        parseJson: false,
      })
    } catch (e) {
      mapDeleteApiError(e, '목표 삭제에 실패했습니다.')
    }
  },
}
