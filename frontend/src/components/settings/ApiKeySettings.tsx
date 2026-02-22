import { useState } from 'react'
import { Key, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { apiKeyService } from '@/services/apiKeyService'
import { useApiKeyStore } from '@/stores/apiKeyStore'

interface ApiKeySettingsProps {
  /** 컴팩트 모드: 카드 레이아웃, 입력/버튼 바로 표시 */
  compact?: boolean
}

export function ApiKeySettings({ compact = false }: ApiKeySettingsProps) {
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
    <div className={compact ? 'neu-float rounded-neu theme-transition bg-theme-card p-3 space-y-3' : 'space-y-4'}>
      {compact ? (
        <>
          <h3 className="text-sm font-semibold text-theme flex items-center gap-2">
            <Key className="w-4 h-4 text-primary-500" />
            Gemini API 키 설정
          </h3>
          <p className="text-xs text-theme-muted">
            API 키는 브라우저에만 저장되며, 계정마다 별도 보관돼요.
          </p>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-1">
            <Key className="w-5 h-5 text-primary-500" />
            <h3 className="text-base font-semibold text-theme">
              Gemini API 키 설정
            </h3>
          </div>
          <p className="text-xs text-theme-muted">
            API 키는 브라우저의 로컬 저장소에만 저장되며, 로그인한 계정(userId)마다 별도로 보관돼요.
          </p>
        </>
      )}

      <div className="space-y-3">
        <div>
          <label
            htmlFor="apiKey"
            className="block text-xs font-medium text-theme-muted mb-1.5"
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
            className={`flex items-start gap-2 p-3 rounded-neu text-xs theme-transition ${
              validationResult.success
                ? 'bg-emerald-500/10'
                : 'bg-red-500/10'
            }`}
          >
            {validationResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <p
              className={
                validationResult.success ? 'text-emerald-800 dark:text-emerald-200' : 'text-red-700 dark:text-red-300'
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

        <p className="text-xs text-[#92400e] bg-amber-500/10 rounded-neu p-3">
          <strong className="text-theme">API 키가 없으신가요?</strong>
          <br />
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-500 hover:text-primary-600 underline font-medium"
          >
            Google AI Studio
          </a>
          에서 무료로 발급받을 수 있어요.
        </p>
      </div>
    </div>
  )
}

