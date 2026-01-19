import { useApiKeyStore } from '@/stores/apiKeyStore'
import { useCalendarStore } from '@/stores/calendarStore'
import type { Todo } from '@/types/calendar'

const API_BASE_URL = '/api/v1'

interface ScheduleData {
  title: string
  description?: string
  date: string
  startTime?: string
  endTime?: string
  priority: string
}

interface ChatResponse {
  reply: string
  thinking?: string
  schedule?: ScheduleData
  conversationId: string
}

/**
 * AI 채팅 서비스
 */
export const aiChatService = {
  /**
   * AI에게 메시지 전송하고 일정 추출
   */
  async sendMessage(message: string, conversationId?: string): Promise<ChatResponse> {
    const { apiKey } = useApiKeyStore.getState()
    
    if (!apiKey) {
      throw new Error('API 키가 설정되지 않았습니다')
    }

    const response = await fetch(`${API_BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gemini-API-Key': apiKey,
      },
      body: JSON.stringify({
        message,
        conversationId,
      }),
    })

    if (!response.ok) {
      throw new Error('AI 채팅 요청 실패')
    }

    const data: ChatResponse = await response.json()
    
    // 일정 정보가 있으면 자동으로 캘린더에 추가
    if (data.schedule) {
      const { addTodo } = useCalendarStore.getState()
      
      const newTodo: Todo = {
        id: `ai-${Date.now()}`,
        title: data.schedule.title,
        description: data.schedule.description || 'AI가 생성한 일정',
        date: data.schedule.date,
        startTime: data.schedule.startTime,
        endTime: data.schedule.endTime,
        status: 'pending',
        priority: (data.schedule.priority as 'low' | 'medium' | 'high') || 'medium',
        createdBy: 'ai',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      addTodo(newTodo)
    }
    
    return data
  },
}
