import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import CalendarGrid from '@/components/calendar/CalendarGrid'
import DayDetailPanel from '@/components/calendar/DayDetailPanel'
import { GoalModal } from '@/components/goals/GoalModal'
import { DopamineFeedback } from '@/components/feedback/DopamineFeedback'
import { TopTimeline } from '@/components/calendar/TopTimeline'
import { VerticalTimeline } from '@/components/calendar/VerticalTimeline'
import { DynamicActionButton } from '@/components/calendar/DynamicActionButton'
import { Target, Calendar as CalendarIcon, X } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
import { useGoalStore } from '@/stores/goalStore'

export default function MainPage() {
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false)
  const [showMonthlyCalendar, setShowMonthlyCalendar] = useState(false) // 월간 캘린더 모달
  const { goals } = useGoalStore()
  const { todos } = useCalendarStore()
  
  // ESC 키로 월간 캘린더 모달 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showMonthlyCalendar) {
        setShowMonthlyCalendar(false)
      }
    }
    
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [showMonthlyCalendar])
  
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
      {/* 🎉 즉각적 도파민 피드백 */}
      <DopamineFeedback />
      
      {/* 🎨 TopTimeline: 주간 히트맵 */}
      <TopTimeline />
      
      <Header />
      
      {/* 우측 상단: 통계 배지 + 월간 일정보기 버튼 */}
      {!showMonthlyCalendar && (
        <div className="fixed top-20 right-8 z-40 flex items-center gap-3">
          {/* 간결한 통계 배지 */}
          <div className="bg-white rounded-lg shadow-lg px-4 py-2 flex items-center gap-3 border border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">{todos.length}개 일정</span>
            </div>
            <div className="w-px h-4 bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-sm font-medium text-gray-700">{goals.length}개 목표</span>
            </div>
          </div>
          
          {/* 월간 일정보기 버튼 */}
          <button
            onClick={() => setShowMonthlyCalendar(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 
                       text-white rounded-lg font-medium shadow-lg hover:shadow-xl
                       transition-all duration-200 hover:scale-105"
          >
            <CalendarIcon className="w-4 h-4" />
            월간보기
          </button>
        </div>
      )}
      
      {/* 🎯 Focus View (Vertical Gravity Timeline) - 기본 화면 */}
      {!showMonthlyCalendar && (
        <main className="flex-1 flex flex-col overflow-hidden min-h-0 relative">
          {/* 메인 영역: VerticalTimeline + 토글 가능한 AI 사이드바 */}
          <div className="flex-1 flex min-h-0 relative">
            {/* 중앙: Vertical Gravity Timeline - 전체 너비 */}
            <div className="flex-1 min-h-0">
              <VerticalTimeline />
            </div>
          </div>
          
          {/* 🚀 Dynamic Action Button (고정 위치) */}
          <DynamicActionButton />
        </main>
      )}
      
      {/* 🗓️ 월간 캘린더 모달 */}
      {showMonthlyCalendar && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            // 배경 클릭 시 모달 닫기 (모달 내부 클릭은 제외)
            if (e.target === e.currentTarget) {
              setShowMonthlyCalendar(false)
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1800px] max-h-[95vh] overflow-hidden flex flex-col">
            {/* 모달 헤더 - 미니멀 & 기능적 */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200 bg-white">
              {/* 좌측: 타이틀 & 간단한 통계 */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                    <CalendarIcon className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">월간 일정</h2>
                </div>
                
                {/* 간결한 통계 배지 */}
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 bg-blue-50 rounded-full flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-blue-700">{todos.length}개 일정</span>
                  </div>
                  <div className="px-3 py-1.5 bg-purple-50 rounded-full flex items-center gap-2">
                    <Target className="w-3.5 h-3.5 text-purple-500" />
                    <span className="text-sm font-medium text-purple-700">{goals.length}개 목표</span>
                  </div>
                </div>
              </div>
              
              {/* 우측: 액션 버튼 */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsGoalModalOpen(true)}
                  className="px-4 py-2 bg-gradient-to-r from-primary-500 to-purple-500 text-white rounded-lg 
                             hover:from-primary-600 hover:to-purple-600 transition-all duration-200 
                             text-sm font-medium shadow-sm flex items-center gap-2"
                >
                  <Target className="w-4 h-4" />
                  목표 추가
                </button>
                
                <button
                  onClick={() => setShowMonthlyCalendar(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="닫기 (ESC)"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
            
            {/* 모달 컨텐츠 - ADHD 친화적 디자인 */}
            <div className="flex-1 overflow-auto bg-gray-50">
              {/* 🎯 단일 초점: 캘린더 중심 레이아웃 */}
              <div className="max-w-[1600px] mx-auto p-8">
                <div className="grid grid-cols-12 gap-8">
                  {/* 중앙: 캘린더 - 주요 초점 영역 (황금 비율: 약 61.8%) */}
                  <div className="col-span-8">
                    <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                      <CalendarGrid />
                    </div>
                  </div>
                  
                  {/* 우측: 선택된 날짜 정보 (보조 영역: 약 38.2%) */}
                  <div className="col-span-4">
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 sticky top-8">
                      <DayDetailPanel />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 목표 생성 모달 */}
      <GoalModal isOpen={isGoalModalOpen} onClose={() => setIsGoalModalOpen(false)} />
    </div>
  )
}
