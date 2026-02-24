import { LogIn } from 'lucide-react'
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

  const handleEnterPlanner = () => {
    navigate('/app')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 theme-transition bg-theme text-theme relative overflow-hidden">
      {/* 배경: 로고 톤에 맞는 은은한 그라데이션 */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{ background: 'var(--primary-gradient)' }}
        aria-hidden
      />
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 rounded-full opacity-30 blur-3xl bg-[var(--primary-point)] pointer-events-none" aria-hidden />
      <div className="absolute bottom-1/4 -right-1/4 w-80 h-80 rounded-full opacity-20 blur-3xl bg-[var(--primary-point)] pointer-events-none" aria-hidden />

      <div className="max-w-md w-full relative z-10 flex flex-col items-center">
        {/* 짜조 로고 (Header와 동일한 비주얼) */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex items-center gap-0.5 shrink-0" aria-hidden>
              <span className="w-10 h-10 sm:w-12 sm:h-12 rounded-tool shadow-md bg-[var(--primary-point)]" />
              <span
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-tool -ml-3 sm:-ml-4 mt-1 sm:mt-1.5 shadow-md opacity-90"
                style={{ background: 'var(--primary-gradient)' }}
              />
            </div>
            <div className="flex flex-col leading-tight text-left">
              <span className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-main)] tracking-tight">
                짜조
              </span>
              <span className="font-display text-xs sm:text-sm font-medium text-[var(--text-muted)]">
                일정을 짜줘
              </span>
            </div>
          </div>
          <p className="text-theme-muted text-sm text-center max-w-[280px]">
            짜조에 오신 것을 환영해요!
          </p>
        </div>

        <div className="card card-flat space-y-4 w-full">
          {/* 로그인 상태 확인 중 표시 */}
          {checking && (
            <p className="text-xs text-theme-muted mb-2">
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

          {/* 안내 문구 */}
          <div className="mt-2 p-4 rounded-neu text-sm text-theme-muted bg-theme-card/60 border border-theme">
            <p className="mb-1 text-theme">
              로그인 후 오른쪽 상단 <strong className="text-theme">설정</strong> 버튼에서 Gemini API 키를 설정하면
              AI 플래너 기능이 활성화됩니다.
            </p>
          </div>

          {/* 이미 로그인했을 때 바로 플래너로 이동 */}
          <button
            type="button"
            onClick={handleEnterPlanner}
            className="w-full text-xs text-theme-muted hover:text-theme underline-offset-2 hover:underline mt-2 transition-colors py-2"
          >
            이미 로그인하셨나요? 플래너로 이동하기
          </button>
        </div>
      </div>
    </div>
  )
}

