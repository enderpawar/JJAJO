/**
 * 모바일/터치 환경에서 진동 피드백 (Vibration API)
 * UX 흥미도 유지 및 클릭/완료 피드백 제공
 */

const canVibrate = (): boolean =>
  typeof navigator !== 'undefined' && 'vibrate' in navigator

/** 짧은 탭 피드백 — 버튼·아이콘 클릭 시 */
export function hapticLight(): void {
  if (!canVibrate()) return
  try {
    navigator.vibrate(8)
  } catch {
    // ignore
  }
}

/** 성공/완료 리워드 피드백 — 저장·적용 완료 등 */
export function hapticSuccess(): void {
  if (!canVibrate()) return
  try {
    navigator.vibrate([10, 40, 15])
  } catch {
    // ignore
  }
}

/** 약한 경고 피드백 — 취소·삭제 확인 등 (선택 사용) */
export function hapticWarn(): void {
  if (!canVibrate()) return
  try {
    navigator.vibrate([5, 30, 5])
  } catch {
    // ignore
  }
}
