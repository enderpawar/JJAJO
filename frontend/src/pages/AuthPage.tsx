import { LogIn } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiBase } from '@/utils/api'
import { debugLog } from '@/utils/debugLog'
import { useUserStore } from '@/stores/userStore'

export default function AuthPage() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const setCurrentUser = useUserStore((s) => s.setCurrentUser)

  // 앱 진입 시 로그인 상태 확인 (백엔드 오리진으로 요청해 쿠키 전송)
  useEffect(() => {
    // #region agent log
    const base = getApiBase()
    debugLog('AuthPage.tsx:mount', 'AuthPage mounted, getApiBase()', { base, baseLength: base?.length ?? 0 }, 'H1')
    // #endregion
  }, [])

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const base = getApiBase()
        const url = base ? `${base}/api/me` : '/api/me'
        const res = await fetch(url, {
          credentials: 'include',
        })
        if (res.ok) {
          // 현재 로그인한 사용자 정보 저장
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

          // 이미 로그인된 상태이면 바로 플래너로 이동
          navigate('/app', { replace: true })
          return
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

        <div className="card space-y-4 w-full shadow-[var(--shadow-float)]">
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
            onClick={() => {
              debugLog('AuthPage.tsx:googleLoginLink', 'Google login link tapped', { url: googleLoginUrl }, 'H2')
            }}
          >
            <LogIn className="w-5 h-5 shrink-0" />
            <span>Google 계정으로 시작하기</span>
          </a>

          {/* 안내 문구 */}
          <div className="mt-2 p-4 neu-inset rounded-neu text-sm text-theme-muted">
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

