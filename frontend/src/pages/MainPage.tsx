import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '@/components/layout/Header'
import CalendarGrid from '@/components/calendar/CalendarGrid'
import DayDetailPanel from '@/components/calendar/DayDetailPanel'
import { AddGoalModal } from '@/components/goals/AddGoalModal'
import AddTodoModal from '@/components/calendar/AddTodoModal'
import { DopamineFeedback } from '@/components/feedback/DopamineFeedback'
import { TopTimeline } from '@/components/calendar/TopTimeline'
import { VerticalTimeline } from '@/components/calendar/VerticalTimeline'
import { Target, Calendar as CalendarIcon, X } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
import { useGoalStore } from '@/stores/goalStore'
import { getSchedules } from '@/services/scheduleService'
import { goalService } from '@/services/goalService'
import { getApiBase, normalizeGoalFromApi } from '@/utils/api'
import type { Goal } from '@/types/goal'

export default function MainPage() {
  const navigate = useNavigate()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false)
  const [isQuickScheduleOpen, setIsQuickScheduleOpen] = useState(false)
  const [quickScheduleInitial, setQuickScheduleInitial] = useState<{time?: string, date?: string}>({})
  const [showMonthlyCalendar, setShowMonthlyCalendar] = useState(false) // 월간 캘린더 모달
  const { goals, setGoals, addGoal, deleteGoal } = useGoalStore()
  const { todos, setTodos } = useCalendarStore()

  // 플래너 진입 시 인증 확인 + 회원별 목표 로드
  useEffect(() => {
    const base = getApiBase()
    const apiMe = base ? `${base}/api/me` : '/api/me'
    const apiGoals = base ? `${base}/api/v1/goals` : '/api/v1/goals'

    const checkAuthAndLoadGoals = async () => {
      try {
        const res = await fetch(apiMe, { credentials: 'include' })
        if (!res.ok) {
          navigate('/', { replace: true })
          return
        }
        // 로그인된 사용자의 목표 목록 로드 (백엔드 enum → 소문자 정규화)
        const goalsRes = await fetch(apiGoals, { credentials: 'include' })
        if (goalsRes.ok) {
          const data = await goalsRes.json()
          const list = Array.isArray(data) ? data.map((g: Record<string, unknown>) => normalizeGoalFromApi(g)) : []
          setGoals(list as Goal[])
        }
        // 회원별 일정 목록 로드 (원격 DB)
        try {
          const scheduleList = await getSchedules()
          setTodos(scheduleList)
        } catch {
          // 일정 조회 실패 시 빈 목록 유지
        }
      } catch {
        // 네트워크 에러 등은 일단 진입 허용
      } finally {
        setCheckingAuth(false)
      }
    }

    checkAuthAndLoadGoals()
  }, [navigate, setGoals, setTodos])
  
  const handleOpenQuickSchedule = (clickedTime: string, date: string) => {
    setQuickScheduleInitial({ time: clickedTime, date })
    setIsQuickScheduleOpen(true)
  }

  const handleAddGoalFromMain = async (title: string, deadline: string, description?: string) => {
    const tempId = `opt-goal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const optimisticGoal: Goal = {
      id: tempId,
      title,
      deadline,
      description: description?.trim() || undefined,
      priority: 'medium',
      status: 'not_started',
      milestones: [],
      category: 'other',
      estimatedHours: 0,
      completedHours: 0,
    }
    addGoal(optimisticGoal)
    setIsGoalModalOpen(false)
    goalService
      .createGoal({ title, deadline, description })
      .then((created) => {
        deleteGoal(tempId)
        addGoal(normalizeGoalFromApi(created as unknown as Record<string, unknown>) as Goal)
      })
      .catch((err) => {
        deleteGoal(tempId)
        alert(err instanceof Error ? err.message : '목표 등록에 실패했습니다.')
      })
  }
  
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
  
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-notion-bg text-notion-text">
        <p className="text-sm text-notion-text-secondary">로그인 상태를 확인하고 있어요...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-notion-bg text-notion-text">
      {/* 🎉 즉각적 도파민 피드백 */}
      <DopamineFeedback />
      
      {/* 🎨 TopTimeline: 주간 히트맵 */}
      <TopTimeline />
      
      <Header />
      
      {/* 🎯 Focus View (Vertical Gravity Timeline) - 기본 화면 (z-0으로 헤더 아래 레이어) */}
      {!showMonthlyCalendar && (
        <main className="flex-1 flex flex-col overflow-hidden min-h-0 relative z-0">
          {/* 메인 영역: VerticalTimeline + 토글 가능한 AI 사이드바 */}
          <div className="flex-1 flex min-h-0 relative">
            {/* 중앙: Vertical Gravity Timeline - 전체 너비 */}
            <div className="flex-1 min-h-0">
              <VerticalTimeline onOpenQuickSchedule={handleOpenQuickSchedule} />
            </div>
          </div>
        </main>
      )}
      
      {/* 🗓️ 월간 캘린더 모달 */}
      {showMonthlyCalendar && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowMonthlyCalendar(false)
            }
          }}
        >
          <div className="bg-notion-sidebar rounded-lg border border-notion-border w-full max-w-[1800px] max-h-[95vh] overflow-hidden flex flex-col">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-notion-border bg-notion-sidebar">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-notion-text rounded-lg flex items-center justify-center">
                    <CalendarIcon className="w-5 h-5 text-notion-bg" />
                  </div>
                  <h2 className="text-xl font-semibold text-notion-text">월간 일정</h2>
                </div>
                
                {/* 간결한 통계 배지 */}
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 bg-blue-500/20 rounded-full flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-blue-400">{todos.length}개 일정</span>
                  </div>
                  <div className="px-3 py-1.5 bg-purple-500/20 rounded-full flex items-center gap-2">
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
      <AddGoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        mode="create"
        onSubmit={handleAddGoalFromMain}
      />

      {/* 빠른 일정 추가 모달 */}
      <AddTodoModal
        isOpen={isQuickScheduleOpen}
        onClose={() => {
          setIsQuickScheduleOpen(false)
          setQuickScheduleInitial({})
        }}
        defaultDate={
          quickScheduleInitial.date
            ? quickScheduleInitial.time
              ? new Date(`${quickScheduleInitial.date}T${quickScheduleInitial.time}:00`)
              : new Date(quickScheduleInitial.date + 'T12:00:00')
            : undefined
        }
      />
    </div>
  )
}
