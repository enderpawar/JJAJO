import { useState } from 'react'
import { Trash2, AlertTriangle, Database } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
import { useToastStore } from '@/stores/toastStore'
import { deleteAllSchedules } from '@/services/scheduleService'

interface ScheduleDataSettingsProps {
  /** 컴팩트 모드: 카드 레이아웃, 초기화 버튼 바로 표시 */
  compact?: boolean
}

export function ScheduleDataSettings({ compact = false }: ScheduleDataSettingsProps) {
  const { todos, clearAllTodos, setTodos } = useCalendarStore()
  const { addToast } = useToastStore()
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const handleClearAll = async () => {
    if (todos.length === 0) {
      setShowConfirmDialog(false)
      return
    }
    const prevTodos = [...todos]
    clearAllTodos()
    setShowConfirmDialog(false)
    try {
      await deleteAllSchedules()
      addToast('모든 일정이 초기화되었습니다.')
    } catch (e) {
      console.error('일정 전체 삭제 실패:', e)
      addToast('일정 전체 삭제에 실패했습니다. 화면을 이전 상태로 되돌릴게요.')
      setTodos(prevTodos)
    }
  }

  return (
    <div className={compact ? 'neu-float rounded-neu theme-transition bg-theme-card p-3 space-y-3' : 'pt-6 border-t border-theme'}>
      {compact ? (
        <>
          <h3 className="text-sm font-semibold text-theme flex items-center gap-2">
            <Database className="w-4 h-4 text-primary-500" />
            일정 데이터
          </h3>
          <p className="text-xs text-theme-muted">
            저장된 모든 일정을 삭제할 수 있습니다. 되돌릴 수 없어요.
          </p>
          <button
            type="button"
            onClick={() => setShowConfirmDialog(true)}
            disabled={todos.length === 0}
            className="neu-btn touch-target w-full flex items-center justify-center gap-2 rounded-neu theme-transition font-medium text-red-400 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] px-3 py-2 text-sm"
          >
            <Trash2 className="w-4 h-4" />
            모든 일정 초기화
          </button>
        </>
      ) : (
        <>
          <h3 className="text-sm font-semibold text-theme mb-2">일정 데이터</h3>
          <p className="text-theme-muted text-xs mb-3">
            저장된 모든 일정을 삭제합니다. 이 작업은 되돌릴 수 없습니다.
          </p>
          <button
            type="button"
            onClick={() => setShowConfirmDialog(true)}
            disabled={todos.length === 0}
            className="neu-btn touch-target w-full flex items-center justify-center gap-2 rounded-neu theme-transition font-medium text-red-400 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] px-4 py-2 text-sm"
          >
            <Trash2 className="w-4 h-4" />
            모든 일정 초기화
          </button>
        </>
      )}

      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="neu-float rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-theme mb-2">
                  모든 일정을 삭제하시겠습니까?
                </h3>
                <p className="text-sm text-theme-muted">
                  총 <span className="font-semibold text-red-400">{todos.length}개</span>의 일정이 삭제됩니다.
                  이 작업은 되돌릴 수 없습니다.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                className="neu-btn touch-target flex-1 min-h-[44px] px-4 py-2 text-theme rounded-neu font-medium"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="touch-target flex-1 min-h-[44px] px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-neu font-medium transition-colors"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

