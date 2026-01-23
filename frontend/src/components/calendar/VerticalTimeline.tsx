import { useMemo, useState, useEffect, useRef } from 'react'
import { useCalendarStore } from '@/stores/calendarStore'
import { Clock, Plus, Edit2 } from 'lucide-react'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import EditTodoPanel from './EditTodoPanel'
import type { Todo } from '../../types/calendar'

/**
 * 🕐 VerticalTimeline: Vertical Gravity Timeline
 * 
 * Concept: "시간은 위에서 아래로 흐르고, 태스크는 그 흐름 속에 떠 있는 블록"
 * - 24시간 수직 그리드 (1시간 = 100px)
 * - 현재 시각 선 (Now Line) - 빨간색 실시간
 * - 과거는 Dimmed, 현재는 Glow, 미래는 반투명
 * - Ghost Block (빈 시간)
 */
export function VerticalTimeline() {
  const { todos, addTodo, updateTodo } = useCalendarStore()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [quickAddSlot, setQuickAddSlot] = useState<{ startTime: string; endTime: string } | null>(null)
  const [quickTitle, setQuickTitle] = useState('')
  const [expandedGaps, setExpandedGaps] = useState<Set<string>>(new Set()) // 펼쳐진 gap 추적
  const [showPastTime, setShowPastTime] = useState(false) // 과거 시간 표시 여부
  const [dragPreview, setDragPreview] = useState<{ taskId: string; startTime: string; endTime: string } | null>(null) // 드래그 프리뷰
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null) // 편집 중인 일정
  const isDraggingRef = useRef(false) // 드래그 중 여부
  
  // 1초마다 현재 시간 업데이트
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])
  
  // 시간을 픽셀로 변환 (Helper Function - 먼저 정의)
  const timeToPixels = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 100 + (minutes / 60) * 100
  }
  
  // 픽셀을 시간으로 변환 (드래그용) - 10분 단위로 스냅
  const pixelToTime = (pixel: number): string => {
    const totalMinutes = (pixel / 100) * 60
    let hours = Math.floor(totalMinutes / 60)
    let minutes = Math.round(totalMinutes % 60)
    
    // 10분 단위로 반올림
    minutes = Math.round(minutes / 10) * 10
    
    // 60분이면 다음 시간으로
    if (minutes === 60) {
      hours += 1
      minutes = 0
    }
    
    // 24시간 넘으면 23:50으로 제한
    if (hours >= 24) {
      hours = 23
      minutes = 50
    }
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }
  
  // 오늘의 일정들
  const todayTodos = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    return todos
      .filter(t => t.date === todayStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [todos])
  
  // 타임라인 높이 계산
  const timelineHeight = 2400 // 항상 24시간
  
  // 현재 시간을 픽셀로 변환 (1시간 = 100px)
  const currentTimePosition = useMemo(() => {
    const hours = currentTime.getHours()
    const minutes = currentTime.getMinutes()
    return hours * 100 + (minutes / 60) * 100
  }, [currentTime])
  
  // 시간을 그리드 행으로 변환
  const timeToGridRow = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours + 1 // Grid는 1부터 시작
  }
  
  // 태스크 블록 생성
  const renderTaskBlock = (task: any) => {
    const startPixel = timeToPixels(task.startTime)
    const endPixel = timeToPixels(task.endTime)
    const baseHeight = endPixel - startPixel
    
    // 상태 판단
    const isPast = endPixel < currentTimePosition
    const isCurrent = startPixel <= currentTimePosition && currentTimePosition < endPixel
    const isFuture = startPixel > currentTimePosition
    
    // 🎯 Dynamic Viewport: 과거는 압축, 현재는 확대
    const dynamicHeight = isPast ? baseHeight * 0.33 : baseHeight
    const scale = isCurrent ? 1.2 : 1
    
    // 진행률 계산 (현재 진행 중인 경우)
    const progress = isCurrent 
      ? ((currentTimePosition - startPixel) / (endPixel - startPixel)) * 100 
      : 0
    
    // 💧 물 차오르는 효과: 빨간 선 위/아래 색상 분리
    const completedHeight = isCurrent 
      ? ((currentTimePosition - startPixel) / (endPixel - startPixel)) * 100 
      : 0
    
    return (
      <motion.div
        key={`${task.id}-${task.startTime}-${task.endTime}`} // ✅ startTime 변경 시 강제 재렌더링
        className={`
          absolute left-0 right-0 mx-4 rounded-xl cursor-grab active:cursor-grabbing
          overflow-hidden
          ${isPast ? 'task-card-past' : ''}
          ${isCurrent ? 'task-card-active' : ''}
          ${isFuture ? 'bg-white border-2 border-gray-300 opacity-70' : ''}
        `}
        style={{
          top: `${startPixel}px`,
          height: `${dynamicHeight}px`,
          zIndex: isCurrent ? 10 : isPast ? 1 : 5,
          transform: `scale(${scale})`,
          opacity: isPast ? 0.5 : isFuture ? 0.7 : 1,
          willChange: 'transform',
          transition: 'none', // 드래그 중 transition 비활성화
        }}
        // 🎯 드래그 기능
        drag="y"
        dragElastic={0}
        dragMomentum={false}
        whileDrag={{ 
          scale: 1.05, 
          zIndex: 100,
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
          cursor: "grabbing"
        }}
        onDragStart={() => {
          isDraggingRef.current = true
        }}
        onDrag={(event, info) => {
          // 드래그 중 실시간 시간 계산
          const newStartPixel = Math.max(0, Math.min(timelineHeight - (endPixel - startPixel), startPixel + info.offset.y))
          const newEndPixel = newStartPixel + (endPixel - startPixel)
          
          const previewStartTime = pixelToTime(newStartPixel)
          const previewEndTime = pixelToTime(newEndPixel)
          
          setDragPreview({
            taskId: task.id,
            startTime: previewStartTime,
            endTime: previewEndTime
          })
        }}
        onDragEnd={(event, info) => {
          // 드래그 프리뷰 제거
          setDragPreview(null)
          
          // 새로운 시작 위치 계산
          let newStartPixel = startPixel + info.offset.y
          const taskDuration = endPixel - startPixel
          
          // 범위 제한: 0 이상, 24시간 이내
          newStartPixel = Math.max(0, Math.min(timelineHeight - taskDuration, newStartPixel))
          const newEndPixel = newStartPixel + taskDuration
          
          // 유효성 검증
          if (newStartPixel < 0 || newEndPixel > timelineHeight) {
            // 드래그 플래그 리셋
            setTimeout(() => { isDraggingRef.current = false }, 100)
            return
          }
          
          // 픽셀을 시간으로 변환
          const newStartTime = pixelToTime(newStartPixel)
          const newEndTime = pixelToTime(newEndPixel)
          
          // 일정 업데이트
          updateTodo(task.id, {
            startTime: newStartTime,
            endTime: newEndTime
          })
          
          // 드래그 플래그 리셋 (약간의 딜레이 후)
          setTimeout(() => { isDraggingRef.current = false }, 100)
        }}
      >
        {/* 🎯 시작 위치 인디케이터 (좌측 화살표) */}
        <div className="absolute -left-6 top-0 z-50 flex items-center">
          <div className="w-5 h-5 bg-primary-500 rounded-full shadow-md flex items-center justify-center">
            <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[8px] border-l-white ml-0.5"></div>
          </div>
          <div className="w-6 h-0.5 bg-primary-500"></div>
        </div>
        
        {/* 📍 드래그 프리뷰 (카드 내부에 크게 표시) */}
        {dragPreview && dragPreview.taskId === task.id && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md flex flex-col items-center justify-center z-30 rounded-xl px-4 py-2">
            {/* 시간 (가로 배치) */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-3xl font-black text-white drop-shadow-2xl animate-pulse">
                {dragPreview.startTime}
              </span>
              <span className="text-2xl font-bold text-white/70 drop-shadow-lg">
                ~
              </span>
              <span className="text-3xl font-black text-white drop-shadow-2xl animate-pulse">
                {dragPreview.endTime}
              </span>
            </div>
            
            {/* 안내 메시지 */}
            <div className="px-3 py-1 bg-primary-500 rounded-full text-white text-xs font-bold shadow-lg">
              📍 10분 단위
            </div>
          </div>
        )}
        
        {/* 💧 물 차오르는 효과 (현재 진행 중) */}
        {isCurrent && (
          <>
            {/* 완료된 부분 (진한 색) */}
            <div 
              className="absolute inset-x-0 top-0 bg-gradient-to-br from-primary-500 to-primary-600"
              style={{ 
                height: `${completedHeight}%`,
                transition: 'height 2s ease-out',
                willChange: 'height'
              }}
            />
            {/* 남은 부분 (연한 색) */}
            <div 
              className="absolute inset-x-0 bottom-0 bg-gradient-to-br from-primary-300 to-primary-400 opacity-50"
              style={{ 
                height: `${100 - completedHeight}%`,
                transition: 'height 2s ease-out',
                willChange: 'height'
              }}
            />
            {/* Glassmorphism 오버레이 */}
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
          </>
        )}
        
        {/* 과거 태스크 - 회색 필터 */}
        {isPast && (
          <div className="absolute inset-0 bg-gray-300" />
        )}
        
        <div className={`relative z-10 ${isPast ? 'p-2' : 'p-4'}`}>
          {/* 🎯 편집 버튼 (항상 표시 - 모바일 친화적) */}
          {!isPast && (
            <button
              onClick={(e) => {
                e.stopPropagation() // 드래그 이벤트 방지
                if (!isDraggingRef.current) {
                  setEditingTodo(task)
                }
              }}
              onPointerDown={(e) => e.stopPropagation()} // 드래그 시작 방지
              className={`absolute top-2 right-2 z-20 p-2 rounded-lg transition-all cursor-pointer
                ${isCurrent 
                  ? 'bg-white/20 hover:bg-white/30 backdrop-blur-sm' 
                  : 'bg-gray-100/80 hover:bg-blue-500 hover:shadow-lg group'
                }`}
            >
              <Edit2 className={`w-4 h-4 transition-colors ${
                isCurrent 
                  ? 'text-white' 
                  : 'text-gray-600 group-hover:text-white'
              }`} />
            </button>
          )}
          
          {/* 과거 태스크 - 압축된 뷰 */}
          {isPast ? (
            <div className="flex items-center gap-2 text-gray-600">
              <div className="text-xs">✓</div>
              <div className="text-xs font-medium truncate">{task.title}</div>
              <div className="text-xs opacity-50 ml-auto">{task.startTime}</div>
            </div>
          ) : (
            <>
              {/* 시간 */}
              <div className={`text-xs font-medium mb-1 ${isCurrent ? 'text-white drop-shadow-lg' : 'text-gray-600'}`}>
                {task.startTime} - {task.endTime}
              </div>
              
              {/* 제목 */}
              <div className={`font-bold mb-1 ${isCurrent ? 'text-white text-xl drop-shadow-lg' : 'text-gray-800'}`}>
                {task.title}
              </div>
              
              {/* 설명 */}
              {task.description && !isPast && (
                <div className={`text-xs ${isCurrent ? 'text-white/90 drop-shadow' : 'text-gray-600'}`}>
                  {task.description}
                </div>
              )}
              
              {/* 진행률 표시 (현재 진행 중) */}
              {isCurrent && (
                <div className="mt-3">
                  <div className="flex justify-between text-sm text-white drop-shadow mb-1">
                    <span className="font-medium">진행 중</span>
                    <span className="font-bold">{Math.round(progress)}%</span>
                  </div>
                  <div className="text-xs text-white/80">
                    💧 {Math.round(completedHeight)}% 완료됨
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    )
  }
  
  // 시간 차이를 분으로 계산
  const getMinutesDiff = (startPixel: number, endPixel: number): number => {
    return ((endPixel - startPixel) / 100) * 60
  }
  
  // 시간 포맷팅 (HH:MM)
  const formatTimeFromPixel = (pixel: number): string => {
    const hours = Math.floor(pixel / 100)
    const minutes = Math.round((pixel % 100) / 100 * 60)
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }
  
  // Ghost Block (빈 시간) 생성 with Accordion Effect
  const renderGhostBlocks = () => {
    // 🚫 Ghost Block 비활성화
    return []
  }
  
  // 빠른 일정 추가 핸들러
  const handleQuickAdd = () => {
    if (!quickAddSlot || !quickTitle.trim()) return
    
    const dateStr = format(new Date(), 'yyyy-MM-dd')
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
    
    // 폼 닫기
    setQuickAddSlot(null)
    setQuickTitle('')
  }
  
  return (
    <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 overflow-y-auto relative">
      {/* 빠른 일정 추가 모달 */}
      {quickAddSlot && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center">
          <motion.div
            className="bg-white rounded-2xl shadow-2xl p-6 w-96"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              ⚡ 빠른 일정 추가
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                시간
              </label>
              <div className="bg-gray-100 px-4 py-2 rounded-lg text-gray-700 font-medium">
                {quickAddSlot.startTime} - {quickAddSlot.endTime}
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                일정 제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleQuickAdd()}
                placeholder="무엇을 하시겠어요?"
                autoFocus
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none transition-colors"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleQuickAdd}
                disabled={!quickTitle.trim()}
                className="flex-1 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-md hover:shadow-lg"
              >
                ✅ 추가하기
              </button>
              <button
                onClick={() => {
                  setQuickAddSlot(null)
                  setQuickTitle('')
                }}
                className="px-6 py-2 bg-white border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors"
              >
                취소
              </button>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* 펼쳐진 상태에서 접기 버튼 (상단 고정) */}
      {showPastTime && (
        <div className="sticky top-0 left-0 right-0 z-[100] bg-gradient-to-b from-white via-white to-transparent pb-4 pt-4">
          <div className="mx-4">
            <button
              onClick={() => {
                setShowPastTime(false)
              }}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-3"
            >
              <Clock className="w-5 h-5" />
              <span>이전 기록 접기 (현재 시간으로 돌아가기) ↑</span>
            </button>
          </div>
        </div>
      )}
      
      {/* 이전 기록 카드 (압축 상태) - 타임라인 외부에 고정 */}
      {!showPastTime && currentTimePosition > 0 && (() => {
        const pastTodos = todayTodos.filter(task => timeToPixels(task.endTime) <= currentTimePosition)
        const pastMinutes = getMinutesDiff(0, currentTimePosition)
        const hours = Math.floor(pastMinutes / 60)
        const minutes = Math.round(pastMinutes % 60)
        const timeLabel = hours > 0 
          ? `${hours}시간 ${minutes > 0 ? minutes + '분' : ''}`
          : `${minutes}분`
        
        const handleClick = () => {
          setShowPastTime(true)
        }
        
        return (
          <motion.div
            key="past-summary-card-fixed"
            className="mx-4 mb-4 rounded-xl cursor-pointer overflow-hidden border-2 border-dashed border-primary-400 bg-gradient-to-r from-primary-50 to-orange-50 hover:from-primary-100 hover:to-orange-100"
            style={{
              height: `100px`,
              zIndex: 100, // z-index 증가
              position: 'relative', // position 명시
            }}
            onClick={handleClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="h-full flex items-center justify-center pointer-events-none">
              <div className="bg-white border-2 border-primary-400 px-6 py-3 rounded-full shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-primary-500">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-primary-600 animate-pulse" />
                  <div className="text-left">
                    <div className="text-sm font-bold text-gray-800">
                      📜 이전 기록: {timeLabel} ({pastTodos.length}개 일정)
                    </div>
                    <div className="text-xs text-primary-600 font-medium">
                      00:00 ~ {format(currentTime, 'HH:mm')} · 👆 클릭하여 펼치기 ↓
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )
      })()}
      
      {/* 타임라인 컨테이너 */}
      <div 
        className="relative transition-all duration-500" 
        style={{ 
          height: `${timelineHeight}px`,
          marginTop: !showPastTime ? `-${currentTimePosition - 100}px` : '0px', // 과거를 위로 밀어올림
        }}
      > {/* 동적 높이 + 동적 마진 */}
        
        {/* 배경 그리드 (시간 가이드라인) */}
        <div className="absolute inset-0" style={{ zIndex: 1 }}>
          {Array.from({ length: 24 }, (_, i) => {
            // 압축 상태에서는 현재 시각 이전의 그리드 숨김
            if (!showPastTime && i < Math.floor(currentTimePosition / 100)) {
              return null
            }
            
            return (
              <div key={i}>
                {/* 정시 눈금 (진한 선) */}
                <div
                  className="absolute left-0 right-0 border-t border-gray-200"
                  style={{ top: `${i * 100}px` }}
                >
                  <div className="absolute left-4 -top-3 text-xs font-medium text-gray-400 bg-gray-50 px-2" style={{ zIndex: 5 }}>
                    {String(i).padStart(2, '0')}:00
                  </div>
                </div>
                
                {/* 30분 보조 눈금 (연한 점선) */}
                {i < 23 && (
                  <div
                    className="absolute left-0 right-0 border-t border-dashed border-gray-100"
                    style={{ top: `${i * 100 + 50}px` }}
                  >
                    <div className="absolute left-4 -top-2 text-[10px] text-gray-300 bg-gray-50 px-1.5" style={{ zIndex: 5 }}>
                      {String(i).padStart(2, '0')}:30
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        
        {/* Ghost Blocks (빈 시간) */}
        {renderGhostBlocks()}
        
        {/* Task Blocks - 압축 상태에서는 미래 일정만 표시 */}
        {(showPastTime 
          ? todayTodos 
          : todayTodos.filter(task => timeToPixels(task.startTime) > currentTimePosition)
        ).map(renderTaskBlock)}
        
        {/* Now Line (현재 시각 선) */}
        <div
          className="absolute left-0 right-0 z-50 transition-all duration-1000 ease-linear"
          style={{ top: `${currentTimePosition}px` }}
        >
          {/* 빨간색 선 */}
          <div className="relative h-0.5 bg-red-500 shadow-lg">
            {/* 좌측 시간 표시 */}
            <div className="absolute -left-2 -top-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-lg">
              {format(currentTime, 'HH:mm:ss')}
            </div>
            
            {/* 우측 점 (ping 제거) */}
            <div className="absolute right-0 -top-1.5 w-4 h-4 bg-red-500 rounded-full" />
          </div>
        </div>
        
        {/* 과거 시간 Dimmed 오버레이 */}
        <div
          className="absolute left-0 right-0 top-0 bg-gray-900/10 pointer-events-none transition-all duration-1000"
          style={{ height: `${currentTimePosition}px`, zIndex: 2 }}
        />
      </div>

      {/* 편집 패널 */}
      <EditTodoPanel
        todo={editingTodo}
        onClose={() => setEditingTodo(null)}
      />
    </div>
  )
}
