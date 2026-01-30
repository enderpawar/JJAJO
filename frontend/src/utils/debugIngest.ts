/**
 * 디버그/에이전트 로그 수집. VITE_DEBUG_INGEST_URL이 설정된 경우에만 전송.
 * 운영(prod) 환경에서는 해당 환경 변수를 설정하지 않아 보안·환경 격리를 유지한다.
 */
const DEBUG_INGEST_URL = import.meta.env.VITE_DEBUG_INGEST_URL

export type DebugPayload = {
  location: string
  message: string
  data?: Record<string, unknown>
  timestamp: number
  sessionId: string
  hypothesisId: string
}

export function sendDebugIngest(payload: DebugPayload): void {
  if (!DEBUG_INGEST_URL || typeof DEBUG_INGEST_URL !== 'string') return
  fetch(DEBUG_INGEST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {})
}
