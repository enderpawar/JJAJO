import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { UserSettings, TimeSlotPreference, DEFAULT_TIME_SLOTS } from '@/types/settings'

interface SettingsStore {
  settings: UserSettings
  theme: 'light' | 'dark'
  updateTimeSlotPreferences: (preferences: TimeSlotPreference[]) => void
  updateWorkHours: (startTime: string, endTime: string) => void
  updateBreakDuration: (minutes: number) => void
  toggleTheme: () => void
  initTheme: () => void
  resetToDefaults: () => void
}

const DEFAULT_SETTINGS: UserSettings = {
  timeSlotPreferences: DEFAULT_TIME_SLOTS,
  workStartTime: '09:00',
  workEndTime: '18:00',
  breakDuration: 15,
}

// 시스템 다크모드 설정 감지
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      theme: getSystemTheme(),

      initTheme: () => {
        const theme = get().theme
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', theme === 'dark')
        }
      },

      toggleTheme: () => {
        set((state) => {
          const newTheme = state.theme === 'light' ? 'dark' : 'light'
          if (typeof document !== 'undefined') {
            document.documentElement.classList.toggle('dark', newTheme === 'dark')
          }
          return { theme: newTheme }
        })
      },

      updateTimeSlotPreferences: (preferences) =>
        set((state) => ({
          settings: {
            ...state.settings,
            timeSlotPreferences: preferences,
          },
        })),

      updateWorkHours: (startTime, endTime) =>
        set((state) => ({
          settings: {
            ...state.settings,
            workStartTime: startTime,
            workEndTime: endTime,
          },
        })),

      updateBreakDuration: (minutes) =>
        set((state) => ({
          settings: {
            ...state.settings,
            breakDuration: minutes,
          },
        })),

      resetToDefaults: () =>
        set({
          settings: DEFAULT_SETTINGS,
        }),
    }),
    {
      name: 'jjajo-settings',
    }
  )
)
