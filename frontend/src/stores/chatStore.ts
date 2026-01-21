import { create } from 'zustand'
import type { ChatMessage, ChatSession } from '@/types/chat'

interface ChatStore {
  currentSession: ChatSession | null
  isLoading: boolean
  
  // Actions
  addMessage: (message: ChatMessage) => void
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void
  removeMessage: (id: string) => void
  clearMessages: () => void
  setLoading: (loading: boolean) => void
  initSession: () => void
}

/**
 * AI 채팅 전역 상태 관리
 */
export const useChatStore = create<ChatStore>((set, get) => ({
  currentSession: null,
  isLoading: false,
  
  addMessage: (message) => set((state) => {
    const session = state.currentSession || {
      id: `session-${Date.now()}`,
      messages: [],
      createdAt: new Date().toISOString(),
    }
    
    return {
      currentSession: {
        ...session,
        messages: [...session.messages, message],
      },
    }
  }),
  
  updateMessage: (id, updates) => set((state) => {
    if (!state.currentSession) return state
    
    return {
      currentSession: {
        ...state.currentSession,
        messages: state.currentSession.messages.map((msg) =>
          msg.id === id ? { ...msg, ...updates } : msg
        ),
      },
    }
  }),
  
  removeMessage: (id) => set((state) => {
    if (!state.currentSession) return state
    
    return {
      currentSession: {
        ...state.currentSession,
        messages: state.currentSession.messages.filter((msg) => msg.id !== id),
      },
    }
  }),
  
  clearMessages: () => set({
    currentSession: null,
  }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  initSession: () => set({
    currentSession: {
      id: `session-${Date.now()}`,
      messages: [],
      createdAt: new Date().toISOString(),
    },
  }),
}))
