/**
 * 디버그 모드에서 원격 로그 수집용 (location, message, data, timestamp, hypothesisId)
 */
export function debugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId?: string
) {
  // #region agent log
  const payload: Record<string, unknown> = { location, message, data, timestamp: Date.now() }
  if (hypothesisId) payload.hypothesisId = hypothesisId
  fetch('http://127.0.0.1:7243/ingest/81e1fb98-9efa-4cc2-bacf-8eaa56d0962b', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {})
  // #endregion
}
