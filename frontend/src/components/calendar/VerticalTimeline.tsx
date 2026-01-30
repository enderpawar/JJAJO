import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useCalendarStore } from '@/stores/calendarStore'
import { updateSchedule, deleteSchedule, createSchedule } from '@/services/scheduleService'
import { Clock, Edit2, Pencil, Trash2 } from 'lucide-react'
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

/** 분 → HH:mm */
function minutesToTimeStr(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = Math.round(totalMinutes % 60)
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
  const [renamingTodoId, setRenamingTodoId] = useState<string | null>(null)
  const [renameInputValue, setRenameInputValue] = useState('')
  const [isSavingRename, setIsSavingRename] = useState(false)
  const actionMenuRef = useRef<HTMLDivElement | null>(null)
  const renameInputRef = useRef<HTMLInputElement | null>(null)
  const isDraggingRef = useRef(false)
  const timelineRef = useRef<HTMLDivElement>(null)
  const hasAutoScrolled = useRef(false)

  useEffect(() => {
    if (!editingTodo) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (actionMenuRef.current && !actionMenuRef.current.contains(target)) {
        setEditingTodo(null)
        setRenamingTodoId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [editingTodo])

  useEffect(() => {
    if (renamingTodoId) {
      setRenameInputValue(editingTodo?.title ?? '')
      requestAnimationFrame(() => renameInputRef.current?.focus())
    }
  }, [renamingTodoId, editingTodo?.title])

  const handleSaveRename = useCallback(async (task: Todo) => {
    const title = renameInputValue.trim()
    if (!title) return
    setIsSavingRename(true)
    try {
      const updated = await updateSchedule(task.id, { title })
      updateTodo(task.id, {
        ...updated,
        updatedAt: updated.updatedAt ?? new Date().toISOString(),
      })
      setRenamingTodoId(null)
      setEditingTodo(null)
    } catch (e) {
      console.error('이름 변경 실패:', e)
      alert(`이름 변경 실패: ${e instanceof Error ? e.message : '알 수 없음'}`)
    } finally {
      setIsSavingRename(false)
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
    if (hours >= 24) { hours = 23; minutes = 50 }
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
          deleteTodo(tempId)
          addTodo(created)
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

  const renderTaskBlock = useCallback((task: Todo) => {
    if (!task.startTime || !task.endTime) return null
    const startPixel = timeToPixels(task.startTime)
    const endPixel = timeToPixels(task.endTime)
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

    return (
      <motion.div
        key={`${task.id}-${task.startTime}-${task.endTime}`}
        className={`
          task-card group absolute left-0 right-0 mx-4 rounded-lg cursor-pointer active:cursor-grabbing overflow-hidden
          ${isPast ? 'task-card-past' : ''}
          ${isCurrent ? 'task-card-active backdrop-blur-md' : ''}
          ${isFuture || (!isCurrent && !isPast) ? 'bg-[#252525]/90 backdrop-blur-md border border-white/10 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] hover:border-white/30 hover:bg-[#2a2a2a]/90 transition-all duration-300 ease-out' : ''}
        `}
        style={{
          top: `${startPixel}px`,
          height: `${baseHeight}px`,
          zIndex: isCurrent ? 10 : isPast ? 1 : 5,
          transform: `scale(${scale})`,
          opacity: isPast ? 0.5 : isFuture ? 0.7 : 1,
          willChange: 'transform',
          transition: 'none',
        }}
        drag="y"
        dragElastic={0}
        dragMomentum={false}
        whileDrag={{ scale: 1.05, zIndex: 100, cursor: 'grabbing' }}
        onDragStart={() => { isDraggingRef.current = true }}
        onDrag={(_, info) => {
          const newStartPixel = Math.max(0, Math.min(timelineHeight - (endPixel - startPixel), startPixel + info.offset.y))
          setDragPreview({
            taskId: task.id,
            startTime: pixelToTime(newStartPixel),
            endTime: pixelToTime(newStartPixel + (endPixel - startPixel)),
          })
        }}
        onDragEnd={(_, info) => {
          setDragPreview(null)
          let newStartPixel = Math.max(0, Math.min(timelineHeight - (endPixel - startPixel), startPixel + info.offset.y))
          const newEndPixel = newStartPixel + (endPixel - startPixel)
          if (newStartPixel < 0 || newEndPixel > timelineHeight) {
            setTimeout(() => { isDraggingRef.current = false }, 100)
            return
          }
          const newStart = pixelToTime(newStartPixel)
          const newEnd = pixelToTime(newEndPixel)
          updateTodo(task.id, { startTime: newStart, endTime: newEnd })
          updateSchedule(task.id, { startTime: newStart, endTime: newEnd }).catch(() => {})
          setTimeout(() => { isDraggingRef.current = false }, 100)
        }}
      >
        {dragPreview && dragPreview.taskId === task.id && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md flex flex-col items-center justify-center z-30 rounded-xl px-4 py-2">
            <span className="text-3xl font-black text-white animate-pulse">{dragPreview.startTime}</span>
            <span className="text-2xl text-white/70">~</span>
            <span className="text-3xl font-black text-white animate-pulse">{dragPreview.endTime}</span>
            <div className="px-3 py-1 bg-primary-500 rounded-full text-white text-xs font-bold mt-2">📍 10분 단위</div>
          </div>
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
            <div
              ref={editingTodo?.id === task.id ? actionMenuRef : undefined}
              className="absolute top-2 right-2 z-20"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  if (!isDraggingRef.current) {
                    setEditingTodo(prev => (prev?.id === task.id ? null : task))
                  }
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className={`p-2 rounded-lg transition-all cursor-pointer ${isCurrent ? 'bg-white/20 hover:bg-white/30 backdrop-blur-sm' : 'bg-notion-sidebar/80 hover:bg-blue-500 group'}`}
              >
                <Edit2 className={`w-4 h-4 ${isCurrent ? 'text-white' : 'text-gray-600 group-hover:text-white'}`} />
              </button>
              {editingTodo?.id === task.id && (
                <div
                  className="absolute top-full right-0 mt-1 min-w-[180px] rounded-lg border border-white/10 bg-[#252525] shadow-xl py-1 z-30"
                  onClick={(e) => e.stopPropagation()}
                >
                  {renamingTodoId === task.id ? (
                    <div className="px-3 py-2 space-y-2">
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={renameInputValue}
                        onChange={(e) => setRenameInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(task)
                          if (e.key === 'Escape') setRenamingTodoId(null)
                        }}
                        className="w-full px-2 py-1.5 text-sm text-white bg-white/10 border border-white/20 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                        placeholder="제목"
                      />
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={isSavingRename || !renameInputValue.trim()}
                          onClick={() => handleSaveRename(task)}
                          className="flex-1 py-1.5 text-xs font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50 rounded transition-colors"
                        >
                          {isSavingRename ? '저장 중…' : '저장'}
                        </button>
                        <button
                          type="button"
                          disabled={isSavingRename}
                          onClick={() => setRenamingTodoId(null)}
                          className="flex-1 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/10 rounded transition-colors"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setRenamingTodoId(task.id)
                          setRenameInputValue(task.title)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-white hover:bg-white/10 transition-colors"
                      >
                        <Pencil className="w-4 h-4 text-gray-400" />
                        이름 변경
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(task)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-white hover:bg-white/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-gray-400" />
                        삭제
                      </button>
                    </>
                  )}
                </div>
              )}
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
              <div className={`text-lg font-semibold mb-2 leading-tight ${isCurrent ? 'text-white text-2xl drop-shadow-lg' : 'text-white'}`}>{task.title}</div>
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
  }, [timeToPixels, pixelToTime, isSelectedDateToday, currentTimePosition, timelineHeight, updateTodo, dragPreview, editingTodo, renamingTodoId, renameInputValue, isSavingRename, handleSaveRename, handleDelete])

  const getMinutesDiff = (startPixel: number, endPixel: number) => ((endPixel - startPixel) / 100) * 60

  return (
    <div ref={timelineRef} className="flex-1 bg-[#191919] overflow-y-auto relative">
      {showPastTime && (
        <div className="sticky top-0 left-0 right-0 z-[100] bg-gradient-to-b from-notion-sidebar via-notion-sidebar to-transparent pb-4 pt-4">
          <div className="mx-4">
            <button
              type="button"
              onClick={() => setShowPastTime(false)}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-3 cursor-pointer"
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
            className="mx-4 mb-4 rounded-xl cursor-pointer overflow-hidden border border-white/10 bg-[#252525]/60 backdrop-blur-xl hover:bg-[#2a2a2a]/70 hover:border-white/20 h-[100px] flex items-center justify-center"
            style={{ position: 'relative', zIndex: 100 }}
          >
            <Clock className="w-5 h-5 text-primary-600 animate-pulse" />
            <div className="text-left ml-3">
              <div className="text-sm font-bold text-notion-text">📜 이전 기록: {timeLabel} ({pastTodos.length}개 일정)</div>
              <div className="text-xs text-primary-600 font-medium">00:00 ~ {format(currentTime, 'HH:mm')} · 👆 클릭하여 펼치기</div>
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
      >
        {/* 그리드 레이어: 클릭은 부모(타임라인 컨테이너)로 전달되도록 pointer-events-none */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
          {Array.from({ length: 24 }, (_, i) => {
            if (!showPastTime && i < Math.floor(currentTimePosition / 100)) return null
            return (
              <div key={i}>
                <div className="absolute left-0 right-0 border-t border-[#373737]" style={{ top: `${i * 100}px` }}>
                  <div className="absolute left-4 -top-3 text-xs text-white/40 bg-[#191919] px-2" style={{ zIndex: 5 }}>{String(i).padStart(2, '0')}:00</div>
                </div>
                {i < 23 && (
                  <div className="absolute left-0 right-0 border-t border-dashed border-[#373737]/50" style={{ top: `${i * 100 + 50}px` }}>
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
      {/* 일정 액션: 이름 변경/삭제는 카드 드롭다운 메뉴로만 사용. EditTodoPanel 모달 사용 안 함 */}
    </div>
  )
}

