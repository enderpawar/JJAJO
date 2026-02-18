import { useEffect, useRef, useState } from 'react'
import { useToastStore } from '@/stores/toastStore'
import { cn } from '@/utils/cn'

const TOAST_DURATION_MS = 2250

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div
      className="fixed right-4 z-[100] flex flex-col gap-2 max-w-[min(360px,calc(100vw-2rem))] bottom-[max(1rem,env(safe-area-inset-bottom))]"
      role="region"
      aria-label="알림"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} id={t.id} message={t.message} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  )
}

function ToastItem({
  id,
  message,
  onClose,
}: {
  id: number
  message: string
  onClose: () => void
}) {
  const [isExiting, setIsExiting] = useState(false)
  const elRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setIsExiting(true), TOAST_DURATION_MS)
    return () => clearTimeout(timer)
  }, [id])

  useEffect(() => {
    if (!isExiting) return
    const el = elRef.current
    if (!el) {
      onClose()
      return
    }
    const handleEnd = () => onClose()
    el.addEventListener('animationend', handleEnd, { once: true })
    return () => el.removeEventListener('animationend', handleEnd)
  }, [isExiting, onClose])

  return (
    <div
      ref={elRef}
      className={cn(
        'rounded-neu neu-float px-4 py-3 text-sm',
        'text-theme',
        'toast-enter',
        isExiting && 'toast-exit'
      )}
      role="status"
    >
      <p className="leading-snug">{message}</p>
    </div>
  )
}
