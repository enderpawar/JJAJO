import { useState, useEffect } from 'react'
import { Calendar, Clock, Plus, Edit2, Trash2 } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
import { useToastStore } from '@/stores/toastStore'
import { deleteSchedule } from '@/services/scheduleService'
import { formatDate, formatDateWithDay } from '@/utils/dateUtils'
import { cn } from '@/utils/cn'
import type { Todo } from '@/types/calendar'
import AddTodoModal from './AddTodoModal'
import EditTodoPanel from './EditTodoPanel'
import { ConfirmModal } from '@/components/ConfirmModal'

interface DayDetailPanelProps {
  /** 캘린더 하단 등 한 블록 안에 묶여 있을 때 true (카드 스타일 생략) */
  embedded?: boolean
  /** true로 바뀌면 일정 추가 모달을 연다 (캘린더 롱프레스 등 외부 트리거) */
  openAddModal?: boolean
  /** 일정 추가 모달을 연 뒤 호출 (openAddModal 플래그 초기화용) */
  onAddModalOpened?: () => void
}

export default function DayDetailPanel({ embedded = false, openAddModal = false, onAddModalOpened }: DayDetailPanelProps = {}) {
  const { selectedDate, getTodosByDate, deleteTodo, addTodo } = useCalendarStore()
  const { addToast } = useToastStore()
  const [deleteConfirmTodo, setDeleteConfirmTodo] = useState<Todo | null>(null)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    if (openAddModal) {
      setIsModalOpen(true)
      onAddModalOpened?.()
    }
  }, [openAddModal])

  /** 낙관적 삭제: 즉시 UI에서 제거한 뒤 백그라운드에서 API 호출. 실패 시 롤백. */
  const performDeleteTodo = (todo: Todo) => {
    const taskCopy = { ...todo }
    deleteTodo(todo.id)
    setDeleteConfirmTodo(null)

    if (todo.id.startsWith('opt-')) return

    deleteSchedule(todo.id).catch((e) => {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('찾을 수 없습니다')) return
      addTodo(taskCopy)
      console.error('일정 삭제 실패:', e)
      addToast(`일정 삭제 실패: ${msg}`)
    })
  }

  const dateStr = formatDate(selectedDate)
  const todos = getTodosByDate(dateStr)
  
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
    <div
      className={cn(
        'flex flex-col min-h-0 flex-1 overflow-hidden',
        embedded ? 'p-0 max-h-none' : 'neu-float rounded-2xl p-4 sm:p-6 max-h-[60vh] sm:max-h-[70vh]'
      )}
    >
      {/* 헤더 (모바일 캘린더 하단 embedded일 때는 생략 — 날짜는 캘린더에서 이미 보임) */}
      {!embedded && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-primary-500" />
            <h3 className="text-lg font-bold text-theme">
              {formatDateWithDay(selectedDate)}
            </h3>
          </div>
          <p className="text-sm text-theme-muted">
            <span className={todos.length > 0 ? 'text-primary-400 font-medium' : ''}>{todos.length}개</span>의 일정
          </p>
        </div>
      )}
      
      {/* 일정 목록 */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {todos.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 neu-inset rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-8 h-8 text-primary-500/80" />
            </div>
            <p className="text-sm font-medium text-theme">
              등록된 일정이 없습니다
            </p>
            <p className="text-xs text-theme-muted mt-1">
              새 일정을 추가해보세요
            </p>
          </div>
        ) : (
          sortedTodos.map((todo) => (
            <div
              key={todo.id}
              className={cn(
                'p-4 rounded-neu bg-theme-card theme-transition',
                  todo.createdBy === 'ai' 
                  ? 'shadow-neu-float-date ring-2 ring-primary-500/10' 
                  : 'shadow-neu-float-date'
              )}
            >
              <div className="flex items-start gap-3">
                {/* 우선순위 표시 */}
                <div className={cn('w-1 h-full rounded-full', getPriorityColor(todo.priority))} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-semibold text-theme">
                      {todo.title}
                    </h4>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingTodo(todo)
                        }}
                        className="neu-btn touch-target flex items-center justify-center min-w-[44px] min-h-[44px] p-2.5 rounded-neu"
                        title="편집"
                      >
                        <Edit2 className="w-4 h-4 text-theme-muted" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteConfirmTodo(todo)
                        }}
                        className="neu-btn touch-target flex items-center justify-center min-w-[44px] min-h-[44px] p-2.5 rounded-neu hover:shadow-neu-inset-hover"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                  
                  {todo.description && (
                    <p className="text-sm text-theme-muted mb-2">
                      {todo.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-3 text-xs text-theme-muted">
                    {todo.startTime && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{todo.startTime}</span>
                        {todo.endTime && <span>~ {todo.endTime}</span>}
                      </div>
                    )}
                    
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs',
                      todo.status === 'completed' && 'bg-green-500/20 text-green-400',
                      todo.status === 'in-progress' && 'bg-primary-500/20 text-primary-400',
                      todo.status === 'pending' && 'bg-[var(--hover-bg)] text-theme-muted',
                      todo.status === 'cancelled' && 'bg-red-500/20 text-red-400'
                    )}>
                      {getStatusLabel(todo.status)}
                    </span>
                    
                    {todo.createdBy === 'ai' && (
                      <span className="px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400">
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
      
      {/* 모바일(embedded): 롱프레스 안내 문구 / 데스크톱: 일정 추가 버튼 */}
      {embedded ? (
        <p className="text-xs text-theme-muted text-center py-3">
          원하는 일자를 길게 눌러 일정을 추가하세요
        </p>
      ) : (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span>이 날에 일정 추가</span>
        </button>
      )}

      {/* 일정 추가 모달 */}
      <AddTodoModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultDate={selectedDate}
      />

      {/* 일정 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={!!deleteConfirmTodo}
        onClose={() => setDeleteConfirmTodo(null)}
        onConfirm={() => deleteConfirmTodo && performDeleteTodo(deleteConfirmTodo)}
        title="일정 삭제"
        message="이 일정을 삭제할까요?"
        confirmLabel="삭제"
        cancelLabel="취소"
        danger
      />

      {/* 일정 편집 패널 (월간 모달 내에서도 z-index로 최상단 표시) */}
      <EditTodoPanel
        todo={editingTodo}
        onClose={() => setEditingTodo(null)}
      />
    </div>
  )
}
