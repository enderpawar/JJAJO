import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'
import DayDetailPanel from './DayDetailPanel'

interface DayDetailBottomSheetProps {
  open: boolean
  onClose: () => void
  /** true면 일정 추가 모달 열기 트리거 */
  openAddModal?: boolean
  onAddModalOpened?: () => void
}

export default function DayDetailBottomSheet({
  open,
  onClose,
  openAddModal = false,
  onAddModalOpened,
}: DayDetailBottomSheetProps) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return (
    <>
      {/* 백드롭 */}
      <div
        className="fixed inset-0 z-40 bg-black/40 transition-opacity"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
        aria-hidden
        onClick={onClose}
      />
      {/* 시트: 하단에서 위로 슬라이드 */}
      <div
        className={cn(
          'fixed left-0 right-0 z-50 flex flex-col rounded-t-[20px] theme-transition bg-theme shadow-[0_-4px_24px_rgba(0,0,0,0.12)]',
          'max-h-[min(88vh,calc(100vh-env(safe-area-inset-top)-2rem))]'
        )}
        style={{
          bottom: 0,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="해당 날짜 일정"
      >
        {/* 드래그 핸들 */}
        <div className="shrink-0 flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-theme-muted/40" aria-hidden />
        </div>
        <div className="shrink-0 flex items-center justify-between px-4 pb-2">
          <span className="text-sm font-medium text-theme-muted">해당 날짜 일정</span>
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
          />
        </div>
      </div>
    </>
  )
}
