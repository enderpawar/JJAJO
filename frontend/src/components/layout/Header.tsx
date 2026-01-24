import { useState, useEffect } from 'react'
import { Sparkles, Key, Settings, LogOut, X, Moon, Sun, Copy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApiKeyStore } from '@/stores/apiKeyStore'
import { useCalendarStore } from '@/stores/calendarStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { TimeSlotSettings } from '@/components/settings/TimeSlotSettings'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function Header() {
  const navigate = useNavigate()
  const { clearApiKey } = useApiKeyStore()
  const { copyTodosFromPreviousDay, selectedDate } = useCalendarStore()
  const { theme, toggleTheme, initTheme } = useSettingsStore()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // 컴포넌트 마운트 시 테마 초기화
  useEffect(() => {
    initTheme()
  }, [initTheme])
  
  const handleLogout = () => {
    if (confirm('로그아웃하시겠습니까? API 키가 삭제됩니다.')) {
      clearApiKey()
      navigate('/api-key', { replace: true })
    }
  }

  const handleCopyPreviousDay = () => {
    const count = copyTodosFromPreviousDay()
    if (count > 0) {
      alert(`어제 일정 ${count}개를 ${format(selectedDate, 'M월 d일', { locale: ko })}로 가져왔습니다!`)
    } else {
      alert('어제 일정이 없습니다.')
    }
  }
  
  return (
    <header className="bg-notion-card border-b border-notion-border shadow-none">
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
            {/* 어제 일정 가져오기 */}
            <button
              onClick={handleCopyPreviousDay}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-notion-hover rounded-notion transition-colors text-xs font-medium text-notion-text-secondary hover:text-notion-text-primary"
              title="어제 일정 가져오기"
            >
              <Copy className="w-4 h-4" />
              <span className="hidden sm:inline">어제 일정</span>
            </button>

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
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 hover:bg-notion-hover rounded-notion transition-colors"
              title="설정"
            >
              <Settings className="w-4 h-4 text-notion-text-secondary hover:text-notion-text-primary" />
            </button>
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-notion-hover rounded-notion transition-colors text-xs font-medium text-notion-text-secondary hover:text-red-400"
              title="로그아웃"
            >
              <Key className="w-4 h-4" />
              <span className="hidden sm:inline">API 키</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* 설정 모달 - Notion 스타일 */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-notion flex items-center justify-center z-50 p-4">
          <div className="bg-notion-card rounded-lg border border-notion-border shadow-none max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* 헤더 */}
            <div className="sticky top-0 bg-notion-card border-b border-notion-border px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-notion-text-primary" />
                <h2 className="text-lg font-semibold text-notion-text-primary">설정</h2>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1.5 hover:bg-notion-hover rounded-notion transition-colors"
              >
                <X className="w-5 h-5 text-notion-text-secondary" />
              </button>
            </div>
            
            {/* 컨텐츠 */}
            <div className="p-6">
              <TimeSlotSettings />
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
