import { Sparkles, LogIn } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiBase } from '@/utils/api'

export default function AuthPage() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)

  // 앱 진입 시 로그인 상태 확인 (백엔드 오리진으로 요청해 쿠키 전송)
  useEffect(() => {
    const checkLogin = async () => {
      try {
        const base = getApiBase()
        const url = base ? `${base}/api/me` : '/api/me'
        const res = await fetch(url, {
          credentials: 'include',
        })
        if (res.ok) {
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
  }, [navigate])

  const handleGoogleLogin = () => {
    const base = getApiBase()
    window.location.href = base ? `${base}/oauth2/authorization/google` : '/oauth2/authorization/google'
  }

  const handleEnterPlanner = () => {
    navigate('/app')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-notion-bg text-notion-text">
      <div className="max-w-md w-full">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl mb-4 shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            짜조에 오신 것을 환영해요!
          </h1>
          <p className="text-sm text-notion-text-secondary">
            먼저 계정을 연결한 뒤, 안에서 설정을 통해 Gemini API 키를 입력할 수 있어요.
          </p>
        </div>

        <div className="card space-y-4">
          {/* 로그인 상태 확인 중 표시 */}
          {checking && (
            <p className="text-xs text-notion-text-secondary mb-2">
              로그인 상태를 확인하고 있어요...
            </p>
          )}

          {/* Google 로그인 버튼 */}
          <button
            onClick={handleGoogleLogin}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            <span>Google 계정으로 시작하기</span>
          </button>

          {/* 안내 문구 */}
          <div className="mt-2 p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-800">
            <p className="mb-1">
              로그인 후 오른쪽 상단 <strong>설정</strong> 버튼에서 Gemini API 키를 설정하면
              AI 플래너 기능이 활성화됩니다.
            </p>
          </div>

          {/* 이미 로그인했을 때 바로 플래너로 이동 */}
          <button
            type="button"
            onClick={handleEnterPlanner}
            className="w-full text-xs text-notion-text-secondary hover:text-notion-text-primary underline-offset-2 hover:underline mt-2"
          >
            이미 로그인하셨나요? 플래너로 이동하기
          </button>
        </div>
      </div>
    </div>
  )
}

