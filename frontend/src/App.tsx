import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import AuthPage from './pages/AuthPage'
import MainPage from './pages/MainPage'

function App() {
  return (
    <Router>
      <Routes>
        {/* 1. 진입점: 회원가입/로그인 화면 */}
        <Route path="/" element={<AuthPage />} />
        {/* 2. 플래너 메인 화면 */}
        <Route path="/app" element={<MainPage />} />
      </Routes>
    </Router>
  )
}

export default App
