import { getApiBase } from '@/utils/api'
import type { ApiKeyValidationRequest, ApiKeyValidationResponse } from '@/types/api'

function getApikeyValidateUrl(): string {
  const base = getApiBase()
  return base ? `${base}/api/v1/apikey/validate` : '/api/v1/apikey/validate'
}

/**
 * API 키 유효성 검증 서비스
 */
export const apiKeyService = {
  /**
   * Gemini API 키의 유효성을 검증합니다
   */
  async validateApiKey(apiKey: string): Promise<ApiKeyValidationResponse> {
    const response = await fetch(getApikeyValidateUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ apiKey } as ApiKeyValidationRequest),
    })

    if (!response.ok) {
      throw new Error(`API 호출 실패: ${response.status}`)
    }

    return response.json()
  },
}
