import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import CalendarGrid from '@/components/calendar/CalendarGrid'
import CalendarStats from '@/components/calendar/CalendarStats'
import AiChatPanel from '@/components/chat/AiChatPanel'
import DayDetailPanel from '@/components/calendar/DayDetailPanel'
import { SuggestionPanel } from '@/components/suggestions/SuggestionPanel'
import { GoalList } from '@/components/goals/GoalList'
import { GoalModal } from '@/components/goals/GoalModal'
import { CurrentTaskSticky } from '@/components/calendar/CurrentTaskSticky'
import { DopamineFeedback } from '@/components/feedback/DopamineFeedback'
import { TopTimeline } from '@/components/calendar/TopTimeline'
import { VerticalTimeline } from '@/components/calendar/VerticalTimeline'
import { AIShadowPlanner } from '@/components/calendar/AIShadowPlanner'
import { DynamicActionButton } from '@/components/calendar/DynamicActionButton'
import { Target, ChevronDown, ChevronUp, Grid, Focus } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
import { useGoalStore } from '@/stores/goalStore'
import { useSuggestionStore } from '@/stores/suggestionStore'

export default function MainPage() {
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false)
  const [isGoalSectionCollapsed, setIsGoalSectionCollapsed] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'focus'>('grid') // 🎨 뷰 모드 토글
  const { goals } = useGoalStore()
  const { suggestions } = useSuggestionStore()
  
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
      {/* 🧠 External Scaffolding: 현재 작업 고정 표시 (Grid 모드만) */}
      {viewMode === 'grid' && <CurrentTaskSticky />}
      
      {/* 🎉 즉각적 도파민 피드백 */}
      <DopamineFeedback />
      
      {/* 🎨 TopTimeline: 주간 히트맵 (Focus 모드) */}
      {viewMode === 'focus' && <TopTimeline />}
      
      <div className={viewMode === 'grid' ? 'mt-24' : ''}>
        <Header />
      </div>
      
      {/* 뷰 모드 토글 버튼 */}
      <div className="fixed top-20 right-8 z-40 flex gap-2">
        <button
          onClick={() => setViewMode('grid')}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200
            ${viewMode === 'grid' 
              ? 'bg-primary-500 text-white shadow-lg' 
              : 'bg-white text-gray-600 hover:bg-gray-100'}
          `}
        >
          <Grid className="w-4 h-4" />
          그리드 뷰
        </button>
        <button
          onClick={() => setViewMode('focus')}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200
            ${viewMode === 'focus' 
              ? 'bg-purple-500 text-white shadow-lg' 
              : 'bg-white text-gray-600 hover:bg-gray-100'}
          `}
        >
          <Focus className="w-4 h-4" />
          포커스 뷰
        </button>
      </div>
      
      {/* 🎯 Grid View (기존 레이아웃) */}
      {viewMode === 'grid' && (
        <main className="flex-1 w-full mx-auto p-6 max-w-[1800px]">
          {/* 상단: 통계 카드 */}
          <div className="mb-6">
            <CalendarStats />
          </div>

        {/* 목표 섹션 - 개선된 버전 */}
        <div className="mb-6">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">내 목표</h2>
                    {goals.length > 0 && (
                      <p className="text-sm text-gray-500">{goals.length}개 진행 중</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsGoalModalOpen(true)}
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium text-sm"
                  >
                    + 새 목표
                  </button>
                  {goals.length > 0 && ( 
                    <button
                      onClick={() => setIsGoalSectionCollapsed(!isGoalSectionCollapsed)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title={isGoalSectionCollapsed ? "펼치기" : "접기"}
                    >
                      {isGoalSectionCollapsed ? (
                        <ChevronDown className="w-5 h-5 text-gray-600" />
                      ) : (
                        <ChevronUp className="w-5 h-5 text-gray-600" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {!isGoalSectionCollapsed && (
              <div className={goals.length === 0 ? "p-6 pt-0" : "px-6 pb-6"}>
                {goals.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Target className="w-8 h-8 text-primary-300" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">
                      아직 목표가 없습니다
                    </h3>
                    <p className="text-xs text-gray-500 mb-4">
                      AI와 함께 목표를 세우고 자동으로 일정을 관리하세요
                    </p>
                    <button
                      onClick={() => setIsGoalModalOpen(true)}
                      className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium text-sm inline-flex items-center gap-2"
                    >
                      <Target className="w-4 h-4" />
                      첫 목표 만들기
                    </button>
                  </div>
                ) : (
                  <GoalList />
                )}
              </div>
            )}
          </div>
        </div>

        {/* 메인 3단 레이아웃 - 개선된 비율 */}
        <div className="grid grid-cols-12 gap-6">
          {/* 좌측: AI 채팅 (3.5열) */}
          <div className="col-span-3">
            <AiChatPanel />
          </div>

          {/* 중앙: 캘린더 (6열) - 더 넓게 */}
          <div className="col-span-6">
            <CalendarGrid />
          </div>

          {/* 우측: 일일 일정 (2.5열) */}
          <div className="col-span-3">
            <DayDetailPanel />
          </div>
        </div>

        {/* AI 제안 섹션 - 조건부 렌더링 */}
        {suggestions.length > 0 && (
          <div className="mt-6">
            <SuggestionPanel />
          </div>
        )}
        </main>
      )}
      
      {/* 🎯 Focus View (Vertical Gravity Timeline) */}
      {viewMode === 'focus' && (
        <main className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* 메인 영역: VerticalTimeline (좌) + AI Shadow Planner (우) */}
          <div className="flex-1 flex min-h-0">
            {/* 좌측: Vertical Gravity Timeline */}
            <div className="flex-1 min-h-0">
              <VerticalTimeline />
            </div>
            
            {/* 우측: AI 추천 일정 (Shadow Schedules) */}
            <div className="w-80 bg-white border-l border-gray-200 p-6 overflow-y-auto">
              <AIShadowPlanner />
            </div>
          </div>
          
          {/* 🚀 Dynamic Action Button (고정 위치) */}
          <DynamicActionButton />
        </main>
      )}

      {/* 목표 생성 모달 */}
      <GoalModal isOpen={isGoalModalOpen} onClose={() => setIsGoalModalOpen(false)} />
    </div>
  )
}
