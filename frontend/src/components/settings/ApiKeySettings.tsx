import { useState } from 'react'
import { Key, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { apiKeyService } from '@/services/apiKeyService'
import { useApiKeyStore } from '@/stores/apiKeyStore'

export function ApiKeySettings() {
  const { apiKey, setApiKey, clearApiKey } = useApiKeyStore()

  const [inputKey, setInputKey] = useState(apiKey ?? '')
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

  const handleClear = () => {
    clearApiKey()
    setInputKey('')
    setValidationResult({
      success: true,
      message: '저장된 API 키가 삭제되었습니다.',
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Key className="w-5 h-5 text-primary-500" />
        <h3 className="text-base font-semibold text-notion-text-primary">
          Gemini API 키 설정
        </h3>
      </div>
      <p className="text-xs text-notion-text-secondary">
        API 키는 브라우저의 세션 저장소에만 저장되며, 브라우저를 닫으면 자동으로 삭제됩니다.
      </p>

      <div className="space-y-3">
        <div>
          <label
            htmlFor="apiKey"
            className="block text-xs font-medium text-notion-text-secondary mb-1.5"
          >
            API 키
          </label>
          <input
            id="apiKey"
            type="password"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder="AIza..."
            className="input-field"
            disabled={isValidating}
          />
        </div>

        {validationResult && (
          <div
            className={`flex items-start gap-2 p-3 rounded-lg text-xs ${
              validationResult.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            {validationResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <p
              className={
                validationResult.success ? 'text-green-800' : 'text-red-800'
              }
            >
              {validationResult.message}
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleValidate}
            disabled={isValidating || !inputKey.trim()}
            className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm"
          >
            {isValidating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>검증 중...</span>
              </>
            ) : (
              <span>API 키 저장</span>
            )}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="btn-secondary flex-1 text-sm"
          >
            API 키 삭제
          </button>
        </div>

        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
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
  )
}

