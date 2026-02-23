import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { UserSettings, TimeSlotPreference, DEFAULT_TIME_SLOTS, DEFAULT_DAYS_OFF, WeekdayCode } from '@/types/settings'

export type AccentColor = 'orange' | 'blue' | 'purple' | 'green'

interface SettingsStore {
  settings: UserSettings
  theme: 'light' | 'dark'
  accentColor: AccentColor
  bgPattern: boolean
  updateTimeSlotPreferences: (preferences: TimeSlotPreference[]) => void
  updateWorkHours: (startTime: string, endTime: string) => void
  updateBreakDuration: (minutes: number) => void
  updateDaysOff: (days: WeekdayCode[]) => void
  toggleTheme: () => void
  initTheme: () => void
  setAccentColor: (color: AccentColor) => void
  setBgPattern: (on: boolean) => void
  resetToDefaults: () => void
}

const DEFAULT_SETTINGS: UserSettings = {
  timeSlotPreferences: DEFAULT_TIME_SLOTS,
  workStartTime: '09:00',
  workEndTime: '18:00',
  breakDuration: 15,
  daysOff: DEFAULT_DAYS_OFF,
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
      accentColor: 'orange' as AccentColor,
      bgPattern: false,

      initTheme: () => {
        const { theme, accentColor, bgPattern } = get()
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', theme === 'dark')
          document.documentElement.setAttribute('data-accent', accentColor === 'orange' ? 'orange' : accentColor)
          document.body.classList.toggle('bg-pattern', bgPattern)
          const meta = document.querySelector('meta[name="theme-color"]')
          if (meta) meta.setAttribute('content', theme === 'dark' ? '#121214' : '#F8F9FA')
          void document.documentElement.offsetHeight
        }
      },

      setAccentColor: (color: AccentColor) => {
        set({ accentColor: color })
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-accent', color === 'orange' ? 'orange' : color)
        }
      },

      setBgPattern: (on: boolean) => {
        set({ bgPattern: on })
        if (typeof document !== 'undefined') {
          document.body.classList.toggle('bg-pattern', on)
        }
      },

      toggleTheme: () => {
        set((state) => {
          const newTheme = state.theme === 'light' ? 'dark' : 'light'
          if (typeof document !== 'undefined') {
            document.documentElement.classList.toggle('dark', newTheme === 'dark')
            const meta = document.querySelector('meta[name="theme-color"]')
            if (meta) meta.setAttribute('content', newTheme === 'dark' ? '#121214' : '#F8F9FA')
            // 강제 reflow로 헤더·캘린더가 같은 프레임에 스타일 적용 후 동시에 transition
            void document.documentElement.offsetHeight
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

      updateDaysOff: (days) =>
        set((state) => ({
          settings: {
            ...state.settings,
            daysOff: [...days],
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
