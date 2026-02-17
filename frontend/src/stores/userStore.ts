import { create } from 'zustand'

export interface CurrentUser {
  userId: string
  email?: string | null
  name?: string | null
  pictureUrl?: string | null
}

interface UserStore {
  currentUser: CurrentUser | null
  setCurrentUser: (user: CurrentUser | null) => void
}

/**
 * 로그인한 사용자 정보 전역 상태 관리
 *
 * - /api/me 응답(userId, email 등)을 저장
 * - Gemini API 키 등 "계정별" 설정에서 userId를 사용하기 위함
 */
export const useUserStore = create<UserStore>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
}))

