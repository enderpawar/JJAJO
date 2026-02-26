import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// iOS Safari: 문서 스크롤 조기 차단 (React 마운트 전부터 적용)
const preventDocumentScroll = (e: TouchEvent) => {
  const target = e.target as Node
  if (target && target instanceof Element && target.closest('[data-allow-scroll]')) return
  if (e.cancelable) e.preventDefault()
}
document.addEventListener('touchmove', preventDocumentScroll, { passive: false, capture: true })

// 저장된 테마 적용 (라이트/다크 토글, 첫 페인트 플래시 방지)
try {
  const raw = localStorage.getItem('jjajo-settings')
  if (raw) {
    const parsed = JSON.parse(raw)
    const theme = parsed?.state?.theme
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
      const meta = document.querySelector('meta[name="theme-color"]')
      if (meta) meta.setAttribute('content', '#121214')
    } else {
      document.documentElement.classList.remove('dark')
      const meta = document.querySelector('meta[name="theme-color"]')
      if (meta) meta.setAttribute('content', '#F8F9FA')
    }
  }
} catch {
  document.documentElement.classList.remove('dark')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
