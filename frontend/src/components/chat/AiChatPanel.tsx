import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Trash2, MessageSquare, CheckCircle, Target, Bot } from 'lucide-react'
import { useChatStore } from '@/stores/chatStore'
import { useGoalStore } from '@/stores/goalStore'
import { useCalendarStore } from '@/stores/calendarStore'
import { createSchedule } from '@/services/scheduleService'
import { aiChatService } from '@/services/aiChatService'
import { goalService } from '@/services/goalService'
import { conversationService, type ConversationChatResponse, type ConversationGoalCreationResult } from '@/services/conversationService'
import type { ChatMessage, QuickReply } from '@/types/chat'
import { cn } from '@/utils/cn'
import { normalizeGoalFromApi } from '@/utils/api'
import ConversationProgress from './ConversationProgress'
import InputHint from './InputHint'
import LoadingIndicator from './LoadingIndicator'
import QuickReplyButtons from './QuickReplyButtons'

export default function AiChatPanel() {
  const { currentSession, isLoading, addMessage, removeMessage, clearMessages, setLoading, initSession } = useChatStore()
  const addGoal = useGoalStore((state) => state.addGoal)
  const addTodo = useCalendarStore((state) => state.addTodo)
  const [inputValue, setInputValue] = useState('')
  const [conversationId, setConversationId] = useState<string>()
  const [_isCreatingGoal, setIsCreatingGoal] = useState(false)
  const [_pendingGoalRequest, setPendingGoalRequest] = useState<string | null>(null)
  const [confirmationMessageId, setConfirmationMessageId] = useState<string | null>(null)
  const [useConversationalMode, setUseConversationalMode] = useState(true) // 대화형 모드 활성화
  const [readyToCreate, setReadyToCreate] = useState(false)
  const [collectedInfo, setCollectedInfo] = useState<ConversationChatResponse['collectedInfo']>({})
  const [nextHint, setNextHint] = useState<string>()
  const [_quickScheduleMode, setQuickScheduleMode] = useState(false) // 간단 일정 모드
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
  
  // 대화 초기화 (Clear 버튼용)
  const handleClearChat = () => {
    clearMessages()
    setConversationId(undefined)
    setPendingGoalRequest(null)
    setConfirmationMessageId(null)
    setReadyToCreate(false)
    setCollectedInfo({})
    setNextHint(undefined)
    setQuickScheduleMode(false)
  }
  
  // Quick Replies 파싱 함수
  const parseQuickReplies = (quickRepliesArray?: string[]): QuickReply[] => {
    if (!quickRepliesArray || quickRepliesArray.length === 0) return []
    
    return quickRepliesArray.map((text, index) => ({
      id: `qr-${Date.now()}-${index}`,
      text: text.trim(),
      value: text.trim(),
      icon: text.includes('⚡') ? 'zap' : text.includes('🌅') ? 'clock' : text.includes('📅') ? 'calendar' : undefined
    }))
  }

  // Quick Reply 선택 핸들러
  const handleQuickReplySelect = async (value: string) => {
    if (isLoading) return
    
    // 사용자 메시지로 표시
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: value,
      timestamp: new Date().toISOString(),
    }
    addMessage(userMessage)
    
    // 메시지 전송
    setLoading(true)
    
    try {
      // 대화가 진행 중이면 대화형 모드로 처리
      if (conversationId && useConversationalMode) {
        const response = await conversationService.chat(value, conversationId)
        
        setCollectedInfo(response.collectedInfo || {})
        
        const aiMessage: ChatMessage = {
          id: `msg-${Date.now()}-ai`,
          role: 'assistant',
          content: response.aiMessage,
          timestamp: new Date().toISOString(),
          quickReplies: parseQuickReplies(response.quickReplies)
        }
        addMessage(aiMessage)
        
        // 목표 생성 준비 완료 확인
        if (response.readyToCreateGoal) {
          setReadyToCreate(true)
          
          const confirmMessageId = `msg-${Date.now()}-confirm`
          setConfirmationMessageId(confirmMessageId)
          
          const confirmationMessage: ChatMessage = {
            id: confirmMessageId,
            role: 'assistant',
            content: `\n\n✅ **충분한 정보가 수집되었습니다!**\n\n목표를 생성하시겠습니까?`,
            timestamp: new Date().toISOString(),
            type: 'confirmation',
            confirmationData: {
              goalRequest: value,
              preview: {
                title: '맞춤형 목표 계획',
                estimatedDays: 84,
                sessionsPerWeek: 5,
                description: '수집된 정보를 바탕으로 최적화된 계획을 수립합니다',
              },
            },
          }
          addMessage(confirmationMessage)
        }
      }
    } catch (error) {
      console.error('Quick Reply 처리 실패:', error)
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
  
  // 간단 일정 즉시 추가 (ADHD 친화적 + Task Chunking!) — 원격 DB 저장
  const addQuickSchedule = async (timeOption: string, goalTitle?: string) => {
    const now = new Date()
    let scheduledDate = new Date(now)
    let startHour = now.getHours()
    let startMinute = now.getMinutes()

    if (timeOption.includes('지금') || timeOption.includes('바로')) {
      scheduledDate = now
      startHour = now.getHours()
      startMinute = now.getMinutes()
    } else if (timeOption.includes('오전')) {
      scheduledDate.setDate(scheduledDate.getDate() + 1)
      startHour = 9
      startMinute = 0
    } else if (timeOption.includes('저녁')) {
      startHour = 20
      startMinute = 0
    }

    const title = goalTitle || collectedInfo.goal_type || '새로운 일정'
    const dateStr = scheduledDate.toISOString().split('T')[0]

    const chunks = [
      { title: `${title} - 준비하기`, duration: 5 },
      { title: `${title} - 시작하기`, duration: 10 },
      { title: `${title} - 집중하기`, duration: 20 },
      { title: `${title} - 마무리하기`, duration: 10 },
    ]

    let currentHour = startHour
    let currentMinute = startMinute
    const addedTodos: string[] = []

    for (let index = 0; index < chunks.length; index++) {
      const chunk = chunks[index]
      const startTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`
      currentMinute += chunk.duration
      if (currentMinute >= 60) {
        currentHour += Math.floor(currentMinute / 60)
        currentMinute = currentMinute % 60
      }
      const endTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`
      try {
        const saved = await createSchedule({
          title: chunk.title,
          date: dateStr,
          startTime,
          endTime,
          status: 'pending',
          priority: 'medium',
          createdBy: 'ai',
        })
        addTodo(saved)
        addedTodos.push(`${startTime} ${chunk.title} (${chunk.duration}분)`)
      } catch {
        addedTodos.push(`${startTime} ${chunk.title} (저장 실패)`)
      }
    }

    const successMessage: ChatMessage = {
      id: `msg-${Date.now()}-success`,
      role: 'assistant',
      content: `✅ **"${title}" 일정이 작은 단위로 등록되었어요!**\n\n🧠 Task Chunking 적용:\n${addedTodos.map(t => `• ${t}`).join('\n')}\n\n각 단계를 완료할 때마다 체크해보세요! 🎯`,
      timestamp: new Date().toISOString(),
    }
    addMessage(successMessage)
    setConversationId(undefined)
    setQuickScheduleMode(false)
  }
  
  // 빠른 생성 핸들러 (사용자가 기다리다 지쳐서 바로 생성 원할 때)
  const handleQuickCreate = async () => {
    if (!conversationId) return
    
    setLoading(true)
    try {
      // "지금 바로 생성해줘" 메시지 전송
      const forceMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: '지금 바로 계획 생성해줘',
        timestamp: new Date().toISOString(),
      }
      addMessage(forceMessage)
      
      const response = await conversationService.chat('지금 바로 계획 생성해줘', conversationId)
      
      // 수집된 정보 업데이트
      setCollectedInfo(response.collectedInfo || {})
      
      // AI 응답 추가 (Quick Replies 포함)
      const aiMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: response.aiMessage,
        timestamp: new Date().toISOString(),
        quickReplies: parseQuickReplies(response.quickReplies)
      }
      addMessage(aiMessage)
      
      // 목표 생성 준비 완료 확인
      if (response.readyToCreateGoal) {
        setReadyToCreate(true)
        
        // 확인 메시지 추가
        const confirmMessageId = `msg-${Date.now()}-confirm`
        setConfirmationMessageId(confirmMessageId)
        
        const confirmationMessage: ChatMessage = {
          id: confirmMessageId,
          role: 'assistant',
          content: `\n\n✅ **충분한 정보가 수집되었습니다!**\n\n목표를 생성하시겠습니까?`,
          timestamp: new Date().toISOString(),
          type: 'confirmation',
          confirmationData: {
            goalRequest: '빠른 생성',
            preview: {
              title: '맞춤형 목표 계획',
              estimatedDays: 84,
              sessionsPerWeek: 5,
              description: '수집된 정보를 바탕으로 최적화된 계획을 수립합니다',
            },
          },
        }
        addMessage(confirmationMessage)
      }
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
  
  // 다음 질문 힌트 생성
  const generateNextHint = (info: ConversationChatResponse['collectedInfo']) => {
    if (!info) {
      setNextHint(undefined)
      return
    }
    
    // 수집되지 않은 정보에 대한 힌트
    if (!info.goal_type && !info.target_score) {
      setNextHint('예: "토익 800점 달성하고 싶어" 또는 "3개월 안에 다이어트 10kg"')
    } else if (!info.current_score) {
      setNextHint('예: "현재 700점이야" 또는 "지금은 70kg이야"')
    } else if (!info.mentioned_deadline) {
      setNextHint('예: "3월까지" 또는 "2개월 안에" 또는 "6월 시험 전까지"')
    } else if (!info.mentioned_hours && !info.mentioned_time_preference) {
      setNextHint('예: "하루 2시간" 또는 "주말에만" 또는 "평일 저녁에"')
    } else {
      setNextHint(undefined) // 모든 정보 수집 완료
    }
  }
  
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
      // 🚀 간단 일정 모드: 시간 키워드 감지 → 즉시 캘린더 등록!
      const timeKeywords = ['지금', '바로', '오전', '저녁', '아침', '점심']
      const hasTimeKeyword = timeKeywords.some(keyword => messageContent.includes(keyword))
      
      if (conversationId && hasTimeKeyword && (collectedInfo.goal_type || collectedInfo.target_score)) {
        // 목표가 있고 + 시간 선택했으면 → 즉시 일정 추가!
        setLoading(false)
        addQuickSchedule(messageContent, collectedInfo.goal_type || collectedInfo.target_score?.toString())
        return
      }
      
      // 1. 대화가 진행 중이면 (conversationId가 있으면) 계속 대화형 모드
      if (conversationId && useConversationalMode) {
        const response = await conversationService.chat(messageContent, conversationId)
        
        // 수집된 정보 업데이트
        setCollectedInfo(response.collectedInfo || {})
        
        // AI 응답 추가 (Quick Replies 포함)
        const aiMessage: ChatMessage = {
          id: `msg-${Date.now()}-ai`,
          role: 'assistant',
          content: response.aiMessage,
          timestamp: new Date().toISOString(),
          quickReplies: parseQuickReplies(response.quickReplies)
        }
        addMessage(aiMessage)
        
        // 목표 생성 준비 완료 확인
        if (response.readyToCreateGoal) {
          setReadyToCreate(true)
          
          // 확인 메시지 추가
          const confirmMessageId = `msg-${Date.now()}-confirm`
          setConfirmationMessageId(confirmMessageId)
          
          const confirmationMessage: ChatMessage = {
            id: confirmMessageId,
            role: 'assistant',
            content: `\n\n✅ **충분한 정보가 수집되었습니다!**\n\n목표를 생성하시겠습니까?`,
            timestamp: new Date().toISOString(),
            type: 'confirmation',
            confirmationData: {
              goalRequest: messageContent,
              preview: {
                title: '맞춤형 목표 계획',
                estimatedDays: 84,
                sessionsPerWeek: 5,
                description: '수집된 정보를 바탕으로 최적화된 계획을 수립합니다',
              },
            },
          }
          addMessage(confirmationMessage)
        }
        return // 대화 모드 처리 완료
      }
      
      // 2. 새로운 메시지 - 목표 요청 감지
      const isGoalRequest = detectGoalRequest(messageContent)
      
      if (isGoalRequest && useConversationalMode) {
        // 대화형 목표 설정 모드 시작
        const response = await conversationService.chat(messageContent, undefined)
        
        // 대화 ID 저장 (새로운 대화 시작)
        setConversationId(response.conversationId)
        
        // 수집된 정보 초기화
        setCollectedInfo(response.collectedInfo || {})
        
        // 다음 힌트 생성
        generateNextHint(response.collectedInfo || {})
        
        // AI 응답 추가 (Quick Replies 포함)
        const aiMessage: ChatMessage = {
          id: `msg-${Date.now()}-ai`,
          role: 'assistant',
          content: response.aiMessage,
          timestamp: new Date().toISOString(),
          quickReplies: parseQuickReplies(response.quickReplies)
        }
        addMessage(aiMessage)
        
        // 목표 생성 준비 완료 확인
        if (response.readyToCreateGoal) {
          setReadyToCreate(true)
          
          // 확인 메시지 추가
          const confirmMessageId = `msg-${Date.now()}-confirm`
          setConfirmationMessageId(confirmMessageId)
          
          const confirmationMessage: ChatMessage = {
            id: confirmMessageId,
            role: 'assistant',
            content: `\n\n✅ **충분한 정보가 수집되었습니다!**\n\n목표를 생성하시겠습니까?`,
            timestamp: new Date().toISOString(),
            type: 'confirmation',
            confirmationData: {
              goalRequest: messageContent,
              preview: {
                title: '맞춤형 목표 계획',
                estimatedDays: 84,
                sessionsPerWeek: 5,
                description: '수집된 정보를 바탕으로 최적화된 계획을 수립합니다',
              },
            },
          }
          addMessage(confirmationMessage)
        }
      } else if (isGoalRequest && !useConversationalMode) {
        // 빠른 목표 생성 모드 (기존 방식)
        setPendingGoalRequest(messageContent)
        
        const confirmMessageId = `msg-${Date.now()}-confirm`
        setConfirmationMessageId(confirmMessageId)
        
        const confirmationMessage: ChatMessage = {
          id: confirmMessageId,
          role: 'assistant',
          content: `📋 **빠른 계획 수립**\n\n` +
                   `요청: "${messageContent}"\n\n` +
                   `💡 Tip: 더 정확한 계획을 원하시면 "상담 모드"를 활성화하세요!`,
          timestamp: new Date().toISOString(),
          type: 'confirmation',
          confirmationData: {
            goalRequest: messageContent,
            preview: {
              title: '목표 달성 계획',
              estimatedDays: 84,
              sessionsPerWeek: 5,
              description: '기본 템플릿으로 계획을 수립합니다',
            },
          },
        }
        addMessage(confirmationMessage)
      } else {
        // 일반 채팅 모드 (일정 등록)
        const response = await aiChatService.sendMessage(messageContent, conversationId)
        
        if (response.conversationId) {
          setConversationId(response.conversationId)
        }
        
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
   * 목표 생성 확인 핸들러
   */
  const handleConfirmGoal = async (goalRequest: string) => {
    if (!goalRequest || isLoading) return
    
    // 확인 메시지 삭제
    if (confirmationMessageId) {
      removeMessage(confirmationMessageId)
      setConfirmationMessageId(null)
    }
    
    setPendingGoalRequest(null)
    setLoading(true)
    setIsCreatingGoal(true)
    
    try {
      // 진행 상황 메시지
      const progressMessage: ChatMessage = {
        id: `msg-${Date.now()}-progress`,
        role: 'assistant',
        content: '🎯 맞춤형 계획을 생성하고 있습니다...\n\n• 수집된 정보 분석 중\n• 최적 커리큘럼 설계 중\n• 일정 배치 중',
        timestamp: new Date().toISOString(),
      }
      addMessage(progressMessage)
      
      let successContent: string
      
      if (readyToCreate && conversationId) {
        // 대화형 모드: 수집된 정보 기반 목표 생성
        const convResult: ConversationGoalCreationResult = await conversationService.createGoalFromConversation(conversationId)
        addGoal({
          id: convResult.goalId,
          title: convResult.title,
          description: convResult.description || '',
          deadline: convResult.deadline,
          category: 'study',
          priority: 'high',
          status: 'not_started',
          estimatedHours: convResult.estimatedHours,
          completedHours: 0,
          milestones: [],
        })
        successContent = `✅ **맞춤형 목표 계획이 완성되었습니다!**\n\n` +
          `📋 **${convResult.title}**\n\n` +
          `⏰ 마감일: ${convResult.deadline}\n` +
          `📚 예상 시간: ${convResult.estimatedHours}시간\n` +
          `🎯 마일스톤: ${convResult.milestoneCount}개\n\n` +
          `수집된 정보를 바탕으로 최적화된 계획이 수립되었습니다!\n` +
          `"내 목표" 섹션에서 진행 상황을 확인하세요.`
      } else {
        // 빠른 모드: 기존 방식 (백엔드 enum → 소문자 정규화 후 추가)
        const goalResult = await goalService.createGoalWithAI(goalRequest)
        addGoal(normalizeGoalFromApi(goalResult.goal as unknown as Record<string, unknown>))
        if (goalResult.schedules?.length) {
          for (const schedule of goalResult.schedules) {
            try {
              const saved = await createSchedule({
                title: schedule.title,
                description: schedule.description || undefined,
                date: schedule.date,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                status: 'pending',
                priority: (schedule.priority as 'high' | 'medium' | 'low') || 'medium',
                createdBy: 'ai',
              })
              addTodo(saved)
            } catch {
              addTodo({
                id: `goal-schedule-${Date.now()}-${Math.random()}`,
                title: schedule.title,
                description: schedule.description || '',
                date: schedule.date,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                status: 'pending',
                priority: (schedule.priority as 'high' | 'medium' | 'low') || 'medium',
                createdBy: 'ai',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              })
            }
          }
        }
        successContent = `✅ 목표 달성 계획이 완성되었습니다!\n\n` +
          `📋 **${goalResult.goal?.title || '새 목표'}**\n\n` +
          `⏰ 예상 기간: ${goalResult.goal?.deadline}까지\n` +
          `📚 총 학습 시간: ${goalResult.totalHours || 0}시간\n` +
          `📅 주 ${goalResult.sessionsPerWeek || 5}회 학습\n\n` +
          `**커리큘럼**\n${goalResult.curriculum || '계획 수립됨'}\n\n` +
          `📌 ${goalResult.schedules?.length || 0}개의 일정이 캘린더에 자동으로 추가되었습니다!\n` +
          `"내 목표" 섹션에서 진행 상황을 확인하세요.`
      }
      
      const successMessage: ChatMessage = {
        id: `msg-${Date.now()}-success`,
        role: 'assistant',
        content: successContent,
        timestamp: new Date().toISOString(),
      }
      addMessage(successMessage)
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: '죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.',
        timestamp: new Date().toISOString(),
      }
      addMessage(errorMessage)
    } finally {
      setIsCreatingGoal(false)
      setLoading(false)
    }
  }
  
  /**
   * 목표 생성 거절 핸들러
   */
  const handleRejectGoal = () => {
    // 확인 메시지 삭제
    if (confirmationMessageId) {
      removeMessage(confirmationMessageId)
      setConfirmationMessageId(null)
    }
    
    setPendingGoalRequest(null)
    
    const rejectMessage: ChatMessage = {
      id: `msg-${Date.now()}-reject`,
      role: 'assistant',
      content: '알겠습니다. 다른 도움이 필요하시면 언제든 말씀해주세요! 😊',
      timestamp: new Date().toISOString(),
    }
    addMessage(rejectMessage)
  }
  
  /**
   * 목표 관련 요청인지 감지
   * - 구체적인 시간이 있으면 → 일정 등록
   * - 장기적인 목표 표현이 있으면 → 목표 생성
   */
  const detectGoalRequest = (message: string): boolean => {
    // 1. 구체적인 시간이 있는 경우 → 일정 등록 (목표 아님)
    const hasSpecificTime = /(\d+시|\d+:\d+|오전|오후|내일|모레|오늘|이번주|다음주|월요일|화요일|수요일|목요일|금요일|토요일|일요일)\s*(오전|오후)?\s*\d+시/.test(message)
    if (hasSpecificTime) {
      return false
    }
    
    // 2. 장기 목표를 나타내는 강한 신호
    const strongGoalPatterns = [
      /(\d+)(개월|달|년).*?(달성|목표|완성|마스터)/,  // "3개월 안에 달성"
      /(토익|토플|TOEIC|TOEFL)\s*\d+점/,  // "토익 800점"
      /(자격증|시험).*?(합격|취득|준비)/,  // "자격증 취득"
      /(\d+)(kg|킬로).*?(감량|다이어트)/,  // "10kg 감량"
      /(커리큘럼|학습\s*계획|공부\s*계획).*?(짜|세워|만들)/,  // "커리큘럼 짜줘"
      /목표.*?(세우|설정|달성|수립)/,  // "목표 세우기"
      /(마스터|완성|정복).*?(하고\s*싶|할\s*거)/,  // "마스터하고 싶어"
    ]
    
    if (strongGoalPatterns.some(pattern => pattern.test(message))) {
      return true
    }
    
    // 3. 약한 목표 키워드 (다른 조건과 함께 있을 때만)
    const weakGoalKeywords = ['목표', '계획', '준비', '학습', '공부']
    const hasWeakGoalKeyword = weakGoalKeywords.some(keyword => message.includes(keyword))
    
    // 약한 키워드 + "~하고 싶어", "~할 거야" 같은 의지 표현
    const hasIntentExpression = /(하고\s*싶|할\s*거|하려고|준비)/.test(message)
    
    // 약한 키워드만 있거나, 의지 표현만 있으면 false
    // 둘 다 있고, 구체적인 시간이 없을 때만 true
    if (hasWeakGoalKeyword && hasIntentExpression) {
      return true
    }
    
    return false
  }
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }
  
  const messages = currentSession?.messages || []
  
  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg flex flex-col h-[600px]">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">AI 채팅</h3>
            {conversationId && useConversationalMode && (
              <p className="text-[10px] text-purple-600 font-medium flex items-center gap-1">
                <Bot className="w-3 h-3" />
                대화형 모드 활성화
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* 대화 모드 토글 */}
          {!conversationId && (
            <button
              onClick={() => setUseConversationalMode(!useConversationalMode)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                useConversationalMode
                  ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
              title="대화형 모드 전환"
            >
              {useConversationalMode ? '🧠 상담 모드' : '⚡ 빠른 모드'}
            </button>
          )}
          
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="대화 내역 삭제"
            >
              <Trash2 className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>
      
      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 대화 진행 상태 표시 */}
        <ConversationProgress
          collectedInfo={collectedInfo}
          isActive={!!conversationId && useConversationalMode}
          onQuickCreate={handleQuickCreate}
        />
        
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-purple-300" />
            </div>
            <p className="text-sm text-gray-500 mb-2">
              AI와 대화를 시작하세요
            </p>
            <p className="text-xs text-gray-400">
              💬 일정 등록: "내일 오후 3시 운동"<br />
              🎯 목표 설정: "3개월 안에 토익 800점 달성하고 싶어"
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
                  
                  {/* Quick Reply 버튼 */}
                  {message.quickReplies && message.quickReplies.length > 0 && (
                    <QuickReplyButtons
                      quickReplies={message.quickReplies}
                      onSelect={handleQuickReplySelect}
                      disabled={isLoading}
                    />
                  )}
                  
                  {/* 확인 버튼 (확인 메시지 타입일 때만 표시) */}
                  {message.type === 'confirmation' && message.confirmationData && (
                    <div className="mt-4 space-y-2">
                      {/* 예시 일정 미리보기 */}
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex items-start gap-2 mb-2">
                          <Target className="w-4 h-4 text-primary-500 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-gray-800">
                              {message.confirmationData.preview.title}
                            </h4>
                            <p className="text-xs text-gray-600 mt-1">
                              {message.confirmationData.preview.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                          <span>📅 주 {message.confirmationData.preview.sessionsPerWeek}회</span>
                          <span>⏰ 약 {message.confirmationData.preview.estimatedDays}일</span>
                        </div>
                      </div>
                      
                      {/* 확인/거절 버튼 */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleConfirmGoal(message.confirmationData!.goalRequest)}
                          disabled={isLoading}
                          className="flex-1 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          계획 수립하기
                        </button>
                        <button
                          onClick={handleRejectGoal}
                          disabled={isLoading}
                          className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  )}
                  
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
            {isLoading && <LoadingIndicator isConversationalMode={!!conversationId} />}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {/* 입력 영역 */}
      <div className="p-4 border-t border-gray-200">
        {/* 입력 힌트 */}
        <InputHint hint={nextHint} isActive={!!conversationId && useConversationalMode} />
        
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
          💡 Tip: 일정은 "내일 오후 3시 운동", 목표는 "토익 800점 달성하고 싶어"로 요청하세요
        </p>
      </div>
      </div>
    </>
  )
}
