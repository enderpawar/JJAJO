import { useMemo, useState } from 'react'
import { useCalendarStore } from '@/stores/calendarStore'
import { Sparkles, PlayCircle, Plus } from 'lucide-react'
import { format } from 'date-fns'
import AddTodoModal from './AddTodoModal'

/**
 * 🎯 DynamicActionButton: Context-Aware Primary CTA
 * 
 * Logic:
 * - 현재 시간에 스케줄이 비어있으면 → '✨ AI 추천받기' 버튼
 * - 현재 시간에 스케줄이 있으면 → '🚀 시작하기' 버튼
 * - 최우선 위치에 크게 노출
 */
export function DynamicActionButton() {
  const { todos } = useCalendarStore()
  const [showAddModal, setShowAddModal] = useState(false)
  
  // 현재 상태 분석
  const buttonState = useMemo(() => {
    const now = new Date()
    const todayStr = format(now, 'yyyy-MM-dd')
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    
    // 오늘의 미완료 일정
    const todayTodos = todos.filter(
      t => t.date === todayStr && t.status !== 'completed' && t.startTime && t.endTime
    )
    
    // 현재 진행 중인 일정
    const currentTask = todayTodos.find(
      t => t.startTime! <= currentTimeStr && t.endTime! > currentTimeStr
    )
    
    // 다음 일정
    const nextTask = todayTodos
      .filter(t => t.startTime! > currentTimeStr)
      .sort((a, b) => a.startTime!.localeCompare(b.startTime!))[0]
    
    // 버튼 상태 결정
    if (currentTask) {
      return {
        type: 'start' as const,
        label: '지금 시작하기',
        icon: PlayCircle,
        color: 'primary',
        task: currentTask
      }
    }
    
    if (nextTask) {
      return {
        type: 'prepare' as const,
        label: '다음 일정 준비',
        icon: PlayCircle,
        color: 'purple',
        task: nextTask
      }
    }
    
    // 일정이 없으면 AI 추천
    return {
      type: 'recommend' as const,
      label: 'AI 추천받기',
      icon: Sparkles,
      color: 'gradient',
      task: null
    }
  }, [todos])
  
  const handleClick = () => {
    if (buttonState.type === 'start' || buttonState.type === 'prepare') {
      // 태스크 시작 로직
      console.log('Starting task:', buttonState.task)
      // TODO: 타이머 시작, 포커스 모드 진입 등
    } else {
      // AI 추천 요청
      console.log('Requesting AI recommendations')
      // TODO: AI 채팅 패널 열기 또는 추천 요청
    }
  }
  
  const Icon = buttonState.icon
  
  return (
    <div className="fixed bottom-8 right-8 z-50">
      <button
        onClick={handleClick}
        className={`
          group relative overflow-hidden
          px-8 py-4 rounded-2xl
          text-white font-bold text-lg
          shadow-2xl hover:shadow-3xl
          transform hover:scale-105 active:scale-95
          transition-all duration-300
          ${buttonState.color === 'primary' ? 'bg-primary-500 hover:bg-primary-600' : ''}
          ${buttonState.color === 'purple' ? 'bg-purple-500 hover:bg-purple-600' : ''}
          ${buttonState.color === 'gradient' ? 'bg-gradient-to-r from-purple-500 to-primary-500 hover:from-purple-600 hover:to-primary-600' : ''}
        `}
      >
        {/* 배경 애니메이션 */}
        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
        
        {/* 버튼 내용 */}
        <div className="relative flex items-center gap-3">
          <Icon className="w-6 h-6 animate-pulse" />
          <span>{buttonState.label}</span>
        </div>
        
        {/* 태스크 정보 툴팁 */}
        {buttonState.task && (
          <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="font-bold mb-1">{buttonState.task.title}</div>
            <div className="text-xs text-gray-300">
              {buttonState.task.startTime} - {buttonState.task.endTime}
            </div>
          </div>
        )}
        
        {/* Pulse 효과 (추천받기일 때) */}
        {buttonState.type === 'recommend' && (
          <div className="absolute inset-0 rounded-2xl bg-purple-400 opacity-50 animate-ping" />
        )}
      </button>
      
      {/* 추가 빠른 액션 버튼 */}
      <button
        onClick={() => setShowAddModal(true)}
        className="mt-3 w-full bg-gray-800 hover:bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        빠른 일정 추가
      </button>
      
      {/* 빠른 일정 추가 모달 */}
      {showAddModal && (
        <AddTodoModal 
          isOpen={showAddModal} 
          onClose={() => setShowAddModal(false)} 
        />
      )}
    </div>
  )
}
