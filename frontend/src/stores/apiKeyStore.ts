import { create } from 'zustand'

interface ApiKeyStore {
  apiKey: string | null
  setApiKey: (key: string) => void
  clearApiKey: () => void
  loadApiKey: () => void
}

const STORAGE_KEY = 'jjajo-gemini-api-key'

/**
 * API 키 전역 상태 관리
 * sessionStorage에 저장하여 브라우저 종료 시 자동 삭제
 */
export const useApiKeyStore = create<ApiKeyStore>((set) => ({
  apiKey: null,
  
  setApiKey: (key: string) => {
    sessionStorage.setItem(STORAGE_KEY, key)
    set({ apiKey: key })
  },
  
  clearApiKey: () => {
    sessionStorage.removeItem(STORAGE_KEY)
    set({ apiKey: null })
  },
  
  loadApiKey: () => {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored) {
      set({ apiKey: stored })
    }
  },
}))

// 앱 시작 시 저장된 API 키 로드
useApiKeyStore.getState().loadApiKey()
