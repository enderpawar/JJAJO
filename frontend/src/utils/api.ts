/** 배포 시 env 없을 때 사용할 백엔드 오리진 (Cloudflare Pages + Render 기준) */
const FALLBACK_BACKEND_ORIGIN = 'https://jjajo-backend.onrender.com'

/**
 * 백엔드 API 베이스 URL (쿠키 기반 인증 시 같은 오리진으로 요청해야 쿠키 전송됨)
 * - 항상 오리진만 반환(경로 제거). 경로가 포함된 env 시 registrationId 오인으로 404 방지.
 * - 개발: VITE_BACKEND_ORIGIN 없으면 '' → Vite 프록시 사용
 * - 프로덕션: 없으면 FALLBACK_BACKEND_ORIGIN 사용 (배포 환경 로그인 정상화)
 */
export function getApiBase(): string {
  const raw = import.meta.env.VITE_BACKEND_ORIGIN
  if (!raw || typeof raw !== 'string') {
    return import.meta.env.DEV ? '' : FALLBACK_BACKEND_ORIGIN
  }
  try {
    const u = new URL(raw.replace(/\/$/, ''))
    return u.origin
  } catch {
    return import.meta.env.DEV ? '' : FALLBACK_BACKEND_ORIGIN
  }
}

/** 백엔드 목표 응답(대문자 enum)을 프론트 Goal 타입(소문자)으로 정규화 */
export function normalizeGoalFromApi(g: Record<string, unknown>): {
  id: string
  userId?: string
  title: string
  description?: string
  deadline: string
  priority: 'high' | 'medium' | 'low'
  status: 'not_started' | 'on_track' | 'at_risk' | 'delayed' | 'completed' | 'cancelled'
  category: 'work' | 'study' | 'health' | 'personal' | 'hobby' | 'other'
  estimatedHours: number
  completedHours: number
  milestones: Array<{
    id: string
    goalId: string
    title: string
    description?: string
    targetDate: string
    completed: boolean
    completedDate?: string
    estimatedHours: number
  }>
} {
  const priority = String(g.priority ?? 'medium').toLowerCase() as 'high' | 'medium' | 'low'
  const status = String(g.status ?? 'not_started').toLowerCase().replace(/-/g, '_') as 'not_started' | 'on_track' | 'at_risk' | 'delayed' | 'completed' | 'cancelled'
  const category = String(g.category ?? 'other').toLowerCase() as 'work' | 'study' | 'health' | 'personal' | 'hobby' | 'other'
  const milestones = Array.isArray(g.milestones)
    ? (g.milestones as Record<string, unknown>[]).map((m) => ({
        id: String(m.id ?? ''),
        goalId: String(m.goalId ?? g.id ?? ''),
        title: String(m.title ?? ''),
        description: m.description != null ? String(m.description) : undefined,
        targetDate: String(m.targetDate ?? ''),
        completed: Boolean(m.completed),
        completedDate: m.completedDate != null ? String(m.completedDate) : undefined,
        estimatedHours: Number(m.estimatedHours ?? 0),
      }))
    : []
  return {
    id: String(g.id ?? ''),
    userId: g.userId != null ? String(g.userId) : undefined,
    title: String(g.title ?? ''),
    description: g.description != null ? String(g.description) : undefined,
    deadline: String(g.deadline ?? ''),
    priority: priority === 'high' || priority === 'low' ? priority : 'medium',
    status: ['not_started', 'on_track', 'at_risk', 'delayed', 'completed', 'cancelled'].includes(status) ? status : 'not_started',
    category: ['work', 'study', 'health', 'personal', 'hobby', 'other'].includes(category) ? category : 'other',
    estimatedHours: Number(g.estimatedHours ?? 0),
    completedHours: Number(g.completedHours ?? 0),
    milestones,
  }
}
