import { Calendar, CheckCircle2, Clock, TrendingUp } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
import { formatDate } from '@/utils/dateUtils'

export default function CalendarStats() {
  const { todos, selectedDate } = useCalendarStore()
  
  const today = new Date()
  const todayStr = formatDate(today)
  const todayTodos = todos.filter(t => t.date === todayStr)
  
  const completedTodos = todos.filter(t => t.status === 'completed').length
  const totalTodos = todos.length
  const completionRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0
  
  const aiTodos = todos.filter(t => t.createdBy === 'ai').length
  
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {/* 오늘 일정 */}
      <div className="stat-card">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 bg-primary-500/10 rounded-xl">
            <Calendar className="w-6 h-6 text-primary-500" />
          </div>
          <div className="text-xs text-gray-400 font-medium">오늘</div>
        </div>
        <div className="text-3xl font-bold mb-1">{todayTodos.length}</div>
        <div className="text-sm text-gray-400">오늘의 일정</div>
      </div>
      
      {/* 완료율 */}
      <div className="stat-card">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 bg-green-500/10 rounded-xl">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
          </div>
          <div className="text-xs text-gray-400 font-medium">완료율</div>
        </div>
        <div className="text-3xl font-bold mb-1">{completionRate}%</div>
        <div className="text-sm text-gray-400">{completedTodos}/{totalTodos} 완료</div>
      </div>
      
      {/* AI 생성 */}
      <div className="stat-card">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 bg-purple-500/10 rounded-xl">
            <TrendingUp className="w-6 h-6 text-purple-500" />
          </div>
          <div className="text-xs text-gray-400 font-medium">AI</div>
        </div>
        <div className="text-3xl font-bold mb-1">{aiTodos}</div>
        <div className="text-sm text-gray-400">AI 생성 일정</div>
      </div>
      
      {/* 전체 일정 */}
      <div className="stat-card">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 bg-blue-500/10 rounded-xl">
            <Clock className="w-6 h-6 text-blue-500" />
          </div>
          <div className="text-xs text-gray-400 font-medium">전체</div>
        </div>
        <div className="text-3xl font-bold mb-1">{totalTodos}</div>
        <div className="text-sm text-gray-400">총 일정 수</div>
      </div>
    </div>
  )
}
