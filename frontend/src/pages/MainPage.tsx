import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '@/components/layout/Header'
import MagicBar from '@/components/layout/MagicBar'
import CalendarGrid from '@/components/calendar/CalendarGrid'
import DayDetailPanel from '@/components/calendar/DayDetailPanel'
import { TopTimeline } from '@/components/calendar/TopTimeline'
import { VerticalTimeline } from '@/components/calendar/VerticalTimeline'
import { ImportTimetableModal } from '@/components/calendar/ImportTimetableModal'
import { X } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
import { useGoalStore } from '@/stores/goalStore'
import { checkAuth, loadGoals } from '@/services/authService'
import { getSchedules } from '@/services/scheduleService'
import { useApiKeyStore } from '@/stores/apiKeyStore'

export default function MainPage() {
  const navigate = useNavigate()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [showMonthlyCalendar, setShowMonthlyCalendar] = useState(false)
  const [showImportTimetable, setShowImportTimetable] = useState(false)
  const [triggerAddModalInMonthly, setTriggerAddModalInMonthly] = useState(false)
  const skipNextScrollToTimeRef = useRef(false)
  const { setGoals } = useGoalStore()
  const { setTodos } = useCalendarStore()
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

  // 월간 모달 열릴 때 body 스크롤 잠금, 닫을 때 롱프레스 트리거 초기화
  useEffect(() => {
    if (!showMonthlyCalendar) {
      setTriggerAddModalInMonthly(false)
      return
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [showMonthlyCalendar])
  
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 theme-transition bg-theme text-theme">
        <p className="text-sm text-theme-muted">로그인 상태를 확인하고 있어요...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col theme-transition bg-theme text-theme">
      {/* 🎨 TopTimeline: 주간 히트맵 */}
      <TopTimeline />
      
      <Header
        onOpenMonthlyCalendar={() => setShowMonthlyCalendar(true)}
        onOpenImportTimetable={() => setShowImportTimetable(true)}
      />

      {/* 매직 바: 한 줄 자연어로 일정 추가 */}
      <div className="shrink-0 theme-transition bg-theme border-b border-theme">
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
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeMonthlyCalendar()
            }
          }}
        >
          <div 
            className="rounded-neu-lg w-full max-w-[1800px] max-h-[min(95vh,calc(100vh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem))] overflow-hidden flex flex-col theme-transition bg-theme-card"
            style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
          >
            {/* 상단: 제목 + 닫기 */}
            <div className="shrink-0 flex items-center justify-between px-4 py-3 theme-transition bg-theme-card border-b border-theme">
              <h2 className="text-lg font-semibold text-theme">월간 일정</h2>
              <button
                type="button"
                onClick={closeMonthlyCalendar}
                className="touch-target flex items-center justify-center min-w-[44px] min-h-[44px] p-2 rounded-lg transition-colors shrink-0 theme-transition hover:bg-[var(--hover-bg)]"
                style={{ color: 'var(--text-muted)' }}
                title="닫기 (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto theme-transition bg-theme flex flex-col min-h-0">
              <div className="flex-1 overflow-auto min-h-0">
                <div className="max-w-[1600px] mx-auto p-4 sm:p-6 xl:p-8">
                  {/* 모바일: 캘린더 + 선택한 날짜 일정을 하단에 표시 (단일 블록) */}
                  <div className="xl:hidden flex-1 min-h-0 flex flex-col">
                    <div className="neu-float rounded-2xl p-4 sm:p-6 flex flex-col min-h-0 overflow-hidden">
                      <CalendarGrid
                        allowFullHeight
                        onDateLongPress={() => setTriggerAddModalInMonthly(true)}
                      />
                      <div className="border-t border-theme mt-4 pt-4 flex flex-col min-h-[140px] max-h-[38vh] shrink-0 overflow-hidden">
                        <DayDetailPanel
                          embedded
                          openAddModal={triggerAddModalInMonthly}
                          onAddModalOpened={() => setTriggerAddModalInMonthly(false)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 데스크톱: 상하 배치 (캘린더 위 + 일정 패널 아래) */}
                  <div className="hidden xl:flex xl:flex-col gap-6 xl:gap-8">
                    <div className="shrink-0">
                      <div className="neu-float rounded-2xl p-8">
                        <CalendarGrid onDateLongPress={() => setTriggerAddModalInMonthly(true)} />
                      </div>
                    </div>
                    <div className="flex-1 min-h-0 flex flex-col overflow-y-auto pr-2">
                      <div className="neu-float rounded-2xl flex flex-col min-h-0">
                        <DayDetailPanel
                          openAddModal={triggerAddModalInMonthly}
                          onAddModalOpened={() => setTriggerAddModalInMonthly(false)}
                        />
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
