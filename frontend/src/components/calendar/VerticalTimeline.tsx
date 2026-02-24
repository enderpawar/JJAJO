import { useMemo, useState, useEffect, useRef, useCallback, type MutableRefObject } from 'react'
import { useCalendarStore } from '@/stores/calendarStore'
import { useToastStore } from '@/stores/toastStore'
import { updateSchedule, deleteSchedule, createSchedule } from '@/services/scheduleService'
import { hapticSuccess, hapticWarn } from '@/utils/haptic'
import { Clock, Edit2, Trash2, ChevronDown, History, CheckSquare, Square } from 'lucide-react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
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
/** 플랜카드 상·하 여백(px) — 카드가 딱 붙지 않도록 호흡 공간 */
const PLAN_CARD_GAP = 8

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

interface VerticalTimelineProps {
  /** 모달 닫기 직후 한 번만 현재 시각 스크롤을 건너뛸 때 사용 */
  skipNextScrollToTimeRef?: MutableRefObject<boolean>
}

export function VerticalTimeline({ skipNextScrollToTimeRef }: VerticalTimelineProps = {}) {
  const { todos, updateTodo, deleteTodo, addTodo, selectedDate, ghostPlans } = useCalendarStore()
  const { addToast } = useToastStore()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showPastTime, setShowPastTime] = useState(false)
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null)
  const [isCardDragging, setCardDragging] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [renameInputValue, setRenameInputValue] = useState('')
  const [lastCreatedTodoId, setLastCreatedTodoId] = useState<string | null>(null)
  const editButtonRef = useRef<HTMLButtonElement | null>(null)
  const titleInputRef = useRef<HTMLInputElement | null>(null)
  const isDraggingRef = useRef(false)
  const draggingTaskIdRef = useRef<string | null>(null)
  const pendingReplaceRef = useRef<{ tempId: string; created: Todo } | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const timelineContentRef = useRef<HTMLDivElement>(null)
  const hasAutoScrolled = useRef(false)
  const createdAnimationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTapTimeRef = useRef(0)
  const lastTapYRef = useRef(0)
  const dragMoveLoggedRef = useRef(false)
  const DOUBLE_TAP_MS = 400
  const DOUBLE_TAP_Y_SLOP = 60
  useEffect(() => {
    if (editingTodo) {
      setRenameInputValue(editingTodo.title ?? '')
    }
  }, [editingTodo?.id])

  // 편집 모드 진입 시 제목 input에 포커스 (input이 마운트된 뒤 실행)
  useEffect(() => {
    if (!editingTodo) return
    const t = setTimeout(() => titleInputRef.current?.focus(), 0)
    return () => clearTimeout(t)
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
      addToast(`이름 변경 실패: ${e instanceof Error ? e.message : '알 수 없음'}`)
    }
  }, [renameInputValue, updateTodo, addToast])

  /** 완료 토글: 낙관적 반영 후 서버 동기화 */
  const handleToggleComplete = useCallback((task: Todo) => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed'
    updateTodo(task.id, { status: nextStatus, updatedAt: new Date().toISOString() })
    hapticSuccess()
    if (!task.id.startsWith('opt-')) {
      updateSchedule(task.id, { status: nextStatus }).catch((e) => {
        updateTodo(task.id, { status: task.status })
        addToast(`완료 상태 저장 실패: ${e instanceof Error ? e.message : '알 수 없음'}`)
      })
    }
  }, [updateTodo, addToast])

  /** 낙관적 삭제: 즉시 UI에서 제거한 뒤 백그라운드에서 API 호출. 실패 시 롤백. */
  const performDelete = useCallback((task: Todo) => {
    hapticWarn()
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
      addToast(`일정 삭제 실패: ${msg}`)
    })
  }, [deleteTodo, addTodo, addToast])

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

  const dateStr = useMemo(() => format(selectedDate ?? new Date(), 'yyyy-MM-dd'), [selectedDate])

  /** 선택일 기준 일정: 해당 일자에 속하는 것만 (시작일=선택일 또는 선택일이 [시작일, 종료일] 구간 안). 시간이 있으면 해당 시간대에 배치. */
  const selectedDateTodos = useMemo(() => {
    return todos
      .filter(t => {
        if (t.isGhost || !t.startTime || !t.endTime) return false
        const end = t.endDate || t.date
        const onDate = dateStr >= t.date && dateStr <= end
        return onDate
      })
      .sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'))
  }, [todos, dateStr])

  const todayTodos = selectedDateTodos

  /** 선택일 기준 고스트 일정 (짜조 제안), 시간순 정렬 */
  const ghostPlansForDate = useMemo(() => {
    return ghostPlans
      .filter(t => t.date === dateStr && t.startTime && t.endTime)
      .sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'))
  }, [ghostPlans, dateStr])

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

  /** 빈 시간대에 일정 추가 (clientY + rect로 위치 계산). 마우스 더블클릭·터치 더블탭 공용 */
  const addTodoAtPosition = useCallback(
    (clientY: number, rect: DOMRect) => {
      const clickY = clientY - rect.top
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
      if (createdAnimationTimeoutRef.current) clearTimeout(createdAnimationTimeoutRef.current)
      setLastCreatedTodoId(tempId)
      createdAnimationTimeoutRef.current = setTimeout(() => {
        setLastCreatedTodoId(null)
        createdAnimationTimeoutRef.current = null
      }, 500)

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
            const currentTodos = useCalendarStore.getState().todos
            const currentTodo = currentTodos.find((t) => t.id === tempId)
            const wasDragged =
              currentTodo?.startTime != null &&
              currentTodo?.endTime != null &&
              (currentTodo.startTime !== created.startTime || currentTodo.endTime !== created.endTime)
            if (wasDragged) {
              const merged = {
                ...created,
                startTime: currentTodo!.startTime!,
                endTime: currentTodo!.endTime!,
              }
              deleteTodo(tempId)
              addTodo(merged)
              setEditingTodo(prev => (prev?.id === tempId ? merged : prev))
              updateSchedule(merged.id, { startTime: merged.startTime, endTime: merged.endTime }).catch(() => {})
            } else {
              deleteTodo(tempId)
              addTodo(created)
              setEditingTodo(prev => (prev?.id === tempId ? created : prev))
            }
          }
        })
        .catch((err) => {
          deleteTodo(tempId)
          console.error('일정 생성 실패:', err)
          addToast(`일정 생성 실패: ${err instanceof Error ? err.message : '알 수 없음'}`)
        })
    },
    [gapsForDay, dateStr, addTodo, deleteTodo, addToast, setEditingTodo]
  )

  const handleDoubleClickEmpty = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement
      if (target.closest('.task-card') || target.closest('.ghost-block')) return
      addTodoAtPosition(e.clientY, e.currentTarget.getBoundingClientRect())
    },
    [addTodoAtPosition]
  )

  /** 터치 더블탭으로 빈 시간대에 일정 추가 (모바일) */
  const handleTouchEndEmpty = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement
      if (target.closest('.task-card') || target.closest('.ghost-block')) return

      const touch = e.changedTouches[0]
      if (!touch) return

      const el = timelineContentRef.current
      if (!el) return

      const clientY = touch.clientY
      const rect = el.getBoundingClientRect()
      const now = Date.now()

      if (
        now - lastTapTimeRef.current <= DOUBLE_TAP_MS &&
        Math.abs(clientY - lastTapYRef.current) <= DOUBLE_TAP_Y_SLOP
      ) {
        if (e.cancelable) e.preventDefault()
        lastTapTimeRef.current = 0
        lastTapYRef.current = 0
        addTodoAtPosition(clientY, rect)
        hapticSuccess()
      } else {
        lastTapTimeRef.current = now
        lastTapYRef.current = clientY
      }
    },
    [addTodoAtPosition]
  )

  // #region agent log
  useEffect(() => {
    const el = timelineRef.current
    if (!el) return
    const onTouchStart = (e: TouchEvent) => {
      const t = e.target as HTMLElement
      const onCard = !!t?.closest?.('.task-card')
      fetch('http://127.0.0.1:7243/ingest/81e1fb98-9efa-4cc2-bacf-8eaa56d0962b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cf01a6'},body:JSON.stringify({sessionId:'cf01a6',location:'VerticalTimeline.tsx:timeline-touchstart',message:'Timeline touchstart',data:{onCard,targetTag:t?.tagName},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{})
    }
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    return () => el.removeEventListener('touchstart', onTouchStart)
  }, [])
  // #endregion

  useEffect(() => {
    if (skipNextScrollToTimeRef?.current) {
      skipNextScrollToTimeRef.current = false
      hasAutoScrolled.current = true
      return
    }
    if (!timelineRef.current || hasAutoScrolled.current) return
    const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
    if (!isToday) return
    const scrollPosition = Math.max(0, currentTimePosition - 200)
    const t = setTimeout(() => {
      const el = timelineRef.current
      if (!el) return
      // 타임라인 div가 스크롤 컨테이너이므로 window가 아닌 el 기준으로 스크롤 (월간→주간 전환 시 window가 끝까지 내려가는 현상 방지)
      el.scrollTo({ top: scrollPosition, behavior: 'smooth' })
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
      const MIN_BLOCK_HEIGHT = 72

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
    const visualTop = startPixel + PLAN_CARD_GAP
    const visualHeight = Math.max(44, baseHeight - PLAN_CARD_GAP * 2)
    const isCompactHeight = visualHeight < 72
    const isPast = isSelectedDateToday && endPixel < currentTimePosition
    const isCurrent = isSelectedDateToday && startPixel <= currentTimePosition && currentTimePosition < endPixel
    const isFuture = isSelectedDateToday && startPixel > currentTimePosition
    const progress = isCurrent
      ? ((currentTimePosition - startPixel) / (endPixel - startPixel)) * 100
      : 0
    const isEditingThisTask = editingTodo?.id === task.id

    /** 클릭/탭 시 "움직일 수 있음" 피드백: 살짝 확대(강조) + 회색톤 테두리 글로우 (편집 중이 아닐 때만) */
    const dragReadyGlow = '0 0 28px rgba(140, 140, 150, 0.5), 0 0 14px rgba(180, 180, 190, 0.45)'
    const dragReadyProps = isEditingThisTask
      ? undefined
      : { scale: 1.02, boxShadow: dragReadyGlow }

    const isJustCreated = task.id === lastCreatedTodoId
    const isCompleted = task.status === 'completed'
    const styleOpacity = isEditingThisTask ? 1 : (isFuture ? 0.92 : 1)

    return (
      <motion.div
        {...(isEditingThisTask && { 'data-editing-card': 'true' })}
        key={`${task.clientKey ?? task.id}-${task.startTime}-${task.endTime}`}
        initial={isJustCreated ? { scale: 0.92, opacity: 0 } : false}
        animate={isJustCreated ? { scale: 1, opacity: 1 } : { scale: 1, opacity: 1 }}
        transition={isJustCreated ? { type: 'spring', stiffness: 380, damping: 26 } : { type: 'tween', duration: 0.2 }}
        className={`
          task-card group absolute left-[calc(5rem+0.5rem)] right-[0.5rem] sm:left-[calc(5.5rem+2.5%)] sm:right-[calc(3.5rem+2.5%)] cursor-pointer active:cursor-grabbing overflow-hidden touch-none
          bg-theme-card theme-transition
          ${isEditingThisTask ? 'rounded-neu' : ''}
          ${isCurrent ? 'task-card-active' : ''}
          ${isCompleted && !isCurrent ? 'task-card-completed' : ''}
        `}
        style={{
          top: `${visualTop}px`,
          height: `${visualHeight}px`,
          zIndex: isCurrent ? 10 : isPast ? 1 : 5,
          opacity: styleOpacity,
          transition: 'none',
        }}
        whileTap={dragReadyProps}
        drag={isEditingThisTask ? false : 'y'}
        dragElastic={0}
        dragMomentum={false}
        whileDrag={
          isEditingThisTask
            ? undefined
            : { scale: 1.03, zIndex: 100, cursor: 'grabbing', boxShadow: dragReadyGlow, transition: { duration: 0.15 } }
        }
        onPointerDown={(e) => {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/81e1fb98-9efa-4cc2-bacf-8eaa56d0962b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cf01a6'},body:JSON.stringify({sessionId:'cf01a6',location:'VerticalTimeline.tsx:card-pointerdown',message:'Card pointer down',data:{pointerType:e.pointerType,taskId:task.id,isTouch:e.pointerType==='touch'},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
          // #endregion
        }}
        onDragStart={() => {
          if (isEditingThisTask) return
          // #region agent log
          dragMoveLoggedRef.current = false
          fetch('http://127.0.0.1:7243/ingest/81e1fb98-9efa-4cc2-bacf-8eaa56d0962b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cf01a6'},body:JSON.stringify({sessionId:'cf01a6',location:'VerticalTimeline.tsx:onDragStart',message:'Drag started',data:{taskId:task.id},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          isDraggingRef.current = true
          draggingTaskIdRef.current = task.id
          setCardDragging(true)
        }}
        onDrag={(_, info) => {
          if (isEditingThisTask) return
          // #region agent log
          if (!dragMoveLoggedRef.current) {
            dragMoveLoggedRef.current = true
            fetch('http://127.0.0.1:7243/ingest/81e1fb98-9efa-4cc2-bacf-8eaa56d0962b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cf01a6'},body:JSON.stringify({sessionId:'cf01a6',location:'VerticalTimeline.tsx:onDrag',message:'First drag move',data:{taskId:task.id,offsetY:info.offset.y},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
          }
          // #endregion
          const newStartPixel = Math.max(0, Math.min(timelineHeight - (endPixel - startPixel), startPixel + info.offset.y))
          setDragPreview({
            taskId: task.id,
            startTime: pixelToTime(newStartPixel),
            endTime: pixelToTime(newStartPixel + (endPixel - startPixel)),
          })
        }}
        onDragEnd={(_, info) => {
          if (isEditingThisTask) return
          setCardDragging(false)
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/81e1fb98-9efa-4cc2-bacf-8eaa56d0962b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cf01a6'},body:JSON.stringify({sessionId:'cf01a6',location:'VerticalTimeline.tsx:onDragEnd',message:'Drag ended',data:{taskId:task.id,offsetY:info.offset.y},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
          // #endregion
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
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md flex flex-row flex-wrap items-center justify-center gap-x-2 gap-y-1 z-30 rounded-neu px-3 py-2">
            <span className="text-2xl font-black text-white animate-pulse whitespace-nowrap">{dragPreview.startTime}</span>
            <span className="text-xl text-white/70">~</span>
            <span className="text-2xl font-black text-white animate-pulse whitespace-nowrap">{dragPreview.endTime}</span>
          </div>
        )}
        {/* 진행 중: 카드 전체를 좌→우로 채워지는 진행률 (모바일에서도 PC와 동일하게 좌→우 채움) */}
        {isCurrent && (
          <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-[inherit]" style={{ minHeight: 0 }}>
            <div
              className="absolute left-0 top-0 bottom-0 bg-[var(--primary-point)] transition-[width] duration-1000 ease-out"
              style={{
                width: `${Math.min(100, Math.max(0, progress))}%`,
                opacity: 0.18,
                minWidth: 0,
                transform: 'translateZ(0)',
              }}
            />
          </div>
        )}
        {/* 편집 모드에서 상/하단 테두리를 잡고 리사이즈할 수 있는 영역 (카드 전체 높이에 따라 자동 이동) */}
        {editingTodo?.id === task.id && (
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
                  bg-theme-card theme-transition
                  text-primary-500
                  shadow-neu-float-date
                  hover:shadow-neu-inset-hover
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
        <div className="relative z-10 h-full px-6 py-4 flex flex-col items-center justify-center text-center">
          {/* 완료 체크: 왼쪽 */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              if (!isDraggingRef.current) handleToggleComplete(task)
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center rounded-tool transition-colors touch-target
              text-theme-muted hover:bg-primary-500/15 hover:text-primary-600 dark:hover:text-primary-400
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
            title={isCompleted ? '완료 해제' : '완료로 표시'}
            aria-label={isCompleted ? '완료 해제' : '완료로 표시'}
          >
            {isCompleted ? (
              <CheckSquare className="w-6 h-6 text-primary-600 dark:text-primary-400 fill-primary-500/20 dark:fill-primary-400/20" />
            ) : (
              <Square className="w-6 h-6 stroke-[2] text-[var(--text-muted)]" strokeWidth={2} aria-hidden />
            )}
          </button>
          <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
            {isEditingThisTask && (
              <button
                ref={editButtonRef}
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  performDelete(task)
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className={`w-7 h-7 flex items-center justify-center rounded-tool transition-all cursor-pointer ${isCurrent ? 'bg-red-500/30 hover:bg-red-500/50' : 'bg-red-500/30 hover:bg-red-500/50 group'}`}
                title="삭제"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400 group-hover:text-white" />
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
              className="w-7 h-7 flex items-center justify-center rounded-tool transition-all cursor-pointer neu-float-sm hover:bg-primary-500/15 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
              title={isEditingThisTask ? '편집 모드 해제' : task.title === '새 일정' ? '클릭하여 이름 입력' : '편집'}
            >
              <Edit2 className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-primary-600 dark:group-hover:text-primary-400" />
            </button>
          </div>

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
              className={`min-w-0 w-full sm:w-[25%] mb-2 leading-snug neu-inset-sm rounded-tool px-4 py-1.5 focus:outline-none focus:ring-0 focus-visible:ring-0 theme-transition text-theme placeholder-theme-muted text-center placeholder:text-center ${
                isCompactHeight ? 'text-lg font-semibold' : 'text-xl sm:text-2xl font-bold'
              }`}
              placeholder="제목"
            />
          ) : (
            <>
              <>
                <div className={`w-full flex justify-center ${isCompactHeight ? 'mb-1' : 'mb-2'}`}>
                  <span className={`plan-card-time ${isCompactHeight ? 'text-xs' : ''}`}>
                    <Clock className={isCompactHeight ? 'w-2.5 h-2.5 opacity-80' : 'w-3 h-3 opacity-80'} aria-hidden />
                    {task.startTime} – {task.endTime}
                  </span>
                </div>
                <div
                  className={`${
                    isCompactHeight ? 'text-lg' : 'text-xl sm:text-2xl'
                  } font-bold leading-snug w-full flex items-center justify-center text-center px-1 ${isCompleted ? 'line-through opacity-70' : ''}`}
                  style={{ color: isCompleted ? 'var(--text-muted)' : 'var(--text-main)' }}
                >
                  {task.title}
                </div>
                {!isCompactHeight && task.title === '새 일정' && (
                  <div className="flex flex-col items-center gap-1 mt-1">
                    <span className="text-xs text-theme-muted">연필 아이콘을 눌러 제목을 입력하세요</span>
                  </div>
                )}
              </>
            </>
          )}

          {isCurrent && (
            <div className="text-xs mt-2 w-full flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
              진행 중 <span className="font-semibold" style={{ color: 'var(--text-main)' }}>{Math.round(progress)}%</span>
            </div>
          )}
        </div>
      </motion.div>
    )
  }, [timeToPixels, pixelToTime, isSelectedDateToday, currentTimePosition, timelineHeight, updateTodo, dragPreview, editingTodo, renameInputValue, handleSaveRename, performDelete, handleToggleComplete, lastCreatedTodoId])

  /** 고스트 일정 블록: 반투명 점선 테두리, 위→아래 0.1초 간격 등장 */
  const renderGhostBlock = useCallback((task: Todo, index: number) => {
    if (!task.startTime || !task.endTime) return null
    const startPixel = timeToPixels(task.startTime)
    const endPixel = timeToPixels(task.endTime)
    const baseHeight = endPixel - startPixel
    return (
      <motion.div
        key={task.id}
        className="ghost-block ghost-block-pattern absolute left-[calc(5rem+0.5rem)] right-[0.5rem] sm:left-[calc(5.5rem+2.5%)] sm:right-[calc(3.5rem+2.5%)] pointer-events-none rounded-neu border-[1.5px] border-dashed border-orange-400/80 bg-orange-400/5 theme-transition"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1, duration: 0.2 }}
        style={{
          top: `${startPixel}px`,
          height: `${baseHeight}px`,
          zIndex: 4,
        }}
      >
        <div className="relative z-10 p-4 h-full flex flex-col justify-center">
          <span className="inline-flex items-center w-fit px-2 py-0.5 rounded-tool text-[10px] font-semibold bg-orange-400/20 text-orange-500 border border-orange-400/40 mb-2">짜조 제안</span>
          <div className="text-sm font-medium text-theme">{task.title}</div>
          <div className="text-xs text-theme-muted mt-1">
            {task.startTime} - {task.endTime}
          </div>
        </div>
      </motion.div>
    )
  }, [timeToPixels])

  return (
    <>
    <div ref={timelineRef} className={`timeline-scroll flex-1 min-h-0 theme-transition bg-theme relative pl-5 pr-2 sm:px-4 ${isCardDragging ? 'timeline-scroll-dragging' : ''}`}>
      <AnimatePresence mode="wait">
        {showPastTime && (
          <motion.div
            key="past-expanded-bar"
            className="sticky top-0 left-0 right-0 z-[100] bg-gradient-to-b from-[var(--bg-color)] via-[var(--bg-color)] to-transparent pt-4 pb-4 theme-transition"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
          >
            <div className="mx-3 sm:mx-4 pb-1">
              <button
                type="button"
                onClick={() => setShowPastTime(false)}
                className="btn-action-press touch-target w-full min-h-[44px] bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 px-6 rounded-neu active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer"
              >
                <Clock className="w-5 h-5" />
                <span>이전 기록 접기 (현재 시간으로 돌아가기) ↑</span>
              </button>
            </div>
          </motion.div>
        )}

        {!showPastTime && currentTimePosition > 0 && (() => {
          const pastTodos = todayTodos.filter(task => timeToPixels(task.endTime!) <= currentTimePosition)
          const dayTotalPx = 24 * 100
          const elapsedPercent = Math.min(100, (currentTimePosition / dayTotalPx) * 100)
          const timeRangeLabel = `00:00 ~ ${format(currentTime, 'HH:mm')}`
          const scheduleLabel = pastTodos.length === 0 ? '일정 없음' : `${pastTodos.length}개`
          return (
            <motion.div
              key="past-collapsed-card"
              role="button"
              tabIndex={0}
              onClick={() => setShowPastTime(true)}
              onKeyDown={(e) => e.key === 'Enter' && setShowPastTime(true)}
              className="btn-ghost-tap touch-target mx-3 sm:mx-4 mb-0 rounded-neu cursor-pointer overflow-hidden shadow-neu-float-date hover:shadow-neu-inset-hover active:scale-[0.98] min-h-0 flex flex-col"
              style={{ position: 'relative', zIndex: 100 }}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            >
              {/* 8px 그리드: 패딩 12px(1.5), 간격 8px */}
              <div className="grid grid-cols-[auto_1fr_auto] gap-x-2 gap-y-1.5 items-center px-3 py-2.5">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-500/10 flex items-center justify-center row-span-2 self-center" aria-hidden>
                  <History className="w-4 h-4 text-primary-500" />
                </div>
                <div className="min-w-0 flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-theme tabular-nums">{timeRangeLabel}</span>
                  <span className="text-[11px] text-theme-muted">· 이전 시간대 보기</span>
                </div>
                <span className="text-[10px] font-medium text-theme-muted bg-black/5 dark:bg-white/10 rounded px-1.5 py-0.5 row-span-2 self-center">
                  {scheduleLabel}
                </span>
                <div className="col-start-2 col-end-3 flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-medium text-theme-muted shrink-0">흐른 시간</span>
                  <div className="flex-1 min-w-0 h-1.5 rounded-full overflow-hidden bg-[var(--card-bg)] border border-[var(--border-color)]">
                    <div
                      className="h-full bg-[var(--primary-point)] rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${elapsedPercent}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold tabular-nums text-[var(--primary-point)] shrink-0 w-7 text-right">{elapsedPercent.toFixed(0)}%</span>
                </div>
              </div>
            </motion.div>
          )
        })()}
      </AnimatePresence>

        <motion.div
          ref={timelineContentRef}
          className="relative theme-transition bg-theme"
          style={{ height: `${timelineHeight}px` }}
          initial={false}
          animate={{ marginTop: !showPastTime ? -Math.max(0, currentTimePosition - 100) : 0 }}
          transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
          onDoubleClick={handleDoubleClickEmpty}
          onTouchEnd={handleTouchEndEmpty}
          title="하단 + 버튼으로 일정을 추가할 수 있어요"
        >
        {/* 그리드 레이어: 클릭은 부모(타임라인 컨테이너)로 전달되도록 pointer-events-none */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
          {Array.from({ length: 25 }, (_, i) => {
            if (!showPastTime && i < Math.floor(currentTimePosition / 100)) return null
            const is24 = i === 24
            const topPx = i * 100
            return (
              <div key={i}>
                <div className="absolute left-0 right-0 border-t border-theme" style={{ top: `${topPx}px` }}>
                  <div className="absolute left-4 -top-3 text-xs text-theme-muted bg-theme px-2 theme-transition" style={{ zIndex: 5 }}>
                    {is24 ? '24:00' : `${String(i).padStart(2, '0')}:00`}
                  </div>
                </div>
                {!is24 && (
                  <div className="absolute left-0 right-0 border-t border-dashed border-theme opacity-60" style={{ top: `${topPx + 50}px` }}>
                    <div className="absolute left-4 -top-2 text-[10px] text-theme-muted bg-theme px-1.5 theme-transition" style={{ zIndex: 5 }}>{String(i).padStart(2, '0')}:30</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {(showPastTime ? todayTodos : todayTodos.filter(task => timeToPixels(task.endTime!) > currentTimePosition)).map(renderTaskBlock)}

        {(showPastTime ? ghostPlansForDate : ghostPlansForDate.filter(task => timeToPixels(task.endTime!) > currentTimePosition)).map((g, i) => renderGhostBlock(g, i))}

        <div className="absolute left-0 right-0 z-50 transition-all duration-1000 ease-linear" style={{ top: `${currentTimePosition}px` }}>
          <div className="relative h-0.5 bg-primary-500">
            <div className="absolute -left-2 -top-4 z-10 bg-primary-500 text-white text-[10px] sm:text-xs font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded shadow-sm">{format(currentTime, 'HH:mm:ss')}</div>
            <div className="absolute right-0 -top-1 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-primary-500/90 rounded-full animate-pulse ring-2 ring-[var(--bg-color)]" />
          </div>
        </div>

        {!showPastTime && (
          <div
            className="absolute left-0 right-0 top-0 bg-black/5 pointer-events-none transition-all duration-1000"
            style={{ height: `${currentTimePosition}px`, zIndex: 2 }}
          />
        )}
      </motion.div>
    </div>

    </>
  )
}

