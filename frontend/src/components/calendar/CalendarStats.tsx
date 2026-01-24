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
    <div className="grid grid-cols-4 gap-4">
      {/* 오늘 일정 - 강조 */}
      <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5" />
            <span className="text-sm font-medium opacity-90">오늘</span>
          </div>
          <div className="text-4xl font-bold mb-1">{todayTodos.length}</div>
          <div className="text-sm opacity-80">오늘의 일정</div>
        </div>
      </div>
      
      {/* 완료율 */}
      <div className="bg-notion-sidebar border border-notion-border rounded-md p-6 hover:bg-notion-hover transition-colors">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 bg-green-500/20 rounded-md">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          </div>
          <span className="text-sm font-medium text-notion-muted">완료율</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-notion-text">{completionRate}%</span>
          <span className="text-sm text-notion-muted">{completedTodos}/{totalTodos}</span>
        </div>
      </div>
      
      {/* AI 생성 */}
      <div className="bg-notion-sidebar border border-notion-border rounded-md p-6 hover:bg-notion-hover transition-colors">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 bg-purple-500/20 rounded-md">
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <span className="text-sm font-medium text-notion-muted">AI 생성</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-notion-text">{aiTodos}</span>
          <span className="text-sm text-notion-muted">개</span>
        </div>
      </div>
      
      {/* 전체 일정 */}
      <div className="bg-notion-sidebar border border-notion-border rounded-md p-6 hover:bg-notion-hover transition-colors">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 bg-blue-500/20 rounded-md">
            <Clock className="w-5 h-5 text-blue-400" />
          </div>
          <span className="text-sm font-medium text-notion-muted">전체</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-notion-text">{totalTodos}</span>
          <span className="text-sm text-gray-500">개</span>
        </div>
      </div>
    </div>
  )
}
