import { LogIn, Sparkles, CalendarDays, Brain } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiBase } from '@/utils/api'
import { getToken, setToken, clearToken } from '@/utils/tokenStorage'
import { useUserStore } from '@/stores/userStore'

export default function AuthPage() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const setCurrentUser = useUserStore((s) => s.setCurrentUser)

  useEffect(() => {
    const checkLogin = async () => {
      // 1. OAuth 리다이렉트 후 URL에서 토큰 추출 (?token= 또는 #token=, iOS Safari 302 시 # 유실 대응)
      const hash = window.location.hash
      const params = new URLSearchParams(window.location.search)
      const tokenFromHash = hash.startsWith('#token=') ? decodeURIComponent(hash.slice(7).trim()) : null
      const tokenFromQuery = params.get('token')
      const tokenFromUrl = tokenFromHash || tokenFromQuery
      if (tokenFromUrl) {
        setToken(tokenFromUrl)
        // URL에서 토큰 제거 (보안·북마크 시 노출 방지)
        const cleanPath = window.location.pathname || '/'
        window.history.replaceState(null, '', cleanPath)
      }

      try {
        const base = getApiBase()
        const url = base ? `${base}/api/me` : '/api/me'
        const token = getToken()
        const res = await fetch(url, {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (res.ok) {
          try {
            const me = await res.json()
            if (me && typeof me.userId === 'string') {
              setCurrentUser({
                userId: me.userId,
                email: me.email ?? null,
                name: me.name ?? null,
                pictureUrl: me.pictureUrl ?? null,
              })
            }
          } catch {
            // JSON 파싱 실패 시에는 사용자 정보 저장 없이 진행
          }
          navigate('/app', { replace: true })
          return
        }
        // 401 시 토큰이 있으면 만료된 것일 수 있음
        if (res.status === 401 && token) {
          clearToken()
        }
      } catch (e) {
        // 네트워크 오류 등은 무시하고 로그인 화면 표시
      } finally {
        setChecking(false)
      }
    }

    checkLogin()
  }, [navigate, setCurrentUser])

  // iOS Safari: window.location.href는 클릭 핸들러에서 차단될 수 있음. <a href> 네이티브 이동 사용.
  const googleLoginUrl = (() => {
    const base = getApiBase()
    return base ? `${base}/oauth2/authorization/google` : '/oauth2/authorization/google'
  })()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-6 theme-transition bg-[#FFF7F0] dark:bg-[#050507] text-theme relative overflow-hidden">
      <div
        className="hidden sm:block absolute top-1/5 -left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl bg-[var(--primary-point)] pointer-events-none animate-float-soft"
        style={{ animationDuration: '18s' }}
        aria-hidden
      />
      <div
        className="hidden sm:block absolute bottom-1/4 -right-1/4 w-80 h-80 rounded-full opacity-18 blur-3xl bg-[var(--primary-point)] pointer-events-none animate-float-soft"
        style={{ animationDuration: '20s', animationDelay: '0.4s' }}
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-3xl mx-auto flex flex-col items-center gap-8">
        {/* 상단: 인트로 카피 (모바일/PC 공통, 중앙 정렬) */}
        <div className="w-full flex flex-col items-center text-center gap-5 animate-intro-slide-up" style={{ animationDelay: '0.02s' }}>
          <div className="flex items-center gap-2">
            <div className="relative flex items-center gap-0.5 shrink-0" aria-hidden>
              <span className="w-10 h-10 sm:w-12 sm:h-12 rounded-tool shadow-md bg-[var(--primary-point)]" />
              <span
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-tool -ml-3 sm:-ml-4 mt-1 sm:mt-1.5 shadow-md opacity-90"
                style={{ background: 'var(--primary-gradient)' }}
              />
            </div>
            <div className="flex flex-col leading-tight text-left">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-main)]">
                짜조
              </span>
              <span className="text-xs sm:text-sm font-medium text-[var(--text-muted)]">
                일정을 짜줘
              </span>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <h1 className="mt-3 sm:mt-4 text-2xl sm:text-3xl md:text-[2.1rem] font-semibold tracking-tight text-[var(--text-main)]">
              <span className="animate-intro-heading-jiggle">머릿속 할 일을,</span>{' '}
              <span className="text-primary-500">AI가 대신 시간표로</span>
            </h1>
            <p className="max-w-xl text-sm sm:text-base text-[var(--text-muted)]">
              공부, 업무, 사이드 프로젝트까지.
              <br className="hidden sm:block" />
              짜조에 &quot;오늘 해야 할 일&quot;만 알려주면, 남는 시간에 딱 맞게 일정을 배치해 드릴게요.
            </p>
          </div>

          {/* 기능 모달(카드) 제거 */}
        </div>

        {/* 하단: 로그인 카드 (모바일/PC 공통 중앙 배치) */}
        <div className="w-full max-w-md animate-intro-slide-up" style={{ animationDelay: '0.22s' }}>
          <div className="space-y-4 w-full">
            {/* 로그인 상태 확인 중 표시 */}
            {checking && (
              <p className="text-xs text-theme-muted mb-1">
                로그인 상태를 확인하고 있어요...
              </p>
            )}

            {/* Google 로그인: iOS Safari 호환을 위해 <a href> 사용 */}
            <a
              href={googleLoginUrl}
              className="btn-primary w-full flex items-center justify-center gap-2 no-underline text-inherit min-h-[48px]"
            >
              <LogIn className="w-5 h-5 shrink-0" />
              <span>Google 계정으로 시작하기</span>
            </a>

            {/* 안내 문구 제거 (Gemini API 키 설정 설명) */}
          </div>
        </div>
      </div>
    </div>
  )
}

