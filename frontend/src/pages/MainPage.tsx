import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import Header from '@/components/layout/Header'
import MagicBar from '@/components/layout/MagicBar'
import CalendarGrid from '@/components/calendar/CalendarGrid'
import DayDetailPanel from '@/components/calendar/DayDetailPanel'
import MemoSidebar from '@/components/calendar/MemoSidebar'
import { TopTimeline } from '@/components/calendar/TopTimeline'
import { VerticalTimeline } from '@/components/calendar/VerticalTimeline'
import { ImportTimetableModal } from '@/components/calendar/ImportTimetableModal'
import { useCalendarStore } from '@/stores/calendarStore'
import { useGoalStore } from '@/stores/goalStore'
import { checkAuth, loadGoals } from '@/services/authService'
import { getSchedules } from '@/services/scheduleService'
import { useApiKeyStore } from '@/stores/apiKeyStore'

export default function MainPage() {
  const navigate = useNavigate()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [showImportTimetable, setShowImportTimetable] = useState(false)
  const [triggerAddModalInMonthly, setTriggerAddModalInMonthly] = useState(false)
  const [isWeekStripExpanded, setIsWeekStripExpanded] = useState(false)
  const [isMemoSidebarOpen, setIsMemoSidebarOpen] = useState(false)
  const skipNextScrollToTimeRef = useRef(false)
  const { setGoals } = useGoalStore()
  const { setTodos, viewMode } = useCalendarStore()
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
  
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 theme-transition bg-theme text-theme">
        <p className="text-sm text-theme-muted">로그인 상태를 확인하고 있어요...</p>
      </div>
    )
  }

  return (
    <div className="h-screen min-h-0 flex flex-col overflow-hidden theme-transition bg-theme text-theme">
      <Header
        onOpenImportTimetable={() => setShowImportTimetable(true)}
        onSwitchToWeekView={() => { skipNextScrollToTimeRef.current = true }}
        weekStripExpanded={viewMode === 'week' ? isWeekStripExpanded : undefined}
        onToggleWeekStrip={viewMode === 'week' ? () => setIsWeekStripExpanded((v) => !v) : undefined}
      />

      {/* 주간 모드: 헤더 아래·매직바 위에 주간 날짜 strip (토글 시 max-height 애니메이션) */}
      {viewMode === 'week' && (
        <div
          className="overflow-hidden"
          style={{
            maxHeight: isWeekStripExpanded ? 260 : 0,
            transition: 'max-height 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        >
          <TopTimeline
            isExpanded={isWeekStripExpanded}
            onCollapse={() => setIsWeekStripExpanded(false)}
          />
        </div>
      )}

      {/* 콘텐츠 영역: 월간일 때 [매직바+캘린더 컬럼 | 메모 사이드바] 로 배치해 매직바와 캘린더 좌우 정렬 */}
      <div className="flex-1 flex min-h-0 overflow-hidden theme-transition bg-theme relative">
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden theme-transition bg-theme relative">
          {/* 매직 바: 한 줄 자연어로 일정 추가 (월간 시 캘린더와 같은 컬럼이라 좌우 맞음) */}
          <div className="shrink-0 theme-transition bg-theme border-b border-theme">
            <MagicBar />
          </div>

          {/* 주간: 타임라인 / 월간: 캘린더+일정 패널 */}
          <main className="flex-1 flex flex-col overflow-hidden min-h-0 relative z-0 theme-transition bg-theme">
            {viewMode === 'week' && (
              <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden min-w-0">
                  <VerticalTimeline skipNextScrollToTimeRef={skipNextScrollToTimeRef} />
                </div>
              </div>
            )}

            {viewMode === 'month' && (
              <div className="flex-1 overflow-auto min-h-0 flex flex-col theme-transition bg-theme">
                <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 w-full theme-transition">
                  <CalendarGrid
                    allowFullHeight
                    onDateLongPress={() => {
                      if (typeof window !== 'undefined' && (window.innerWidth < 768 || 'ontouchstart' in window)) {
                        setTriggerAddModalInMonthly(true)
                      }
                    }}
                  />
                  <div className="mt-8 pt-8 border-t border-[var(--border-color)]">
                    <DayDetailPanel
                      embedded
                      openAddModal={triggerAddModalInMonthly}
                      onAddModalOpened={() => setTriggerAddModalInMonthly(false)}
                    />
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* 월간 + 사이드바 접힌 상태: 배경 위에 화살표만 떠 있게 (flex 영역 아님) */}
          {viewMode === 'month' && !isMemoSidebarOpen && (
            <button
              type="button"
              onClick={() => setIsMemoSidebarOpen(true)}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 flex items-center justify-center text-theme-muted/60 hover:text-theme-muted transition-colors rounded-md hover:bg-[var(--hover-bg)]/30"
              aria-label="메모 패널 펼치기"
            >
              <ChevronRight className="w-4 h-4" strokeWidth={2} />
            </button>
          )}
        </div>

        {/* 월간 + 사이드바 펼침: 메모 사이드바 */}
        {viewMode === 'month' && isMemoSidebarOpen && (
          <MemoSidebar onCollapse={() => setIsMemoSidebarOpen(false)} />
        )}
      </div>

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
