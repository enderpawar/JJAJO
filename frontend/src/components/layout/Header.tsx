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
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-screen-2xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* 로고 */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-md">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">짜조</h1>
              <p className="text-xs text-gray-500">AI 일정 플래너</p>
            </div>
          </div>
          
          {/* 우측 메뉴 */}
          <div className="flex items-center gap-2">
            <button
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="설정"
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 hover:bg-red-50 rounded-lg transition-colors text-sm text-gray-700 hover:text-red-600"
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
