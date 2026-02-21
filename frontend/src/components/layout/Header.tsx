import { useState, useEffect, useRef } from 'react'
import { Menu } from '@headlessui/react'
import { Settings, X, Copy, CalendarDays, LogIn, RotateCcw, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Folder, Moon, Sun } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { TimeSlotSettings } from '@/components/settings/TimeSlotSettings'
import { ApiKeySettings } from '@/components/settings/ApiKeySettings'
import { ScheduleDataSettings } from '@/components/settings/ScheduleDataSettings'
import { getApiBase } from '@/utils/api'
import { createSchedule, deleteSchedule } from '@/services/scheduleService'
import { useToastStore } from '@/stores/toastStore'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { formatDate, isToday } from '@/utils/dateUtils'
import { ConfirmModal } from '@/components/ConfirmModal'
import { cn } from '@/utils/cn'

interface HeaderProps {
  onOpenImportTimetable?: () => void
  /** 월간→주간 전환 시 호출 (주간 타임라인 자동 스크롤 스킵용) */
  onSwitchToWeekView?: () => void
  /** 주간 모드에서 주간 날짜 strip 펼침 여부 (같은 줄에 "오늘" 버튼 표시용) */
  weekStripExpanded?: boolean
  /** 주간 날짜 strip 펼치기/접기 토글 */
  onToggleWeekStrip?: () => void
}

export default function Header({ onOpenImportTimetable, onSwitchToWeekView, weekStripExpanded, onToggleWeekStrip }: HeaderProps) {
  const { copyTodosFromPreviousDay, addTodos, selectedDate, isBulkSavingTimetable, getTodosByDate, deleteTodo, addTodo, viewMode, setViewMode, currentMonth, setCurrentMonth, setSelectedDate } = useCalendarStore()
  const { addToast } = useToastStore()
  const { theme, toggleTheme, initTheme } = useSettingsStore()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isCopying, setIsCopying] = useState(false)
  const [showResetDayConfirm, setShowResetDayConfirm] = useState(false)
  const [isResettingDay, setIsResettingDay] = useState(false)
  const settingsScrollRef = useRef<HTMLDivElement>(null)

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
      setIsCopying(false)
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

  const dateStr = formatDate(selectedDate)
  const todosOnSelectedDay = getTodosByDate(dateStr)
  const menuTitleLabel = isToday(selectedDate)
    ? '오늘의 일정'
    : `${format(selectedDate, 'M월 d일', { locale: ko })} 일정`

  const goToToday = () => {
    const today = new Date()
    setCurrentMonth(today)
    setSelectedDate(today)
  }
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

  return (
    <header className="relative z-30 theme-transition border-b border-[var(--border-color)] bg-[var(--card-bg)]" style={{ isolation: 'isolate' }}>
      <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 md:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 min-h-[5rem] flex flex-col justify-center">
        <div className="flex items-center h-[52px] sm:h-[56px] gap-2 sm:gap-3">
          {/* 왼쪽: 짜조 로고 + 오늘·주간 날짜 (동일 너비로 중앙 정렬용) */}
          <div className="flex-1 min-w-0 flex items-center justify-start">
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="relative flex items-center gap-0.5" aria-hidden>
                <span className="w-6 h-6 rounded-tool shadow-sm bg-[var(--primary-point)]" />
                <span className="w-6 h-6 rounded-tool -ml-2 mt-1 shadow-sm opacity-90" style={{ background: 'var(--primary-gradient)' }} />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-lg font-bold text-[var(--text-main)] tracking-tight">짜조</span>
                <span className="text-[10px] font-medium text-[var(--text-muted)]">일정 짜줘</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 ml-1 sm:ml-2">
              <button
                type="button"
                onClick={goToToday}
                className="shrink-0 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-tool transition-colors text-[var(--text-main)] hover:bg-[var(--hover-bg)]"
              >
                오늘
              </button>
              {viewMode === 'week' && onToggleWeekStrip && (
                <button
                  type="button"
                  onClick={onToggleWeekStrip}
                  className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-tool transition-colors text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-main)]"
                  aria-expanded={weekStripExpanded ?? false}
                  aria-label={weekStripExpanded ? '주간 날짜 접기' : '주간 날짜 펼치기'}
                  title={weekStripExpanded ? '일~월 날짜 접기' : '일~월 날짜 펼치기'}
                >
                  {weekStripExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  <span className="hidden sm:inline text-xs">주간 날짜</span>
                </button>
              )}
            </div>
          </div>

          {/* 정중앙: 연월 표시 + 이전/다음 (헤더 정확한 중앙) */}
          <div className="flex flex-1 min-w-0 items-center justify-center">
            <div className="flex items-center gap-1 sm:gap-0.5 shrink-0">
              <button type="button" onClick={handlePrevMonth} className="btn-nav-tap p-1.5 rounded-tool hover:bg-[var(--hover-bg)] text-[var(--text-muted)] shrink-0" aria-label="이전 달">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="min-w-[4.5rem] sm:min-w-[5rem] text-center text-xs sm:text-sm font-medium tabular-nums text-[var(--text-main)] whitespace-nowrap">
                {format(currentMonth, 'M월 yyyy', { locale: ko })}
              </span>
              <button type="button" onClick={handleNextMonth} className="btn-nav-tap p-1.5 rounded-tool hover:bg-[var(--hover-bg)] text-[var(--text-muted)] shrink-0" aria-label="다음 달">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 오른쪽: 캘린더/할일 토글 + 아이콘들 (동일 너비로 중앙 정렬용) */}
          <div className="flex flex-1 min-w-0 items-center justify-end gap-3 sm:gap-4">
            <div className="view-mode-segmented" role="group" aria-label="캘린더 / 할일 보기 전환">
              <div className="view-mode-segmented-track">
                <span
                  className="view-mode-segmented-pill"
                  data-active={viewMode === 'week'}
                  aria-hidden
                />
                <button
                  type="button"
                  onClick={() => setViewMode('month')}
                  className={cn(
                    'view-mode-segmented-btn',
                    viewMode === 'month' && 'view-mode-segmented-btn-active'
                  )}
                  aria-pressed={viewMode === 'month'}
                  aria-label="캘린더 보기"
                  title="캘린더 보기"
                >
                  캘린더
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSwitchToWeekView?.()
                    setViewMode('week')
                  }}
                  className={cn(
                    'view-mode-segmented-btn',
                    viewMode === 'week' && 'view-mode-segmented-btn-active'
                  )}
                  aria-pressed={viewMode === 'week'}
                  aria-label="할일 보기"
                  title="할일 보기"
                >
                  할일
                </button>
              </div>
            </div>
            <Menu as="div" className="relative">
              <Menu.Button
                type="button"
                className="btn-icon-tap w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--hover-bg)] hover:bg-[var(--card-bg)] text-[var(--text-main)] border border-[var(--border-color)]"
                aria-label="일정 메뉴"
              >
                <Folder className="w-4 h-4" />
              </Menu.Button>
              <Menu.Items
                className={cn(
                  'absolute right-0 mt-2 w-52 origin-top-right rounded-xl border focus:outline-none z-20 theme-transition',
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
                        onClick={handleCopyPreviousDay}
                        disabled={isCopying}
                        className={cn(
                          'w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium btn-ghost-tap',
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
                            'w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium btn-ghost-tap',
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
                        disabled={isResettingDay || todosOnSelectedDay.length === 0}
                        className={cn(
                          'w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium btn-ghost-tap',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                          active ? 'bg-[var(--hover-bg)]' : '',
                          'text-[var(--text-main)]'
                        )}
                        title={todosOnSelectedDay.length === 0 ? '선택한 날짜에 일정이 없어요' : '이 날 일정 전체 삭제'}
                      >
                        <RotateCcw className="w-4 h-4 flex-shrink-0" />
                        {isResettingDay ? '비우는 중…' : '이 날 일정 비우기'}
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Menu>
            <button
              type="button"
              onClick={toggleTheme}
              className="btn-icon-tap w-9 h-9 rounded-tool flex items-center justify-center bg-[var(--hover-bg)] hover:bg-[var(--card-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-color)]"
              aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
              title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="btn-icon-tap w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--hover-bg)] hover:bg-[var(--card-bg)] text-[var(--text-main)] border border-[var(--border-color)]"
              aria-label="설정"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
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
          className="settings-modal-scroll rounded-neu-lg max-w-2xl w-full max-h-[min(90vh,calc(100vh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-56px-2rem))] overflow-x-hidden overscroll-contain theme-transition bg-theme-card"
          style={{ boxShadow: 'var(--shadow-style)' }}
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
                className="btn-icon-tap neu-btn touch-target flex items-center justify-center p-2 min-w-[44px] rounded-neu cursor-pointer border-0 outline-none focus:outline-none"
              >
                <X className="w-5 h-5 text-theme" />
              </button>
            </div>

            <div className="p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-8 bg-theme-card theme-transition">
              <div className="pb-6 border-b border-theme">
                <h3 className="text-sm font-semibold text-theme mb-2">계정</h3>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="neu-btn touch-target w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 rounded-neu text-theme text-sm font-medium border-0 outline-none focus:outline-none"
                  title="Google 계정으로 로그인"
                >
                  <LogIn className="w-4 h-4" />
                  Google 로그인
                </button>
                <p className="text-xs text-theme-muted mt-2">
                  Google 계정으로 로그인하면 일정을 동기화할 수 있습니다.
                </p>
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

      {/* 하루 일정 초기화 확인 모달 */}
      <ConfirmModal
        isOpen={showResetDayConfirm}
        onClose={() => setShowResetDayConfirm(false)}
        onConfirm={handleResetDay}
        title="하루 일정 초기화"
        message={`선택한 날짜(${format(selectedDate, 'M월 d일', { locale: ko })})의 일정 ${todosOnSelectedDay.length}개를 모두 삭제할까요? 되돌릴 수 없어요.`}
        confirmLabel="전체 삭제"
        danger
      />
    </header>
  )
}
