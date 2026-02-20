import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '@/components/layout/Header'
import MagicBar from '@/components/layout/MagicBar'
import CalendarGrid from '@/components/calendar/CalendarGrid'
import DayDetailPanel from '@/components/calendar/DayDetailPanel'
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
    <div className="min-h-screen flex flex-col theme-transition bg-theme text-theme">
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

      {/* 매직 바: 한 줄 자연어로 일정 추가 */}
      <div className="shrink-0 theme-transition bg-theme border-b border-theme">
        <MagicBar />
      </div>
      
      {/* 주간: 타임라인 / 월간: 캘린더+일정 패널 (같은 메인 영역에서 전환) */}
      <main className="flex-1 flex flex-col overflow-hidden min-h-0 relative z-0">
        {viewMode === 'week' && (
          <div className="flex-1 flex min-h-0 relative">
            <div className="flex-1 min-h-0">
              <VerticalTimeline skipNextScrollToTimeRef={skipNextScrollToTimeRef} />
            </div>
          </div>
        )}

        {viewMode === 'month' && (
          <div className="flex-1 overflow-auto theme-transition bg-theme flex flex-col min-h-0">
            <div className="flex-1 overflow-auto min-h-0">
              <div className="max-w-[1600px] mx-auto p-4 sm:p-6 xl:p-8">
                {/* 섹션 타이틀: 월간 플래너에 대한 기대감 */}
                <div className="mb-4 sm:mb-6">
                  <h2 className="text-theme font-bold text-lg sm:text-xl tracking-tight">
                    이번 달 일정
                  </h2>
                  <p className="text-theme-muted text-xs sm:text-sm mt-0.5">
                    날짜를 눌러 일정을 확인하고, 길게 눌러 추가하세요
                  </p>
                </div>

                {/* 모바일: 캘린더 + 선택한 날짜 일정을 하단에 표시 */}
                <div className="xl:hidden flex-1 min-h-0 flex flex-col">
                  <div className="monthly-planner-card neu-float rounded-2xl p-4 sm:p-6 flex flex-col min-h-0 overflow-hidden">
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
                    <div className="monthly-planner-card neu-float rounded-2xl p-8">
                      <CalendarGrid onDateLongPress={() => setTriggerAddModalInMonthly(true)} />
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 flex flex-col overflow-y-auto pr-2">
                    <div className="monthly-planner-card neu-float rounded-2xl flex flex-col min-h-0">
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
        )}
      </main>

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
