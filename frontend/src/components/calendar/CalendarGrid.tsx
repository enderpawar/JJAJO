import { useState, useRef } from 'react'
import { ChevronLeft, ChevronRight, Trash2, AlertTriangle } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
import { useToastStore } from '@/stores/toastStore'
import { deleteAllSchedules } from '@/services/scheduleService'
import { formatDate, formatYearMonth, getCalendarDays, isSameDay } from '@/utils/dateUtils'
import { cn } from '@/utils/cn'

interface CalendarGridProps {
  /** 날짜 클릭 시 호출 (데스크톱 등에서 선택일 영역 포커스용) */
  onDateSelect?: () => void
  /** 날짜 더블클릭/더블탭 시 호출 (모바일 모달에서 해당일 일정 패널 열기) */
  onDateDoubleClick?: () => void
  /** true면 높이 제한 완화, 모달 내부 스크롤로 한 달 전체 표시 */
  allowFullHeight?: boolean
}

const DOUBLE_TAP_MS = 450

export default function CalendarGrid({ onDateSelect, onDateDoubleClick, allowFullHeight }: CalendarGridProps) {
  const { currentMonth, selectedDate, setCurrentMonth, setSelectedDate, getTodosByDate, clearAllTodos, setTodos, todos } = useCalendarStore()
  const { addToast } = useToastStore()
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const lastClickedDateRef = useRef<string>('')
  const lastClickedTimeRef = useRef<number>(0)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const days = getCalendarDays(year, month)
  
  const handlePrevMonth = () => {
    const newDate = new Date(currentMonth)
    newDate.setMonth(newDate.getMonth() - 1)
    setCurrentMonth(newDate)
  }
  
  const handleNextMonth = () => {
    const newDate = new Date(currentMonth)
    newDate.setMonth(newDate.getMonth() + 1)
    setCurrentMonth(newDate)
  }
  
  const handleDateClick = (date: Date) => {
    const dateStr = formatDate(date)
    const now = Date.now()
    const lastTime = lastClickedTimeRef.current
    const isDouble = lastTime > 0 && dateStr === lastClickedDateRef.current && now - lastTime < DOUBLE_TAP_MS

    if (isDouble) {
      setSelectedDate(date)
      onDateDoubleClick?.()
      lastClickedDateRef.current = ''
      lastClickedTimeRef.current = 0
      return
    }
    lastClickedDateRef.current = dateStr
    lastClickedTimeRef.current = now
    setSelectedDate(date)
    if (!onDateDoubleClick) onDateSelect?.()
  }
  
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
    } catch (e) {
      console.error('일정 전체 삭제 실패:', e)
      addToast('일정 전체 삭제에 실패했습니다. 화면을 이전 상태로 되돌릴게요.')
      setTodos(prevTodos)
    }
  }
  
  const weekDays = ['일', '월', '화', '수', '목', '금', '토']
  
  return (
    <div
      className={cn(
        'neu-float p-4 sm:p-6 flex flex-col h-full',
        allowFullHeight ? 'min-h-0 flex-1 overflow-auto max-h-none' : 'max-h-[50vh] sm:max-h-[60vh] xl:max-h-[750px]'
      )}
    >
      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="neu-btn touch-target flex items-center justify-center min-w-[44px] min-h-[44px] p-2 rounded-neu"
          title="이전 달"
        >
          <ChevronLeft className="w-5 h-5 text-theme-muted" />
        </button>
        
        <h2 className="text-xl font-bold text-theme">
          {formatYearMonth(currentMonth)}
        </h2>
        
        <button
          type="button"
          onClick={handleNextMonth}
          className="neu-btn touch-target flex items-center justify-center min-w-[44px] min-h-[44px] p-2 rounded-neu"
          title="다음 달"
        >
          <ChevronRight className="w-5 h-5 text-theme-muted" />
        </button>
      </div>
      
      {/* 요일 헤더 - 모바일에서 gap 축소 */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 flex-shrink-0">
        {weekDays.map((day, index) => (
          <div
            key={day}
            className={cn(
              'text-center text-xs font-semibold py-1',
              index === 0 ? 'text-red-500/90' : index === 6 ? 'text-primary-500/90' : 'text-theme-muted'
            )}
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* 날짜 그리드 - 모바일에서 gap·글자 크기 조정 */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 flex-1 min-h-0">
        {days.map((date) => {
          const dateStr = formatDate(date)
          const dateTodos = getTodosByDate(dateStr)
          const isCurrentMonthDay = date.getMonth() === month
          const isSelected = isSameDay(date, selectedDate)
          
          return (
            <button
              key={dateStr}
              onClick={() => handleDateClick(date)}
              className={cn(
                'w-full h-full min-h-[44px] p-1.5 sm:p-2 rounded-neu theme-transition',
                'relative flex flex-col items-center justify-center bg-theme-card',
                isCurrentMonthDay ? 'text-theme' : 'text-theme-muted',
                isSelected ? 'neu-date-selected' : 'neu-float-sm hover:shadow-neu-inset-hover active:scale-[0.98]'
              )}
            >
              <div className="text-[10px] sm:text-xs font-medium">{date.getDate()}</div>
              
              {/* 일정 표시 점 */}
              {dateTodos.length > 0 && (
                <div className="flex gap-0.5 justify-center mt-0.5">
                  {dateTodos.slice(0, 3).map((todo, index) => (
                    <div
                      key={`${todo.id}-${index}`}
                      className="w-1 h-1 rounded-full bg-primary-500"
                    />
                  ))}
                  {dateTodos.length > 3 && (
                    <div className="text-[10px] text-theme-muted ml-0.5">+</div>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
      
      {/* 하단: 모바일/데스크톱 공통 - 모든 일정 초기화 버튼 */}
      <div className="mt-3 pt-3 flex-shrink-0 border-t border-theme">
        <button
          type="button"
          onClick={() => setShowConfirmDialog(true)}
          disabled={todos.length === 0}
          className={cn(
            'touch-target w-full flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-neu theme-transition font-medium text-sm',
            todos.length === 0
              ? 'neu-inset-sm text-theme-muted cursor-not-allowed'
              : 'neu-btn text-red-400'
          )}
        >
          <Trash2 className="w-4 h-4" />
          모든 일정 초기화
        </button>
      </div>
      
      {/* 확인 다이얼로그 */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
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
