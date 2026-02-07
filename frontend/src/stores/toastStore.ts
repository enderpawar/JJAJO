import { create } from 'zustand'

export interface ToastItem {
  id: number
  message: string
  createdAt: number
}

interface ToastStore {
  toasts: ToastItem[]
  addToast: (message: string) => void
  removeToast: (id: number) => void
}

let nextId = 0

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        { id: ++nextId, message, createdAt: Date.now() },
      ],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}))
