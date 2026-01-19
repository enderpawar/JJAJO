import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import CalendarGrid from '@/components/calendar/CalendarGrid'
import CalendarStats from '@/components/calendar/CalendarStats'
import AiChatPanel from '@/components/chat/AiChatPanel'
import DayDetailPanel from '@/components/calendar/DayDetailPanel'
import { SuggestionPanel } from '@/components/suggestions/SuggestionPanel'
import { GoalList } from '@/components/goals/GoalList'
import { GoalModal } from '@/components/goals/GoalModal'
import { Target } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'

export default function MainPage() {
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false)
  
  // 테스트용 더미 데이터
  useEffect(() => {
    const { todos, addTodo } = useCalendarStore.getState()
    
    // 이미 일정이 있으면 추가하지 않음
    if (todos.length > 0) return
    
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const formatDate = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    // 더미 일정 추가
    addTodo({
      id: 'dummy-1',
      title: '팀 회의',
      description: '주간 스프린트 회의',
      date: formatDate(today),
      startTime: '09:00',
      endTime: '10:00',
      status: 'pending',
      priority: 'high',
      createdBy: 'ai',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    
    addTodo({
      id: 'dummy-2',
      title: '운동',
      description: '헬스장 30분',
      date: formatDate(today),
      startTime: '14:00',
      endTime: '15:00',
      status: 'in-progress',
      priority: 'medium',
      createdBy: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    
    addTodo({
      id: 'dummy-3',
      title: '프로젝트 공부',
      description: 'React 심화 학습',
      date: formatDate(today),
      startTime: '19:00',
      endTime: '21:00',
      status: 'pending',
      priority: 'high',
      createdBy: 'ai',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    
    addTodo({
      id: 'dummy-4',
      title: '저녁 약속',
      description: '친구들과 저녁 식사',
      date: formatDate(tomorrow),
      startTime: '18:00',
      endTime: '20:00',
      status: 'pending',
      priority: 'low',
      createdBy: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }, [])
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 w-full mx-auto p-6 max-w-[1800px]">
        {/* 상단: 통계 카드 */}
        <div className="mb-6">
          <CalendarStats />
        </div>

        {/* 목표 섹션 */}
        <div className="mb-6">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-6 h-6 text-primary-500" />
                <h2 className="text-xl font-bold text-gray-900">내 목표</h2>
              </div>
              <button
                onClick={() => setIsGoalModalOpen(true)}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
              >
                + 새 목표
              </button>
            </div>
            <GoalList />
          </div>
        </div>

        {/* 메인 3단 레이아웃 */}
        <div className="grid grid-cols-12 gap-6">
          {/* 좌측: AI 채팅 (4열) */}
          <div className="col-span-4">
            <AiChatPanel />
          </div>

          {/* 중앙: 캘린더 (5열) */}
          <div className="col-span-5">
            <CalendarGrid />
          </div>

          {/* 우측: 일일 일정 (3열) */}
          <div className="col-span-3">
            <DayDetailPanel />
          </div>
        </div>

        {/* AI 제안 섹션 (하단 전체 폭) */}
        <div className="mt-6">
          <SuggestionPanel />
        </div>
      </main>

      {/* 목표 생성 모달 */}
      <GoalModal isOpen={isGoalModalOpen} onClose={() => setIsGoalModalOpen(false)} />
    </div>
  )
}
