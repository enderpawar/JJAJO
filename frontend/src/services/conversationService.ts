import { useApiKeyStore } from '@/stores/apiKeyStore'

const API_BASE_URL = '/api/v1/conversations'

export interface ConversationChatResponse {
  conversationId: string
  aiMessage: string
  state: 'INITIAL' | 'UNDERSTANDING_CONTEXT' | 'COLLECTING_DETAILS' | 'READY_TO_CREATE'
  readyToCreateGoal: boolean
  collectedInfo: Record<string, any>
  quickReplies?: string[]
}

export interface ConversationGoalCreationResult {
  goalId: string
  title: string
  description: string
  deadline: string
  estimatedHours: number
  milestoneCount: number
}

/**
 * 대화형 목표 설정 서비스
 * 
 * 기능:
 * - AI와 여러 차례 대화를 통해 정보 수집
 * - 사용자 상황에 최적화된 맞춤형 계획 수립
 */
export const conversationService = {
  /**
   * AI와 대화하기
   */
  async chat(
    message: string,
    conversationId?: string
  ): Promise<ConversationChatResponse> {
    const { apiKey } = useApiKeyStore.getState()
    
    if (!apiKey) {
      throw new Error('API 키가 설정되지 않았습니다')
    }

    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        message,
        conversationId,
      }),
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('대화 처리 실패')
    }

    return await response.json()
  },

  /**
   * 대화 완료 후 목표 생성
   */
  async createGoalFromConversation(
    conversationId: string
  ): Promise<ConversationGoalCreationResult> {
    const { apiKey } = useApiKeyStore.getState()
    
    if (!apiKey) {
      throw new Error('API 키가 설정되지 않았습니다')
    }

    const response = await fetch(`${API_BASE_URL}/create-goal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        conversationId,
      }),
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('목표 생성 실패')
    }

    return await response.json()
  },
}
