import { useState, useEffect, useRef } from 'react'
import { Settings, X, Moon, Sun, Copy, Calendar, LogIn } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { TimeSlotSettings } from '@/components/settings/TimeSlotSettings'
import { ApiKeySettings } from '@/components/settings/ApiKeySettings'
import { getApiBase } from '@/utils/api'
import { createSchedule } from '@/services/scheduleService'
import { useToastStore } from '@/stores/toastStore'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface HeaderProps {
  onOpenMonthlyCalendar?: () => void
}

export default function Header({ onOpenMonthlyCalendar }: HeaderProps) {
  const { copyTodosFromPreviousDay, addTodos, selectedDate, isBulkSavingTimetable } = useCalendarStore()
  const { addToast } = useToastStore()
  const { theme, toggleTheme, initTheme } = useSettingsStore()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isCopying, setIsCopying] = useState(false)
  const settingsScrollRef = useRef<HTMLDivElement>(null)

  const handleGoogleLogin = () => {
    const base = getApiBase()
    const url = base ? `${base}/oauth2/authorization/google` : '/oauth2/authorization/google'
    window.location.href = url
  }

  // 컴포넌트 마운트 시 테마 초기화
  useEffect(() => {
    initTheme()
  }, [initTheme])

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

  return (
    <header className="relative z-30 theme-transition border-b border-[var(--border-color)]" style={{ isolation: 'isolate', backgroundColor: 'var(--bg-color)' }}>
      <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 md:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 min-h-[5rem] flex flex-col justify-center">
        <div className="flex items-center justify-end h-[60px]">
          {/* 우측 메뉴 - 어제 일정 복사 | 월간 | 테마 토글 | 설정 */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={handleCopyPreviousDay}
              disabled={isCopying}
              className="neu-btn touch-target flex items-center justify-center gap-2 px-3 min-w-[44px] rounded-neu text-xs font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: 'var(--text-main)' }}
              title={isCopying ? '복사 중…' : `선택한 날짜(${format(selectedDate, 'M월 d일', { locale: ko })})로 어제 일정 복사`}
            >
              <Copy className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">{isCopying ? '복사 중…' : '어제 일정 복사'}</span>
            </button>
            {onOpenMonthlyCalendar && (
              <button
                type="button"
                onClick={onOpenMonthlyCalendar}
                className="neu-btn touch-target flex items-center justify-center gap-2 px-3 min-w-[44px] rounded-neu text-xs font-medium cursor-pointer"
                style={{ color: 'var(--text-main)' }}
                title="월간 일정 보기"
              >
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">월간</span>
              </button>
            )}

            {/* 테마 토글 스위치 (설정 옆, Sun/Moon 교체 · 소프트 미니멀) */}
            <button
              type="button"
              onClick={toggleTheme}
              className="theme-toggle-switch touch-target"
              title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
              aria-label={theme === 'dark' ? '라이트 모드' : '다크 모드'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" aria-hidden /> : <Moon className="w-4 h-4" aria-hidden />}
            </button>

            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="neu-btn touch-target flex items-center justify-center p-2 min-w-[44px] rounded-neu cursor-pointer"
              style={{ color: 'var(--text-main)' }}
              title="설정"
            >
              <Settings className="w-4 h-4 flex-shrink-0" />
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
                className="neu-btn touch-target flex items-center justify-center p-2 min-w-[44px] rounded-neu cursor-pointer border-0 outline-none focus:outline-none"
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
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
