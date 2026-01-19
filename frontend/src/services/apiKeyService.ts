import type { ApiKeyValidationRequest, ApiKeyValidationResponse } from '@/types/api'

const API_BASE_URL = '/api/v1'

/**
 * API 키 유효성 검증 서비스
 */
export const apiKeyService = {
  /**
   * Gemini API 키의 유효성을 검증합니다
   */
  async validateApiKey(apiKey: string): Promise<ApiKeyValidationResponse> {
    const response = await fetch(`${API_BASE_URL}/apikey/validate`, {
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
