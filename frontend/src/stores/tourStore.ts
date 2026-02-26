import { create } from 'zustand'

const TOUR_SEEN_KEY = 'jjajo_tour_seen'

interface TourState {
  run: boolean
  stepIndex: number
  hasSeenTour: boolean
  /** 투어 처음부터 시작 */
  startTour: () => void
  /** run=false (stepIndex 유지) — 뷰 전환 중 일시 정지용 */
  pauseTour: () => void
  /** run=true (stepIndex 유지) — 뷰 전환 완료 후 재개용 */
  resumeTour: () => void
  /** run=false (stepIndex 유지) — 투어 완전 종료용 */
  stopTour: () => void
  setStepIndex: (i: number) => void
  markSeen: () => void
}

function readTourSeen(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(TOUR_SEEN_KEY) === 'true'
  } catch {
    return false
  }
}

export const useTourStore = create<TourState>((set) => ({
  run: false,
  stepIndex: 0,
  hasSeenTour: readTourSeen(),

  startTour: () => set({ run: true, stepIndex: 0 }),

  pauseTour: () => set({ run: false }),

  resumeTour: () => set({ run: true }),

  stopTour: () => set({ run: false }),

  setStepIndex: (i) => set({ stepIndex: i }),

  markSeen: () => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(TOUR_SEEN_KEY, 'true')
      }
    } catch {
      // 프라이빗 모드 등 스토리지 접근 불가 시 무시
    }
    set({ hasSeenTour: true })
  },
}))
