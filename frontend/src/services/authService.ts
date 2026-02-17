import { getApiBase, apiRequest, normalizeGoalFromApi } from '@/utils/api'
import { useUserStore } from '@/stores/userStore'
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
 * 현재 로그인한 사용자 정보 조회 (쿠키 기반)
 * - 성공 시 전역 userStore에 userId 등 저장
 * @returns 인증됐으면 true
 * @throws 인증 실패 시 (401 등)
 */
export async function checkAuth(): Promise<boolean> {
  const me = await apiRequest<{
    userId: string
    email?: string | null
    name?: string | null
    pictureUrl?: string | null
  }>(meUrl())

  useUserStore.getState().setCurrentUser({
    userId: me.userId,
    email: me.email ?? null,
    name: me.name ?? null,
    pictureUrl: me.pictureUrl ?? null,
  })

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
