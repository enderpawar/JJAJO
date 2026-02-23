import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Plus, Edit2, Trash2, Check, MoreHorizontal, Clock } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
import { useToastStore } from '@/stores/toastStore'
import { getEventColorMapForDay } from '@/components/calendar/CalendarGrid'
import { deleteSchedule, updateSchedule, createSchedule } from '@/services/scheduleService'
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

/** HH:mm → "8:30 AM" 형태로 표시 */
function formatTimeLabel(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  if (h === 0) return `12:${String(m).padStart(2, '0')} AM`
  if (h < 12) return `${h}:${String(m).padStart(2, '0')} AM`
  if (h === 12) return `12:${String(m).padStart(2, '0')} PM`
  return `${h - 12}:${String(m).padStart(2, '0')} PM`
}

/** startTime, endTime으로 소요 분 계산 */
function getDurationMinutes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  return (eh * 60 + em) - (sh * 60 + sm)
}
import { ConfirmModal } from '@/components/ConfirmModal'
import { hapticSuccess } from '@/utils/haptic'

interface DayDetailPanelProps {
  /** 캘린더 하단 등 한 블록 안에 묶여 있을 때 true (카드 스타일 생략) */
  embedded?: boolean
  /** true로 바뀌면 일정 추가 모달을 연다 (캘린더 롱프레스 등 외부 트리거) */
  openAddModal?: boolean
  /** 일정 추가 모달을 연 뒤 호출 (openAddModal 플래그 초기화용) */
  onAddModalOpened?: () => void
  /** PC 우측 패널에서 새 일정 추가 모달을 열 때 호출 (제공 시 하단 '새 일정 추가' 버튼이 이걸 호출) */
  onOpenAddModal?: () => void
  /** false면 하단 '새 일정 추가' 버튼·빈 상태 추가 버튼 숨김 (모바일 시트: 하단 + 만 사용) */
  showAddButton?: boolean
  /** 일정 리스트 최대 높이(예: '10rem'). 지정 시 최대 2개 정도만 보이고 나머지는 스크롤 */
  listMaxHeight?: string
}

export default function DayDetailPanel({ embedded = false, openAddModal = false, onAddModalOpened, onOpenAddModal, showAddButton = true, listMaxHeight }: DayDetailPanelProps = {}) {
  const { selectedDate, currentMonth, getTodosByDate, deleteTodo, addTodo, updateTodo, todos: allTodos, setSelectionDimmed } = useCalendarStore()
  const { addToast } = useToastStore()
  const [deleteConfirmTodo, setDeleteConfirmTodo] = useState<Todo | null>(null)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [editForm, setEditForm] = useState({ title: '', date: '', endDate: '', startTime: '', endTime: '', description: '' })
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [isSavingNew, setIsSavingNew] = useState(false)
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null)
  const editingCardRef = useRef<HTMLDivElement>(null)

  const dateStr = formatDate(selectedDate)
  const isTodaySelected = dateStr === formatDate(new Date())

  /** 일정 삭제 확인 모달이 열려 있을 때 캘린더 선택 하이라이트 제거 */
  useEffect(() => {
    setSelectionDimmed(!!deleteConfirmTodo)
    return () => setSelectionDimmed(false)
  }, [deleteConfirmTodo, setSelectionDimmed])

  /** 하단 리스트에 새 일정 카드(드래프트) 추가 후 편집 모드로 열기 */
  const startNewTodo = () => {
    const now = new Date().toISOString()
    const draft: Todo = {
      id: `opt-new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      title: '새 일정',
      date: dateStr,
      startTime: '',
      endTime: '',
      status: 'pending',
      priority: 'medium',
      createdBy: 'user',
      createdAt: now,
      updatedAt: now,
    }
    addTodo(draft)
    setEditingTodo(draft)
    setEditForm({
      title: '새 일정',
      date: dateStr,
      endDate: '',
      startTime: '',
      endTime: '',
      description: '',
    })
  }

  useEffect(() => {
    if (!openAddModal) return
    startNewTodo()
    onAddModalOpened?.()
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

  const todos = getTodosByDate(dateStr)
  /** 캘린더 그리드와 동일한 일정별 색상 (날짜 셀 점·블록 색상과 일치) */
  const eventColorMap = getEventColorMapForDay(dateStr, currentMonth, getTodosByDate, allTodos)

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
      date: todo.date,
      endDate: todo.endDate ?? '',
      startTime: todo.startTime ?? '',
      endTime: todo.endTime ?? '',
      description: todo.description ?? '',
    })
  }

  /** 인라인 편집 저장 (기존 일정 수정 또는 새 일정 생성) */
  const saveInlineEdit = async () => {
    if (!editingTodo) return
    const { title, date, endDate, startTime, endTime, description } = editForm
    const resolvedDate = date || editingTodo.date
    const endDateVal = endDate && endDate >= resolvedDate ? endDate : undefined
    const titleVal = title.trim() || editingTodo.title

    if (editingTodo.id.startsWith('opt-')) {
      if (!titleVal) {
        addToast('제목을 입력해주세요')
        return
      }
      setIsSavingNew(true)
      const tempId = editingTodo.id
      setEditingTodo(null)
      try {
        const created = await createSchedule({
          title: titleVal,
          description: description.trim() || undefined,
          date: resolvedDate,
          endDate: endDateVal,
          startTime: startTime || undefined,
          endTime: endTime || undefined,
          status: 'pending',
          priority: 'medium',
          createdBy: 'user',
        })
        deleteTodo(tempId)
        addTodo(created)
        hapticSuccess()
      } catch (e) {
        setEditingTodo(editingTodo)
        setEditForm({ title: titleVal, date: resolvedDate, endDate: endDateVal ?? '', startTime: startTime ?? '', endTime: endTime ?? '', description: description ?? '' })
        addToast(`일정 추가 실패: ${e instanceof Error ? e.message : '알 수 없음'}`)
      }
      setIsSavingNew(false)
      return
    }

    const prev = { ...editingTodo }
    updateTodo(editingTodo.id, {
      title: titleVal,
      date: resolvedDate,
      endDate: endDateVal,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      description: description.trim() || undefined,
      updatedAt: new Date().toISOString(),
    })
    setEditingTodo(null)
    try {
      const updated = await updateSchedule(editingTodo.id, {
        title: titleVal,
        date: resolvedDate,
        endDate: endDateVal,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        description: description.trim() || undefined,
      })
      updateTodo(editingTodo.id, { updatedAt: updated.updatedAt ?? new Date().toISOString() })
      hapticSuccess()
    } catch (e) {
      updateTodo(editingTodo.id, prev)
      addToast(`저장 실패: ${e instanceof Error ? e.message : '알 수 없음'}`)
    }
  }

  /** 인라인 편집 취소 (새 일정 드래프트면 리스트에서 제거) */
  const cancelInlineEdit = () => {
    if (editingTodo?.id.startsWith('opt-')) {
      deleteTodo(editingTodo.id)
    }
    setEditingTodo(null)
  }

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingTodo) cancelInlineEdit()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [editingTodo])

  // 빈 공간(카드 밖) 클릭 시 새 일정 생성/편집 취소
  useEffect(() => {
    if (!editingTodo) return
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (editingCardRef.current && !editingCardRef.current.contains(target)) {
        cancelInlineEdit()
      }
    }
    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => document.removeEventListener('pointerdown', handlePointerDown, true)
  }, [editingTodo?.id])

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
              className="fixed z-[101] py-1.5 rounded-neu bg-theme-card border border-[var(--border-color)] dark:border-white/[0.12] min-w-[100px] theme-transition"
              style={{ top: menuPosition.top, right: menuPosition.right }}
              role="menu"
            >
              <button
                type="button"
                role="menuitem"
                onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); startEditing(openTodo) }}
                className="btn-ghost-tap w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-medium text-theme hover:bg-black/5 dark:hover:bg-white/10"
              >
                <Edit2 className="w-3.5 h-3.5" /> 편집
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); setDeleteConfirmTodo(openTodo) }}
                className="btn-danger-press w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-normal text-red-500 hover:bg-red-500/10"
              >
                <Trash2 className="w-3.5 h-3.5" /> 삭제
              </button>
            </div>
          </>,
          document.body
        )}

    <div className={cn('flex flex-col min-h-0 flex-1 overflow-hidden', embedded && 'p-0 max-h-none')}>
      {/* 헤더: 날짜 + 오늘 뱃지 + 개수 (모바일 시트 embedded일 때는 상단 시트에서 이미 표시하므로 생략) */}
      {!embedded && (
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
      )}

      {/* 일정 카드 리스트: 레퍼런스 스타일 타임라인 카드 UI */}
      <div
        className={cn(
          'flex-1 overflow-y-auto overscroll-contain space-y-0 mb-4 min-h-0 pr-3',
          embedded && 'pt-0.5'
        )}
        style={listMaxHeight ? { maxHeight: listMaxHeight } : undefined}
      >
        {todos.length === 0 ? (
          <div className="py-14 flex flex-col items-center justify-center gap-4">
            <p className="text-base font-medium text-theme">이 날 일정이 없어요</p>
            {showAddButton ? (
              <>
                <p className="text-sm text-theme-muted">아래 버튼으로 추가해 보세요</p>
                <button
                  type="button"
                  onClick={onOpenAddModal ?? startNewTodo}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-neu text-sm font-medium text-primary-500 dark:text-primary-400 bg-primary-500/10 dark:bg-primary-500/15 hover:bg-primary-500/15 dark:hover:bg-primary-500/20 transition-colors"
                  aria-label="일정 추가"
                >
                  <Plus className="w-4 h-4" />
                  일정 추가
                </button>
              </>
            ) : (
              <p className="text-sm text-theme-muted">하단 <strong className="font-semibold text-theme">+ 버튼</strong>으로 일정을 추가해 보세요</p>
            )}
          </div>
        ) : (
          <div className="py-1">
            {sortedTodos.map((todo, index) => {
              const isEditing = editingTodo?.id === todo.id
              const isCompleted = todo.status === 'completed'
              const timeLabel = todo.startTime ? formatTimeLabel(todo.startTime) : '—'
              const durationMin = todo.startTime && todo.endTime ? getDurationMinutes(todo.startTime, todo.endTime) : null
              const durationText = durationMin != null ? (durationMin >= 60 ? `${Math.floor(durationMin / 60)}시간 ${durationMin % 60 ? `${durationMin % 60}분` : ''}`.trim() : `${durationMin}분`) : null
              const barColor = eventColorMap.get(todo.id) ?? getPriorityBarColor(todo.priority ?? 'medium')
              const isLast = index === sortedTodos.length - 1
              return (
                <motion.div
                  key={todo.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.2), ease: [0.32, 0.72, 0, 1] }}
                  ref={isEditing ? editingCardRef : undefined}
                  className="flex items-stretch gap-3 py-2 first:pt-0"
                >
                  {/* 타임라인: 시간 + 원형 아이콘 + 세로 연결선 */}
                  <div className="flex flex-col items-center w-[4.25rem] shrink-0 pt-0.5">
                    <span className="text-[11px] font-medium text-theme-muted tabular-nums leading-tight">
                      {timeLabel}
                    </span>
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1.5 text-white',
                        barColor
                      )}
                      aria-hidden
                    >
                      <Clock className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </div>
                    {!isLast && (
                      <div
                        className="flex-1 w-0.5 min-h-[10px] mt-0.5 bg-theme-muted/40 rounded-full"
                        aria-hidden
                      />
                    )}
                  </div>
                  {/* 카드 영역 */}
                  <div
                    className={cn(
                      'flex-1 min-w-0 rounded-xl overflow-hidden transition-colors duration-200',
                      'border border-black/8 dark:border-white/[0.08]',
                      'bg-white/80 dark:bg-white/[0.06]',
                      'shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none',
                      !isEditing && 'hover:border-black/12 dark:hover:border-white/[0.12] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]',
                      isEditing && 'ring-1 ring-primary-500/30 border-primary-500/20'
                    )}
                  >
                    <div className={cn('flex items-center gap-3 py-3 px-4', isEditing && 'bg-black/[0.02] dark:bg-white/[0.03]')}>
                      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
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
                              className="w-full px-2 py-1.5 rounded-tool border border-black/10 dark:border-white/10 bg-transparent text-theme text-sm font-medium focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-500"
                              placeholder="제목"
                            />
                            <div className="flex flex-wrap gap-2 items-center">
                              <input
                                type="date"
                                value={editForm.date}
                                onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                                className="px-2 py-1 rounded-tool border border-black/10 dark:border-white/10 bg-transparent text-theme text-xs"
                              />
                              <input
                                type="date"
                                value={editForm.endDate}
                                min={editForm.date}
                                onChange={(e) => setEditForm((f) => ({ ...f, endDate: e.target.value }))}
                                placeholder="종료일"
                                className="px-2 py-1 rounded-tool border border-black/10 dark:border-white/10 bg-transparent text-theme text-xs w-28"
                                title="종료일 (여러 날 일정)"
                              />
                              <input
                                type="time"
                                value={editForm.startTime}
                                onChange={(e) => setEditForm((f) => ({ ...f, startTime: e.target.value }))}
                                className="px-2 py-1 rounded-tool border border-black/10 dark:border-white/10 bg-transparent text-theme text-xs"
                              />
                              <span className="text-theme-muted">~</span>
                              <input
                                type="time"
                                value={editForm.endTime}
                                onChange={(e) => setEditForm((f) => ({ ...f, endTime: e.target.value }))}
                                className="px-2 py-1 rounded-tool border border-black/10 dark:border-white/10 bg-transparent text-theme text-xs"
                              />
                              <button type="button" onClick={cancelInlineEdit} className="btn-ghost-tap text-xs font-normal text-theme-muted">취소</button>
                              <button type="button" onClick={saveInlineEdit} disabled={isSavingNew} className="btn-action-press text-xs font-medium text-primary-500 disabled:opacity-50 disabled:transform-none">{(isSavingNew ? '저장 중…' : '저장')}</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className={cn('text-sm font-semibold text-theme tracking-tight flex items-center gap-1.5 min-w-0', isCompleted && 'line-through font-normal text-theme-muted')}>
                              <span className="truncate">{todo.title}</span>
                              {todo.createdBy === 'ai' && (
                                <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-tool bg-primary-500/15 text-primary-600 dark:text-primary-400 font-medium">
                                  짜조
                                </span>
                              )}
                            </p>
                            {(durationText || todo.description) && (
                              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                {durationText && (
                                  <span className="text-[11px] font-normal text-theme-muted tabular-nums">
                                    {durationText}
                                  </span>
                                )}
                                {todo.description && (
                                  <p className="text-xs font-normal text-theme-muted/90 truncate max-w-full">
                                    {todo.description}
                                  </p>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      {!isEditing && (
                        <div className="shrink-0">
                          <button
                            ref={menuOpenId === todo.id ? menuTriggerRef : undefined}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === todo.id ? null : todo.id) }}
                            className="btn-icon-tap p-2 rounded-tool text-theme-muted hover:text-theme hover:bg-black/5 dark:hover:bg-white/10"
                            title="더보기"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* 완료 체크박스 (카드 오른쪽) */}
                  {!isEditing && todo.status !== 'cancelled' && (
                    <div className="shrink-0 flex items-start pt-3">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleToggleComplete(todo) }}
                        className={cn(
                          'btn-icon-tap shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 transition-colors',
                          isCompleted ? 'border-primary-500 bg-primary-500/20 text-primary-500 dark:text-primary-400' : 'border-theme-muted/50 hover:border-primary-500/50'
                        )}
                        title={isCompleted ? '완료 해제' : '완료'}
                        aria-label={isCompleted ? '완료 해제' : '완료'}
                      >
                        {isCompleted && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
                      </button>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* 모바일 안내: 하단 + 버튼으로만 일정 추가 */}
      {embedded && !showAddButton && (
        <p className="text-xs font-normal text-theme-muted text-center py-2 md:hidden">
          하단 <strong className="font-semibold text-theme">+ 버튼</strong>으로 일정 추가
        </p>
      )}

      {/* 하단 버튼 영역 — showAddButton일 때만 새 일정 추가 버튼 표시 */}
      {showAddButton && (
      <div
        className={cn(
          'shrink-0 flex gap-3 pt-5 pb-2',
          'max-md:sticky max-md:bottom-0 max-md:z-10 max-md:pt-3 max-md:bg-theme max-md:border-t max-md:border-[var(--border-color)]'
        )}
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <button
          type="button"
          onClick={onOpenAddModal ?? startNewTodo}
          disabled={!!editingTodo}
            className={cn(
            'btn-action-press py-3.5 rounded-neu text-sm font-semibold text-white bg-primary-button shadow-[var(--shadow-float-sm)] hover:shadow-[var(--shadow-float)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-button)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-color)] active:scale-[0.98] disabled:transform-none flex items-center justify-center flex-1 min-w-0'
          )}
          title="새 일정 추가"
          aria-label="새 일정 추가"
        >
          <span className="inline-flex items-center gap-2">
            <Plus className="w-4 h-4 shrink-0" strokeWidth={2.5} />
            새 일정 추가
          </span>
        </button>
      </div>
      )}

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

    </div>
    </>
  )
}
