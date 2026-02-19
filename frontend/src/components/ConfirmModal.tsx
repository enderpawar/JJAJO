import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  /** 삭제 등 위험 액션일 때 true (빨간 강조) */
  danger?: boolean
}

/**
 * 현재 테마(Notion 다크)와 어울리는 확인/취소 커스텀 모달.
 * 브라우저 confirm() 대신 사용.
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = '확인',
  message,
  confirmLabel = '확인',
  cancelLabel = '취소',
  danger = false,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* 배경 딤 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          {/* 모달 패널 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-sm rounded-neu-lg neu-float"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            aria-describedby="confirm-modal-desc"
          >
            <div className="p-6">
              <div className="flex gap-3">
                {danger && (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/20">
                    <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2
                    id="confirm-modal-title"
                    className="text-base font-semibold text-theme"
                  >
                    {title}
                  </h2>
                  <p
                    id="confirm-modal-desc"
                    className="mt-1 text-sm text-theme-muted"
                  >
                    {message}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-theme">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1 rounded-neu py-2.5 text-sm font-medium"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={
                  danger
                    ? 'flex-1 rounded-neu py-2.5 text-sm font-medium text-white transition-colors bg-red-500 hover:bg-red-600 active:scale-[0.98]'
                    : 'flex-1 rounded-neu py-2.5 text-sm font-medium text-white transition-colors bg-primary-500 hover:bg-primary-600 active:scale-[0.98]'
                }
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
