import { useState } from 'react'
import { Sparkles, Plus, Clock, CheckCircle2, Circle } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
import { cn } from '@/utils/cn'
import type { Todo } from '@/types/calendar'
import AddTodoModal from './AddTodoModal'

export default function AiTodosSidebar() {
  const { getAiTodos, selectedDate, setSelectedDate } = useCalendarStore()
  const aiTodos = getAiTodos()
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  const handleTodoClick = (todo: Todo) => {
    const todoDate = new Date(todo.date)
    setSelectedDate(todoDate)
  }
  
  const getStatusIcon = (status: Todo['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'in-progress':
        return <Clock className="w-4 h-4 text-blue-500" />
      default:
        return <Circle className="w-4 h-4 text-gray-400" />
    }
  }
  
  return (
    <div className="w-80 bg-white rounded-xl shadow-lg p-6 flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-lg font-bold text-gray-800">AI 생성 일정</h3>
      </div>
      
      {/* AI 일정 목록 */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {aiTodos.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-8 h-8 text-purple-300" />
            </div>
            <p className="text-sm text-gray-500">
              AI가 생성한 일정이 없습니다
            </p>
            <p className="text-xs text-gray-400 mt-1">
              AI에게 일정을 요청해보세요!
            </p>
          </div>
        ) : (
          aiTodos.map((todo) => (
            <button
              key={todo.id}
              onClick={() => handleTodoClick(todo)}
              className="w-full text-left p-3 rounded-lg border border-purple-100 bg-purple-50 hover:bg-purple-100 transition-colors"
            >
              <div className="flex items-start gap-2">
                {getStatusIcon(todo.status)}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-800 text-sm truncate">
                    {todo.title}
                  </h4>
                  {todo.description && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {todo.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <span>{todo.date}</span>
                    {todo.startTime && (
                      <>
                        <span>•</span>
                        <span>{todo.startTime}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
      
      {/* 일정 추가 버튼 */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        <span>일정 추가</span>
      </button>

      {/* 일정 추가 모달 */}
      <AddTodoModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}
