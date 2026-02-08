import { getApiBase, apiRequest, normalizeGoalFromApi } from '@/utils/api'
import type { Goal } from '@/types/goal'

function meUrl(): string {
  const base = getApiBase()
  return base ? `${base}/api/me` : '/api/me'
}

function goalsUrl(): string {
  const base = getApiBase()
  return base ? `${base}/api/v1/goals` : '/api/v1/goals'
}

/**
 * 현재 사용자 인증 여부 확인 (쿠키 기반)
 * @returns 인증됐으면 true
 * @throws 인증 실패 시 (401 등)
 */
export async function checkAuth(): Promise<boolean> {
  await apiRequest<unknown>(meUrl(), { parseJson: false })
  return true
}

/**
 * 로그인된 사용자의 목표 목록 조회 (백엔드 enum → 소문자 정규화)
 */
export async function loadGoals(): Promise<Goal[]> {
  const data = await apiRequest<unknown>(goalsUrl())
  const list = Array.isArray(data) ? data : []
  return list.map((g: Record<string, unknown>) => normalizeGoalFromApi(g)) as Goal[]
}
