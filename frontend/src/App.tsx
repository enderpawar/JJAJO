import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import AuthPage from './pages/AuthPage'
import MainPage from './pages/MainPage'
import { ToastContainer } from './components/layout/Toast'
import { getApiBase } from './utils/api'
import { hapticLight } from './utils/haptic'

/** /oauth2/authorization/google 로 들어온 경우(상대 경로로 로그인 시도 시) 백엔드로 리다이렉트 */
function OAuthRedirect() {
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    if (location.pathname === '/oauth2/authorization/google') {
      const base = getApiBase()
      if (base) {
        window.location.href = `${base}/oauth2/authorization/google`
        return
      }
      navigate('/', { replace: true })
    }
  }, [location.pathname, navigate])
  return null
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/oauth2/authorization/google" element={<OAuthRedirect />} />
      <Route path="/" element={<AuthPage />} />
      <Route path="/app" element={<MainPage />} />
    </Routes>
  )
}

/** 버튼·탭 가능 요소 클릭 시 모바일에서 경량 진동 피드백 */
function useHapticOnTap() {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const interactive = target.closest?.(
        'button, [role="button"], .btn-action-press, .btn-icon-tap, .btn-ghost-tap, .btn-nav-tap, .btn-danger-press, .view-mode-segmented-btn, .calendar-date-cell, [data-haptic]'
      )
      if (interactive && !(interactive as HTMLElement).hasAttribute('disabled')) {
        hapticLight()
      }
    }
    document.addEventListener('click', handleClick, { capture: true, passive: true })
    return () => document.removeEventListener('click', handleClick, { capture: true })
  }, [])
}

function App() {
  useHapticOnTap()
  return (
    <Router>
      <AppRoutes />
      <ToastContainer />
    </Router>
  )
}

export default App
