/**
 * 백엔드 API 베이스 URL (쿠키 기반 인증 시 같은 오리진으로 요청해야 쿠키 전송됨)
 * - 개발: VITE_BACKEND_ORIGIN 또는 http://localhost:8080
 * - 프로덕션: 빈 문자열이면 상대 경로(/api) 사용 (같은 도메인 프록시 가정)
 */
export function getApiBase(): string {
  const origin = import.meta.env.VITE_BACKEND_ORIGIN
  if (origin && typeof origin === 'string') return String(origin).replace(/\/$/, '')
  if (import.meta.env.DEV) return 'http://localhost:8080'
  return ''
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
