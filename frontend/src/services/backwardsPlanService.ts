import { useApiKeyStore } from '@/stores/apiKeyStore'
import type { BackwardsPlanPayload, BackwardsPlanResult } from '@/types/backwardsPlan'

const API_BASE_URL = '/api/v1/ai'

/**
 * 데드라인 역계산 계획 요청
 */
export async function requestBackwardsPlan(payload: BackwardsPlanPayload): Promise<BackwardsPlanResult> {
  const { apiKey } = useApiKeyStore.getState()
  if (!apiKey) {
    throw new Error('Gemini API 키가 필요합니다.')
  }

  const response = await fetch(`${API_BASE_URL}/backwards-plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Gemini-API-Key': apiKey,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const message = await safeParseMessage(response)
    throw new Error(message ?? '역계산 계획 생성에 실패했습니다.')
  }

  return response.json() as Promise<BackwardsPlanResult>
}

async function safeParseMessage(response: Response): Promise<string | undefined> {
  try {
    const data = await response.json()
    if (typeof data?.message === 'string') {
      return data.message
    }
  } catch {
    // ignore
  }
  return undefined
}
