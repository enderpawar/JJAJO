import { useMemo, useState, useEffect, useCallback } from 'react'
import { Clock, Edit2, Trash2 } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
import { formatDate } from '@/utils/dateUtils'
import { cn } from '@/utils/cn'
import type { Todo } from '@/types/calendar'

interface TimelineViewProps {
  showPastTime?: boolean
}

// 타임라인 설정 상수 (컴포넌트 외부로 이동)
const HOUR_HEIGHT = 80 // 1시간당 픽셀 높이
const TIMELINE_HEIGHT = 24 * HOUR_HEIGHT // 24시간 전체 높이
const START_HOUR = 0
const END_HOUR = 24

export default function TimelineView({ showPastTime = true }: TimelineViewProps) {
  const { selectedDate, getTodosByDate, deleteTodo } = useCalendarStore()
  const dateStr = formatDate(selectedDate)
  const todos = getTodosByDate(dateStr)
  
  // 현재 시간 상태 (분 단위 변화만 감지)
  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes())
  })
  
  // 분 단위로만 업데이트 (초 단위 변화 무시)
  useEffect(() => {
    const updateCurrentTime = () => {
      const now = new Date()
      const minuteTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes())
      setCurrentTime(minuteTime)
    }
    
    // 매 분마다 업데이트
    const interval = setInterval(updateCurrentTime, 60000)
    return () => clearInterval(interval)
  }, [])
  
  /**
   * 중앙 집중식 오프셋 관리 (positionOffset)
   * showPastTime 옵션에 따라 모든 요소(그리드, 카드, 현재 시간 선)가 
   * 동일한 기준점을 바탕으로 이동하도록 강제
   */
  const positionOffset = useMemo(() => {
    if (!showPastTime) {
      const currentHour = currentTime.getHours()
      const currentMinute = currentTime.getMinutes()
      const minutesFromDayStart = currentHour * 60 + currentMinute
      // 현재 시간을 정각으로 내림하여 위치 계산
      const roundedMinutes = Math.floor(minutesFromDayStart / 60) * 60
      return -(roundedMinutes / 60) * HOUR_HEIGHT
    }
    return 0
  }, [showPastTime, currentTime])
  
  /**
   * 좌표 계산 공식 정규화
   * 시간을 Y축 픽셀 위치로 변환하는 통일된 공식
   * 
   * @param timeStr - HH:mm 형식의 시간 문자열
   * @returns 픽셀 단위 Y 좌표
   */
  const getYPosition = useCallback((timeStr: string): number => {
    // 시간 형식 검증
    if (!timeStr || !timeStr.includes(':')) {
      console.warn(`Invalid time format: ${timeStr}`)
      return 0
    }
    
    const [hours, minutes] = timeStr.split(':').map(Number)
    
    // 유효한 숫자인지 확인
    if (isNaN(hours) || isNaN(minutes)) {
      console.warn(`Invalid time values: ${timeStr}`)
      return 0
    }
    
    const minutesFromDayStart = hours * 60 + minutes
    const totalMinutesInDay = 24 * 60
    const top = (minutesFromDayStart / totalMinutesInDay) * TIMELINE_HEIGHT + positionOffset
    return top
  }, [positionOffset])
  
  /**
   * 시간 duration을 픽셀 높이로 변환
   * 
   * @param startTime - 시작 시간 (HH:mm)
   * @param endTime - 종료 시간 (HH:mm)
   * @returns 픽셀 단위 높이
   */
  const getCardHeight = useCallback((startTime: string, endTime: string): number => {
    const [startHours, startMinutes] = startTime.split(':').map(Number)
    const [endHours, endMinutes] = endTime.split(':').map(Number)
    const startMinutesFromDay = startHours * 60 + startMinutes
    const endMinutesFromDay = endHours * 60 + endMinutes
    const durationMinutes = endMinutesFromDay - startMinutesFromDay
    
    // 종료 시간이 시작 시간보다 이전인 경우 최소 높이 반환
    if (durationMinutes <= 0) {
      console.warn(`Invalid time range: ${startTime} to ${endTime}`)
      return 60 // 최소 높이
    }
    
    return (durationMinutes / (24 * 60)) * TIMELINE_HEIGHT
  }, [])
  
  /**
   * 현재 시간의 Y 좌표
   */
  const currentTimeY = useMemo(() => {
    const hours = currentTime.getHours()
    const minutes = currentTime.getMinutes()
    const minutesFromDayStart = hours * 60 + minutes
    const totalMinutesInDay = 24 * 60
    return (minutesFromDayStart / totalMinutesInDay) * TIMELINE_HEIGHT + positionOffset
  }, [currentTime, positionOffset])
  
  const getPriorityColor = (priority: Todo['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/90 border-red-600'
      case 'medium':
        return 'bg-yellow-500/90 border-yellow-600'
      case 'low':
        return 'bg-green-500/90 border-green-600'
    }
  }
  
  // 시간이 있는 일정만 필터링
  const scheduledTodos = todos.filter(todo => todo.startTime && todo.endTime)
  
  return (
    <div className="relative h-full overflow-y-auto bg-gray-900 rounded-lg">
      <div className="relative" style={{ height: `${TIMELINE_HEIGHT}px` }}>
        {/* 배경 시간 그리드 */}
        <div className="absolute inset-0">
          {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => {
            const hour = START_HOUR + i
            const yPos = (hour / 24) * TIMELINE_HEIGHT + positionOffset
            
            return (
              <div
                key={hour}
                className="absolute w-full flex items-start"
                style={{ top: `${yPos}px` }}
              >
                {/* 시간 레이블 */}
                <div className="sticky left-0 w-16 text-xs text-gray-400 font-medium pr-2 text-right">
                  {String(hour).padStart(2, '0')}:00
                </div>
                
                {/* 시간 구분선 */}
                <div className="flex-1 border-t border-gray-700" />
              </div>
            )
          })}
        </div>
        
        {/* 현재 시간 표시선 */}
        {showPastTime && (
          <div
            className="absolute left-0 right-0 z-20 pointer-events-none"
            style={{ top: `${currentTimeY}px` }}
          >
            <div className="flex items-center">
              <div className="w-16 flex justify-end pr-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
              </div>
              <div className="flex-1 h-0.5 bg-red-500" />
            </div>
          </div>
        )}
        
        {/* 일정 카드 */}
        <div className="absolute left-16 right-0 top-0 bottom-0">
          {scheduledTodos.map((todo) => {
            if (!todo.startTime || !todo.endTime) return null
            
            const top = getYPosition(todo.startTime)
            const height = getCardHeight(todo.startTime, todo.endTime)
            
            return (
              <div
                key={todo.id}
                className={cn(
                  'absolute left-2 right-2 rounded-lg border-2 p-3 shadow-lg',
                  'transition-all duration-200 hover:shadow-xl',
                  getPriorityColor(todo.priority),
                  todo.createdBy === 'ai' ? 'border-l-4 border-l-purple-400' : ''
                )}
                style={{
                  top: `${top}px`,
                  height: `${height}px`,
                  minHeight: '60px'
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-white/80 font-medium">
                        {todo.startTime} ~ {todo.endTime}
                      </span>
                      {todo.createdBy === 'ai' && (
                        <span className="px-1.5 py-0.5 text-xs rounded bg-purple-500/50 text-white">
                          AI
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-white text-sm mb-1 truncate">
                      {todo.title}
                    </h4>
                    {todo.description && (
                      <p className="text-xs text-white/70 line-clamp-2">
                        {todo.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-1">
                    <button 
                      className="p-1 hover:bg-white/20 rounded transition-colors"
                      aria-label={`일정 수정: ${todo.title}`}
                      disabled
                    >
                      <Edit2 className="w-3 h-3 text-white/50" />
                    </button>
                    <button 
                      onClick={() => deleteTodo(todo.id)}
                      className="p-1 hover:bg-white/20 rounded transition-colors"
                      aria-label={`일정 삭제: ${todo.title}`}
                    >
                      <Trash2 className="w-3 h-3 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        {/* 일정이 없을 때 */}
        {scheduledTodos.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Clock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400">
                시간이 지정된 일정이 없습니다
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
