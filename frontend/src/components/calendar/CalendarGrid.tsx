import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
import { formatDate, formatYearMonth, getCalendarDays, isSameDay, isToday } from '@/utils/dateUtils'
import { cn } from '@/utils/cn'

export default function CalendarGrid() {
  const { currentMonth, selectedDate, setCurrentMonth, setSelectedDate, getTodosByDate } = useCalendarStore()
  
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
  
  const weekDays = ['일', '월', '화', '수', '목', '금', '토']
  
  return (
    <div className="flex-1 bg-white rounded-xl shadow-lg p-6">
      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        
        <h2 className="text-2xl font-bold text-gray-800">
          {formatYearMonth(currentMonth)}
        </h2>
        
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>
      
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays.map((day, index) => (
          <div
            key={day}
            className={cn(
              'text-center text-sm font-semibold py-2',
              index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-600'
            )}
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((date) => {
          const dateStr = formatDate(date)
          const todos = getTodosByDate(dateStr)
          const isCurrentMonthDay = date.getMonth() === month
          const isTodayDate = isToday(date)
          const isSelected = isSameDay(date, selectedDate)
          
          return (
            <button
              key={dateStr}
              onClick={() => handleDateClick(date)}
              className={cn(
                'aspect-square p-2 rounded-lg transition-all duration-200',
                'hover:bg-gray-50 relative',
                isCurrentMonthDay ? 'text-gray-800' : 'text-gray-300',
                isTodayDate && 'bg-primary-50 border-2 border-primary-500',
                isSelected && !isTodayDate && 'bg-primary-100 border-2 border-primary-400',
                !isSelected && !isTodayDate && 'border border-gray-100'
              )}
            >
              <div className="text-sm font-medium">{date.getDate()}</div>
              
              {/* 일정 표시 점 */}
              {todos.length > 0 && (
                <div className="flex gap-0.5 justify-center mt-1">
                  {todos.slice(0, 3).map((todo, index) => (
                    <div
                      key={`${todo.id}-${index}`}
                      className={cn(
                        'w-1 h-1 rounded-full',
                        todo.createdBy === 'ai' ? 'bg-purple-500' : 'bg-blue-500'
                      )}
                    />
                  ))}
                  {todos.length > 3 && (
                    <div className="text-xs text-gray-400">+</div>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
