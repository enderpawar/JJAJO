import { useState } from 'react'
import { ChevronLeft, ChevronRight, Trash2, AlertTriangle } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
import { formatDate, formatYearMonth, getCalendarDays, isSameDay, isToday } from '@/utils/dateUtils'
import { cn } from '@/utils/cn'

export default function CalendarGrid() {
  const { currentMonth, selectedDate, setCurrentMonth, setSelectedDate, getTodosByDate, clearAllTodos, todos } = useCalendarStore()
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  
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
    setSelectedDate(date)
  }
  
  const handleClearAll = () => {
    clearAllTodos()
    setShowConfirmDialog(false)
  }
  
  const weekDays = ['일', '월', '화', '수', '목', '금', '토']
  
  return (
    <div className="bg-notion-sidebar rounded-2xl p-6 flex flex-col h-full max-h-[750px]">
      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-notion-hover rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-notion-muted" />
        </button>
        
        <h2 className="text-xl font-bold text-notion-text">
          {formatYearMonth(currentMonth)}
        </h2>
        
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-notion-hover rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-notion-muted" />
        </button>
      </div>
      
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-2 mb-2 flex-shrink-0">
        {weekDays.map((day, index) => (
          <div
            key={day}
            className={cn(
              'text-center text-xs font-semibold py-1',
              index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-notion-muted'
            )}
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-2 flex-1 min-h-0">
        {days.map((date) => {
          const dateStr = formatDate(date)
          const dateTodos = getTodosByDate(dateStr)
          const isCurrentMonthDay = date.getMonth() === month
          const isTodayDate = isToday(date)
          const isSelected = isSameDay(date, selectedDate)
          
          return (
            <button
              key={dateStr}
              onClick={() => handleDateClick(date)}
              className={cn(
                'w-full h-full p-1.5 rounded-lg transition-all duration-200',
                'hover:bg-notion-hover relative flex flex-col items-center justify-center',
                isCurrentMonthDay ? 'text-notion-text' : 'text-notion-muted',
                isTodayDate && 'bg-primary-500/20 border-2 border-primary-500',
                isSelected && !isTodayDate && 'bg-primary-500/10 border-2 border-primary-400',
                !isSelected && !isTodayDate && 'border border-notion-border'
              )}
            >
              <div className="text-xs font-medium">{date.getDate()}</div>
              
              {/* 일정 표시 점 */}
              {dateTodos.length > 0 && (
                <div className="flex gap-0.5 justify-center mt-0.5">
                  {dateTodos.slice(0, 3).map((todo, index) => (
                    <div
                      key={`${todo.id}-${index}`}
                      className={cn(
                        'w-1 h-1 rounded-full',
                        todo.createdBy === 'ai' ? 'bg-purple-500' : 'bg-blue-500'
                      )}
                    />
                  ))}
                  {dateTodos.length > 3 && (
                    <div className="text-[10px] text-notion-muted ml-0.5">+</div>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
      
      {/* 하단: 초기화 버튼 */}
      <div className="mt-3 pt-3 border-t border-notion-border flex-shrink-0">
        <button
          onClick={() => setShowConfirmDialog(true)}
          disabled={todos.length === 0}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm',
            todos.length === 0
              ? 'bg-notion-sidebar text-notion-muted cursor-not-allowed'
              : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
          )}
        >
          <Trash2 className="w-4 h-4" />
          모든 일정 초기화
        </button>
      </div>
      
      {/* 확인 다이얼로그 */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-notion-sidebar rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-notion-text mb-2">
                  모든 일정을 삭제하시겠습니까?
                </h3>
                <p className="text-sm text-notion-muted">
                  총 <span className="font-semibold text-red-600">{todos.length}개</span>의 일정이 삭제됩니다.
                  이 작업은 되돌릴 수 없습니다.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 px-4 py-2 bg-notion-sidebar hover:bg-notion-hover text-notion-text rounded-lg font-medium transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
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
