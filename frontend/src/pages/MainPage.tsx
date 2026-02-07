import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '@/components/layout/Header'
import MagicBar from '@/components/layout/MagicBar'
import CalendarGrid from '@/components/calendar/CalendarGrid'
import DayDetailPanel from '@/components/calendar/DayDetailPanel'
import { TopTimeline } from '@/components/calendar/TopTimeline'
import { VerticalTimeline } from '@/components/calendar/VerticalTimeline'
import { GoalsAndBackwardsPlanSection } from '@/components/goals/GoalsAndBackwardsPlanSection'
import { Target, Calendar as CalendarIcon, X, CalendarDays, ListTodo } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
import { useGoalStore } from '@/stores/goalStore'
import { getSchedules } from '@/services/scheduleService'
import { getApiBase, normalizeGoalFromApi } from '@/utils/api'
import type { Goal } from '@/types/goal'

export default function MainPage() {
  const navigate = useNavigate()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [showMonthlyCalendar, setShowMonthlyCalendar] = useState(false)
  const [monthlyModalTab, setMonthlyModalTab] = useState<'calendar' | 'goals' | 'day'>('calendar')
  const { goals, setGoals } = useGoalStore()
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
          const ct = goalsRes.headers.get('content-type') ?? ''
          if (ct.includes('application/json')) {
            const data = await goalsRes.json()
            const list = Array.isArray(data) ? data.map((g: Record<string, unknown>) => normalizeGoalFromApi(g)) : []
            setGoals(list as Goal[])
          }
        }
        // 회원별 일정 목록 로드 (원격 DB)
        try {
          const scheduleList = await getSchedules()
          setTodos(scheduleList)
        } catch {
          // 일정 조회 실패 시 빈 목록 유지
        }
      } catch (err) {
        // ERR_CONNECTION_REFUSED 등: 백엔드(8080)가 꺼져 있음. 진입은 허용하되 로그인/데이터는 불가
        if (err instanceof TypeError && (err.message === 'Failed to fetch' || err.message.includes('fetch'))) {
          console.warn('백엔드에 연결할 수 없습니다. 백엔드를 실행한 뒤 새로고침하세요. (예: 포트 8080)')
        }
      } finally {
        setCheckingAuth(false)
      }
    }

    checkAuthAndLoadGoals()
  }, [navigate, setGoals, setTodos])
  
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

  // 월간 모달 열릴 때 body 스크롤 잠금 + 탭 초기화
  useEffect(() => {
    if (!showMonthlyCalendar) return
    setMonthlyModalTab('calendar')
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
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
      {/* 🎨 TopTimeline: 주간 히트맵 */}
      <TopTimeline />
      
      <Header onOpenMonthlyCalendar={() => setShowMonthlyCalendar(true)} />

      {/* 매직 바: 한 줄 자연어로 일정 추가 (Gemini Function Calling) */}
      <div className="shrink-0 border-b border-notion-border bg-notion-card/50">
        <MagicBar />
      </div>
      
      {/* 🎯 Focus View (Vertical Gravity Timeline) - 기본 화면 (z-0으로 헤더 아래 레이어) */}
      {!showMonthlyCalendar && (
        <main className="flex-1 flex flex-col overflow-hidden min-h-0 relative z-0">
          {/* 메인 영역: VerticalTimeline */}
          <div className="flex-1 flex min-h-0 relative">
            <div className="flex-1 min-h-0">
              <VerticalTimeline />
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
            {/* 모달 헤더 - 반응형 패딩 */}
            <div className="flex items-center justify-between px-4 sm:px-6 xl:px-8 py-4 sm:py-6 border-b border-notion-border bg-notion-sidebar">
              <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-500/15 border border-primary-500/30 rounded-lg flex items-center justify-center">
                    <CalendarIcon className="w-5 h-5 text-primary-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-notion-text">월간 일정</h2>
                </div>
                
                {/* 간결한 통계 배지 */}
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 bg-primary-500/20 rounded-full flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                    <span className="text-sm font-medium text-primary-400">{todos.length}개 일정</span>
                  </div>
                  <div className="px-3 py-1.5 bg-red-500/20 rounded-full flex items-center gap-2">
                    <Target className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-sm font-medium text-red-400">{goals.length}개 목표</span>
                  </div>
                </div>
              </div>
              
              {/* 우측: 액션 버튼 */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowMonthlyCalendar(false)}
                  className="touch-target flex items-center justify-center min-w-[44px] min-h-[44px] p-2 hover:bg-notion-hover rounded-lg transition-colors"
                  title="닫기 (ESC)"
                >
                  <X className="w-5 h-5 text-notion-muted" />
                </button>
              </div>
            </div>

            {/* 매직 바: 월간 일정에서도 한 줄 자연어로 일정 추가 */}
            <div className="shrink-0 border-b border-notion-border bg-notion-card/50">
              <MagicBar />
            </div>
            
            {/* 모달 컨텐츠: 모바일 탭 / 데스크톱 그리드 */}
            <div className="flex-1 overflow-auto bg-notion-bg flex flex-col min-h-0">
              {/* 모바일 전용 탭 (xl 미만에서만) */}
              <div className="xl:hidden shrink-0 border-b border-notion-border bg-notion-sidebar">
                <div className="flex max-w-[1600px] mx-auto">
                  {[
                    { id: 'calendar' as const, label: '캘린더', icon: CalendarDays },
                    { id: 'goals' as const, label: '목표', icon: Target },
                    { id: 'day' as const, label: '선택일', icon: ListTodo },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMonthlyModalTab(id)}
                      className={`touch-target flex-1 min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                        monthlyModalTab === id
                          ? 'border-primary-500 text-primary-400 bg-primary-500/10'
                          : 'border-transparent text-notion-muted hover:text-notion-text hover:bg-notion-hover'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-auto min-h-0">
                <div className="max-w-[1600px] mx-auto p-4 sm:p-6 xl:p-8">
                  {/* 모바일: 탭별 단일 패널 */}
                  <div className="xl:hidden">
                    {monthlyModalTab === 'calendar' && (
                      <div className="bg-notion-sidebar rounded-2xl shadow-none p-4 sm:p-6 border border-notion-border">
                        <CalendarGrid />
                      </div>
                    )}
                    {monthlyModalTab === 'goals' && (
                      <div className="bg-notion-sidebar rounded-2xl shadow-none p-4 sm:p-5 border border-notion-border">
                        <GoalsAndBackwardsPlanSection />
                      </div>
                    )}
                    {monthlyModalTab === 'day' && (
                      <div className="bg-notion-sidebar rounded-2xl shadow-none border border-notion-border flex flex-col min-h-0 max-h-[70vh]">
                        <DayDetailPanel />
                      </div>
                    )}
                  </div>

                  {/* 데스크톱: 기존 2열 그리드 */}
                  <div className="hidden xl:grid grid-cols-12 gap-6 xl:gap-8">
                    <div className="col-span-7 flex flex-col gap-6">
                      <div className="bg-notion-sidebar rounded-2xl shadow-none p-8 border border-notion-border">
                        <CalendarGrid />
                      </div>
                      <div className="bg-notion-sidebar rounded-2xl shadow-none p-5 border border-notion-border">
                        <GoalsAndBackwardsPlanSection />
                      </div>
                    </div>
                    <div className="col-span-5 flex flex-col gap-6 max-h-[75vh] overflow-y-auto pr-2">
                      <div className="bg-notion-sidebar rounded-2xl shadow-none border border-notion-border flex flex-col min-h-0">
                        <DayDetailPanel />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
