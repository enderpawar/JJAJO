import { useState } from 'react'
import { Calendar, Clock, Plus, Edit2, Trash2 } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
import { deleteSchedule } from '@/services/scheduleService'
import { formatDate, formatDateWithDay } from '@/utils/dateUtils'
import { cn } from '@/utils/cn'
import type { Todo } from '@/types/calendar'
import AddTodoModal from './AddTodoModal'

export default function DayDetailPanel() {
  const { selectedDate, getTodosByDate, deleteTodo } = useCalendarStore()

  const handleDeleteTodo = async (todo: Todo) => {
    try {
      await deleteSchedule(todo.id)
      deleteTodo(todo.id)
    } catch (e) {
      console.error('일정 삭제 실패:', e)
      alert(`일정 삭제 실패: ${e instanceof Error ? e.message : '알 수 없음'}`)
    }
  }
  const dateStr = formatDate(selectedDate)
  const todos = getTodosByDate(dateStr)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // 시간별로 정렬
  const sortedTodos = [...todos].sort((a, b) => {
    if (!a.startTime) return 1
    if (!b.startTime) return -1
    return a.startTime.localeCompare(b.startTime)
  })
  
  const getPriorityColor = (priority: Todo['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'low':
        return 'bg-green-500'
    }
  }
  
  const getStatusLabel = (status: Todo['status']) => {
    switch (status) {
      case 'completed':
        return '완료'
      case 'in-progress':
        return '진행중'
      case 'pending':
        return '대기'
      case 'cancelled':
        return '취소'
    }
  }
  
  return (
    <div className="bg-notion-sidebar rounded-2xl p-6 flex flex-col h-[600px]">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-5 h-5 text-primary-500" />
          <h3 className="text-lg font-bold text-notion-text">
            {formatDateWithDay(selectedDate)}
          </h3>
        </div>
        <p className="text-sm text-gray-500">
          {todos.length}개의 일정
        </p>
      </div>
      
      {/* 일정 목록 */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {todos.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-notion-hover rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-8 h-8 text-notion-muted" />
            </div>
            <p className="text-sm text-notion-muted">
              등록된 일정이 없습니다
            </p>
            <p className="text-xs text-notion-muted mt-1">
              새 일정을 추가해보세요
            </p>
          </div>
        ) : (
          sortedTodos.map((todo) => (
            <div
              key={todo.id}
              className={cn(
                'p-4 rounded-lg border transition-all duration-200',
                todo.createdBy === 'ai' 
                  ? 'border-purple-200 bg-purple-50' 
                  : 'border-notion-border bg-notion-sidebar'
              )}
            >
              <div className="flex items-start gap-3">
                {/* 우선순위 표시 */}
                <div className={cn('w-1 h-full rounded-full', getPriorityColor(todo.priority))} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-semibold text-notion-text">
                      {todo.title}
                    </h4>
                    <div className="flex gap-1">
                      <button className="p-1 hover:bg-notion-hover rounded transition-colors">
                        <Edit2 className="w-3 h-3 text-notion-muted" />
                      </button>
                      <button 
                        onClick={() => handleDeleteTodo(todo)}
                        className="p-1 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  </div>
                  
                  {todo.description && (
                    <p className="text-sm text-notion-muted mb-2">
                      {todo.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-3 text-xs text-notion-muted">
                    {todo.startTime && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{todo.startTime}</span>
                        {todo.endTime && <span>~ {todo.endTime}</span>}
                      </div>
                    )}
                    
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs',
                      todo.status === 'completed' && 'bg-green-100 text-green-700',
                      todo.status === 'in-progress' && 'bg-blue-100 text-blue-700',
                      todo.status === 'pending' && 'bg-notion-sidebar text-notion-muted',
                      todo.status === 'cancelled' && 'bg-red-100 text-red-700'
                    )}>
                      {getStatusLabel(todo.status)}
                    </span>
                    
                    {todo.createdBy === 'ai' && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                        AI
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* 일정 추가 버튼 */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        <span>이 날에 일정 추가</span>
      </button>

      {/* 일정 추가 모달 */}
      <AddTodoModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultDate={selectedDate}
      />
    </div>
  )
}
