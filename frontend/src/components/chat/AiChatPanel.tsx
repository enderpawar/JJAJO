import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Loader2, Trash2, MessageSquare, CheckCircle } from 'lucide-react'
import { useChatStore } from '@/stores/chatStore'
import { aiChatService } from '@/services/aiChatService'
import type { ChatMessage } from '@/types/chat'
import { cn } from '@/utils/cn'

export default function AiChatPanel() {
  const { currentSession, isLoading, addMessage, clearMessages, setLoading, initSession } = useChatStore()
  const [inputValue, setInputValue] = useState('')
  const [conversationId, setConversationId] = useState<string>()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // 세션 초기화
  useEffect(() => {
    if (!currentSession) {
      initSession()
    }
  }, [currentSession, initSession])
  
  // 메시지가 추가될 때마다 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentSession?.messages])
  
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return
    
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
    }
    
    addMessage(userMessage)
    setInputValue('')
    setLoading(true)
    
    try {
      // AI 응답 대기
      const response = await aiChatService.sendMessage(userMessage.content, conversationId)
      
      // 대화 ID 저장
      if (response.conversationId) {
        setConversationId(response.conversationId)
      }
      
      // AI 응답 추가
      let replyContent = response.reply
      if (response.schedule) {
        replyContent += '\n\n✅ 일정이 캘린더에 추가되었습니다!'
      }
      
      const aiMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: replyContent,
        timestamp: new Date().toISOString(),
      }
      
      addMessage(aiMessage)
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: '죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.',
        timestamp: new Date().toISOString(),
      }
      
      addMessage(errorMessage)
    } finally {
      setLoading(false)
    }
  }
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }
  
  const messages = currentSession?.messages || []
  
  return (
    <div className="w-80 bg-white rounded-xl shadow-lg flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">AI 채팅</h3>
        </div>
        
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="대화 내역 삭제"
          >
            <Trash2 className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>
      
      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-purple-300" />
            </div>
            <p className="text-sm text-gray-500 mb-2">
              AI와 대화를 시작하세요
            </p>
            <p className="text-xs text-gray-400">
              "내일 오후 2시에 회의 일정 추가해줘"<br />
              같이 자연스럽게 말해보세요!
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-lg px-4 py-2',
                    message.role === 'user'
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-800'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                  <p
                    className={cn(
                      'text-xs mt-1',
                      message.role === 'user' ? 'text-primary-100' : 'text-gray-500'
                    )}
                  >
                    {new Date(message.timestamp).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
            
            {/* 로딩 중 */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
                    <span className="text-sm text-gray-600">AI가 생각하는 중...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {/* 입력 영역 */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="일정을 요청해보세요..."
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className={cn(
              'p-2 rounded-lg transition-colors',
              inputValue.trim() && !isLoading
                ? 'bg-purple-500 hover:bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-xs text-gray-400 mt-2">
          💡 Tip: "내일 오후 3시 운동", "다음주 월요일 회의" 등으로 요청해보세요
        </p>
      </div>
    </div>
  )
}
