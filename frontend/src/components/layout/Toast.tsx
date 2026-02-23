import { forwardRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToastStore } from '@/stores/toastStore'
import { cn } from '@/utils/cn'

const TOAST_DURATION_MS = 2250

/** 하단 네비 바로 위에 토스트가 오도록: nav bottom(20) + nav height(56) + safe area + 간격(8) */
const TOAST_BOTTOM = 'calc(84px + env(safe-area-inset-bottom))'

interface ToastItemProps {
  id: number
  message: string
  onClose: () => void
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div
      className="fixed right-4 z-[100] flex flex-col gap-2 max-w-[min(360px,calc(100vw-2rem))]"
      style={{ bottom: TOAST_BOTTOM }}
      role="region"
      aria-label="알림"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastItem key={t.id} id={t.id} message={t.message} onClose={() => removeToast(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  )
}

const toastTransition = { type: 'tween' as const, duration: 0.28, ease: [0.32, 0.72, 0, 1] as const }

const ToastItem = forwardRef<HTMLDivElement, ToastItemProps>(function ToastItem(
  { id, message, onClose },
  ref
) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), TOAST_DURATION_MS)
    return () => clearTimeout(timer)
  }, [id, onClose])

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={toastTransition}
      className={cn(
        'rounded-neu neu-float px-4 py-3 text-sm',
        'text-theme'
      )}
      role="status"
    >
      <p className="leading-snug">{message}</p>
    </motion.div>
  )
})
