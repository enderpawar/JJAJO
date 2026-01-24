import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useCalendarStore } from '@/stores/calendarStore'
import { Edit2, ChevronUp, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
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
 * 🕐 VerticalTimeline: Vertical Gravity Timeline (Refactored & Improved)
 * 
 * ✅ 수정 사항:
 * - selectedDate 버그 수정 (new Date() → selectedDate)
 * - 타입 안정성 강화 (any 제거)
 * - 성능 최적화 (useCallback, useMemo)
 * - UX 개선 (자연스러운 스크롤, 과거/미래 토글)
 * - 접근성 개선 (키보드 지원, ARIA 속성)
 * - 코드 구조 개선 (불필요한 로직 제거)
 */
export function VerticalTimeline({ onOpenQuickSchedule }: VerticalTimelineProps = {}) {
  const { todos, addTodo, updateTodo, selectedDate } = useCalendarStore()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [quickAddSlot, setQuickAddSlot] = useState<{ startTime: string; endTime: string } | null>(null)
  const [quickTitle, setQuickTitle] = useState('')
  const [showPastTime, setShowPastTime] = useState(true)
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const isDraggingRef = useRef(false)
  const timelineRef = useRef<HTMLDivElement>(null)
  const hasAutoScrolled = useRef(false)
  
  // 상수
  const TIMELINE_HEIGHT = 2400 // 24시간 * 100px
  const HOUR_HEIGHT = 100
  
  // 1초마다 현재 시간 업데이트
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])
  
  // 시간을 픽셀로 변환
  const timeToPixels = useCallback((timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * HOUR_HEIGHT + (minutes / 60) * HOUR_HEIGHT
  }, [])
  
  // 픽셀을 시간으로 변환 (10분 단위 스냅)
  const pixelToTime = useCallback((pixel: number): string => {
    const totalMinutes = (pixel / HOUR_HEIGHT) * 60
    let hours = Math.floor(totalMinutes / 60)
    let minutes = Math.round((totalMinutes % 60) / 10) * 10
    
    if (minutes === 60) {
      hours += 1
      minutes = 0
    }
    
    if (hours >= 24) {
      hours = 23
      minutes = 50
    }
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }, [])
  
  // 선택된 날짜의 일정들 (✅ 버그 수정)
  const selectedDateTodos = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    return todos
      .filter(t => t.date === dateStr && t.startTime && t.endTime)
      .sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'))
  }, [todos, selectedDate])
  
  // 현재 시간 픽셀 위치
  const currentTimePosition = useMemo(() => {
    const hours = currentTime.getHours()
    const minutes = currentTime.getMinutes()
    return hours * HOUR_HEIGHT + (minutes / 60) * HOUR_HEIGHT
  }, [currentTime])
  
  // 선택된 날짜가 오늘인지
  const isSelectedDateToday = useMemo(() => {
    return format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  }, [selectedDate])
  
  // 자동 스크롤 (오늘 날짜일 때만, 한 번만)
  useEffect(() => {
    if (!timelineRef.current || hasAutoScrolled.current || !isSelectedDateToday) return
    
    const scrollToCurrentTime = () => {
      if (!timelineRef.current) return
      
      // 현재 시간 - 2시간 위치로 스크롤
      const scrollPosition = Math.max(0, currentTimePosition - 200)
      timelineRef.current.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      })
      hasAutoScrolled.current = true
    }
    
    setTimeout(scrollToCurrentTime, 300)
  }, [isSelectedDateToday, currentTimePosition])
  
  // 날짜 변경 시 자동 스크롤 플래그 리셋
  useEffect(() => {
    hasAutoScrolled.current = false
  }, [selectedDate])
  
  // 태스크 블록 렌더링 (✅ 타입 안정성 강화)
  const renderTaskBlock = useCallback((task: Todo) => {
    if (!task.startTime || !task.endTime) return null
    
    const startPixel = timeToPixels(task.startTime)
    const endPixel = timeToPixels(task.endTime)
    const height = endPixel - startPixel
    
    // 상태 판단
    const isPast = isSelectedDateToday && endPixel < currentTimePosition
    const isCurrent = isSelectedDateToday && startPixel <= currentTimePosition && currentTimePosition < endPixel
    const isFuture = isSelectedDateToday && startPixel > currentTimePosition
    const isOtherDay = !isSelectedDateToday
    
    // 진행률
    const progress = isCurrent 
      ? Math.max(0, Math.min(100, ((currentTimePosition - startPixel) / height) * 100))
      : 0
    
    // 과거 숨기기 시 위치 오프셋
    const positionOffset = !showPastTime && isSelectedDateToday 
      ? Math.max(0, currentTimePosition - HOUR_HEIGHT)
      : 0
    
    // 드래그 중인지 확인
    const isDragging = dragPreview?.taskId === task.id

    return (
      <motion.div
        key={`${task.id}-${task.startTime}-${task.endTime}`}
        className={`
          task-card group absolute left-0 right-0 mx-4 rounded-lg
          overflow-hidden relative cursor-grab active:cursor-grabbing
          ${isDragging ? 'opacity-40' : ''}
          ${isPast ? 'opacity-50 bg-[#1a1a1a]/70 border border-white/5' : ''}
          ${isCurrent ? 'border-l-4 border-blue-500 bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-md shadow-[0_0_30px_rgba(59,130,246,0.3)] z-10' : ''}
          ${isFuture || isOtherDay ? 'bg-[#252525]/90 backdrop-blur-md border border-white/10 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] hover:border-white/30 hover:bg-[#2a2a2a]/90' : ''}
        `}
        style={{
          top: `${startPixel - positionOffset}px`,
          height: `${height}px`,
        }}
        drag="y"
        dragConstraints={{ top: -startPixel + positionOffset, bottom: TIMELINE_HEIGHT - startPixel - height + positionOffset }}
        dragElastic={0}
        dragMomentum={false}
        dragTransition={{ bounceStiffness: 300, bounceDamping: 30 }}
        whileDrag={{ 
          scale: 1.03,
          zIndex: 100,
          boxShadow: '0 0 40px rgba(59, 130, 246, 0.6), 0 10px 30px rgba(0, 0, 0, 0.5)',
          cursor: 'grabbing'
        }}
        onDragStart={() => { isDraggingRef.current = true }}
        onDrag={(_event, info) => {
          const newStartPixel = Math.max(0, Math.min(TIMELINE_HEIGHT - height, startPixel + info.offset.y))
          setDragPreview({
            taskId: task.id,
            startTime: pixelToTime(newStartPixel),
            endTime: pixelToTime(newStartPixel + height)
          })
        }}
        onDragEnd={(_event, info) => {
          setDragPreview(null)
          const newStartPixel = Math.max(0, Math.min(TIMELINE_HEIGHT - height, startPixel + info.offset.y))
          
          if (newStartPixel >= 0 && newStartPixel + height <= TIMELINE_HEIGHT) {
            updateTodo(task.id, {
              startTime: pixelToTime(newStartPixel),
              endTime: pixelToTime(newStartPixel + height)
            })
          }
          
          setTimeout(() => { isDraggingRef.current = false }, 100)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setEditingTodo(task)
          }
        }}
        aria-label={`${task.title}, ${task.startTime}부터 ${task.endTime}까지`}
        role="button"
        tabIndex={0}
      >
        {/* 드래그 프리뷰 */}
        <AnimatePresence>
          {isDragging && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-30 rounded-lg border-2 border-blue-500/50"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl font-black text-white drop-shadow-[0_2px_10px_rgba(59,130,246,0.5)]">
                  {dragPreview!.startTime}
                </span>
                <span className="text-2xl text-white/70 font-bold">~</span>
                <span className="text-3xl font-black text-white drop-shadow-[0_2px_10px_rgba(59,130,246,0.5)]">
                  {dragPreview!.endTime}
                </span>
              </div>
              <div className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full text-white text-sm font-bold shadow-lg">
                10분 단위로 조정
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* 현재 진행 중 시각화 */}
        {isCurrent && (
          <div 
            className="absolute inset-x-0 top-0 bg-gradient-to-br from-blue-500/30 to-purple-500/30"
            style={{ height: `${progress}%`, transition: 'height 1s ease-out' }}
          />
        )}
        
        <div className="relative z-10 p-4">
          {/* 편집 버튼 */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (!isDraggingRef.current) setEditingTodo(task)
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className={`absolute top-2 right-2 z-20 p-2 rounded-lg transition-all
              ${isCurrent ? 'bg-white/20 hover:bg-white/30' : 'bg-[#202020]/80 hover:bg-blue-500 group'}`}
            aria-label="일정 편집"
          >
            <Edit2 className={`w-4 h-4 transition-colors ${
              isCurrent ? 'text-white' : 'text-gray-400 group-hover:text-white'
            }`} />
          </button>
          
          {/* 과거 일정 */}
          {isPast ? (
            <div className="flex items-center gap-2 text-gray-500">
              <div className="text-xs">✓</div>
              <div className="text-sm font-medium truncate">{task.title}</div>
              <div className="text-xs ml-auto">{task.startTime}</div>
            </div>
          ) : (
            <>
              {/* 드래그 핸들 */}
              <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-50 transition-opacity" aria-hidden="true">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="w-1 h-1 bg-white rounded-full" />
                ))}
              </div>

              {/* 시간 */}
              <div className={`text-sm font-medium mb-2 ${isCurrent ? 'text-white' : 'text-gray-400'}`}>
                {task.startTime} ~ {task.endTime}
              </div>
              
              {/* 제목 */}
              <div className={`font-semibold mb-2 leading-tight ${isCurrent ? 'text-white text-xl' : 'text-white text-lg'}`}>
                {task.title}
              </div>
              
              {/* 설명 */}
              {task.description && (
                <div className={`text-sm mb-2 line-clamp-2 ${isCurrent ? 'text-white/90' : 'text-gray-400'}`}>
                  {task.description}
                </div>
              )}
              
              {/* 진행률 */}
              {isCurrent && (
                <div className="mt-3">
                  <div className="relative h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                    <motion.div 
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">진행 중</span>
                    <span className="text-white font-bold">{Math.round(progress)}%</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    )
  }, [timeToPixels, pixelToTime, currentTimePosition, isSelectedDateToday, dragPreview, updateTodo, TIMELINE_HEIGHT, showPastTime])
  
  // 빠른 일정 추가
  const handleQuickAdd = useCallback(() => {
    if (!quickAddSlot || !quickTitle.trim()) return
    
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const now = new Date().toISOString()
    
    addTodo({
      id: `quick-${Date.now()}`,
      title: quickTitle,
      date: dateStr,
      startTime: quickAddSlot.startTime,
      endTime: quickAddSlot.endTime,
      status: 'pending',
      priority: 'medium',
      createdBy: 'user',
      createdAt: now,
      updatedAt: now,
    })
    
    setQuickAddSlot(null)
    setQuickTitle('')
  }, [quickAddSlot, quickTitle, selectedDate, addTodo])
  
  return (
    <div className="flex-1 bg-[#191919] overflow-y-auto relative" ref={timelineRef}>
      {/* 빠른 일정 추가 모달 */}
      <AnimatePresence>
        {quickAddSlot && (
          <motion.div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setQuickAddSlot(null)
              setQuickTitle('')
            }}
          >
            <motion.div
              className="bg-[#202020] rounded-xl p-6 w-96 max-w-[90vw]"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-white mb-4">
                빠른 일정 추가
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  시간
                </label>
                <div className="bg-[#191919] px-4 py-2 rounded-lg text-white font-medium">
                  {quickAddSlot.startTime} ~ {quickAddSlot.endTime}
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  일정 제목 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleQuickAdd()
                    if (e.key === 'Escape') {
                      setQuickAddSlot(null)
                      setQuickTitle('')
                    }
                  }}
                  placeholder="무엇을 하시겠어요?"
                  autoFocus
                  className="w-full px-4 py-2 bg-[#191919] border-2 border-[#373737] rounded-lg focus:border-blue-500 focus:outline-none transition-colors text-white"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleQuickAdd}
                  disabled={!quickTitle.trim()}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-[#252525] disabled:text-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-bold transition-colors"
                >
                  추가
                </button>
                <button
                  onClick={() => {
                    setQuickAddSlot(null)
                    setQuickTitle('')
                  }}
                  className="px-6 py-2 bg-[#252525] hover:bg-[#2a2a2a] text-white rounded-lg font-medium transition-colors"
                >
                  취소
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 과거/미래 토글 */}
      {isSelectedDateToday && (
        <div className="sticky top-0 left-0 right-0 z-50 bg-gradient-to-b from-[#191919] via-[#191919] to-transparent pb-3 pt-3">
          <div className="mx-4">
            <button
              onClick={() => setShowPastTime(!showPastTime)}
              className="w-full bg-[#252525] hover:bg-[#2a2a2a] border border-white/10 hover:border-white/20 text-white font-medium py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {showPastTime ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  <span>과거 숨기기</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  <span>과거 보기</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
      
      {/* 타임라인 */}
      <div 
        className="relative bg-[#191919] transition-all duration-300" 
        style={{ 
          height: !showPastTime && isSelectedDateToday 
            ? `${TIMELINE_HEIGHT - Math.max(0, currentTimePosition - HOUR_HEIGHT)}px`
            : `${TIMELINE_HEIGHT}px`,
          minHeight: !showPastTime && isSelectedDateToday
            ? `${TIMELINE_HEIGHT - Math.max(0, currentTimePosition - HOUR_HEIGHT)}px`
            : `${TIMELINE_HEIGHT}px`,
          paddingTop: !showPastTime && isSelectedDateToday
            ? '0px'
            : '0px',
        }}
        onDoubleClick={(e) => {
          if (!onOpenQuickSchedule) return
          
          const target = e.target as HTMLElement
          if (target.closest('.task-card')) return
          
          const rect = e.currentTarget.getBoundingClientRect()
          const clickY = e.clientY - rect.top + (timelineRef.current?.scrollTop || 0)
          // 과거 숨기기 상태일 때는 오프셋 추가
          const offset = !showPastTime && isSelectedDateToday 
            ? Math.max(0, currentTimePosition - HOUR_HEIGHT)
            : 0
          const clickedTime = pixelToTime(clickY + offset)
          const targetDate = format(selectedDate, 'yyyy-MM-dd')
          
          onOpenQuickSchedule(clickedTime, targetDate)
        }}
      >
        {/* 빈 공간 힌트 */}
        {onOpenQuickSchedule && selectedDateTodos.length === 0 && (
          <motion.div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-sm border border-white/10 rounded-xl px-8 py-6">
              <div className="text-center space-y-2">
                <div className="text-sm font-medium text-white">빈 공간을 더블클릭하여 일정 추가</div>
                <div className="flex items-center justify-center gap-1.5">
                  {[0, 0.15, 0.3].map((delay, i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* 배경 그리드 */}
        <div className="absolute inset-0 z-0">
          {Array.from({ length: 24 }, (_, hour) => {
            // 과거 숨기기: 현재 시간보다 1시간 이전의 그리드는 숨김
            if (!showPastTime && isSelectedDateToday && (hour + 1) * HOUR_HEIGHT < currentTimePosition) {
              return null
            }
            
            // 오프셋 계산 (과거 숨기기 시 위치 조정)
            const offset = !showPastTime && isSelectedDateToday 
              ? Math.max(0, currentTimePosition - HOUR_HEIGHT)
              : 0
            
            return (
              <div key={hour}>
                <div
                  className="absolute left-0 right-0 border-t border-[#373737]"
                  style={{ top: `${hour * HOUR_HEIGHT - offset}px` }}
                >
                  <div className="absolute left-4 -top-3 text-xs text-white/40 bg-[#191919] px-2">
                    {String(hour).padStart(2, '0')}:00
                  </div>
                </div>
                
                {hour < 23 && (
                  <div
                    className="absolute left-0 right-0 border-t border-dashed border-[#373737]/40"
                    style={{ top: `${hour * HOUR_HEIGHT + 50 - offset}px` }}
                  />
                )}
              </div>
            )
          })}
        </div>
        
        {/* 일정 블록 */}
        {selectedDateTodos
          .filter(task => {
            // 오늘이 아닌 날짜는 모두 표시
            if (!isSelectedDateToday) return true
            
            // 과거 보기가 켜져있으면 모두 표시
            if (showPastTime) return true
            
            // 과거 숨기기: 종료 시간이 현재 시간보다 이전인 일정은 숨김
            if (task.endTime) {
              return timeToPixels(task.endTime) >= currentTimePosition
            }
            
            return true
          })
          .map(renderTaskBlock)}
        
        {/* 현재 시간 선 */}
        {isSelectedDateToday && (
          <motion.div
            className="absolute left-0 right-0 z-20"
            style={{ 
              top: `${currentTimePosition - (!showPastTime && isSelectedDateToday 
                ? Math.max(0, currentTimePosition - HOUR_HEIGHT)
                : 0)}px` 
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="relative h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]">
              <div className="absolute left-4 -top-4 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">
                {format(currentTime, 'HH:mm')}
              </div>
              <motion.div 
                className="absolute right-0 -top-1.5 w-3 h-3 bg-red-500 rounded-full"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* 편집 패널 */}
      <EditTodoPanel
        todo={editingTodo}
        onClose={() => setEditingTodo(null)}
      />
    </div>
  )
}
