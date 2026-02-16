import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import AuthPage from './pages/AuthPage'
import MainPage from './pages/MainPage'
import { ToastContainer } from './components/layout/Toast'
import { getApiBase } from './utils/api'
import { debugLog } from './utils/debugLog'

/** /oauth2/authorization/google 로 들어온 경우(상대 경로로 로그인 시도 시) 백엔드로 리다이렉트 */
function OAuthRedirect() {
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    if (location.pathname === '/oauth2/authorization/google') {
      const base = getApiBase()
      // #region agent log
      debugLog('App.tsx:OAuthRedirect', 'Landed on /oauth2/authorization/google', { base, hasBase: !!base }, 'H3')
      // #endregion
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

function App() {
  return (
    <Router>
      <AppRoutes />
      <ToastContainer />
    </Router>
  )
}

export default App
