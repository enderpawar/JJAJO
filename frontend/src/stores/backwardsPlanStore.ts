import { create } from 'zustand'
import type { BackwardsPlanResult } from '@/types/backwardsPlan'

interface BackwardsPlanState {
  isOpen: boolean
  loading: boolean
  applying: boolean
  error?: string
  form: {
    /** 일당 투자 시간(1~12). 없으면 비움(백엔드가 시간대 설정으로 계산) */
    preferredDailyHours: number | ''
    /** 총 필요 시간 override(시간). 기본 UI에서는 숨김 */
    totalHours: number | ''
  }
  result?: BackwardsPlanResult
  openModal: () => void
  closeModal: () => void
  setLoading: (loading: boolean) => void
  setApplying: (applying: boolean) => void
  setError: (message?: string) => void
  setResult: (result?: BackwardsPlanResult) => void
  updateForm: (updates: Partial<BackwardsPlanState['form']>) => void
  reset: () => void
}

export const useBackwardsPlanStore = create<BackwardsPlanState>((set) => ({
  isOpen: false,
  loading: false,
  applying: false,
  form: {
    preferredDailyHours: '' as number | '',
    totalHours: '' as number | '',
  },
  openModal: () => set({ isOpen: true, error: undefined }),
  closeModal: () => set({ isOpen: false }),
  setLoading: (loading) => set({ loading }),
  setApplying: (applying) => set({ applying }),
  setError: (message) => set({ error: message }),
  setResult: (result) => set({ result }),
  updateForm: (updates) =>
    set((state) => ({
      form: {
        ...state.form,
        ...updates,
      },
    })),
  reset: () =>
    set({
      loading: false,
      applying: false,
      error: undefined,
      result: undefined,
      form: {
        preferredDailyHours: '' as number | '',
        totalHours: '' as number | '',
      },
    }),
}))
