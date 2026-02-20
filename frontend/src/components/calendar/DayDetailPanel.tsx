import { useState, useEffect, useRef, useMemo } from 'react'
import { Clock, Plus, Edit2, Trash2, Check, MoreHorizontal } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
import { useToastStore } from '@/stores/toastStore'
import { deleteSchedule, updateSchedule } from '@/services/scheduleService'
import { formatDate, formatDateWithDay } from '@/utils/dateUtils'
import { cn } from '@/utils/cn'
import type { Todo } from '@/types/calendar'
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
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
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
    <div className={cn('flex flex-col min-h-0 flex-1 overflow-hidden', embedded && 'p-0 max-h-none')}>
      {/* 심플 헤더: 선택한 날짜 + 개수 */}
      <div className="flex items-baseline justify-between gap-2 mb-4">
        <h3 className="text-base font-semibold text-theme">
          {formatDateWithDay(selectedDate)}
          {isTodaySelected && (
            <span className="ml-2 text-xs font-medium text-primary-500">오늘</span>
          )}
        </h3>
        {todos.length > 0 && (
          <span className="text-xs text-theme-muted tabular-nums">{todos.length}개</span>
        )}
      </div>
      {isTodaySelected && todos.length > 0 && (
        <button
          type="button"
          onClick={() => setDeleteAllTodayConfirm(true)}
          disabled={isDeletingAllToday}
          className="text-xs text-red-500/80 hover:text-red-500 mb-3"
          title="오늘 일정 전체 삭제"
        >
          오늘 일정 전체 삭제
        </button>
      )}

      {/* 플랫 리스트 — 체크 + 제목 + 시간, ... 메뉴 */}
      <div className="flex-1 overflow-y-auto space-y-0 mb-5">
        {todos.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-theme-muted mb-4">이 날 일정이 없어요</p>
          </div>
        ) : (
          sortedTodos.map((todo) => {
            const isEditing = editingTodo?.id === todo.id
            const isCompleted = todo.status === 'completed'
            return (
              <div
                key={todo.id}
                className={cn(
                  'flex items-center gap-3 py-3 border-b border-black/6 dark:border-white/8 last:border-0',
                  isEditing && 'bg-black/5 dark:bg-white/5 -mx-2 px-2 rounded-lg'
                )}
              >
                {!isEditing && todo.status !== 'cancelled' && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleToggleComplete(todo) }}
                    className={cn(
                      'shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
                      isCompleted ? 'border-primary-500 bg-primary-500/20 text-primary-500' : 'border-theme-muted/50'
                    )}
                    title={isCompleted ? '완료 해제' : '완료'}
                    aria-label={isCompleted ? '완료 해제' : '완료'}
                  >
                    {isCompleted && <Check className="w-3 h-3" strokeWidth={2.5} />}
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        ref={titleInputRef}
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveInlineEdit()
                          if (e.key === 'Escape') cancelInlineEdit()
                        }}
                        className="w-full px-2 py-1.5 rounded-md border border-black/10 dark:border-white/10 bg-transparent text-theme text-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-500"
                        placeholder="제목"
                      />
                      <div className="flex gap-2 items-center">
                        <input
                          type="time"
                          value={editForm.startTime}
                          onChange={(e) => setEditForm((f) => ({ ...f, startTime: e.target.value }))}
                          className="px-2 py-1 rounded-md border border-black/10 dark:border-white/10 bg-transparent text-theme text-xs"
                        />
                        <span className="text-theme-muted">~</span>
                        <input
                          type="time"
                          value={editForm.endTime}
                          onChange={(e) => setEditForm((f) => ({ ...f, endTime: e.target.value }))}
                          className="px-2 py-1 rounded-md border border-black/10 dark:border-white/10 bg-transparent text-theme text-xs"
                        />
                        <button type="button" onClick={cancelInlineEdit} className="text-xs text-theme-muted">취소</button>
                        <button type="button" onClick={saveInlineEdit} className="text-xs text-primary-500 font-medium">저장</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className={cn('text-sm text-theme truncate', isCompleted && 'line-through text-theme-muted')}>
                        {todo.title}
                      </p>
                      {(todo.startTime || todo.description) && (
                        <p className="text-xs text-theme-muted mt-0.5 truncate flex items-center gap-1">
                          {todo.startTime && (
                            <>
                              <Clock className="w-3 h-3 shrink-0" />
                              {todo.startTime}{todo.endTime ? `–${todo.endTime}` : ''}
                            </>
                          )}
                          {todo.startTime && todo.description && ' · '}
                          {todo.description}
                        </p>
                      )}
                    </>
                  )}
                </div>
                {!isEditing && (
                  <div className="shrink-0 relative">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === todo.id ? null : todo.id) }}
                      className="p-1.5 rounded text-theme-muted hover:text-theme hover:bg-black/5 dark:hover:bg-white/10"
                      title="더보기"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {menuOpenId === todo.id && (
                      <>
                        <div className="fixed inset-0 z-10" aria-hidden onClick={() => setMenuOpenId(null)} />
                        <div className="absolute right-0 top-full mt-0.5 z-20 py-1 rounded-lg bg-theme-card border border-black/10 dark:border-white/10 shadow-lg min-w-[96px]">
                          <button type="button" onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); startEditing(todo) }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-theme hover:bg-black/5 dark:hover:bg-white/10">
                            <Edit2 className="w-3.5 h-3.5" /> 편집
                          </button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); setDeleteConfirmTodo(todo) }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500/10">
                            <Trash2 className="w-3.5 h-3.5" /> 삭제
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* 일정 추가 — 심플 버튼 */}
      {embedded ? (
        <p className="text-xs text-theme-muted text-center py-2">
          날짜를 <strong className="text-theme">길게 누르면</strong> 일정 추가
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="w-full py-3 rounded-xl text-sm font-medium text-primary-500 hover:bg-primary-500/10 dark:hover:bg-primary-500/15 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        이 날에 추가
      </button>

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
