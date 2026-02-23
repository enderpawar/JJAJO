import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const MOBILE_BREAKPOINT = 768
/** 날짜별 일정 시트 대략 높이(px) — 선택한 주가 시트 위에 보이도록 스크롤할 때 사용 */
const DAY_SHEET_HEIGHT_PX = 420

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

import Header from '@/components/layout/Header'
import BottomNav from '@/components/layout/BottomNav'
import MobileCalendarTodoSwitcher from '@/components/layout/MobileCalendarTodoSwitcher'
import MagicBar from '@/components/layout/MagicBar'
import CalendarGrid from '@/components/calendar/CalendarGrid'
import DayDetailPanel from '@/components/calendar/DayDetailPanel'
import DayDetailBottomSheet from '@/components/calendar/DayDetailBottomSheet'
import { TopTimeline } from '@/components/calendar/TopTimeline'
import { VerticalTimeline } from '@/components/calendar/VerticalTimeline'
import { ImportTimetableModal } from '@/components/calendar/ImportTimetableModal'
import MobileSettingsPage from '@/components/layout/MobileSettingsPage'
import { FocusModeView } from '@/components/calendar/FocusModeView'
import { cn } from '@/utils/cn'
import { ChevronRight, ListTodo } from 'lucide-react'
import { formatDate } from '@/utils/dateUtils'
import { useCalendarStore } from '@/stores/calendarStore'
import { useGoalStore } from '@/stores/goalStore'
import { checkAuth, loadGoals } from '@/services/authService'
import { getSchedules } from '@/services/scheduleService'
import { useApiKeyStore } from '@/stores/apiKeyStore'

export default function MainPage() {
  const navigate = useNavigate()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [showImportTimetable, setShowImportTimetable] = useState(false)
  const [isWeekStripExpanded, setIsWeekStripExpanded] = useState(false)
  const [openDaySheet, setOpenDaySheet] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [mobileSettingsPageOpen, setMobileSettingsPageOpen] = useState(false)
  const [focusModeOpen, setFocusModeOpen] = useState(false)
  const [openAddModalFromFab, setOpenAddModalFromFab] = useState(false)
  /** PC 월간 뷰: 할일 목록 사이드바 펼침 여부. 접으면 캘린더 중앙 정렬, 펼치면 캘린더가 좌측으로 밀림 */
  const [pcTodoSidebarOpen, setPcTodoSidebarOpen] = useState(true)
  const skipNextScrollToTimeRef = useRef(false)
  const magicBarRef = useRef<{ focus: () => void } | null>(null)
  const calendarScrollRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()
  const { setGoals } = useGoalStore()
  const { setTodos, viewMode, setViewMode, selectedDate } = useCalendarStore()
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

  // 모바일에서 날짜 탭 시 일정 시트가 열리면, 해당 주가 시트 위에 보이도록 캘린더 스크롤(배경 블러 없이)
  useEffect(() => {
    if (!isMobile || viewMode !== 'month' || !openDaySheet) return
    const scrollToSelectedWeek = () => {
      const container = calendarScrollRef.current
      const dateStr = formatDate(selectedDate)
      const cell = container?.querySelector(`[data-date="${dateStr}"]`) as HTMLElement | null
      if (!container || !cell) return
      const dateGrid = cell.closest('.calendar-date-grid')
      const weekBlock = dateGrid?.parentElement as HTMLElement | null
      const targetEl = weekBlock || cell
      const containerRect = container.getBoundingClientRect()
      const targetRect = targetEl.getBoundingClientRect()
      const targetBottom = containerRect.bottom - DAY_SHEET_HEIGHT_PX
      const targetScrollTop = container.scrollTop + (targetRect.bottom - targetBottom)
      container.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' })
    }
    const t = setTimeout(scrollToSelectedWeek, 150)
    return () => clearTimeout(t)
  }, [isMobile, viewMode, openDaySheet, selectedDate])

  // 모바일에서 날짜 탭 시 일정 시트가 열리면, 해당 주가 시트 위에 보이도록 캘린더 스크롤(배경 블러 없이)
  useEffect(() => {
    if (!isMobile || viewMode !== 'month' || !openDaySheet) return
    const scrollToSelectedWeek = () => {
      const container = calendarScrollRef.current
      const dateStr = formatDate(selectedDate)
      const cell = container?.querySelector(`[data-date="${dateStr}"]`) as HTMLElement | null
      if (!container || !cell) return
      const dateGrid = cell.closest('.calendar-date-grid')
      const weekBlock = dateGrid?.parentElement as HTMLElement | null
      const targetEl = weekBlock || cell
      const containerRect = container.getBoundingClientRect()
      const targetRect = targetEl.getBoundingClientRect()
      const targetBottom = containerRect.bottom - DAY_SHEET_HEIGHT_PX
      const targetScrollTop = container.scrollTop + (targetRect.bottom - targetBottom)
      container.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' })
    }
    const t = setTimeout(scrollToSelectedWeek, 150)
    return () => clearTimeout(t)
  }, [isMobile, viewMode, openDaySheet, selectedDate])

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
        isSettingsOpen={isSettingsOpen}
        onSettingsOpenChange={setIsSettingsOpen}
      />

      {/* 콘텐츠 영역: 월간일 때 [매직바+캘린더 | 우측 일정 패널]. 모바일 시 하단 메뉴바 높이만큼 패딩 */}
      <div className={cn('flex-1 flex min-h-0 overflow-hidden theme-transition bg-theme relative', isMobile && 'pb-bottom-nav')}>
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden theme-transition bg-theme relative">
          {/* 매직 바: PC·모바일 동일하게 헤더 바로 아랫줄에 상시 표시 */}
          <div className="shrink-0 theme-transition bg-theme border-b border-theme">
            <MagicBar ref={magicBarRef} />
          </div>

          {/* 주간 모드: 매직바 바로 밑에 주간 날짜 strip (헤더에서 2월 2026 클릭 시 펼침/접힘) */}
          {viewMode === 'week' && (
            <div
              className="overflow-hidden border-b border-theme theme-transition"
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

          {/* 주간: 타임라인 / 월간: 캘린더+일정 패널. 모바일은 좌우 스와이프로 전환 */}
          <main className="flex-1 flex flex-col overflow-hidden min-h-0 relative z-0 theme-transition bg-theme">
            {isMobile ? (
              <MobileCalendarTodoSwitcher
                viewMode={viewMode}
                onViewModeChange={(mode) => {
                  setViewMode(mode)
                  if (mode === 'week') skipNextScrollToTimeRef.current = true
                }}
                calendarPanel={
                  <div ref={calendarScrollRef} className="h-full overflow-auto flex flex-col theme-transition bg-theme">
                    <div
                      className="max-w-2xl mx-auto px-4 py-6 sm:py-8 w-full theme-transition bg-theme flex-1"
                      style={
                        openDaySheet
                          ? { paddingBottom: `min(70vh, ${DAY_SHEET_HEIGHT_PX + 40}px)` }
                          : undefined
                      }
                    >
                      <CalendarGrid
                        allowFullHeight
                        onDateSelect={() => setOpenDaySheet(true)}
                      />
                    </div>
                  </div>
                }
                todoPanel={
                  <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden min-w-0">
                      <VerticalTimeline skipNextScrollToTimeRef={skipNextScrollToTimeRef} />
                    </div>
                  </div>
                }
              />
            ) : (
              <>
                {viewMode === 'week' && (
                  <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden min-w-0">
                      <VerticalTimeline skipNextScrollToTimeRef={skipNextScrollToTimeRef} />
                    </div>
                  </div>
                )}

                {viewMode === 'month' && (
                  <div className="flex-1 flex min-h-0 overflow-hidden theme-transition bg-theme relative">
                    {/* 헤더의 2월 2026과 동일한 중앙 정렬: max-w-screen-2xl 기준으로 캘린더 중앙 컬럼 고정 */}
                    <div
                      className={cn(
                        'w-full max-w-screen-2xl mx-auto grid min-h-0',
                        pcTodoSidebarOpen ? 'grid-cols-[400px_42rem_400px]' : 'grid-cols-[1fr_42rem_1fr]'
                      )}
                    >
                      <div className="min-w-0 min-h-0" aria-hidden />
                      <div ref={calendarScrollRef} className="overflow-auto min-h-0 min-w-0 theme-transition bg-theme">
                        <div className="w-full px-4 py-6 sm:py-8 theme-transition bg-theme">
                          <CalendarGrid
                            allowFullHeight
                            onDateSelect={undefined}
                          />
                        </div>
                      </div>
                      <aside
                        className={cn(
                          'flex flex-row min-h-0 bg-theme theme-transition overflow-hidden',
                          pcTodoSidebarOpen && 'border-l border-[var(--border-color)]'
                        )}
                        style={{
                          width: pcTodoSidebarOpen ? undefined : 0,
                          minWidth: 0,
                          transition: 'width 0.28s cubic-bezier(0.32, 0.72, 0, 1), min-width 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
                        }}
                      >
                        {pcTodoSidebarOpen && (
                          <>
                            <button
                              type="button"
                              onClick={() => setPcTodoSidebarOpen(false)}
                              className="shrink-0 w-10 flex flex-col items-center justify-center gap-1 py-4 border-r border-[var(--border-color)] bg-theme hover:bg-theme-hover text-theme-muted hover:text-theme transition-colors"
                              aria-label="할일 목록 접기"
                              title="할일 목록 접기"
                            >
                              <ChevronRight className="w-5 h-5 shrink-0" />
                              <span className="text-[10px] font-medium" style={{ writingMode: 'vertical-rl' }}>접기</span>
                            </button>
                            <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden animate-sidebar-content-in">
                              <DayDetailPanel
                                embedded
                                openAddModal={false}
                                onAddModalOpened={() => {}}
                              />
                            </div>
                          </>
                        )}
                      </aside>
                    </div>
                    {/* 접힌 상태: 우측 고정 탭 등장 애니메이션 */}
                    {!pcTodoSidebarOpen && (
                      <button
                        type="button"
                        onClick={() => setPcTodoSidebarOpen(true)}
                        className="fixed right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-16 flex flex-col items-center justify-center gap-1 py-2 rounded-l-neu border border-r-0 border-[var(--border-color)] bg-theme hover:bg-theme-hover shadow-md transition-colors animate-sidebar-tab-in"
                        style={{ marginTop: 0 }}
                        aria-label="할일 목록 펼치기"
                        title="할일 목록 펼치기"
                      >
                        <ListTodo className="w-5 h-5 text-theme-muted shrink-0" />
                        <span className="text-[10px] font-medium text-theme-muted" style={{ writingMode: 'vertical-rl' }}>
                          할일
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </main>

          </div>
      </div>

      {/* 모바일: 설정 전체 화면 페이지 (하단 탭 설정 탭) */}
      {isMobile && mobileSettingsPageOpen && (
        <MobileSettingsPage onClose={() => setMobileSettingsPageOpen(false)} />
      )}

      {/* 모바일: 포커스 모드 전체 화면 (진행 중 일정 + 종료까지 남은 시간 타이머) */}
      {isMobile && focusModeOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col theme-transition bg-theme"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
            paddingLeft: 'env(safe-area-inset-left)',
            paddingRight: 'env(safe-area-inset-right)',
          }}
          role="dialog"
          aria-modal="true"
          aria-label="포커스 모드"
        >
          <FocusModeView onClose={() => setFocusModeOpen(false)} showCloseButton />
        </div>
      )}

      {/* 모바일 월간: 날짜 클릭 시 하단 시트(해당 날짜 일정). + 버튼으로 인라인 추가 트리거 */}
      {viewMode === 'month' && isMobile && (
        <DayDetailBottomSheet
          open={openDaySheet}
          onClose={() => setOpenDaySheet(false)}
          openAddModal={openAddModalFromFab}
          onAddModalOpened={() => setOpenAddModalFromFab(false)}
        />
      )}

      {/* 모바일 전용: 하단 메뉴바 (캘린더 / FAB / 할일 / 포커스 / 설정) */}
      {isMobile && (
        <BottomNav
          isFocusOpen={focusModeOpen}
          onOpenFocus={() => setFocusModeOpen(true)}
          onCloseFocus={() => setFocusModeOpen(false)}
          onSwitchToWeekView={() => { skipNextScrollToTimeRef.current = true }}
          onAddSchedule={() => {
            setViewMode('month')
            setOpenDaySheet(true)
            setOpenAddModalFromFab(true)
          }}
          onOpenSettings={() => setMobileSettingsPageOpen(true)}
        />
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
