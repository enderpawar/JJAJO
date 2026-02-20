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
    <div className="min-h-screen flex items-center justify-center p-4 theme-transition bg-theme text-theme">
      <div className="max-w-md w-full">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 text-theme">
            짜조에 오신 것을 환영해요!
          </h1>
          <p className="text-sm text-theme-muted">
            먼저 계정을 연결한 뒤, 안에서 설정을 통해 Gemini API 키를 입력할 수 있어요.
          </p>
        </div>

        <div className="card space-y-4">
          {/* 로그인 상태 확인 중 표시 */}
          {checking && (
            <p className="text-xs text-theme-muted mb-2">
              로그인 상태를 확인하고 있어요...
            </p>
          )}

          {/* Google 로그인: iOS Safari 호환을 위해 <a href> 사용 (클릭 핸들러 내 location.href는 차단될 수 있음) */}
          <a
            href={googleLoginUrl}
            className="btn-primary w-full flex items-center justify-center gap-2 no-underline text-inherit"
            onClick={() => {
              // #region agent log
              debugLog('AuthPage.tsx:googleLoginLink', 'Google login link tapped', { url: googleLoginUrl }, 'H2')
              // #endregion
            }}
          >
            <LogIn className="w-5 h-5" />
            <span>Google 계정으로 시작하기</span>
          </a>

          {/* 안내 문구 - 다크 모드에서도 가독성 확보 (테마 색상 사용) */}
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
            className="w-full text-xs text-theme-muted hover:text-theme underline-offset-2 hover:underline mt-2 transition-colors"
          >
            이미 로그인하셨나요? 플래너로 이동하기
          </button>
        </div>
      </div>
    </div>
  )
}

