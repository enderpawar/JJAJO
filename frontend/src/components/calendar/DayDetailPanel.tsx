import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Edit2, Trash2, Check, MoreHorizontal } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
import { useToastStore } from '@/stores/toastStore'
import { deleteSchedule, updateSchedule } from '@/services/scheduleService'
import { formatDate, formatDateWithDay } from '@/utils/dateUtils'
import { cn } from '@/utils/cn'
import type { Todo, TodoPriority } from '@/types/calendar'

/** 일정 우선순위별 왼쪽 컬러 바 색상 */
function getPriorityBarColor(priority: TodoPriority): string {
  switch (priority) {
    case 'high':
      return 'bg-red-500 dark:bg-red-400'
    case 'medium':
      return 'bg-primary-500 dark:bg-primary-400'
    case 'low':
    default:
      return 'bg-theme-muted/60'
  }
}
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
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null)

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

  // 더보기 드롭다운 위치 측정 — Portal로 overflow 밖에 렌더링하기 위함
  useLayoutEffect(() => {
    if (!menuOpenId || !menuTriggerRef.current) {
      setMenuPosition(null)
      return
    }
    const rect = menuTriggerRef.current.getBoundingClientRect()
    setMenuPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    return () => setMenuPosition(null)
  }, [menuOpenId])

  const openTodo = menuOpenId ? sortedTodos.find((t) => t.id === menuOpenId) : null

  return (
    <>
      {/* 더보기 드롭다운 — Portal로 body에 렌더링해 overflow에 가려지지 않도록 */}
      {openTodo && menuPosition &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[100]"
              aria-hidden
              onClick={() => setMenuOpenId(null)}
            />
            <div
              className="fixed z-[101] py-1.5 rounded-xl bg-theme-card border border-black/8 dark:border-white/10 shadow-xl min-w-[100px]"
              style={{ top: menuPosition.top, right: menuPosition.right }}
              role="menu"
            >
              <button
                type="button"
                role="menuitem"
                onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); startEditing(openTodo) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-medium text-theme hover:bg-black/5 dark:hover:bg-white/10"
              >
                <Edit2 className="w-3.5 h-3.5" /> 편집
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); setDeleteConfirmTodo(openTodo) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-normal text-red-500 hover:bg-red-500/10"
              >
                <Trash2 className="w-3.5 h-3.5" /> 삭제
              </button>
            </div>
          </>,
          document.body
        )}

    <div className={cn('flex flex-col min-h-0 flex-1 overflow-hidden', embedded && 'p-0 max-h-none')}>
      {/* 헤더: 날짜 + 오늘 뱃지 + 개수 */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5 min-w-0">
          <h3 className="text-lg font-bold text-theme tracking-tight truncate">
            {formatDateWithDay(selectedDate)}
          </h3>
          {isTodaySelected && (
            <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary-500/15 dark:bg-primary-500/20 text-primary-500 dark:text-primary-400">
              오늘
            </span>
          )}
        </div>
        {todos.length > 0 && (
          <span className="shrink-0 text-xs font-normal text-theme-muted tabular-nums">
            {todos.length}개
          </span>
        )}
      </div>

      {/* 일정 카드 리스트 */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {todos.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-sm text-theme-muted/90">이 날 일정이 없어요</p>
            <p className="text-xs text-theme-muted/70 mt-1">아래 버튼으로 추가해 보세요</p>
          </div>
        ) : (
          sortedTodos.map((todo) => {
            const isEditing = editingTodo?.id === todo.id
            const isCompleted = todo.status === 'completed'
            const timeStr = todo.startTime ? (todo.endTime ? `${todo.startTime}-${todo.endTime}` : todo.startTime) : null
            return (
              <div
                key={todo.id}
                className={cn(
                  'flex items-stretch gap-0 rounded-2xl overflow-hidden transition-shadow duration-200',
                  'border border-black/6 dark:border-white/[0.06]',
                  'bg-black/[0.03] dark:bg-white/[0.04] shadow-sm',
                  !isEditing && 'hover:border-black/10 dark:hover:border-white/[0.1] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_4px_16px_rgba(0,0,0,0.3)]',
                  isEditing && 'ring-1 ring-primary-500/30 border-primary-500/20'
                )}
              >
                {/* 왼쪽 컬러 바 — 상단만 둥글게 */}
                <div className={cn('w-1 shrink-0 self-stretch rounded-l-full', getPriorityBarColor(todo.priority ?? 'medium'))} aria-hidden />
                <div className={cn('flex items-center gap-3 py-3.5 px-4 flex-1 min-w-0', isEditing && 'bg-black/[0.02] dark:bg-white/[0.03]')}>
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
                  <div className="flex-1 min-w-0 flex items-baseline gap-2">
                    {isEditing ? (
                      <div className="space-y-2 w-full">
                        <input
                          ref={titleInputRef}
                          type="text"
                          value={editForm.title}
                          onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveInlineEdit()
                            if (e.key === 'Escape') cancelInlineEdit()
                          }}
                          className="w-full px-2 py-1.5 rounded-md border border-black/10 dark:border-white/10 bg-transparent text-theme text-sm font-medium focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-500"
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
                          <button type="button" onClick={cancelInlineEdit} className="text-xs font-normal text-theme-muted">취소</button>
                          <button type="button" onClick={saveInlineEdit} className="text-xs font-medium text-primary-500">저장</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {timeStr && (
                          <span className="text-[11px] font-normal text-theme-muted/90 tabular-nums shrink-0 tracking-tight">
                            {timeStr}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className={cn('text-sm font-semibold text-theme truncate tracking-tight', isCompleted && 'line-through font-normal text-theme-muted')}>
                            {todo.title}
                          </p>
                          {todo.description && (
                            <p className="text-xs font-normal text-theme-muted/90 mt-0.5 truncate">
                              {todo.description}
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  {!isEditing && (
                    <div className="shrink-0 relative">
                      <button
                        ref={menuOpenId === todo.id ? menuTriggerRef : undefined}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === todo.id ? null : todo.id) }}
                        className="p-2 rounded-xl text-theme-muted hover:text-theme hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        title="더보기"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 모바일 안내: 날짜 길게 누르면 일정 추가 */}
      {embedded && (
        <p className="text-xs font-normal text-theme-muted text-center py-2 md:hidden">
          날짜를 <strong className="font-semibold text-theme">길게 누르면</strong> 일정 추가
        </p>
      )}

      {/* 하단 버튼 영역 — 비율 2:3, 세련된 스타일 */}
      <div
        className="shrink-0 flex gap-3 pt-5 pb-2"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {isTodaySelected && todos.length > 0 && (
          <button
            type="button"
            onClick={() => setDeleteAllTodayConfirm(true)}
            disabled={isDeletingAllToday}
            className="flex-[2] min-w-0 py-3.5 rounded-2xl text-sm font-medium text-red-500 dark:text-red-400 border border-red-500/25 dark:border-red-400/30 bg-transparent hover:bg-red-500/10 dark:hover:bg-red-500/15 active:bg-red-500/15 transition-colors flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-color)] disabled:opacity-50"
            title="오늘 일정 전체 삭제"
          >
            <Trash2 className="w-4 h-4 shrink-0" strokeWidth={2} />
            전체 삭제
          </button>
        )}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={cn(
            'py-3.5 rounded-2xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 dark:bg-primary-500 dark:hover:bg-primary-400 shadow-md hover:shadow-lg dark:shadow-[0_4px_14px_rgba(255,149,0,0.2)] dark:hover:shadow-[0_6px_20px_rgba(255,149,0,0.28)] transition-all duration-200 flex items-center justify-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-color)] active:scale-[0.98]',
            isTodaySelected && todos.length > 0 ? 'flex-[3] min-w-0' : 'flex-1 min-w-0'
          )}
          title="새 일정 추가"
          aria-label="새 일정 추가"
        >
          <Plus className="w-4 h-4 shrink-0" strokeWidth={2.5} />
          새 일정 추가
        </button>
      </div>

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
    </>
  )
}
