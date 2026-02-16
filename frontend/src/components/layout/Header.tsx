import { useState, useEffect } from 'react'
import { Sparkles, Settings, X, Moon, Sun, Copy, Calendar, LogIn } from 'lucide-react'
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
  const { copyTodosFromPreviousDay, addTodos, selectedDate, setSelectedDate } = useCalendarStore()
  const { addToast } = useToastStore()
  const { theme, toggleTheme, initTheme } = useSettingsStore()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isCopying, setIsCopying] = useState(false)

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

  const handleCopyPreviousDay = async () => {
    if (isCopying) return
    const { toCopy, excluded } = copyTodosFromPreviousDay()
    if (toCopy.length === 0 && excluded.length === 0) {
      alert('어제 일정이 없습니다.')
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
      alert(`어제 일정 ${created.length}개를 ${format(selectedDate, 'M월 d일', { locale: ko })}로 가져왔습니다!`)
    } catch (e) {
      const { todos, setTodos } = useCalendarStore.getState()
      setTodos(todos.filter((t) => !optimisticIds.has(t.id)))
      const message = e instanceof Error ? e.message : '일정 저장 실패'
      alert(`저장 중 오류: ${message}`)
    } finally {
      setIsCopying(false)
    }
  }

  const handleLogoClick = () => {
    setSelectedDate(new Date())
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <header className="relative z-30 bg-notion-card border-b border-notion-border shadow-none" style={{ isolation: 'isolate' }}>
      <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 md:px-6 py-3 h-20">
        <div className="flex items-center justify-between h-[60px]">
          {/* 로고 - 클릭 시 오늘 날짜로 이동 + 상단 스크롤 */}
          <button
            type="button"
            onClick={handleLogoClick}
            className="flex items-center gap-3 rounded-notion hover:bg-notion-hover transition-colors px-1 py-1 -mx-1 min-h-[44px]"
            title="오늘로 이동"
            aria-label="짜조 로고, 오늘로 이동"
          >
            <div className="w-8 h-8 bg-primary-500 rounded-notion flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-base font-semibold text-notion-text-primary">짜조</h1>
          </button>
          
          {/* 우측 메뉴 - 어제 일정 복사 | 월간 | 설정 */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* 어제 일정 복사하기 - 월간 캘린더 왼쪽 */}
            <button
              type="button"
              onClick={handleCopyPreviousDay}
              disabled={isCopying}
              className="touch-target flex items-center justify-center gap-2 px-3 min-w-[44px] hover:bg-notion-hover rounded-notion transition-colors text-xs font-medium text-notion-text-secondary hover:text-notion-text-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              title={isCopying ? '복사 중…' : `선택한 날짜(${format(selectedDate, 'M월 d일', { locale: ko })})로 어제 일정 복사`}
            >
              <Copy className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">{isCopying ? '복사 중…' : '어제 일정 복사'}</span>
            </button>
            {/* 월간 캘린더 */}
            {onOpenMonthlyCalendar && (
              <button
                type="button"
                onClick={onOpenMonthlyCalendar}
                className="touch-target flex items-center justify-center gap-2 px-3 min-w-[44px] hover:bg-notion-hover rounded-notion transition-colors text-xs font-medium text-notion-text-secondary hover:text-notion-text-primary cursor-pointer"
                title="월간 일정 보기"
              >
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">월간</span>
              </button>
            )}

            {/* 다크모드 토글 (Notion은 항상 다크모드이므로 숨김 처리 가능) */}
            <button
              onClick={toggleTheme}
              className="hidden touch-target p-2 hover:bg-notion-hover rounded-notion transition-colors"
              title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-notion-text-secondary" />
              ) : (
                <Moon className="w-4 h-4 text-notion-text-secondary" />
              )}
            </button>

            {/* 설정 - sm 이상에서 라벨 표시 */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="touch-target flex items-center justify-center gap-2 p-2 sm:px-3 min-w-[44px] hover:bg-notion-hover rounded-notion transition-colors cursor-pointer"
              title="설정"
            >
              <Settings className="w-4 h-4 text-notion-text-secondary hover:text-notion-text-primary flex-shrink-0" />
              <span className="hidden sm:inline text-xs font-medium text-notion-text-secondary hover:text-notion-text-primary">설정</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* 설정 모달 - Notion 스타일 */}
      {isSettingsOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-notion flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.target === e.currentTarget && setIsSettingsOpen(false)}
        >
          <div
            className="bg-notion-sidebar rounded-lg border border-notion-border shadow-none max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="sticky top-0 bg-notion-sidebar border-b border-notion-border px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-notion-text" />
                <h2 className="text-lg font-semibold text-notion-text">설정</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="touch-target flex items-center justify-center p-2 min-w-[44px] hover:bg-notion-hover rounded-notion transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-notion-muted" />
              </button>
            </div>
            
            {/* 컨텐츠 */}
            <div className="p-6 space-y-8">
              <div className="border-b border-notion-border pb-6">
                <h3 className="text-sm font-semibold text-notion-text mb-2">계정</h3>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="touch-target w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-notion-hover hover:bg-notion-border text-notion-text text-sm font-medium transition-colors"
                  title="Google 계정으로 로그인"
                >
                  <LogIn className="w-4 h-4" />
                  Google 로그인
                </button>
                <p className="text-xs text-notion-muted mt-2">
                  Google 계정으로 로그인하면 일정을 동기화할 수 있습니다.
                </p>
              </div>
              <TimeSlotSettings />
              <div className="border-t border-notion-border pt-6">
                <ApiKeySettings />
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
