/**
 * 모바일/터치 환경에서 진동 피드백 (Vibration API)
 * UX 흥미도 유지 및 클릭/완료 피드백 제공
 *
 * Chrome은 사용자 제스처 없이 vibrate 호출 시 Intervention으로 차단하므로,
 * userActivation이 있을 때만 호출한다. 롱프레스(setTimeout)·useEffect 등
 * 비동기 경로에서는 제스처가 끝난 것으로 간주되어 진동이 막힌다.
 * → 드래그 햅틱은 touchmove 핸들러 안에서 동기로 호출해야 한다.
 */

/** 개발 환경에서만 햅틱 호출 여부를 콘솔에 로그로 출력 */
const HAPTIC_DEBUG = import.meta.env.DEV

const canVibrate = (): boolean => {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) {
    if (HAPTIC_DEBUG) console.log('[haptic] canVibrate: false (no navigator.vibrate)')
    return false
  }
  const ua = (navigator as any).userActivation
  if (ua && ua.isActive === false) {
    if (HAPTIC_DEBUG) console.log('[haptic] canVibrate: false (userActivation not active)')
    return false
  }
  return true
}

/** 짧은 탭 피드백 — 버튼·아이콘 클릭 시 */
export function hapticLight(): void {
  if (!canVibrate()) return
  try {
    navigator.vibrate(8)
    if (HAPTIC_DEBUG) console.log('[haptic] hapticLight() called')
  } catch (e) {
    if (HAPTIC_DEBUG) console.warn('[haptic] hapticLight error', e)
  }
}

/** 성공/완료 리워드 피드백 — 저장·적용 완료 등 */
export function hapticSuccess(): void {
  if (!canVibrate()) return
  try {
    navigator.vibrate([10, 40, 15])
    if (HAPTIC_DEBUG) console.log('[haptic] hapticSuccess() called')
  } catch (e) {
    if (HAPTIC_DEBUG) console.warn('[haptic] hapticSuccess error', e)
  }
}

/** 약한 경고 피드백 — 취소·삭제 확인 등 (선택 사용) */
export function hapticWarn(): void {
  if (!canVibrate()) return
  try {
    navigator.vibrate([5, 30, 5])
    if (HAPTIC_DEBUG) console.log('[haptic] hapticWarn() called')
  } catch (e) {
    if (HAPTIC_DEBUG) console.warn('[haptic] hapticWarn error', e)
  }
}
