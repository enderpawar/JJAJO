import { useEffect, useRef } from 'react'
import { useCalendarStore } from '@/stores/calendarStore'
import { useToastStore } from '@/stores/toastStore'
import { format } from 'date-fns'

const REMINDER_SHOWN_KEY = 'jjajo_reminder_shown'

function getShownSet(): Set<string> {
  try {
    const raw = sessionStorage.getItem(REMINDER_SHOWN_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

function markShown(key: string) {
  const set = getShownSet()
  set.add(key)
  try {
    sessionStorage.setItem(REMINDER_SHOWN_KEY, JSON.stringify([...set]))
  } catch {}
}

/** 일정 시작 N분 전이 되면 브라우저 알림 + 토스트. 1분마다 체크. */
export function useReminderRunner() {
  const todos = useCalendarStore((s) => s.todos)
  const { addToast } = useToastStore()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    function check() {
      const now = new Date()
      const todayStr = format(now, 'yyyy-MM-dd')
      const nowMinutes = now.getHours() * 60 + now.getMinutes()

      for (const todo of todos) {
        if (todo.status === 'completed' || todo.status === 'cancelled') continue
        const minutes = todo.reminderMinutesBefore ?? 0
        if (minutes <= 0 || !todo.startTime || !todo.date) continue
        if (todo.date !== todayStr) continue

        const [h, m] = todo.startTime.split(':').map(Number)
        const startMinutes = h * 60 + m
        const reminderAt = startMinutes - minutes
        if (reminderAt <= nowMinutes && nowMinutes < reminderAt + 2) {
          const key = `${todo.id}-${todo.date}-${reminderAt}`
          if (getShownSet().has(key)) continue
          markShown(key)
          const msg = `${minutes}분 후 "${todo.title}" 시작해요`
          addToast(msg)
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('짜조 알림', { body: msg })
          }
        }
      }
    }

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }

    intervalRef.current = setInterval(check, 60_000)
    check()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [todos, addToast])
}
