import { useState, useEffect, useRef } from 'react'
import { Menu } from '@headlessui/react'
import { Settings, X, Copy, CalendarDays, LogIn, RotateCcw, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, MoreVertical, Moon, Sun, Trash2 } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { TimeSlotSettings } from '@/components/settings/TimeSlotSettings'
import { ApiKeySettings } from '@/components/settings/ApiKeySettings'
import { ScheduleDataSettings } from '@/components/settings/ScheduleDataSettings'
import { getApiBase } from '@/utils/api'
import { createSchedule, deleteSchedule, deleteAllSchedules } from '@/services/scheduleService'
import { useToastStore } from '@/stores/toastStore'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { formatDate, isToday } from '@/utils/dateUtils'
import { ConfirmModal } from '@/components/ConfirmModal'
import { cn } from '@/utils/cn'

interface HeaderProps {
  onOpenImportTimetable?: () => void
  onSwitchToWeekView?: () => void
  weekStripExpanded?: boolean
  onToggleWeekStrip?: () => void
  isSettingsOpen?: boolean
  onSettingsOpenChange?: (open: boolean) => void
  /** 모바일 FAB 롱프레스 메뉴 등에서 사용 — 확인 모달은 MainPage에서 렌더 */
  setShowResetDayConfirm?: (open: boolean) => void
  setShowClearAllConfirm?: (open: boolean) => void
  onCopyPreviousDay?: () => void
  isCopying?: boolean
  isResettingDay?: boolean
  isClearingAll?: boolean
  todosOnSelectedDayCount?: number
}

export default function Header({
  onOpenImportTimetable,
  onSwitchToWeekView,
  weekStripExpanded,
  onToggleWeekStrip,
  isSettingsOpen: isSettingsOpenProp,
  onSettingsOpenChange,
  setShowResetDayConfirm: setShowResetDayConfirmProp,
  setShowClearAllConfirm: setShowClearAllConfirmProp,
  onCopyPreviousDay: onCopyPreviousDayProp,
  isCopying: isCopyingProp,
  isResettingDay: isResettingDayProp,
  isClearingAll: isClearingAllProp,
  todosOnSelectedDayCount = 0,
}: HeaderProps) {
  const { selectedDate, isBulkSavingTimetable, getTodosByDate, viewMode, setViewMode, currentMonth, setCurrentMonth, todos, copyTodosFromPreviousDay, addTodos, deleteTodo, addTodo, clearAllTodos } = useCalendarStore()
  const { addToast } = useToastStore()
  const { theme, toggleTheme, initTheme } = useSettingsStore()
  const [internalSettingsOpen, setInternalSettingsOpen] = useState(false)
  const isControlled = onSettingsOpenChange != null
  const isSettingsOpen = isControlled ? (isSettingsOpenProp ?? false) : internalSettingsOpen
  const setIsSettingsOpen = isControlled ? onSettingsOpenChange : setInternalSettingsOpen
  const [internalCopying, setInternalCopying] = useState(false)
  const [internalShowResetDayConfirm, setInternalShowResetDayConfirm] = useState(false)
  const [internalResettingDay, setInternalResettingDay] = useState(false)
  const [internalShowClearAllConfirm, setInternalShowClearAllConfirm] = useState(false)
  const [internalClearingAll, setInternalClearingAll] = useState(false)
  const settingsScrollRef = useRef<HTMLDivElement>(null)

  const isLifted = setShowResetDayConfirmProp != null
  const setShowResetDayConfirm = setShowResetDayConfirmProp ?? setInternalShowResetDayConfirm
  const setShowClearAllConfirm = setShowClearAllConfirmProp ?? setInternalShowClearAllConfirm
  const isCopying = isCopyingProp ?? internalCopying
  const isResettingDay = isResettingDayProp ?? internalResettingDay
  const isClearingAll = isClearingAllProp ?? internalClearingAll
  const todosOnSelectedDay = isLifted ? todosOnSelectedDayCount : getTodosByDate(formatDate(selectedDate)).length

  const handleGoogleLogin = () => {
    const base = getApiBase()
    const url = base ? `${base}/oauth2/authorization/google` : '/oauth2/authorization/google'
    window.location.href = url
  }

  // 테마·강조색·배경패턴 적용 (마운트 시 + rehydration/설정 변경 시)
  useEffect(() => {
    initTheme()
  }, [initTheme, theme])

  // 설정 모달 열릴 때 body 스크롤 잠금 (크로스플랫폼)
  useEffect(() => {
    if (!isSettingsOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isSettingsOpen])

  // 설정 모달 열릴 때 스크롤을 맨 위로 (닫기 버튼이 보이도록)
  useEffect(() => {
    if (!isSettingsOpen) return
    const el = settingsScrollRef.current
    if (el) {
      el.scrollTo(0, 0)
      // requestAnimationFrame으로 한 프레임 뒤에도 한 번 더 적용 (iOS 대응)
      const id = requestAnimationFrame(() => {
        el.scrollTo(0, 0)
      })
      return () => cancelAnimationFrame(id)
    }
  }, [isSettingsOpen])

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
    setInternalCopying(true)

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
      const { todos, setTodos } = useCalendarStore.getState()
      setTodos(
        todos.map((t) => {
          const idx = toCopy.findIndex((c) => c.id === t.id)
          if (idx >= 0) return { ...created[idx], clientKey: t.id }
          return t
        })
      )
      addToast(`어제 일정 ${created.length}개를 ${format(selectedDate, 'M월 d일', { locale: ko })}로 가져왔습니다!`)
    } catch (e) {
      const { todos, setTodos } = useCalendarStore.getState()
      setTodos(todos.filter((t) => !optimisticIds.has(t.id)))
      const message = e instanceof Error ? e.message : '일정 저장 실패'
      addToast(`저장 중 오류: ${message}`)
    } finally {
      setInternalCopying(false)
    }
  }

  /** 선택한 날짜의 일정 전체 삭제 (하루 일정 초기화) */
  const handleResetDay = async () => {
    const dateStr = formatDate(selectedDate)
    const toDelete = getTodosByDate(dateStr)
    if (toDelete.length === 0) {
      setShowResetDayConfirm(false)
      addToast('해당 날짜에 일정이 없어요.')
      return
    }
    const copies = toDelete.map((t) => ({ ...t }))
    setInternalResettingDay(true)
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
    setInternalResettingDay(false)
  }

  /** 전체 일정 비우기 (모든 날짜 일정 삭제) */
  const handleClearAllSchedules = async () => {
    if (todos.length === 0) {
      setShowClearAllConfirm(false)
      addToast('삭제할 일정이 없어요.')
      return
    }
    const count = todos.length
    const copies = todos.map((t) => ({ ...t }))
    setInternalClearingAll(true)
    setShowClearAllConfirm(false)
    clearAllTodos()
    try {
      await deleteAllSchedules()
      addToast(`전체 일정 ${count}개를 비웠어요.`)
    } catch (e) {
      const { setTodos } = useCalendarStore.getState()
      setTodos(copies)
      const message = e instanceof Error ? e.message : '일정 삭제 실패'
      addToast(`전체 삭제 실패: ${message}`)
    } finally {
      setInternalClearingAll(false)
    }
  }

  const menuTitleLabel = isToday(selectedDate)
    ? '오늘의 일정'
    : `${format(selectedDate, 'M월 d일', { locale: ko })} 일정`

  const handlePrevMonth = () => {
    const d = new Date(currentMonth)
    d.setMonth(d.getMonth() - 1)
    setCurrentMonth(d)
  }
  const handleNextMonth = () => {
    const d = new Date(currentMonth)
    d.setMonth(d.getMonth() + 1)
    setCurrentMonth(d)
  }

  const touchStartXRef = useRef<number>(0)
  const handleDateBarTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX
  }
  const handleDateBarTouchEnd = (e: React.TouchEvent) => {
    const endX = e.changedTouches[0].clientX
    const delta = endX - touchStartXRef.current
    if (delta > 50) handlePrevMonth()
    else if (delta < -50) handleNextMonth()
  }

  /** 연월 피커 블록 — 단일 행 헤더용 컴팩트(모바일) + 스와이프 지원 */
  const datePickerBlock = (
    <div
      className="inline-flex items-center gap-0.5 sm:gap-2 px-1.5 py-1 sm:px-4 sm:py-2.5 rounded-neu sm:rounded-neu bg-[var(--card-bg)] shadow-[var(--shadow-float-sm)] max-md:bg-[var(--hover-bg)]/60 max-md:shadow-none max-md:py-1.5 max-md:px-2"
      onTouchStart={handleDateBarTouchStart}
      onTouchEnd={handleDateBarTouchEnd}
    >
      <button
        type="button"
        onClick={handlePrevMonth}
        className="btn-nav-tap touch-target w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-main)] transition-colors shrink-0"
        aria-label="이전 달"
      >
        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>
      {viewMode === 'week' && onToggleWeekStrip ? (
        <button
          type="button"
          onClick={onToggleWeekStrip}
          className="min-w-[4.5rem] sm:min-w-[6.5rem] text-center text-lg font-bold sm:text-2xl md:text-3xl sm:font-semibold tabular-nums text-[var(--text-main)] tracking-tight whitespace-nowrap px-2 py-1 rounded-tool hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
          aria-expanded={weekStripExpanded ?? false}
          aria-label={weekStripExpanded ? '주간 날짜 접기' : '주간 날짜 펼치기'}
          title={weekStripExpanded ? '클릭하면 주간 날짜 접기' : '클릭하면 주간 날짜 펼치기'}
        >
          {format(currentMonth, 'M월 yyyy', { locale: ko })}
        </button>
      ) : (
        <span className="min-w-[4.5rem] sm:min-w-[6.5rem] text-center text-lg font-bold sm:text-2xl md:text-3xl sm:font-semibold tabular-nums text-[var(--text-main)] tracking-tight whitespace-nowrap px-0.5">
          {format(currentMonth, 'M월 yyyy', { locale: ko })}
        </span>
      )}
      <button
        type="button"
        onClick={handleNextMonth}
        className="btn-nav-tap touch-target w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-main)] transition-colors shrink-0"
        aria-label="다음 달"
      >
        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>
    </div>
  )

  return (
    <header className="relative z-30 theme-transition bg-[var(--card-bg)]" style={{ isolation: 'isolate' }}>
      <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 md:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 sm:pb-3 min-h-[3.25rem] sm:min-h-[5rem] flex flex-col justify-center">
        {/* 단일 행: 왼쪽 로고 / 중앙 연월 / 오른쪽 아이콘. 연월은 md 이상에서 화면 정중앙 배치 */}
        <div className="flex flex-row items-center gap-2 md:relative md:h-14 md:gap-0">
          {/* 왼쪽: 로고 + 짜조 (PC에서만 주간 날짜 토글 표시) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink-0">
            <div className="relative flex items-center gap-0.5 shrink-0" aria-hidden>
              <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-tool shadow-sm bg-[var(--primary-point)]" />
              <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-tool -ml-1.5 sm:-ml-2 mt-0.5 sm:mt-1 shadow-sm opacity-90" style={{ background: 'var(--primary-gradient)' }} />
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-sm sm:text-lg font-bold text-[var(--text-main)] tracking-tight truncate">짜조</span>
              <span className="text-[10px] font-medium text-[var(--text-muted)] hidden sm:block">일정을 짜줘</span>
            </div>
            {viewMode === 'week' && onToggleWeekStrip && (
              <button
                type="button"
                onClick={onToggleWeekStrip}
                className="hidden md:flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-tool transition-colors text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-main)]"
                aria-expanded={weekStripExpanded ?? false}
                aria-label={weekStripExpanded ? '주간 날짜 접기' : '주간 날짜 펼치기'}
                title={weekStripExpanded ? '일~월 날짜 접기' : '일~월 날짜 펼치기'}
              >
                {weekStripExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <span className="text-xs">주간 날짜</span>
              </button>
            )}
          </div>
          {/* 모바일: 연월 인라인 중앙 */}
          <div className="flex-1 flex justify-center min-w-0 md:invisible md:absolute md:pointer-events-none md:left-0 md:right-0 md:flex-initial">
            <div className="md:hidden">{datePickerBlock}</div>
          </div>
          {/* 오른쪽: 뷰 전환(md만) + 메뉴 + 테마 + 설정(md만) — PC에서 우측 정렬 */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-3 md:gap-4 shrink-0 md:ml-auto">
              <div className="hidden md:flex items-center gap-3 md:gap-4">
                <div className="view-mode-segmented" role="group" aria-label="캘린더 / 할일 보기 전환">
                  <div className="view-mode-segmented-track">
                    <span className="view-mode-segmented-pill" data-active={viewMode === 'week'} aria-hidden />
                    <button
                      type="button"
                      onClick={() => setViewMode('month')}
                      className={cn('view-mode-segmented-btn', viewMode === 'month' && 'view-mode-segmented-btn-active')}
                      aria-pressed={viewMode === 'month'}
                      aria-label="캘린더 보기"
                      title="캘린더 보기"
                    >
                      캘린더
                    </button>
                    <button
                      type="button"
                      onClick={() => { onSwitchToWeekView?.(); setViewMode('week') }}
                      className={cn('view-mode-segmented-btn', viewMode === 'week' && 'view-mode-segmented-btn-active')}
                      aria-pressed={viewMode === 'week'}
                      aria-label="할일 보기"
                      title="할일 보기"
                    >
                      할일
                    </button>
                  </div>
                </div>
              </div>
            {/* PC: 원본 스타일 유지 */}
            <button
              type="button"
              onClick={toggleTheme}
              className="btn-icon-tap hidden md:flex w-9 h-9 rounded-neu items-center justify-center bg-[var(--hover-bg)] hover:bg-[var(--card-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-color)]"
              aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
              title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {/* 모바일: theme-toggle-switch 스타일 */}
            <button
              type="button"
              onClick={toggleTheme}
              className="btn-icon-tap theme-toggle-switch theme-transition flex md:hidden w-11 h-11 min-w-[44px] min-h-[44px] items-center justify-center"
              aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
              title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <Menu as="div" className="relative hidden md:block">
              <Menu.Button
                type="button"
className="btn-icon-tap w-8 h-8 sm:w-9 sm:h-9 rounded-neu flex items-center justify-center bg-[var(--hover-bg)] hover:bg-[var(--card-bg)] text-[var(--text-main)] border border-[var(--border-color)]"
              aria-label="일정 메뉴"
              >
                <MoreVertical className="w-4 h-4" />
              </Menu.Button>
              <Menu.Items
                className={cn(
                  'absolute right-0 mt-2 w-52 origin-top-right rounded-neu border focus:outline-none z-20 theme-transition',
                  'bg-[var(--card-bg)] border-[var(--border-color)] shadow-lg'
                )}
              >
                <div className="px-3 pt-2.5 pb-1.5 border-b border-[var(--border-color)]">
                  <p className="text-xs font-medium truncate text-[var(--text-muted)]">{menuTitleLabel}</p>
                </div>
                <div className="p-1.5">
                  <p className="px-2.5 pt-1.5 pb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">가져오기</p>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        type="button"
                        onClick={onCopyPreviousDayProp ?? handleCopyPreviousDay}
                        disabled={isCopying}
                        className={cn(
                          'w-full flex items-center gap-2 rounded-tool px-3 py-2 text-sm font-medium btn-ghost-tap',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                          active ? 'bg-[var(--hover-bg)]' : '',
                          'text-[var(--text-main)]'
                        )}
                        title={isCopying ? '복사 중…' : '어제 일정을 선택한 날로 가져오기'}
                      >
                        <Copy className="w-4 h-4 flex-shrink-0" />
                        {isCopying ? '가져오는 중…' : '어제 일정 가져오기'}
                      </button>
                    )}
                  </Menu.Item>
                  {onOpenImportTimetable && (
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          type="button"
                          onClick={onOpenImportTimetable}
                          className={cn(
                            'w-full flex items-center gap-2 rounded-tool px-3 py-2 text-sm font-medium btn-ghost-tap',
                            active ? 'bg-[var(--hover-bg)]' : '',
                            'text-[var(--text-main)]'
                          )}
                          title="시간표 이미지로 불러오기"
                        >
                          <CalendarDays className="w-4 h-4 flex-shrink-0" />
                          시간표 불러오기
                        </button>
                      )}
                    </Menu.Item>
                  )}
                  <p className="px-2.5 pt-2.5 pb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">정리</p>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        type="button"
                        onClick={() => setShowResetDayConfirm(true)}
                        disabled={isResettingDay || todosOnSelectedDay === 0}
                        className={cn(
                          'w-full flex items-center gap-2 rounded-tool px-3 py-2 text-sm font-medium btn-ghost-tap',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                          active ? 'bg-[var(--hover-bg)]' : '',
                          'text-[var(--text-main)]'
                        )}
                        title={todosOnSelectedDay === 0 ? '선택한 날짜에 일정이 없어요' : '이 날 일정 전체 삭제'}
                      >
                        <RotateCcw className="w-4 h-4 flex-shrink-0" />
                        {isResettingDay ? '비우는 중…' : '이 날 일정 비우기'}
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        type="button"
                        onClick={() => setShowClearAllConfirm(true)}
                        disabled={isClearingAll || todos.length === 0}
                        className={cn(
                          'w-full flex items-center gap-2 rounded-tool px-3 py-2 text-sm font-medium btn-ghost-tap',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                          active ? 'bg-[var(--hover-bg)]' : '',
                          'text-[var(--text-main)]'
                        )}
                        title={todos.length === 0 ? '삭제할 일정이 없어요' : '저장된 모든 일정 삭제'}
                      >
                        <Trash2 className="w-4 h-4 flex-shrink-0" />
                        {isClearingAll ? '비우는 중…' : '전체 일정 비우기'}
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Menu>
            {/* 모바일에서는 하단 탭에서 설정 가능하므로 헤더 설정 버튼 숨김 */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="hidden md:flex btn-icon-tap w-8 h-8 sm:w-9 sm:h-9 rounded-neu items-center justify-center bg-[var(--hover-bg)] hover:bg-[var(--card-bg)] text-[var(--text-main)] border border-[var(--border-color)]"
              aria-label="설정"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      {/* PC(md+): 연월을 화면 정중앙에 배치 (viewport 기준) */}
      <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-full justify-center pointer-events-none">
        <div className="pointer-events-auto">{datePickerBlock}</div>
      </div>
      {/* 시간표 대량 저장 백그라운드 인디케이터 */}
      {isBulkSavingTimetable && (
        <div className="w-full bg-primary-500/8" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
          <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 md:px-6 py-1.5 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary-400 animate-pulse" />
            <p className="text-xs text-theme-muted">
              시간표를 학기 전체에 적용하는 중이에요… 잠시 후 모든 일정이 안정적으로 저장됩니다.
            </p>
          </div>
        </div>
      )}
      
      {/* 설정 모달 - Notion 스타일 */}
      {isSettingsOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex flex-col items-center justify-start z-50 pt-[max(1.5rem,calc(env(safe-area-inset-top)+56px))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))]"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.target === e.currentTarget && setIsSettingsOpen(false)}
        >
        <div
          ref={settingsScrollRef}
          className="settings-modal-scroll rounded-neu-lg max-w-2xl w-full max-h-[min(90vh,calc(100vh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-56px-2rem))] overflow-x-hidden overscroll-contain theme-transition bg-theme-card border border-[var(--border-color)]"
          onClick={(e) => e.stopPropagation()}
        >
            <div className="pt-[max(0px,env(safe-area-inset-top))]" />
            <div className="bg-theme-card theme-transition px-6 py-4 flex items-center justify-between sticky top-0 z-10 border-b border-theme">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-theme" />
                <h2 className="text-lg font-semibold text-theme">설정</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="btn-icon-tap touch-target flex items-center justify-center p-2 min-w-[44px] rounded-neu cursor-pointer outline-none focus:outline-none border border-[var(--border-color)] bg-[var(--hover-bg)] hover:bg-[var(--card-bg)]"
              >
                <X className="w-5 h-5 text-theme" />
              </button>
            </div>

            <div className="p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-8 bg-theme-card theme-transition settings-modal-flat">
              <div className="pb-6 border-b border-theme">
                <h3 className="text-sm font-semibold text-theme mb-2">계정</h3>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="touch-target w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 rounded-neu text-theme text-sm font-medium outline-none focus:outline-none border border-[var(--border-color)] bg-[var(--hover-bg)] hover:bg-[var(--card-bg)]"
                  title="Google 계정으로 로그인"
                >
                  <LogIn className="w-4 h-4" />
                  Google 로그인
                </button>
              </div>
              <TimeSlotSettings />
              <div className="pt-6 border-t border-theme">
                <ApiKeySettings />
              </div>
              <ScheduleDataSettings />
            </div>
          </div>
        </div>
      )}

      {/* 하루 일정 초기화 / 전체 일정 비우기 확인 모달 (상위에서 제어 시 여기서는 미렌더) */}
      {!isLifted && (
        <>
      <ConfirmModal
        isOpen={internalShowResetDayConfirm}
        onClose={() => setShowResetDayConfirm(false)}
        onConfirm={handleResetDay}
        title="하루 일정 초기화"
        message={`선택한 날짜(${format(selectedDate, 'M월 d일', { locale: ko })})의 일정 ${getTodosByDate(formatDate(selectedDate)).length}개를 모두 삭제할까요? 되돌릴 수 없어요.`}
        confirmLabel="전체 삭제"
        danger
      />
      <ConfirmModal
        isOpen={internalShowClearAllConfirm}
        onClose={() => setShowClearAllConfirm(false)}
        onConfirm={handleClearAllSchedules}
        title="전체 일정 비우기"
        message={`저장된 일정 ${todos.length}개를 모두 삭제할까요? 되돌릴 수 없어요.`}
        confirmLabel="전체 삭제"
        danger
      />
        </>
      )}
    </header>
  )
}
