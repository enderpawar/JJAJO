import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Loader2, Trash2, MessageSquare, CheckCircle, Target } from 'lucide-react'
import { useChatStore } from '@/stores/chatStore'
import { useGoalStore } from '@/stores/goalStore'
import { useCalendarStore } from '@/stores/calendarStore'
import { aiChatService } from '@/services/aiChatService'
import { goalService } from '@/services/goalService'
import type { ChatMessage } from '@/types/chat'
import { cn } from '@/utils/cn'

export default function AiChatPanel() {
  const { currentSession, isLoading, addMessage, clearMessages, setLoading, initSession } = useChatStore()
  const { addGoal } = useGoalStore()
  const { addTodo } = useCalendarStore()
  const [inputValue, setInputValue] = useState('')
  const [conversationId, setConversationId] = useState<string>()
  const [isCreatingGoal, setIsCreatingGoal] = useState(false)
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
    const messageContent = inputValue.trim()
    setInputValue('')
    setLoading(true)
    
    try {
      // 목표 관련 키워드 감지
      const isGoalRequest = detectGoalRequest(messageContent)
      
      if (isGoalRequest) {
        // 목표 생성 모드
        setIsCreatingGoal(true)
        
        // 진행 상황 메시지
        const progressMessage: ChatMessage = {
          id: `msg-${Date.now()}-progress`,
          role: 'assistant',
          content: '🎯 목표를 분석하고 계획을 수립하고 있습니다...\n\n• 목표 분석 중\n• 커리큘럼 설계 중\n• 일정 생성 중',
          timestamp: new Date().toISOString(),
        }
        addMessage(progressMessage)
        
        // AI 기반 목표 생성
        const result = await goalService.createGoalWithAI(messageContent)
        
        // Goal 추가
        addGoal(result.goal)
        
        // 일정들을 캘린더에 추가
        result.schedules.forEach((schedule, index) => {
          addTodo({
            id: `goal-schedule-${Date.now()}-${index}`,
            title: schedule.title,
            description: schedule.description || '',
            date: schedule.date,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            status: 'pending',
            priority: schedule.priority as 'high' | 'medium' | 'low',
            createdBy: 'ai',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        })
        
        // 완료 메시지
        const successMessage: ChatMessage = {
          id: `msg-${Date.now()}-success`,
          role: 'assistant',
          content: `✅ 목표 달성 계획이 완성되었습니다!\n\n` +
                   `📋 **${result.goal.title}**\n\n` +
                   `⏰ 예상 기간: ${result.goal.deadline}까지\n` +
                   `📚 총 학습 시간: ${result.totalHours}시간\n` +
                   `📅 주 ${result.sessionsPerWeek}회 학습\n\n` +
                   `**커리큘럼**\n${result.curriculum}\n\n` +
                   `📌 ${result.schedules.length}개의 일정이 캘린더에 자동으로 추가되었습니다!\n` +
                   `"내 목표" 섹션에서 진행 상황을 확인하세요.`,
          timestamp: new Date().toISOString(),
        }
        addMessage(successMessage)
        
        setIsCreatingGoal(false)
      } else {
        // 일반 채팅 모드
        const response = await aiChatService.sendMessage(messageContent, conversationId)
        
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
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: '죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.',
        timestamp: new Date().toISOString(),
      }
      
      addMessage(errorMessage)
      setIsCreatingGoal(false)
    } finally {
      setLoading(false)
    }
  }
  
  /**
   * 목표 관련 요청인지 감지
   */
  const detectGoalRequest = (message: string): boolean => {
    const goalKeywords = [
      '목표', '계획', '달성', '공부', '학습', '준비',
      '토익', '토플', 'TOEIC', 'TOEFL',
      '자격증', '시험', '합격',
      '커리큘럼', '일정 짜', '스케줄',
      '~하고 싶어', '~할래', '~할 거야',
    ]
    
    return goalKeywords.some(keyword => message.includes(keyword))
  }
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }
  
  const messages = currentSession?.messages || []
  
  return (
    <div className="bg-white rounded-2xl shadow-lg flex flex-col h-[600px]">
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
