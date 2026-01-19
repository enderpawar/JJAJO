import { Sparkles, Key, Settings, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApiKeyStore } from '@/stores/apiKeyStore'

export default function Header() {
  const navigate = useNavigate()
  const { clearApiKey } = useApiKeyStore()
  
  const handleLogout = () => {
    if (confirm('로그아웃하시겠습니까? API 키가 삭제됩니다.')) {
      clearApiKey()
      navigate('/api-key', { replace: true })
    }
  }
  
  return (
    <header className="bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-screen-2xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* 로고 */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">짜조</h1>
              <p className="text-xs text-gray-500 font-medium">AI 일정 플래너</p>
            </div>
          </div>
          
          {/* 우측 메뉴 */}
          <div className="flex items-center gap-2">
            <button
              className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors"
              title="설정"
            >
              <Settings className="w-5 h-5 text-gray-700" />
            </button>
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2.5 hover:bg-red-50 rounded-xl transition-colors text-sm font-medium text-gray-700 hover:text-red-600"
              title="로그아웃"
            >
              <Key className="w-4 h-4" />
              <span className="hidden sm:inline">API 키 변경</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
