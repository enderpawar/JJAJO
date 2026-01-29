import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useCalendarStore } from '@/stores/calendarStore'
import { updateSchedule } from '@/services/scheduleService'
import { Clock, Edit2 } from 'lucide-react'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import EditTodoPanel from './EditTodoPanel'
import type { Todo } from '../../types/calendar'

interface VerticalTimelineProps {
  onOpenQuickSchedule?: (clickedTime: string, date: string) => void
}

interface DragPreview {
  taskId: string
  startTime: string
  endTime: string
}

/**
 * VerticalTimeline: 24시간 수직 그리드 캔버스
 * - 시간 그리드(00:00~24:00), 현재 시각 선, 일정 블록 표시
 * - 빈 공간 더블클릭 시 빠른 일정 추가
 */
export function VerticalTimeline({ onOpenQuickSchedule }: VerticalTimelineProps = {}) {
  const { todos, updateTodo, selectedDate } = useCalendarStore()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showPastTime, setShowPastTime] = useState(true)
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const isDraggingRef = useRef(false)
  const timelineRef = useRef<HTMLDivElement>(null)
  const hasAutoScrolled = useRef(false)

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
  const TIMELINE_HEIGHT = 2400
  const timelineHeight = TIMELINE_HEIGHT
  const HOUR_HEIGHT = 100

  const currentTimePosition = useMemo(() => {
    const hours = currentTime.getHours()
    const minutes = currentTime.getMinutes()
    return hours * HOUR_HEIGHT + (minutes / 60) * HOUR_HEIGHT
  }, [currentTime])

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
          ${isCurrent ? 'task-card-active border-l-4 border-blue-500 bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-md shadow-[0_0_30px_rgba(59,130,246,0.3)]' : ''}
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
            <div className="absolute inset-x-0 top-0 bg-gradient-to-br from-primary-500 to-primary-600" style={{ height: `${completedHeight}%`, transition: 'height 2s ease-out' }} />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-br from-primary-300 to-primary-400 opacity-50" style={{ height: `${100 - completedHeight}%`, transition: 'height 2s ease-out' }} />
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
          </>
        )}
        {isPast && <div className="absolute inset-0 bg-gray-300" />}
        <div className={`relative z-10 ${isPast ? 'p-2' : 'p-4'}`}>
          {!isPast && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (!isDraggingRef.current) setEditingTodo(task)
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className={`absolute top-2 right-2 z-20 p-2 rounded-lg transition-all cursor-pointer ${isCurrent ? 'bg-white/20 hover:bg-white/30 backdrop-blur-sm' : 'bg-notion-sidebar/80 hover:bg-blue-500 group'}`}
            >
              <Edit2 className={`w-4 h-4 ${isCurrent ? 'text-white' : 'text-gray-600 group-hover:text-white'}`} />
            </button>
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
                  <div className="relative h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                    <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
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
  }, [timeToPixels, pixelToTime, isSelectedDateToday, currentTimePosition, timelineHeight, updateTodo, dragPreview])

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
        onDoubleClick={(e) => {
          if (!onOpenQuickSchedule) return
          const target = e.target as HTMLElement
          if (target.closest('.task-card') || target.closest('.ghost-block')) return
          const rect = e.currentTarget.getBoundingClientRect()
          const clickY = e.clientY - rect.top + (!showPastTime ? currentTimePosition - 100 : 0)
          const clickedTime = pixelToTime(clickY)
          const targetDate = format(selectedDate ?? new Date(), 'yyyy-MM-dd')
          onOpenQuickSchedule(clickedTime, targetDate)
        }}
      >
        {onOpenQuickSchedule && todayTodos.filter(task => timeToPixels(task.startTime!) > currentTimePosition).length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-xl border border-white/10 rounded-2xl px-10 py-8 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
              <div className="text-center space-y-3">
                <div className="text-4xl animate-bounce">⚡</div>
                <div className="text-base font-semibold text-white">빈 공간을 더블클릭하여</div>
                <div className="text-sm text-gray-400">해당 시간에 일정 추가하기</div>
              </div>
            </div>
          </div>
        )}

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

        {(showPastTime ? todayTodos : todayTodos.filter(task => timeToPixels(task.startTime!) > currentTimePosition)).map(renderTaskBlock)}

        <div className="absolute left-0 right-0 z-50 transition-all duration-1000 ease-linear" style={{ top: `${currentTimePosition}px` }}>
          <div className="relative h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]">
            <div className="absolute -left-2 -top-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-[0_0_10px_rgba(239,68,68,0.8)]">{format(currentTime, 'HH:mm:ss')}</div>
            <div className="absolute right-0 -top-1.5 w-4 h-4 bg-red-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
          </div>
        </div>

        <div className="absolute left-0 right-0 top-0 bg-gray-900/10 pointer-events-none transition-all duration-1000" style={{ height: `${currentTimePosition}px`, zIndex: 2 }} />
      </div>

      <EditTodoPanel todo={editingTodo} onClose={() => setEditingTodo(null)} />
    </div>
  )
}

