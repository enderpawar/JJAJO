/**
 * AI 채팅 관련 타입 정의
 */

export type MessageRole = 'user' | 'assistant' | 'system'
export type MessageType = 'text' | 'confirmation' | 'quick-reply'

export interface QuickReply {
  id: string
  text: string
  value: string
  icon?: string
}

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: string
  isThinking?: boolean
  type?: MessageType
  quickReplies?: QuickReply[]
  confirmationData?: {
    goalRequest: string
    preview: {
      title: string
      estimatedDays: number
      sessionsPerWeek: number
      description: string
    }
  }
}

export interface ChatSession {
  id: string
  messages: ChatMessage[]
  createdAt: string
}
