import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useCalendarStore } from '@/stores/calendarStore'
import { updateSchedule, deleteSchedule, createSchedule } from '@/services/scheduleService'
import { Clock, Edit2, Trash2, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import type { Todo } from '../../types/calendar'

interface DragPreview {
  taskId: string
  startTime: string
  endTime: string
}

/**
 * VerticalTimeline: 24시간 수직 그리드 캔버스
 * - 시간 그리드(00:00~24:00), 현재 시각 선, 일정 블록 표시
 */
/** HH:mm → 당일 0시 기준 분 */
function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

/** 분 → HH:mm (24:00 = 당일 종료 허용) */
function minutesToTimeStr(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = Math.round(totalMinutes % 60)
  if (h >= 24 && m === 0) return '24:00'
  const hours = Math.min(23, Math.max(0, h))
  const minutes = Math.min(59, Math.max(0, m))
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function VerticalTimeline() {
  const { todos, updateTodo, deleteTodo, addTodo, selectedDate } = useCalendarStore()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showPastTime, setShowPastTime] = useState(false)
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [renameInputValue, setRenameInputValue] = useState('')
  const editButtonRef = useRef<HTMLButtonElement | null>(null)
  const titleInputRef = useRef<HTMLInputElement | null>(null)
  const isDraggingRef = useRef(false)
  const draggingTaskIdRef = useRef<string | null>(null)
  const pendingReplaceRef = useRef<{ tempId: string; created: Todo } | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const hasAutoScrolled = useRef(false)
  useEffect(() => {
    if (editingTodo) {
      setRenameInputValue(editingTodo.title ?? '')
    }
  }, [editingTodo?.id])

  const handleSaveRename = useCallback(async (task: Todo) => {
    const title = renameInputValue.trim()
    if (!title) return
    const previousTitle = task.title
    // 낙관적 반영: 제목을 바로 UI에 반영하고 입력창 닫기
    updateTodo(task.id, { title, updatedAt: new Date().toISOString() })
    setEditingTodo(null)

    if (task.id.startsWith('opt-')) return

    try {
      const updated = await updateSchedule(task.id, { title })
      updateTodo(task.id, { updatedAt: updated.updatedAt ?? new Date().toISOString() })
    } catch (e) {
      console.error('이름 변경 실패:', e)
      updateTodo(task.id, { title: previousTitle })
      alert(`이름 변경 실패: ${e instanceof Error ? e.message : '알 수 없음'}`)
    }
  }, [renameInputValue, updateTodo])

  /** 낙관적 삭제: 즉시 UI에서 제거한 뒤 백그라운드에서 API 호출. 실패 시 롤백. */
  const handleDelete = useCallback((task: Todo) => {
    if (!confirm('정말 이 일정을 삭제할까요?')) return
    const taskCopy = { ...task }
    deleteTodo(task.id)
    setEditingTodo(null)

    if (task.id.startsWith('opt-')) {
      return
    }
    deleteSchedule(task.id).catch((e) => {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('찾을 수 없습니다')) return
      addTodo(taskCopy)
      console.error('일정 삭제 실패:', e)
      alert(`일정 삭제 실패: ${msg}`)
    })
  }, [deleteTodo, addTodo])

  useEffect(() => {
    if (!editingTodo) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element
      if (target.closest?.('[data-editing-card]')) return
      if (renameInputValue.trim() && renameInputValue.trim() !== editingTodo.title) {
        handleSaveRename(editingTodo)
      } else {
        setEditingTodo(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside, true)
    return () => document.removeEventListener('mousedown', handleClickOutside, true)
  }, [editingTodo, renameInputValue, handleSaveRename])

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const timeToPixels = useCallback((timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number)
    return h * 100 + (m / 60) * 100
  }, [])

  const pixelToTime = useCallback((pixel: number): string => {
    let totalMinutes = (pixel / 100) * 60
    let hours = Math.floor(totalMinutes / 60)
    let minutes = Math.round(totalMinutes % 60)
    minutes = Math.round(minutes / 10) * 10
    if (minutes === 60) { hours += 1; minutes = 0 }
    if (hours >= 24) return '24:00'
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }, [])

  const selectedDateTodos = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    return todos
      .filter(t => t.date === dateStr && t.startTime && t.endTime)
      .sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'))
  }, [todos, selectedDate])

  const todayTodos = selectedDateTodos
  const dateStr = useMemo(() => format(selectedDate ?? new Date(), 'yyyy-MM-dd'), [selectedDate])

  const TIMELINE_HEIGHT = 2400
  const timelineHeight = TIMELINE_HEIGHT
  const HOUR_HEIGHT = 100

  const currentTimePosition = useMemo(() => {
    const hours = currentTime.getHours()
    const minutes = currentTime.getMinutes()
    return hours * HOUR_HEIGHT + (minutes / 60) * HOUR_HEIGHT
  }, [currentTime])

  /** 당일 일정 기준 빈 구간(갭) 목록. [start분, end분] 오름차순. */
  const gapsForDay = useMemo(() => {
    const dayEndMinutes = 24 * 60
    const intervals = todayTodos
      .map(t => ({ start: timeToMinutes(t.startTime!), end: timeToMinutes(t.endTime!) }))
      .sort((a, b) => a.start - b.start)
    if (intervals.length === 0) return [{ start: 0, end: dayEndMinutes }]
    const merged: Array<{ start: number; end: number }> = []
    for (const { start, end } of intervals) {
      if (merged.length === 0) {
        merged.push({ start, end })
        continue
      }
      const last = merged[merged.length - 1]
      if (start <= last.end) {
        last.end = Math.max(last.end, end)
      } else {
        merged.push({ start, end })
      }
    }
    const gaps: Array<{ start: number; end: number }> = []
    let prevEnd = 0
    for (const { start, end } of merged) {
      if (start > prevEnd) gaps.push({ start: prevEnd, end: start })
      prevEnd = end
    }
    if (prevEnd < dayEndMinutes) gaps.push({ start: prevEnd, end: dayEndMinutes })
    return gaps
  }, [todayTodos])

  const handleDoubleClickEmpty = useCallback(
    async (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement
      if (target.closest('.task-card') || target.closest('.ghost-block')) return

      const rect = e.currentTarget.getBoundingClientRect()
      const clickY = e.clientY - rect.top
      const clickedMinutes = Math.round((clickY / 100) * 60)

      const gap = gapsForDay.find(g => g.start <= clickedMinutes && clickedMinutes < g.end)
      if (!gap) return

      const durationMin = gap.end - gap.start
      let blockStartMin: number
      let blockEndMin: number

      if (durationMin >= 60) {
        const snappedToHour = Math.floor(clickedMinutes / 60) * 60
        blockStartMin = Math.max(gap.start, Math.min(snappedToHour, gap.end - 60))
        blockEndMin = Math.min(blockStartMin + 60, gap.end)
      } else {
        blockStartMin = gap.start
        blockEndMin = gap.end
      }

      if (blockEndMin <= blockStartMin) return

      const startTime = minutesToTimeStr(blockStartMin)
      const endTime = minutesToTimeStr(blockEndMin)
      const now = new Date().toISOString()
      const tempId = `opt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

      const optimisticTodo: Todo = {
        id: tempId,
        title: '새 일정',
        date: dateStr,
        startTime,
        endTime,
        status: 'pending',
        priority: 'medium',
        createdBy: 'user',
        createdAt: now,
        updatedAt: now,
      }
      addTodo(optimisticTodo)

      createSchedule({
        title: optimisticTodo.title,
        date: dateStr,
        startTime,
        endTime,
        status: 'pending',
        priority: 'medium',
        createdBy: 'user',
      })
        .then((created) => {
          if (isDraggingRef.current && draggingTaskIdRef.current === tempId) {
            pendingReplaceRef.current = { tempId, created }
          } else {
            deleteTodo(tempId)
            addTodo(created)
          }
        })
        .catch((err) => {
          deleteTodo(tempId)
          console.error('일정 생성 실패:', err)
          alert(`일정 생성 실패: ${err instanceof Error ? err.message : '알 수 없음'}`)
        })
    },
    [gapsForDay, dateStr, addTodo, deleteTodo]
  )

  useEffect(() => {
    if (!timelineRef.current || hasAutoScrolled.current) return
    const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
    if (!isToday) return
    const scrollPosition = Math.max(0, currentTimePosition - 200)
    const t = setTimeout(() => {
      timelineRef.current?.scrollTo({ top: scrollPosition, behavior: 'smooth' })
      hasAutoScrolled.current = true
    }, 300)
    return () => clearTimeout(t)
  }, [selectedDate, currentTimePosition])

  const isSelectedDateToday = useMemo(() =>
    format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'),
  [selectedDate])

  const startResize = useCallback(
    (initialClientY: number, task: Todo, edge: 'start' | 'end') => {
      if (!task.startTime || !task.endTime) return

      const initialStartPixel = timeToPixels(task.startTime)
      const initialEndPixel = timeToPixels(task.endTime)
      const MIN_BLOCK_HEIGHT = 40

      const handleMove = (ev: MouseEvent | TouchEvent) => {
        const clientY =
          ev instanceof MouseEvent ? ev.clientY : ev.touches[0]?.clientY ?? initialClientY
        const deltaY = clientY - initialClientY

        let newStartPixel = initialStartPixel
        let newEndPixel = initialEndPixel

        if (edge === 'start') {
          newStartPixel = Math.min(
            initialEndPixel - MIN_BLOCK_HEIGHT,
            Math.max(0, initialStartPixel + deltaY)
          )
        } else {
          newEndPixel = Math.max(
            initialStartPixel + MIN_BLOCK_HEIGHT,
            Math.min(timelineHeight, initialEndPixel + deltaY)
          )
        }

        setDragPreview({
          taskId: task.id,
          startTime: pixelToTime(newStartPixel),
          endTime: pixelToTime(newEndPixel),
        })
      }

      const handleUp = (ev: MouseEvent | TouchEvent) => {
        window.removeEventListener('mousemove', handleMove as any)
        window.removeEventListener('mouseup', handleUp as any)
        window.removeEventListener('touchmove', handleMove as any)
        window.removeEventListener('touchend', handleUp as any)

        const clientY =
          ev instanceof MouseEvent ? ev.clientY : (ev as TouchEvent).changedTouches[0]?.clientY ?? initialClientY
        const deltaY = clientY - initialClientY

        let newStartPixel = initialStartPixel
        let newEndPixel = initialEndPixel

        if (edge === 'start') {
          newStartPixel = Math.min(
            initialEndPixel - MIN_BLOCK_HEIGHT,
            Math.max(0, initialStartPixel + deltaY)
          )
        } else {
          newEndPixel = Math.max(
            initialStartPixel + MIN_BLOCK_HEIGHT,
            Math.min(timelineHeight, initialEndPixel + deltaY)
          )
        }

        const newStart = pixelToTime(newStartPixel)
        const newEnd = pixelToTime(newEndPixel)

        setDragPreview(null)

        if (pendingReplaceRef.current && pendingReplaceRef.current.tempId === task.id) {
          const { created } = pendingReplaceRef.current
          const tempIdToRemove = task.id
          pendingReplaceRef.current = null

          updateTodo(tempIdToRemove, { startTime: newStart, endTime: newEnd })
          setTimeout(() => {
            deleteTodo(tempIdToRemove)
            addTodo({ ...created, startTime: newStart, endTime: newEnd })
            updateSchedule(created.id, { startTime: newStart, endTime: newEnd }).catch(() => {})
          }, 0)
          return
        }

        updateTodo(task.id, { startTime: newStart, endTime: newEnd })
        if (!task.id.startsWith('opt-')) {
          updateSchedule(task.id, { startTime: newStart, endTime: newEnd }).catch(() => {})
        }
      }

      window.addEventListener('mousemove', handleMove as any)
      window.addEventListener('mouseup', handleUp as any)
      window.addEventListener('touchmove', handleMove as any, { passive: false })
      window.addEventListener('touchend', handleUp as any)
    },
    [timeToPixels, pixelToTime, timelineHeight, updateTodo, deleteTodo, addTodo]
  )

  const renderTaskBlock = useCallback((task: Todo) => {
    if (!task.startTime || !task.endTime) return null

    // 원본 위치 (시간 기준)
    const originalStartPixel = timeToPixels(task.startTime)
    const originalEndPixel = timeToPixels(task.endTime)

    // 기본값: 원본 위치
    let startPixel = originalStartPixel
    let endPixel = originalEndPixel

    // 전체 카드 드래그가 아닌, 리사이즈 중일 때만 프리뷰 값을 실제 카드 위치/높이에 반영
    if (dragPreview && dragPreview.taskId === task.id && !isDraggingRef.current) {
      startPixel = timeToPixels(dragPreview.startTime)
      endPixel = timeToPixels(dragPreview.endTime)
    }

    const baseHeight = endPixel - startPixel
    const isPast = isSelectedDateToday && endPixel < currentTimePosition
    const isCurrent = isSelectedDateToday && startPixel <= currentTimePosition && currentTimePosition < endPixel
    const isFuture = isSelectedDateToday && startPixel > currentTimePosition
    const progress = isCurrent
      ? ((currentTimePosition - startPixel) / (endPixel - startPixel)) * 100
      : 0
    const completedHeight = isCurrent
      ? ((currentTimePosition - startPixel) / (endPixel - startPixel)) * 100
      : 0
    const scale = 1
    const isEditingThisTask = editingTodo?.id === task.id

    return (
      <motion.div
        {...(isEditingThisTask && { 'data-editing-card': 'true' })}
        key={`${task.clientKey ?? task.id}-${task.startTime}-${task.endTime}`}
        className={`
          task-card group absolute left-0 right-0 mx-4 cursor-pointer active:cursor-grabbing overflow-hidden touch-none
          ${isEditingThisTask ? 'rounded-2xl border-2 border-primary-400 shadow-[0_0_0_1px_rgba(56,189,248,0.4)]' : 'rounded-lg'}
          ${isPast ? 'task-card-past' : ''}
          ${isCurrent ? 'task-card-active backdrop-blur-md' : ''}
          ${isFuture || (!isCurrent && !isPast)
            ? `bg-[#252525]/90 backdrop-blur-md ${
                isEditingThisTask ? '' : 'border border-white/10'
              } hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] ${
                isEditingThisTask ? '' : 'hover:border-white/30'
              } hover:bg-[#2a2a2a]/90 transition-all duration-300 ease-out`
            : ''}
        `}
        style={{
          top: `${startPixel}px`,
          height: `${baseHeight}px`,
          zIndex: isCurrent ? 10 : isPast ? 1 : 5,
          transform: `scale(${scale})`,
          opacity: isPast ? 0.5 : isFuture ? 0.7 : 1,
          transition: 'none',
        }}
        drag={isEditingThisTask ? false : 'y'}
        dragElastic={0}
        dragMomentum={false}
        whileDrag={isEditingThisTask ? undefined : { scale: 1.05, zIndex: 100, cursor: 'grabbing' }}
        onDragStart={() => {
          if (isEditingThisTask) return
          isDraggingRef.current = true
          draggingTaskIdRef.current = task.id
        }}
        onDrag={(_, info) => {
          if (isEditingThisTask) return
          const newStartPixel = Math.max(0, Math.min(timelineHeight - (endPixel - startPixel), startPixel + info.offset.y))
          setDragPreview({
            taskId: task.id,
            startTime: pixelToTime(newStartPixel),
            endTime: pixelToTime(newStartPixel + (endPixel - startPixel)),
          })
        }}
        onDragEnd={(_, info) => {
          if (isEditingThisTask) return
          setDragPreview(null)
          let newStartPixel = Math.max(0, Math.min(timelineHeight - (endPixel - startPixel), startPixel + info.offset.y))
          const newEndPixel = newStartPixel + (endPixel - startPixel)
          const newStart = pixelToTime(newStartPixel)
          const newEnd = pixelToTime(newEndPixel)

          if (pendingReplaceRef.current && pendingReplaceRef.current.tempId === task.id) {
            const { created } = pendingReplaceRef.current
            const tempIdToRemove = task.id
            pendingReplaceRef.current = null
            updateTodo(tempIdToRemove, { startTime: newStart, endTime: newEnd })
            setTimeout(() => {
              deleteTodo(tempIdToRemove)
              addTodo({ ...created, startTime: newStart, endTime: newEnd })
              updateSchedule(created.id, { startTime: newStart, endTime: newEnd }).catch(() => {})
            }, 0)
            setTimeout(() => { isDraggingRef.current = false; draggingTaskIdRef.current = null }, 100)
            return
          }
          if (newStartPixel < 0 || newEndPixel > timelineHeight) {
            setTimeout(() => { isDraggingRef.current = false; draggingTaskIdRef.current = null }, 100)
            return
          }
          updateTodo(task.id, { startTime: newStart, endTime: newEnd })
          updateSchedule(task.id, { startTime: newStart, endTime: newEnd }).catch(() => {})
          setTimeout(() => { isDraggingRef.current = false; draggingTaskIdRef.current = null }, 100)
        }}
      >
        {dragPreview && dragPreview.taskId === task.id && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md flex flex-row flex-wrap items-center justify-center gap-x-2 gap-y-1 z-30 rounded-xl px-3 py-2">
            <span className="text-2xl font-black text-white animate-pulse whitespace-nowrap">{dragPreview.startTime}</span>
            <span className="text-xl text-white/70">~</span>
            <span className="text-2xl font-black text-white animate-pulse whitespace-nowrap">{dragPreview.endTime}</span>
            <span className="px-2.5 py-1 bg-primary-500 rounded-full text-white text-xs font-bold">📍 10분</span>
          </div>
        )}
        {/* 편집 모드에서 상/하단 테두리를 잡고 리사이즈할 수 있는 영역 (카드 전체 높이에 따라 자동 이동) */}
        {!isPast && editingTodo?.id === task.id && (
          <>
            {/* 상단: 얇은 투명 히트존만 유지 (시간 앞당기기용) */}
            <div
              className="absolute inset-x-0 top-0 h-3 cursor-n-resize touch-none z-20"
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                startResize(e.clientY, task, 'start')
              }}
              onTouchStart={(e) => {
                e.preventDefault()
                e.stopPropagation()
                const touch = e.touches[0]
                if (touch) startResize(touch.clientY, task, 'start')
              }}
            />
            {/* 하단: 테마와 어울리는 V(chevron) 모양 드래그 핸들 */}
            <div
              className="absolute left-1/2 bottom-1 -translate-x-1/2 z-20"
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                startResize(e.clientY, task, 'end')
              }}
              onTouchStart={(e) => {
                e.preventDefault()
                e.stopPropagation()
                const touch = e.touches[0]
                if (touch) startResize(touch.clientY, task, 'end')
              }}
            >
              <div
                className="
                  flex items-center justify-center
                  w-8 h-4
                  rounded-full
                  bg-white/5
                  border border-primary-500/70
                  text-primary-400
                  shadow-[0_0_8px_rgba(251,146,60,0.4)]
                  hover:bg-primary-500/20
                  transition-all duration-150
                  animate-float-soft
                  cursor-s-resize
                  touch-none
                "
              >
                <ChevronDown className="w-3 h-3" />
              </div>
            </div>
          </>
        )}
        {isCurrent && (
          <>
            <div className="absolute inset-x-0 top-0 bg-slate-600/50" style={{ height: `${completedHeight}%`, transition: 'height 2s ease-out' }} />
            <div className="absolute inset-x-0 bottom-0 bg-slate-700/25" style={{ height: `${100 - completedHeight}%`, transition: 'height 2s ease-out' }} />
            <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-sm" />
          </>
        )}
        {isPast && <div className="absolute inset-0 bg-gray-300" />}
        <div className={`relative z-10 ${isPast ? 'p-2' : 'p-4'}`}>
          {!isPast && (
            <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
              {isEditingThisTask && (
                <button
                  ref={editButtonRef}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleDelete(task)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all cursor-pointer ${isCurrent ? 'bg-red-500/40 hover:bg-red-500/60 backdrop-blur-sm' : 'bg-red-500/30 hover:bg-red-500/50 group'}`}
                  title="삭제"
                >
                  <Trash2 className={`w-3.5 h-3.5 ${isCurrent ? 'text-white' : 'text-red-400 group-hover:text-white'}`} />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  if (!isDraggingRef.current) {
                    setEditingTodo(prev => (prev?.id === task.id ? null : task))
                  }
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all cursor-pointer ${isCurrent ? 'bg-white/20 hover:bg-white/30 backdrop-blur-sm' : 'bg-notion-sidebar/80 hover:bg-blue-500 group'}`}
                title={isEditingThisTask ? '편집 모드 해제' : task.title === '새 일정' ? '클릭하여 이름 입력' : '편집'}
              >
                <Edit2 className={`w-3.5 h-3.5 ${isCurrent ? 'text-white' : 'text-gray-600 group-hover:text-white'}`} />
              </button>
            </div>
          )}
          {isPast ? (
            <div className="flex items-center gap-2 text-notion-muted">
              <span className="text-xs">✓</span>
              <span className="text-xs font-medium truncate">{task.title}</span>
              <span className="text-xs opacity-50 ml-auto">{task.startTime}</span>
            </div>
          ) : (
            <>
              <div className="text-sm font-medium mb-2 text-gray-400">{task.startTime} - {task.endTime}</div>
              {isEditingThisTask ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={renameInputValue}
                  onChange={(e) => setRenameInputValue(e.target.value)}
                  onBlur={() => {
                    if (renameInputValue.trim() && renameInputValue.trim() !== task.title) {
                      handleSaveRename(task)
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (renameInputValue.trim()) handleSaveRename(task)
                    }
                    if (e.key === 'Escape') {
                      setRenameInputValue(task.title)
                      setEditingTodo(null)
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className={`w-[25%] pr-12 text-lg font-semibold mb-2 leading-tight bg-white/10 border border-white/20 rounded px-2 py-1 focus:outline-none focus:ring-0 focus-visible:ring-0 ${isCurrent ? 'text-white placeholder-white/50' : 'text-white placeholder-white/40'}`}
                  placeholder="제목"
                />
              ) : (
                <>
                  <div className={`text-lg font-semibold mb-2 leading-tight pr-12 ${isCurrent ? 'text-white text-2xl drop-shadow-lg' : 'text-white'}`}>{task.title}</div>
                  {task.title === '새 일정' && (
                    <div className="text-xs text-notion-muted">연필 아이콘을 눌러 제목을 입력하세요</div>
                  )}
                </>
              )}
              {task.description && <div className={`text-sm mb-3 ${isCurrent ? 'text-white/90' : 'text-gray-400'}`}>{task.description}</div>}
              {isCurrent && (
                <div className="mt-4 mr-4">
                  <div className="relative h-2 bg-slate-700/60 rounded-full overflow-hidden mb-2">
                    <div className="absolute inset-y-0 left-0 bg-slate-500 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">🔥 진행 중</span>
                    <span className="text-white font-bold">{Math.round(progress)}%</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    )
  }, [timeToPixels, pixelToTime, isSelectedDateToday, currentTimePosition, timelineHeight, updateTodo, dragPreview, editingTodo, renameInputValue, handleSaveRename, handleDelete])

  const getMinutesDiff = (startPixel: number, endPixel: number) => ((endPixel - startPixel) / 100) * 60

  return (
    <div ref={timelineRef} className="timeline-scroll flex-1 bg-[#191919] overflow-y-auto relative">
      {showPastTime && (
        <div className="sticky top-0 left-0 right-0 z-[100] bg-gradient-to-b from-notion-sidebar via-notion-sidebar to-transparent pb-4 pt-4">
          <div className="mx-4">
            <button
              type="button"
              onClick={() => setShowPastTime(false)}
              className="touch-target w-full min-h-[44px] bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-3 cursor-pointer"
            >
              <Clock className="w-5 h-5" />
              <span>이전 기록 접기 (현재 시간으로 돌아가기) ↑</span>
            </button>
          </div>
        </div>
      )}

      {!showPastTime && currentTimePosition > 0 && (() => {
        const pastTodos = todayTodos.filter(task => timeToPixels(task.endTime!) <= currentTimePosition)
        const pastMinutes = getMinutesDiff(0, currentTimePosition)
        const hours = Math.floor(pastMinutes / 60)
        const minutes = Math.round(pastMinutes % 60)
        const timeLabel = hours > 0 ? `${hours}시간 ${minutes > 0 ? minutes + '분' : ''}` : `${minutes}분`
        return (
          <div
            role="button"
            tabIndex={0}
            onClick={() => setShowPastTime(true)}
            onKeyDown={(e) => e.key === 'Enter' && setShowPastTime(true)}
            className="touch-target mx-4 mb-0 rounded-xl cursor-pointer overflow-hidden border border-white/10 bg-[#252525]/60 backdrop-blur-xl hover:bg-[#2a2a2a]/70 hover:border-white/20 min-h-[300px] flex items-center justify-center"
            style={{ position: 'relative', zIndex: 100 }}
          >
            <Clock className="w-5 h-5 text-primary-600 animate-pulse" />
            <div className="text-left ml-3">
              <div className="text-sm font-bold text-notion-text">
                📜 이전 기록: {timeLabel} ({pastTodos.length === 0 ? '일정 없음' : `${pastTodos.length}개 일정`})
              </div>
              <div className="text-xs text-primary-600 font-medium">00:00 ~ {format(currentTime, 'HH:mm')} · 👆 클릭하여 이전 시간대 보기</div>
            </div>
          </div>
        )
      })()}

      <div
        className="relative transition-all duration-500 bg-[#191919]"
        style={{
          height: `${timelineHeight}px`,
          marginTop: !showPastTime ? `-${currentTimePosition - 100}px` : '0px',
        }}
        onDoubleClick={handleDoubleClickEmpty}
        title="빈 칸을 더블클릭하면 일정을 추가할 수 있어요"
      >
        {/* 그리드 레이어: 클릭은 부모(타임라인 컨테이너)로 전달되도록 pointer-events-none */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
          {Array.from({ length: 25 }, (_, i) => {
            if (!showPastTime && i < Math.floor(currentTimePosition / 100)) return null
            const is24 = i === 24
            const topPx = i * 100
            return (
              <div key={i}>
                <div className="absolute left-0 right-0 border-t border-[#373737]" style={{ top: `${topPx}px` }}>
                  <div className="absolute left-4 -top-3 text-xs text-white/40 bg-[#191919] px-2" style={{ zIndex: 5 }}>
                    {is24 ? '24:00' : `${String(i).padStart(2, '0')}:00`}
                  </div>
                </div>
                {!is24 && (
                  <div className="absolute left-0 right-0 border-t border-dashed border-[#373737]/50" style={{ top: `${topPx + 50}px` }}>
                    <div className="absolute left-4 -top-2 text-[10px] text-white/20 bg-[#191919] px-1.5" style={{ zIndex: 5 }}>{String(i).padStart(2, '0')}:30</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {(showPastTime ? todayTodos : todayTodos.filter(task => timeToPixels(task.endTime!) > currentTimePosition)).map(renderTaskBlock)}

        <div className="absolute left-0 right-0 z-50 transition-all duration-1000 ease-linear" style={{ top: `${currentTimePosition}px` }}>
          <div className="relative h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]">
            <div className="absolute -left-2 -top-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-[0_0_10px_rgba(239,68,68,0.8)]">{format(currentTime, 'HH:mm:ss')}</div>
            <div className="absolute right-0 -top-1.5 w-4 h-4 bg-red-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
          </div>
        </div>

        <div className="absolute left-0 right-0 top-0 bg-gray-900/10 pointer-events-none transition-all duration-1000" style={{ height: `${currentTimePosition}px`, zIndex: 2 }} />
      </div>
    </div>
  )
}

