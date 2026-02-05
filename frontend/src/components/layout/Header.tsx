import { useState, useEffect } from 'react'
import { Sparkles, Settings, X, Moon, Sun, Copy, Calendar } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { TimeSlotSettings } from '@/components/settings/TimeSlotSettings'
import { ApiKeySettings } from '@/components/settings/ApiKeySettings'
import { getApiBase } from '@/utils/api'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface HeaderProps {
  onOpenMonthlyCalendar?: () => void
}

export default function Header({ onOpenMonthlyCalendar }: HeaderProps) {
  const { copyTodosFromPreviousDay, selectedDate } = useCalendarStore()
  const { theme, toggleTheme, initTheme } = useSettingsStore()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const handleGoogleLogin = () => {
    const base = getApiBase()
    const url = base ? `${base}/oauth2/authorization/google` : '/oauth2/authorization/google'
    window.location.href = url
  }

  // 컴포넌트 마운트 시 테마 초기화
  useEffect(() => {
    initTheme()
  }, [initTheme])

  const handleCopyPreviousDay = () => {
    const count = copyTodosFromPreviousDay()
    if (count > 0) {
      alert(`어제 일정 ${count}개를 ${format(selectedDate, 'M월 d일', { locale: ko })}로 가져왔습니다!`)
    } else {
      alert('어제 일정이 없습니다.')
    }
  }
  
  return (
    <header className="relative z-30 bg-notion-card border-b border-notion-border shadow-none" style={{ isolation: 'isolate' }}>
      <div className="max-w-screen-2xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {/* 로고 - Notion 스타일 미니멀 */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-notion-text-primary rounded-notion flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-notion-bg" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-notion-text-primary">짜조</h1>
            </div>
          </div>
          
          {/* 우측 메뉴 - Notion 플랫 버튼 스타일 */}
          <div className="flex items-center gap-1">
            {/* Google 로그인 */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-notion-hover rounded-notion transition-colors text-xs font-medium text-notion-text-secondary hover:text-notion-text-primary cursor-pointer"
              title="Google 계정으로 로그인"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Google 로그인</span>
            </button>
            {/* 어제 일정 가져오기 */}
            <button
              type="button"
              onClick={handleCopyPreviousDay}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-notion-hover rounded-notion transition-colors text-xs font-medium text-notion-text-secondary hover:text-notion-text-primary cursor-pointer"
              title="어제 일정 가져오기"
            >
              <Copy className="w-4 h-4" />
              <span className="hidden sm:inline">어제 일정</span>
            </button>

            {/* 월간 캘린더 */}
            {onOpenMonthlyCalendar && (
              <button
                type="button"
                onClick={onOpenMonthlyCalendar}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-notion-hover rounded-notion transition-colors text-xs font-medium text-notion-text-secondary hover:text-notion-text-primary cursor-pointer"
                title="월간 일정 보기"
              >
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">월간</span>
              </button>
            )}

            {/* 다크모드 토글 (Notion은 항상 다크모드이므로 숨김 처리 가능) */}
            <button
              onClick={toggleTheme}
              className="hidden p-2 hover:bg-notion-hover rounded-notion transition-colors"
              title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-notion-text-secondary" />
              ) : (
                <Moon className="w-4 h-4 text-notion-text-secondary" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 hover:bg-notion-hover rounded-notion transition-colors cursor-pointer"
              title="설정"
            >
              <Settings className="w-4 h-4 text-notion-text-secondary hover:text-notion-text-primary" />
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
                className="p-1.5 hover:bg-notion-hover rounded-notion transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-notion-muted" />
              </button>
            </div>
            
            {/* 컨텐츠 */}
            <div className="p-6 space-y-8">
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
