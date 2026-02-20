import { useState, useEffect, useRef, useMemo } from 'react'
import { Calendar, Clock, Plus, Edit2, Trash2, Trash, Check, X } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
import { useToastStore } from '@/stores/toastStore'
import { deleteSchedule, updateSchedule } from '@/services/scheduleService'
import { formatDate, formatDateWithDay } from '@/utils/dateUtils'
import { cn } from '@/utils/cn'
import type { Todo, TodoPriority } from '@/types/calendar'
import AddTodoModal from './AddTodoModal'
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
  const { selectedDate, getTodosByDate, deleteTodo, addTodo, updateTodo } = useCalendarStore()
  const { addToast } = useToastStore()
  const [deleteConfirmTodo, setDeleteConfirmTodo] = useState<Todo | null>(null)
  const [deleteAllTodayConfirm, setDeleteAllTodayConfirm] = useState(false)
  const [isDeletingAllToday, setIsDeletingAllToday] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [editForm, setEditForm] = useState({ title: '', startTime: '', endTime: '', description: '' })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)

  const dateStr = formatDate(selectedDate)
  const isTodaySelected = dateStr === formatDate(new Date())

  useEffect(() => {
    if (openAddModal) {
      setIsModalOpen(true)
      onAddModalOpened?.()
    }
  }, [openAddModal])

  // 편집 모드 진입 시 제목 input에 포커스
  useEffect(() => {
    if (!editingTodo) return
    const t = setTimeout(() => titleInputRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [editingTodo?.id])

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

  /** 오늘 배치된 일정 전체 삭제: 낙관적 UI 후 서버 삭제, 실패 시 롤백 */
  const performDeleteAllToday = async () => {
    const todayStr = formatDate(new Date())
    const toDelete = getTodosByDate(todayStr)
    if (toDelete.length === 0) {
      setDeleteAllTodayConfirm(false)
      return
    }
    const copies = toDelete.map((t) => ({ ...t }))
    setIsDeletingAllToday(true)
    toDelete.forEach((t) => deleteTodo(t.id))
    setDeleteAllTodayConfirm(false)

    const serverIds = toDelete.filter((t) => !t.id.startsWith('opt-'))
    const results = await Promise.allSettled(serverIds.map((id) => deleteSchedule(id.id)))
    const failed = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[]
    if (failed.length > 0) {
      copies.forEach((t) => addTodo(t))
      const msg = failed[0].reason instanceof Error ? failed[0].reason.message : String(failed[0].reason)
      addToast(`일정 일부 삭제 실패: ${msg}`)
    } else if (toDelete.length > 0) {
      addToast(`오늘 일정 ${toDelete.length}개를 삭제했어요`)
    }
    setIsDeletingAllToday(false)
  }

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
        return 'bg-amber-500'
      case 'low':
        return 'bg-emerald-500'
    }
  }

  const getPriorityLabel = (priority: TodoPriority) => {
    switch (priority) {
      case 'high': return '높음'
      case 'medium': return '보통'
      case 'low': return '낮음'
    }
  }

  /** 우선순위별로 그룹화 (높음 → 보통 → 낮음) */
  const todosByPriority = useMemo(() => {
    const order: TodoPriority[] = ['high', 'medium', 'low']
    const map = new Map<TodoPriority, Todo[]>()
    order.forEach((p) => map.set(p, []))
    sortedTodos.forEach((t) => {
      if (t.status === 'cancelled') return
      map.get(t.priority)!.push(t)
    })
    return order.map((p) => ({ priority: p, todos: map.get(p)! })).filter((g) => g.todos.length > 0)
  }, [sortedTodos])
  
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

  /** 완료 토글 (취소된 일정은 제외) */
  const handleToggleComplete = (todo: Todo) => {
    if (todo.status === 'cancelled') return
    const nextStatus = todo.status === 'completed' ? 'pending' : 'completed'
    updateTodo(todo.id, { status: nextStatus, updatedAt: new Date().toISOString() })
    if (!todo.id.startsWith('opt-')) {
      updateSchedule(todo.id, { status: nextStatus }).catch((e) => {
        updateTodo(todo.id, { status: todo.status })
        addToast(`저장 실패: ${e instanceof Error ? e.message : '알 수 없음'}`)
      })
    }
  }

  /** 인라인 편집 시작 */
  const startEditing = (todo: Todo) => {
    setEditingTodo(todo)
    setEditForm({
      title: todo.title,
      startTime: todo.startTime ?? '',
      endTime: todo.endTime ?? '',
      description: todo.description ?? '',
    })
  }

  /** 인라인 편집 저장 */
  const saveInlineEdit = async () => {
    if (!editingTodo) return
    const { title, startTime, endTime, description } = editForm
    const prev = { ...editingTodo }
    updateTodo(editingTodo.id, {
      title: title.trim() || editingTodo.title,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      description: description.trim() || undefined,
      updatedAt: new Date().toISOString(),
    })
    setEditingTodo(null)
    if (editingTodo.id.startsWith('opt-')) return
    try {
      const updated = await updateSchedule(editingTodo.id, {
        title: title.trim() || editingTodo.title,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        description: description.trim() || undefined,
      })
      updateTodo(editingTodo.id, { updatedAt: updated.updatedAt ?? new Date().toISOString() })
    } catch (e) {
      updateTodo(editingTodo.id, prev)
      addToast(`저장 실패: ${e instanceof Error ? e.message : '알 수 없음'}`)
    }
  }

  /** 인라인 편집 취소 */
  const cancelInlineEdit = () => {
    setEditingTodo(null)
  }

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingTodo) cancelInlineEdit()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [editingTodo])

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
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-theme tracking-tight">
                {formatDateWithDay(selectedDate)}
              </h3>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {isTodaySelected && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-500/15 text-primary-500">
                    오늘
                  </span>
                )}
                <span className={cn(
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  todos.length > 0 ? 'bg-primary-500/15 text-primary-500' : 'bg-theme-muted/10 text-theme-muted'
                )}>
                  {todos.length}개의 일정
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm text-theme-muted sr-only">
              <span className={todos.length > 0 ? 'text-primary-400 font-medium' : ''}>{todos.length}개</span>의 일정
            </p>
            {isTodaySelected && todos.length > 0 && (
              <button
                type="button"
                onClick={() => setDeleteAllTodayConfirm(true)}
                disabled={isDeletingAllToday}
                className="text-xs text-red-500 hover:text-red-400 font-medium flex items-center gap-1.5 py-1.5 px-2 rounded-neu hover:bg-red-500/10 transition-colors disabled:opacity-50"
                title="오늘 배치된 일정 전체 삭제"
              >
                <Trash className="w-3.5 h-3.5" />
                <span>오늘 일정 전체 삭제</span>
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* 일정 목록 - 우선순위별 그룹 (참고 앱의 카테고리별 그룹) */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {todos.length === 0 ? (
          <div className="text-center py-10 sm:py-14 px-4">
            <div className="w-20 h-20 rounded-2xl bg-primary-500/10 flex items-center justify-center mx-auto mb-4 ring-2 ring-primary-500/5">
              <Calendar className="w-10 h-10 text-primary-500/90" />
            </div>
            <p className="text-base font-semibold text-theme mb-1">
              이 날은 아직 일정이 없어요
            </p>
            <p className="text-sm text-theme-muted max-w-[240px] mx-auto">
              아래 버튼으로 첫 일정을 추가하면 하루가 더 알차게 보내져요
            </p>
          </div>
        ) : (
          todosByPriority.map(({ priority, todos: groupTodos }) => (
            <div key={priority} className="space-y-2">
              {/* 카테고리(우선순위) 헤더 */}
              <div className="flex items-center gap-2 px-1">
                <div className={cn('w-2 h-2 rounded-full', getPriorityColor(priority))} />
                <span className="text-xs font-semibold text-theme-muted uppercase tracking-wide">
                  {getPriorityLabel(priority)}
                </span>
              </div>
              {groupTodos.map((todo) => {
                const isEditing = editingTodo?.id === todo.id
                return (
            <div
              key={todo.id}
              className={cn(
                'p-4 rounded-neu bg-theme-card theme-transition',
                  todo.createdBy === 'ai' 
                  ? 'shadow-neu-float-date ring-2 ring-primary-500/10' 
                  : 'shadow-neu-float-date',
                  isEditing && 'ring-2 ring-primary-500/50'
              )}
            >
              <div className="flex items-start gap-3">
                {/* 원형 완료 체크 (참고 앱: 완료 시 빨간 원+체크, 미완료 시 테두리 원) */}
                {!isEditing && todo.status !== 'cancelled' && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleToggleComplete(todo) }}
                    className="touch-target shrink-0 mt-0.5 w-7 h-7 flex items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
                    title={todo.status === 'completed' ? '완료 해제' : '완료로 표시'}
                    aria-label={todo.status === 'completed' ? '완료 해제' : '완료로 표시'}
                  >
                    {todo.status === 'completed' ? (
                      <span className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center text-white">
                        <Check className="w-4 h-4" strokeWidth={2.5} />
                      </span>
                    ) : (
                      <span className="w-7 h-7 rounded-full border-2 border-theme-muted/60 flex items-center justify-center bg-transparent" />
                    )}
                  </button>
                )}
                {/* 우선순위 세로 바 */}
                <div className={cn('w-1 h-full min-h-[60px] rounded-full', getPriorityColor(todo.priority))} />
                
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    /* 카드 내 인라인 편집 */
                    <div className="space-y-3">
                      <input
                        ref={titleInputRef}
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveInlineEdit()
                          if (e.key === 'Escape') cancelInlineEdit()
                        }}
                        className="w-full px-3 py-2.5 rounded-neu neu-inset-sm text-theme text-base theme-transition font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 placeholder:text-theme-muted"
                        placeholder="일정 제목"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="time"
                          value={editForm.startTime}
                          onChange={(e) => setEditForm((f) => ({ ...f, startTime: e.target.value }))}
                          className="px-2 py-1.5 rounded-neu neu-inset-sm text-theme text-sm theme-transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        />
                        <span className="text-theme-muted">~</span>
                        <input
                          type="time"
                          value={editForm.endTime}
                          onChange={(e) => setEditForm((f) => ({ ...f, endTime: e.target.value }))}
                          className="px-2 py-1.5 rounded-neu neu-inset-sm text-theme text-sm theme-transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        />
                      </div>
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                        placeholder="설명 (선택)"
                        rows={2}
                        className="w-full px-3 py-2 rounded-neu neu-inset-sm text-theme text-sm theme-transition resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 placeholder:text-theme-muted"
                      />
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={cancelInlineEdit}
                          className="touch-target flex items-center gap-1.5 px-3 py-2 rounded-neu neu-float-sm text-theme-muted text-sm font-medium hover:shadow-neu-inset-hover"
                        >
                          <X className="w-4 h-4" />
                          취소
                        </button>
                        <button
                          type="button"
                          onClick={saveInlineEdit}
                          className="touch-target flex items-center gap-1.5 px-3 py-2 rounded-neu bg-primary-500 text-white text-sm font-medium hover:bg-primary-600"
                        >
                          <Check className="w-4 h-4" />
                          저장
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className={cn('font-semibold text-theme', todo.status === 'completed' && 'line-through opacity-70')}>
                          {todo.title}
                        </h4>
                        <div className="flex gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); startEditing(todo) }}
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
                    </>
                  )}
                </div>
              </div>
            </div>
              )
              })}
            </div>
          ))
        )}
      </div>
      
      {/* 모바일(embedded): 롱프레스 안내 문구 / 데스크톱: 일정 추가 버튼 */}
      {embedded ? (
        <p className="text-xs text-theme-muted text-center py-3 px-2">
          캘린더에서 날짜를 <span className="font-medium text-theme">길게 누르면</span> 그날에 일정을 추가할 수 있어요
        </p>
      ) : (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 px-4 font-semibold text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card-bg)] transition-all duration-200 hover:shadow-lg hover:shadow-primary-500/20 active:scale-[0.99]"
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

      {/* 오늘 일정 전체 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={deleteAllTodayConfirm}
        onClose={() => setDeleteAllTodayConfirm(false)}
        onConfirm={performDeleteAllToday}
        title="오늘 일정 전체 삭제"
        message={`오늘 배치된 일정 ${todos.length}개를 모두 삭제할까요? 이 작업은 되돌릴 수 없어요.`}
        confirmLabel="전체 삭제"
        cancelLabel="취소"
        danger
      />

    </div>
  )
}
