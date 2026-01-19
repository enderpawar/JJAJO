import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Key, Loader2, CheckCircle2, XCircle, Sparkles } from 'lucide-react'
import { apiKeyService } from '@/services/apiKeyService'
import { useApiKeyStore } from '@/stores/apiKeyStore'

export default function ApiKeyPage() {
  const navigate = useNavigate()
  const { setApiKey } = useApiKeyStore()
  
  const [inputKey, setInputKey] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const handleValidate = async () => {
    if (!inputKey.trim()) {
      setValidationResult({
        success: false,
        message: 'API 키를 입력해주세요',
      })
      return
    }

    setIsValidating(true)
    setValidationResult(null)

    try {
      const result = await apiKeyService.validateApiKey(inputKey.trim())
      
      if (result.valid) {
        setValidationResult({
          success: true,
          message: result.message,
        })
        
        // API 키 저장
        setApiKey(inputKey.trim())
        
        // 1초 후 메인 페이지로 이동
        setTimeout(() => {
          navigate('/', { replace: true })
        }, 1000)
      } else {
        setValidationResult({
          success: false,
          message: result.message,
        })
      }
    } catch (error) {
      setValidationResult({
        success: false,
        message: '네트워크 오류가 발생했습니다. 다시 시도해주세요.',
      })
    } finally {
      setIsValidating(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isValidating) {
      handleValidate()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl mb-4 shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            짜조에 오신 것을 환영해요!
          </h1>
          <p className="text-gray-600">
            AI와 함께 일정을 계획해보세요
          </p>
        </div>

        {/* API 키 입력 카드 */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-5 h-5 text-primary-500" />
            <h2 className="text-xl font-semibold text-gray-800">
              Gemini API 키 입력
            </h2>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            개인 API 키는 서버에 저장되지 않으며, 브라우저를 닫으면 자동으로 삭제됩니다.
          </p>

          <div className="space-y-4">
            <div>
              <label 
                htmlFor="apiKey" 
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                API 키
              </label>
              <input
                id="apiKey"
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="AIza..."
                className="input-field"
                disabled={isValidating}
              />
            </div>

            {/* 검증 결과 메시지 */}
            {validationResult && (
              <div
                className={`flex items-start gap-2 p-4 rounded-lg ${
                  validationResult.success
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                {validationResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <p
                  className={`text-sm ${
                    validationResult.success ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {validationResult.message}
                </p>
              </div>
            )}

            <button
              onClick={handleValidate}
              disabled={isValidating || !inputKey.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>검증 중...</span>
                </>
              ) : (
                <span>시작하기</span>
              )}
            </button>
          </div>

          {/* 안내 문구 */}
          <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800">
              <strong>💡 API 키가 없으신가요?</strong>
              <br />
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 underline"
              >
                Google AI Studio
              </a>
              에서 무료로 발급받을 수 있어요.
            </p>
          </div>
        </div>

        {/* 푸터 */}
        <p className="text-center text-sm text-gray-500 mt-6">
          짜조와 함께 스마트한 일정 관리를 시작하세요 ✨
        </p>
      </div>
    </div>
  )
}
