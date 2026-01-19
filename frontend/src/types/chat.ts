/**
 * AI 채팅 관련 타입 정의
 */

export type MessageRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: string
  isThinking?: boolean
}

export interface ChatSession {
  id: string
  messages: ChatMessage[]
  createdAt: string
}
