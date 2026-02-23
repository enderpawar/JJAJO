import { useEffect } from 'react'
import { ChevronLeft, Settings, LogIn } from 'lucide-react'
import { getApiBase } from '@/utils/api'
import { TimeSlotSettings } from '@/components/settings/TimeSlotSettings'
import { ApiKeySettings } from '@/components/settings/ApiKeySettings'
import { ScheduleDataSettings } from '@/components/settings/ScheduleDataSettings'

interface MobileSettingsPageProps {
  onClose: () => void
}

export default function MobileSettingsPage({ onClose }: MobileSettingsPageProps) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const handleGoogleLogin = () => {
    const base = getApiBase()
    const url = base ? `${base}/oauth2/authorization/google` : '/oauth2/authorization/google'
    window.location.href = url
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col theme-transition bg-theme"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="설정"
    >
      {/* 상단 헤더: 뒤로가기 + 제목 (모바일 컴팩트) */}
      <header className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-[var(--border-color)] bg-[var(--card-bg)] theme-transition">
        <button
          type="button"
          onClick={onClose}
          className="touch-target flex items-center justify-center w-9 h-9 rounded-full text-theme-muted hover:bg-[var(--hover-bg)] hover:text-theme transition-colors -ml-0.5"
          aria-label="뒤로"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Settings className="w-4 h-4 text-theme shrink-0" />
          <h1 className="text-base font-semibold text-theme truncate">설정</h1>
        </div>
        <div className="w-9 shrink-0" aria-hidden />
      </header>

      {/* 스크롤 영역: scrollbar-gutter로 스크롤바 등장 시 위쪽 콘텐츠가 좌우로 밀리지 않도록 함 */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
        style={{ scrollbarGutter: 'stable' }}
      >
        <div className="p-3 pb-4 space-y-4 max-w-2xl mx-auto min-w-0 w-full box-border">
          {/* 계정 — 카드 스타일로 상단 섹션과 시각적 일관성 */}
          <section className="neu-float rounded-neu theme-transition bg-theme-card p-3">
            <h2 className="text-xs font-semibold text-theme mb-1.5">계정</h2>
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-neu bg-[var(--hover-bg)] border-0 text-theme text-sm font-medium theme-transition hover:opacity-90 active:scale-[0.98]"
              title="Google 계정으로 로그인"
            >
              <LogIn className="w-4 h-4" />
              Google 로그인
            </button>
          </section>

          <TimeSlotSettings defaultTimeSlotsExpanded={false} compact />

          <ApiKeySettings compact />

          <ScheduleDataSettings compact />
        </div>
      </div>
    </div>
  )
}
