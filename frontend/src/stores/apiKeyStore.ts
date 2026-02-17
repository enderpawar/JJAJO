import { create } from 'zustand'
import { useUserStore } from './userStore'

interface ApiKeyStore {
  apiKey: string | null
  setApiKey: (key: string) => void
  clearApiKey: () => void
  loadApiKeyForCurrentUser: () => void
}

const STORAGE_KEY_PREFIX = 'jjajo-gemini-api-key:'

function getStorageKeyForUser(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`
}

/**
 * Gemini API 키 전역 상태 관리
 *
 * - 브라우저 localStorage에만 저장 (서버로 전송하지 않음)
 * - 로그인한 userId별로 다른 키를 사용
 */
export const useApiKeyStore = create<ApiKeyStore>((set) => ({
  apiKey: null,

  setApiKey: (key: string) => {
    const currentUser = useUserStore.getState().currentUser
    if (!currentUser?.userId) {
      // 로그인 정보가 없는 경우에는 메모리에는만 유지 (페이지 이동 시 사라질 수 있음)
      set({ apiKey: key })
      return
    }

    const storageKey = getStorageKeyForUser(currentUser.userId)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, key)
    }
    set({ apiKey: key })
  },

  clearApiKey: () => {
    const currentUser = useUserStore.getState().currentUser
    if (currentUser?.userId && typeof window !== 'undefined') {
      const storageKey = getStorageKeyForUser(currentUser.userId)
      window.localStorage.removeItem(storageKey)
    }
    set({ apiKey: null })
  },

  loadApiKeyForCurrentUser: () => {
    const currentUser = useUserStore.getState().currentUser
    if (!currentUser?.userId || typeof window === 'undefined') {
      set({ apiKey: null })
      return
    }
    const storageKey = getStorageKeyForUser(currentUser.userId)
    const stored = window.localStorage.getItem(storageKey)
    set({ apiKey: stored })
  },
}))
