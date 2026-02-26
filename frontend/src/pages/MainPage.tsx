import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

/** 768: 기존. 1025로 올려 iPad/태블릿(~1024px)에서 캘린더 중앙 정렬(모바일 레이아웃) 사용 */
const MOBILE_BREAKPOINT = 1025
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
import { checkAuth } from '@/services/authService'
import { getSchedules, createSchedule, deleteSchedule, deleteAllSchedules } from '@/services/scheduleService'
import { useApiKeyStore } from '@/stores/apiKeyStore'
import { useToastStore } from '@/stores/toastStore'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ConfirmModal } from '@/components/ConfirmModal'
import { hapticLight } from '@/utils/haptic'

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
  const calendarSlideContainerRef = useRef<HTMLDivElement>(null)
  const calendarTouchStartX = useRef(0)
  const calendarTouchStartY = useRef(0)
  const isMobile = useIsMobile()
  const { setTodos, viewMode, setViewMode, selectedDate, currentMonth, setCurrentMonth, copyTodosFromPreviousDay, addTodos, getTodosByDate, deleteTodo, addTodo, clearAllTodos, clearTodosInMonth, todos, setSelectionDimmed } = useCalendarStore()
  const { addToast } = useToastStore()
  const loadApiKeyForCurrentUser = useApiKeyStore((s) => s.loadApiKeyForCurrentUser)
  const [showResetDayConfirm, setShowResetDayConfirm] = useState(false)
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false)
  const [showClearMonthConfirm, setShowClearMonthConfirm] = useState(false)
  const [isCopying, setIsCopying] = useState(false)
  const [isResettingDay, setIsResettingDay] = useState(false)
  const [isClearingAll, setIsClearingAll] = useState(false)
  const [, setIsClearingMonth] = useState(false)
  /** 모바일 월간 캘린더 슬라이드: 드래그 오프셋(px), 0이면 드래그 중 아님 */
  const [calendarDragOffsetPx, setCalendarDragOffsetPx] = useState(0)
  const [calendarIsDragging, setCalendarIsDragging] = useState(false)
  /** 슬라이드 스냅 애니메이션 후 월 전환 시 사용. -100=prev, 0=center, 100=next 방향으로 이동 중 */
  const calendarSlideTargetRef = useRef<'prev' | 'next' | null>(null)
  const calendarSlideJustResetRef = useRef(false)
  const calendarSlideFromMonthRef = useRef<Date>(new Date())
  /** 가로 스와이프 중일 때 세로 스크롤 방지용 (preventDefault 호출) */
  const calendarHorizontalSwipeRef = useRef(false)
  /** 터치 시작 시 캘린더 세로 스크롤 위치 (가로 스와이프 시 복원용) */
  const calendarScrollTopOnTouchStartRef = useRef(0)
  /** transitionend 미발생 시 슬라이드 완료 처리용 폴백 타이머 */
  const calendarSlideFallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** 확인 모달(하루 초기화/전체 비우기/월간 비우기)이 열려 있을 때 캘린더 선택 하이라이트 제거 */
  useEffect(() => {
    const open = showResetDayConfirm || showClearAllConfirm || showClearMonthConfirm
    setSelectionDimmed(open)
    return () => setSelectionDimmed(false)
  }, [showResetDayConfirm, showClearAllConfirm, showClearMonthConfirm, setSelectionDimmed])

  // 플래너 진입 시 인증 확인 + 회원별 일정 로드
  useEffect(() => {
    const init = async () => {
      try {
        await checkAuth()
        // 인증 후 userId가 설정되면, 해당 계정에 대한 Gemini API 키를 localStorage에서 불러온다
        loadApiKeyForCurrentUser()
        const schedules = await getSchedules().catch(() => [])
        setTodos(schedules)
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
  }, [navigate, setTodos, loadApiKeyForCurrentUser])

  /** 메인 앱 레이아웃: 문서(body) 스크롤 방지 — 스크롤은 캘린더/타임라인 내부만 */
  useEffect(() => {
    document.documentElement.classList.add('main-app-layout')
    return () => document.documentElement.classList.remove('main-app-layout')
  }, [])

  /** 슬라이드 월 전환 후 오프셋 리셋 시 트랜지션 없이 바로 보이도록, 리셋 플래그를 한 프레임 후 해제 */
  useEffect(() => {
    if (calendarDragOffsetPx === 0) {
      calendarSlideJustResetRef.current = false
    }
  }, [calendarDragOffsetPx])

  /** 모바일 캘린더: 가로 스와이프로 판단되면 같은 touchmove에서 즉시 preventDefault (세로 스크롤 고정) */
  useEffect(() => {
    if (!isMobile) return
    const el = calendarSlideContainerRef.current
    if (!el) return
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      // 이미 수평 스와이프로 판정된 제스처면 이후에도 계속 preventDefault (세로 기울어져도 스크롤 고정 유지)
      if (calendarHorizontalSwipeRef.current) {
        if (e.cancelable) e.preventDefault()
        return
      }
      const deltaX = e.touches[0].clientX - calendarTouchStartX.current
      const deltaY = e.touches[0].clientY - calendarTouchStartY.current
      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)
      const isHorizontal = absX > absY && absX > 8
      if (isHorizontal) {
        calendarHorizontalSwipeRef.current = true
        if (e.cancelable) e.preventDefault()
      }
    }
    el.addEventListener('touchmove', onTouchMove, { passive: false, capture: true })
    return () => el.removeEventListener('touchmove', onTouchMove, { capture: true })
  }, [isMobile])

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

  const handleCopyPreviousDay = async () => {
    if (isCopying) return
    const { toCopy, excluded } = copyTodosFromPreviousDay()
    if (toCopy.length === 0 && excluded.length === 0) {
      addToast('어제 일정이 없습니다.')
      return
    }
    excluded.forEach(({ title, startTime, endTime }) => {
      addToast(`${startTime}~${endTime}에 있는 「${title}」이 중복되어 제외했습니다!`)
    })
    if (toCopy.length === 0) return
    const optimisticIds = new Set(toCopy.map((t) => t.id))
    addTodos(toCopy)
    setIsCopying(true)
    try {
      const created = await Promise.all(
        toCopy.map((t) =>
          createSchedule({
            title: t.title,
            description: t.description ?? '',
            date: t.date,
            startTime: t.startTime ?? '',
            endTime: t.endTime ?? '',
            status: t.status,
            priority: t.priority,
            createdBy: t.createdBy,
          })
        )
      )
      const { todos: storeTodos, setTodos: setStoreTodos } = useCalendarStore.getState()
      setStoreTodos(
        storeTodos.map((t) => {
          const idx = toCopy.findIndex((c) => c.id === t.id)
          if (idx >= 0) return { ...created[idx], clientKey: t.id }
          return t
        })
      )
      addToast(`어제 일정 ${created.length}개를 ${format(selectedDate, 'M월 d일', { locale: ko })}로 가져왔습니다!`)
    } catch (e) {
      const { todos: storeTodos, setTodos: setStoreTodos } = useCalendarStore.getState()
      setStoreTodos(storeTodos.filter((t) => !optimisticIds.has(t.id)))
      const message = e instanceof Error ? e.message : '일정 저장 실패'
      addToast(`저장 중 오류: ${message}`)
    } finally {
      setIsCopying(false)
    }
  }

  const handleResetDay = async () => {
    const dateStr = formatDate(selectedDate)
    const toDelete = getTodosByDate(dateStr)
    if (toDelete.length === 0) {
      setShowResetDayConfirm(false)
      addToast('해당 날짜에 일정이 없어요.')
      return
    }
    const copies = toDelete.map((t) => ({ ...t }))
    setIsResettingDay(true)
    setShowResetDayConfirm(false)
    toDelete.forEach((t) => deleteTodo(t.id))
    const serverIds = toDelete.filter((t) => !t.id.startsWith('opt-'))
    const results = await Promise.allSettled(serverIds.map((t) => deleteSchedule(t.id)))
    const failed = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[]
    if (failed.length > 0) {
      copies.forEach((t) => addTodo(t))
      const msg = failed[0].reason instanceof Error ? failed[0].reason.message : String(failed[0].reason)
      addToast(`일정 일부 삭제 실패: ${msg}`)
    } else if (toDelete.length > 0) {
      addToast(`${format(selectedDate, 'M월 d일', { locale: ko })} 일정 ${toDelete.length}개를 초기화했어요`)
    }
    setIsResettingDay(false)
  }

  const handleClearAllSchedules = async () => {
    if (todos.length === 0) {
      setShowClearAllConfirm(false)
      addToast('삭제할 일정이 없어요.')
      return
    }
    const count = todos.length
    const copies = todos.map((t) => ({ ...t }))
    setIsClearingAll(true)
    setShowClearAllConfirm(false)
    clearAllTodos()
    try {
      await deleteAllSchedules()
      addToast(`전체 일정 ${count}개를 비웠어요.`)
    } catch (e) {
      const { setTodos: setStoreTodos } = useCalendarStore.getState()
      setStoreTodos(copies)
      const message = e instanceof Error ? e.message : '일정 삭제 실패'
      addToast(`전체 삭제 실패: ${message}`)
    } finally {
      setIsClearingAll(false)
    }
  }

  /** 헤더 currentMonth 기준 해당 월 일정만 비우기 (FAB 롱프레스 → 월간 일정 비우기) */
  const handleClearMonthSchedules = async () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const inMonth = (d: string) => {
      const t = new Date(d + 'T12:00:00')
      return t.getFullYear() === year && t.getMonth() === month
    }
    const toRemove = todos.filter((t) => inMonth(t.date))
    if (toRemove.length === 0) {
      setShowClearMonthConfirm(false)
      addToast('해당 월에 삭제할 일정이 없어요.')
      return
    }
    const count = toRemove.length
    const copies = todos.map((t) => ({ ...t }))
    const serverIds = toRemove.filter((t) => t.id && !t.id.startsWith('opt-')).map((t) => t.id)
    setIsClearingMonth(true)
    setShowClearMonthConfirm(false)
    clearTodosInMonth(year, month)
    try {
      await Promise.allSettled(serverIds.map((id) => deleteSchedule(id)))
      addToast(`${format(currentMonth, 'M월', { locale: ko })} 일정 ${count}개를 비웠어요.`)
    } catch (e) {
      const { setTodos: setStoreTodos } = useCalendarStore.getState()
      setStoreTodos(copies)
      const message = e instanceof Error ? e.message : '일정 삭제 실패'
      addToast(`월간 비우기 실패: ${message}`)
    } finally {
      setIsClearingMonth(false)
    }
  }

  /** 모바일 캘린더: 좌우 스와이프로 이전/다음 월 이동 (슬라이드 애니메이션). d는 Date 또는 직렬화된 값(문자열 등) 허용 */
  const toDate = (d: Date | string | number): Date => (d instanceof Date ? d : new Date(d))
  const getPrevMonth = (d: Date | string | number) => {
    const date = toDate(d)
    return new Date(date.getFullYear(), date.getMonth() - 1, 1)
  }
  const getNextMonth = (d: Date | string | number) => {
    const date = toDate(d)
    return new Date(date.getFullYear(), date.getMonth() + 1, 1)
  }

  const handleCalendarSlideTransitionEnd = (e: React.TransitionEvent) => {
    if (e.propertyName !== 'transform' || e.target !== e.currentTarget) return
    const target = calendarSlideTargetRef.current
    const fromMonth = calendarSlideFromMonthRef.current
    if (calendarSlideFallbackTimeoutRef.current !== null) {
      clearTimeout(calendarSlideFallbackTimeoutRef.current)
      calendarSlideFallbackTimeoutRef.current = null
    }
    if (target === 'prev') {
      setCurrentMonth(getPrevMonth(fromMonth))
      hapticLight()
    } else if (target === 'next') {
      setCurrentMonth(getNextMonth(fromMonth))
      hapticLight()
    }
    calendarSlideTargetRef.current = null
    calendarSlideJustResetRef.current = true
    setCalendarDragOffsetPx(0)
  }

  const handleCalendarTouchStart = (e: React.TouchEvent) => {
    calendarTouchStartX.current = e.touches[0].clientX
    calendarTouchStartY.current = e.touches[0].clientY
    calendarHorizontalSwipeRef.current = false
    calendarScrollTopOnTouchStartRef.current = calendarScrollRef.current?.scrollTop ?? 0
    setCalendarIsDragging(true)
  }
  /** 캡처 단계에서 호출: 좌우 슬라이드로 판단되면 preventDefault로 상하 스크롤 차단 */
  const handleCalendarTouchMoveCapture = (e: React.TouchEvent) => {
    const deltaX = e.touches[0].clientX - calendarTouchStartX.current
    const deltaY = e.touches[0].clientY - calendarTouchStartY.current
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)
    if (absX > absY && absX > 8) {
      e.preventDefault()
    }
  }

  const handleCalendarTouchMove = (e: React.TouchEvent) => {
    const container = calendarSlideContainerRef.current
    if (!container || calendarSlideTargetRef.current !== null) return
    const deltaX = e.touches[0].clientX - calendarTouchStartX.current
    const deltaY = e.touches[0].clientY - calendarTouchStartY.current
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)
    if (absX > absY && absX > 8) {
      calendarHorizontalSwipeRef.current = true
      const width = container.offsetWidth
      const maxDrag = width * 0.45
      const clamped = Math.max(-maxDrag, Math.min(maxDrag, deltaX))
      setCalendarDragOffsetPx(clamped)
    }
  }
  const handleCalendarTouchEnd = (e: React.TouchEvent) => {
    const endX = e.changedTouches[0].clientX
    const endY = e.changedTouches[0].clientY
    const deltaX = endX - calendarTouchStartX.current
    const deltaY = endY - calendarTouchStartY.current
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)
    const container = calendarSlideContainerRef.current
    const width = container?.offsetWidth ?? 300
    const threshold = width * 0.22

    const didHorizontalSwipe = calendarHorizontalSwipeRef.current
    calendarHorizontalSwipeRef.current = false
    setCalendarIsDragging(false)
    if (calendarSlideTargetRef.current !== null) return

    if (didHorizontalSwipe && calendarScrollRef.current) {
      calendarScrollRef.current.scrollTop = calendarScrollTopOnTouchStartRef.current
    }

    if (absX > absY && absX > 50) {
      if (deltaX > threshold) {
        calendarSlideTargetRef.current = 'prev'
        calendarSlideFromMonthRef.current = toDate(currentMonth)
        setCalendarDragOffsetPx(width)
        if (calendarSlideFallbackTimeoutRef.current !== null) clearTimeout(calendarSlideFallbackTimeoutRef.current)
        calendarSlideFallbackTimeoutRef.current = setTimeout(() => {
          calendarSlideFallbackTimeoutRef.current = null
          if (calendarSlideTargetRef.current !== 'prev') return
          const from = calendarSlideFromMonthRef.current
          setCurrentMonth(getPrevMonth(from))
          hapticLight()
          calendarSlideTargetRef.current = null
          calendarSlideJustResetRef.current = true
          setCalendarDragOffsetPx(0)
        }, 500)
      } else if (deltaX < -threshold) {
        calendarSlideTargetRef.current = 'next'
        calendarSlideFromMonthRef.current = toDate(currentMonth)
        setCalendarDragOffsetPx(-width)
        if (calendarSlideFallbackTimeoutRef.current !== null) clearTimeout(calendarSlideFallbackTimeoutRef.current)
        calendarSlideFallbackTimeoutRef.current = setTimeout(() => {
          calendarSlideFallbackTimeoutRef.current = null
          if (calendarSlideTargetRef.current !== 'next') return
          const from = calendarSlideFromMonthRef.current
          setCurrentMonth(getNextMonth(from))
          hapticLight()
          calendarSlideTargetRef.current = null
          calendarSlideJustResetRef.current = true
          setCalendarDragOffsetPx(0)
        }, 500)
      }
    }
    if (calendarSlideTargetRef.current === null) {
      setCalendarDragOffsetPx(0)
    }
  }

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
        setShowResetDayConfirm={setShowResetDayConfirm}
        setShowClearAllConfirm={setShowClearAllConfirm}
        onCopyPreviousDay={handleCopyPreviousDay}
        isCopying={isCopying}
        isResettingDay={isResettingDay}
        isClearingAll={isClearingAll}
        todosOnSelectedDayCount={getTodosByDate(formatDate(selectedDate)).length}
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
              className="shrink-0 overflow-hidden border-b border-theme theme-transition"
              style={{
                maxHeight: isWeekStripExpanded ? 168 : 0,
                transition: 'max-height 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
              }}
            >
              <TopTimeline
                isExpanded={isWeekStripExpanded}
                onCollapse={() => setIsWeekStripExpanded(false)}
              />
            </div>
          )}

          {/* 주간: 타임라인 / 월간: 캘린더+일정 패널. 모바일은 탭으로 전환, 캘린더에서 좌우 스와이프 시 이전/다음 월 */}
          <main className="flex-1 flex flex-col overflow-hidden min-h-0 relative z-0 theme-transition bg-theme">
            {isMobile ? (
              <MobileCalendarTodoSwitcher
                viewMode={viewMode}
                onViewModeChange={(mode) => {
                  setViewMode(mode)
                  if (mode === 'week') skipNextScrollToTimeRef.current = true
                }}
                calendarPanel={
                  <div
                    ref={calendarSlideContainerRef}
                    className="h-full overflow-hidden touch-pan-y"
                    onTouchStart={handleCalendarTouchStart}
                    onTouchMove={handleCalendarTouchMove}
                    onTouchMoveCapture={handleCalendarTouchMoveCapture}
                    onTouchEnd={handleCalendarTouchEnd}
                    onTouchCancel={handleCalendarTouchEnd}
                  >
                    <div
                      className="flex h-full will-change-transform"
                      style={{
                        width: '300%',
                        transform: `translate3d(calc(-33.333% + ${calendarDragOffsetPx}px), 0, 0)`,
                        transition: calendarIsDragging || calendarSlideJustResetRef.current
                          ? 'none'
                          : 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
                      }}
                      onTransitionEnd={handleCalendarSlideTransitionEnd}
                    >
                      {(() => {
                        const visualMonth =
                          calendarSlideJustResetRef.current && calendarDragOffsetPx !== 0
                            ? calendarSlideFromMonthRef.current
                            : currentMonth
                        const base = toDate(visualMonth)
                        const panels = [getPrevMonth(base), base, getNextMonth(base)]
                        return panels.map((month, idx) => (
                        <div
                          key={month.getTime()}
                          className="w-1/3 h-full flex-shrink-0 flex flex-col overflow-hidden"
                        >
                          <div
                            ref={idx === 1 ? calendarScrollRef : undefined}
                            className="h-full overflow-auto scrollbar-none calendar-scroll-area overscroll-contain flex flex-col theme-transition bg-theme"
                          >
                            <div
                              className="max-w-2xl mx-auto px-4 py-6 sm:py-8 w-full theme-transition bg-theme flex-1"
                              style={
                                openDaySheet && idx === 1
                                  ? { paddingBottom: `min(70vh, ${DAY_SHEET_HEIGHT_PX + 40}px)` }
                                  : undefined
                              }
                            >
                              <CalendarGrid
                                allowFullHeight
                                displayMonth={idx !== 1 ? month : undefined}
                                onDateSelect={idx === 1 ? () => setOpenDaySheet(true) : undefined}
                              />
                            </div>
                          </div>
                        </div>
                      ))})()}
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
              /* PC: 캘린더 ↔ 할일 전환 시 슬라이드 애니메이션 */
              <div className="flex-1 min-h-0 overflow-hidden relative">
                <div
                  className="flex h-full will-change-transform"
                  style={{
                    width: '200%',
                    transform: viewMode === 'month' ? 'translate3d(0, 0, 0)' : 'translate3d(-50%, 0, 0)',
                    transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
                  }}
                >
                  <div className="w-1/2 h-full min-h-0 flex flex-col shrink-0 overflow-hidden">
                    <div className="flex-1 flex min-h-0 overflow-hidden theme-transition bg-theme relative">
                      <div
                        className={cn(
                          'w-full max-w-screen-2xl mx-auto grid min-h-0',
                          pcTodoSidebarOpen ? 'grid-cols-[400px_42rem_400px]' : 'grid-cols-[1fr_42rem_1fr]'
                        )}
                      >
                        <div className="min-w-0 min-h-0" aria-hidden />
                        <div ref={calendarScrollRef} className="overflow-auto scrollbar-none calendar-scroll-area min-h-0 min-w-0 theme-transition bg-theme">
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
                    </div>
                  </div>
                  <div className="w-1/2 h-full min-h-0 flex flex-col shrink-0 overflow-hidden">
                    <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
                      <div className="flex-1 flex flex-col min-h-0 overflow-hidden min-w-0">
                        <VerticalTimeline skipNextScrollToTimeRef={skipNextScrollToTimeRef} />
                      </div>
                    </div>
                  </div>
                </div>
                {/* 펼치기 버튼: transform 밖에 두어 뷰포트 기준 fixed가 동작하도록 */}
                {viewMode === 'month' && !pcTodoSidebarOpen && (
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
          onOpenImportTimetable={() => setShowImportTimetable(true)}
          onCopyPreviousDay={handleCopyPreviousDay}
          onResetDayConfirm={() => setShowResetDayConfirm(true)}
          onClearMonthConfirm={() => setShowClearMonthConfirm(true)}
        />
      )}

      {/* 시간표 이미지 임포트 모달 */}
      {showImportTimetable && (
        <ImportTimetableModal
          isOpen={showImportTimetable}
          onClose={() => setShowImportTimetable(false)}
        />
      )}

      {/* 하루 일정 초기화 / 전체 일정 비우기 확인 모달 (모바일 FAB 롱프레스 메뉴 등에서 사용) */}
      <ConfirmModal
        isOpen={showResetDayConfirm}
        onClose={() => { setShowResetDayConfirm(false); setSelectionDimmed(false) }}
        onConfirm={handleResetDay}
        title="하루 일정 초기화"
        message={`선택한 날짜(${format(selectedDate, 'M월 d일', { locale: ko })})의 일정 ${getTodosByDate(formatDate(selectedDate)).length}개를 모두 삭제할까요? 되돌릴 수 없어요.`}
        confirmLabel="전체 삭제"
        danger
      />
      <ConfirmModal
        isOpen={showClearAllConfirm}
        onClose={() => { setShowClearAllConfirm(false); setSelectionDimmed(false) }}
        onConfirm={handleClearAllSchedules}
        title="전체 일정 비우기"
        message={`전체 일정 ${todos.length}개를 모두 삭제할까요? 되돌릴 수 없어요.`}
        confirmLabel="전체 삭제"
        danger
      />
      <ConfirmModal
        isOpen={showClearMonthConfirm}
        onClose={() => { setShowClearMonthConfirm(false); setSelectionDimmed(false) }}
        onConfirm={handleClearMonthSchedules}
        title="월간 일정 비우기"
        message={(() => {
          const year = currentMonth.getFullYear()
          const month = currentMonth.getMonth()
          const inMonth = (d: string) => {
            const t = new Date(d + 'T12:00:00')
            return t.getFullYear() === year && t.getMonth() === month
          }
          const count = todos.filter((t) => inMonth(t.date)).length
          return `${format(currentMonth, 'yyyy년 M월', { locale: ko })} 일정 ${count}개를 모두 삭제할까요? 되돌릴 수 없어요.`
        })()}
        confirmLabel="전체 삭제"
        danger
      />
    </div>
  )
}
