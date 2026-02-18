import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '@/components/layout/Header'
import MagicBar from '@/components/layout/MagicBar'
import CalendarGrid from '@/components/calendar/CalendarGrid'
import DayDetailPanel from '@/components/calendar/DayDetailPanel'
import { TopTimeline } from '@/components/calendar/TopTimeline'
import { VerticalTimeline } from '@/components/calendar/VerticalTimeline'
import { GoalsAndBackwardsPlanSection } from '@/components/goals/GoalsAndBackwardsPlanSection'
import { ImportTimetableModal } from '@/components/calendar/ImportTimetableModal'
import { Target, X, CalendarDays } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
import { useGoalStore } from '@/stores/goalStore'
import { formatDateWithDay } from '@/utils/dateUtils'
import { checkAuth, loadGoals } from '@/services/authService'
import { getSchedules } from '@/services/scheduleService'
import { useApiKeyStore } from '@/stores/apiKeyStore'

export default function MainPage() {
  const navigate = useNavigate()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [showMonthlyCalendar, setShowMonthlyCalendar] = useState(false)
  const [showImportTimetable, setShowImportTimetable] = useState(false)
  const [monthlyModalTab, setMonthlyModalTab] = useState<'calendar' | 'goals'>('calendar')
  const [showDayPanelInModal, setShowDayPanelInModal] = useState(false)
  const [modalDragY, setModalDragY] = useState(0)
  const modalDragStartY = useRef(0)
  const skipNextScrollToTimeRef = useRef(false)
  const { goals, setGoals } = useGoalStore()
  const { todos, setTodos, selectedDate } = useCalendarStore()
  const loadApiKeyForCurrentUser = useApiKeyStore((s) => s.loadApiKeyForCurrentUser)

  // 플래너 진입 시 인증 확인 + 회원별 목표·일정 로드
  useEffect(() => {
    const init = async () => {
      try {
        await checkAuth()
        // 인증 후 userId가 설정되면, 해당 계정에 대한 Gemini API 키를 localStorage에서 불러온다
        loadApiKeyForCurrentUser()
        const [goalsList] = await Promise.all([
          loadGoals(),
          getSchedules().then(setTodos).catch(() => {}),
        ])
        setGoals(goalsList)
      } catch (err) {
        if (err instanceof TypeError && (err.message === 'Failed to fetch' || err.message.includes('fetch'))) {
          console.warn('백엔드에 연결할 수 없습니다. 백엔드를 실행한 뒤 새로고침하세요. (예: 포트 8080)')
        } else {
          navigate('/', { replace: true })
        }
      } finally {
        setCheckingAuth(false)
      }
    }
    init()
  }, [navigate, setGoals, setTodos, loadApiKeyForCurrentUser])
  
  const closeMonthlyCalendar = useCallback(() => {
    skipNextScrollToTimeRef.current = true
    setShowMonthlyCalendar(false)
  }, [])

  // ESC 키로 월간 캘린더 모달 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showMonthlyCalendar) {
        closeMonthlyCalendar()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [showMonthlyCalendar, closeMonthlyCalendar])

  // 월간 모달 열릴 때 body 스크롤 잠금 + 탭 초기화
  useEffect(() => {
    if (!showMonthlyCalendar) {
      setModalDragY(0)
      setShowDayPanelInModal(false)
      return
    }
    setMonthlyModalTab('calendar')
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [showMonthlyCalendar])
  
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-notion-bg text-notion-text">
        <img src="/logo.png" alt="짜조" className="h-12 w-auto object-contain" />
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
              <VerticalTimeline skipNextScrollToTimeRef={skipNextScrollToTimeRef} />
            </div>
          </div>
        </main>
      )}
      
      {/* 🗓️ 월간 캘린더 모달 */}
      {showMonthlyCalendar && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeMonthlyCalendar()
            }
          }}
        >
          <div 
            className="bg-notion-sidebar rounded-lg border border-notion-border w-full max-w-[1800px] max-h-[min(95vh,calc(100vh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem))] overflow-hidden flex flex-col transition-transform duration-150"
            style={{ transform: `translateY(${modalDragY}px)` }}
          >
            {/* 상단: 모바일은 스와이프 핸들+닫기, 데스크톱은 최소 바(닫기+시간표 불러오기) */}
            <div className="shrink-0 flex items-center justify-between px-2 py-2 border-b border-notion-border bg-notion-sidebar">
              <div
                className="xl:hidden flex-1 flex justify-center touch-none min-h-[44px] items-center"
                onTouchStart={(e) => { modalDragStartY.current = e.touches[0].clientY }}
                onTouchMove={(e) => {
                  const y = e.touches[0].clientY
                  const delta = y - modalDragStartY.current
                  if (delta > 0) setModalDragY(delta)
                }}
                onTouchEnd={() => {
                  if (modalDragY > 100) closeMonthlyCalendar()
                  setModalDragY(0)
                }}
              >
                <div className="w-10 h-1 rounded-full bg-notion-border" aria-hidden />
              </div>
              <div className="hidden xl:flex items-center gap-2 flex-1">
                <button
                  type="button"
                  onClick={() => setShowImportTimetable(true)}
                  className="touch-target flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary-500/15 text-primary-400 hover:bg-primary-500/25 text-sm font-medium"
                >
                  <CalendarDays className="w-4 h-4" />
                  시간표 이미지로 불러오기
                </button>
              </div>
              <button
                type="button"
                onClick={closeMonthlyCalendar}
                className="touch-target flex items-center justify-center min-w-[44px] min-h-[44px] p-2 hover:bg-notion-hover rounded-lg transition-colors shrink-0"
                title="닫기 (ESC)"
              >
                <X className="w-5 h-5 text-notion-muted" />
              </button>
            </div>

            {/* 매직 바: 모바일/데스크톱 모두 항상 표시 */}
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
                  {/* 모바일: 탭별 단일 패널. 날짜 더블클릭/더블탭 시 일정 패널 오버레이 */}
                  <div className="xl:hidden relative flex-1 min-h-0 flex flex-col">
                    {monthlyModalTab === 'calendar' && (
                      <div className="bg-notion-sidebar rounded-2xl shadow-none p-4 sm:p-6 border border-notion-border flex flex-col min-h-0 flex-1">
                        <CalendarGrid
                          onDateDoubleClick={() => setShowDayPanelInModal(true)}
                          allowFullHeight
                        />
                      </div>
                    )}
                    {monthlyModalTab === 'goals' && (
                      <div className="bg-notion-sidebar rounded-2xl shadow-none p-4 sm:p-5 border border-notion-border">
                        <GoalsAndBackwardsPlanSection />
                      </div>
                    )}
                    {/* 더블클릭/더블탭으로 연 일정 패널 오버레이 */}
                    {showDayPanelInModal && (
                      <div className="absolute inset-0 z-10 bg-notion-bg flex flex-col rounded-2xl overflow-hidden border border-notion-border">
                        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-notion-border bg-notion-sidebar">
                          <button
                            type="button"
                            onClick={() => setShowDayPanelInModal(false)}
                            className="touch-target flex items-center gap-2 min-h-[44px] px-3 text-sm font-medium text-notion-muted hover:text-notion-text"
                          >
                            ← 뒤로
                          </button>
                          <span className="text-sm text-notion-muted">{formatDateWithDay(selectedDate)}</span>
                        </div>
                        <div className="flex-1 min-h-0 overflow-auto">
                          <DayDetailPanel />
                        </div>
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

      {/* 시간표 이미지 임포트 모달 */}
      {showImportTimetable && (
        <ImportTimetableModal
          isOpen={showImportTimetable}
          onClose={() => setShowImportTimetable(false)}
        />
      )}
    </div>
  )
}
