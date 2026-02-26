import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
import { formatDate, formatDateWithDay, isToday } from '@/utils/dateUtils'
import { cn } from '@/utils/cn'
import DayDetailPanel from './DayDetailPanel'

interface DayDetailBottomSheetProps {
  open: boolean
  onClose: () => void
  /** true면 일정 추가 모달 열기 트리거 */
  openAddModal?: boolean
  onAddModalOpened?: () => void
}

const enterTransition = { type: 'tween' as const, duration: 0.32, ease: [0.32, 0.72, 0, 1] as const }
const exitTransition = { type: 'tween' as const, duration: 0.24, ease: [0.4, 0, 1, 1] as const }

export default function DayDetailBottomSheet({
  open,
  onClose,
  openAddModal = false,
  onAddModalOpened,
}: DayDetailBottomSheetProps) {
  const { selectedDate, getTodosByDate } = useCalendarStore()
  const dateLabel = formatDateWithDay(selectedDate)
  const isTodaySelected = isToday(selectedDate)
  const dateStr = formatDate(selectedDate)
  const scheduleCount = getTodosByDate(dateStr).length

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <>
      {/* 배경 오버레이 */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-0 z-[29] bg-black/25 dark:bg-black/40"
            aria-hidden
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* 시트 본체 */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="day-detail-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0, transition: enterTransition }}
            exit={{ y: '100%', transition: exitTransition }}
            className={cn(
              'fixed left-0 right-0 z-30 flex flex-col rounded-t-[20px] theme-transition bg-theme shadow-[0_-4px_24px_rgba(0,0,0,0.12)]',
              'max-h-[min(88vh,calc(100vh-env(safe-area-inset-top)-2rem))]'
            )}
            style={{
              bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
            role="dialog"
            aria-modal="true"
            aria-label={`${dateLabel} 일정`}
          >
            {/* 드래그 핸들 */}
            <div className="shrink-0 flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-theme-muted/40" aria-hidden />
            </div>
            <div className="shrink-0 flex items-center justify-between px-4 pb-2">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span className="text-sm font-semibold text-theme tracking-tight">{dateLabel}</span>
                {isTodaySelected && (
                  <span className="text-sm font-medium text-primary-500 dark:text-primary-400 shrink-0">오늘</span>
                )}
                <span className="text-sm font-medium text-theme-muted shrink-0">{scheduleCount}개</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="touch-target flex items-center justify-center w-10 h-10 rounded-full text-theme-muted hover:bg-[var(--hover-bg)] hover:text-theme transition-colors"
                aria-label="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain -webkit-overflow-scrolling-touch px-4 pb-4">
              <DayDetailPanel
                embedded
                openAddModal={openAddModal}
                onAddModalOpened={onAddModalOpened}
                showAddButton={false}
                listMaxHeight="14rem"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
