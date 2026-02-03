import { useEffect, useState } from 'react'
import { Calendar, Clock } from 'lucide-react'
import Header from '@/components/layout/Header'
import CalendarGrid from '@/components/calendar/CalendarGrid'
import AiTodosSidebar from '@/components/calendar/AiTodosSidebar'
import DayDetailPanel from '@/components/calendar/DayDetailPanel'
import DayPlannerView from '@/components/calendar/DayPlannerView'
import { useCalendarStore } from '@/stores/calendarStore'

type DisplayMode = 'calendar' | 'planner'

export default function MainPage() {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('planner')
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <Header />
      
      <main className="flex-1 max-w-screen-2xl w-full mx-auto p-6">
        {/* View mode toggle */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setDisplayMode('calendar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              displayMode === 'calendar'
                ? 'bg-primary-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>캘린더 뷰</span>
          </button>
          <button
            onClick={() => setDisplayMode('planner')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              displayMode === 'planner'
                ? 'bg-primary-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>플래너 뷰</span>
          </button>
        </div>
        
        <div className="flex gap-6 h-[calc(100vh-180px)]">
          {/* 좌측: AI 일정 사이드바 */}
          <AiTodosSidebar />
          
          {/* 중앙: 캘린더 그리드 또는 플래너 뷰 */}
          {displayMode === 'calendar' ? (
            <CalendarGrid />
          ) : (
            <DayPlannerView />
          )}
          
          {/* 우측: 일일 일정 상세 (캘린더 뷰일 때만) */}
          {displayMode === 'calendar' && <DayDetailPanel />}
        </div>
      </main>
    </div>
  )
}
