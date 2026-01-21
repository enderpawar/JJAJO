import { useMemo, useState } from 'react'
import { useCalendarStore } from '@/stores/calendarStore'
import { Sparkles, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'

interface ShadowSchedule {
  id: string
  title: string
  description: string
  startTime: string
  endTime: string
  reason: string
}

/**
 * 👻 AIShadowPlanner: AI Recommendation Ghost Schedules
 * 
 * Concept: "Preview before commit"
 * - 빈 시간 슬롯을 감지하여 AI의 추천 일정을 미리 렌더링
 * - dashed border + opacity 0.5로 "유령" 효과
 * - 클릭 시 즉시 'Confirmed' 상태로 전환
 */
export function AIShadowPlanner() {
  const { todos, selectedDate, addTodo } = useCalendarStore()
  const [confirming, setConfirming] = useState<string | null>(null)
  
  // AI 추천 일정 생성 (빈 시간 슬롯 기반)
  const shadowSchedules = useMemo((): ShadowSchedule[] => {
    if (!selectedDate) return []
    
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const dayTodos = todos
      .filter(t => t.date === dateStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
    
    const shadows: ShadowSchedule[] = []
    
    // 빈 시간 슬롯 찾기
    const workHourStart = 9 // 오전 9시
    const workHourEnd = 22 // 밤 10시
    
    let currentHour = workHourStart
    
    while (currentHour < workHourEnd) {
      const currentTime = `${String(currentHour).padStart(2, '0')}:00`
      const nextTime = `${String(currentHour + 1).padStart(2, '0')}:00`
      
      // 이 시간대에 일정이 있는지 확인
      const hasSchedule = dayTodos.some(t => {
        const [startHour] = t.startTime.split(':').map(Number)
        const [endHour] = t.endTime.split(':').map(Number)
        return startHour <= currentHour && endHour > currentHour
      })
      
      // 빈 시간이면 AI 추천 생성
      if (!hasSchedule && shadows.length < 3) { // 최대 3개까지만
        const recommendation = generateRecommendation(currentHour)
        if (recommendation) {
          shadows.push({
            id: `shadow-${dateStr}-${currentHour}`,
            ...recommendation,
            startTime: currentTime,
            endTime: nextTime
          })
        }
      }
      
      currentHour++
    }
    
    return shadows
  }, [selectedDate, todos])
  
  // Shadow Schedule을 실제 일정으로 확정
  const handleConfirmShadow = (shadow: ShadowSchedule, event: React.MouseEvent) => {
    // 카드의 현재 위치 가져오기
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const startX = rect.left + rect.width / 2
    const startY = rect.top + rect.height / 2
    
    setConfirming(shadow.id)
    
    // Fly In 애니메이션 후 실제 일정으로 등록
    setTimeout(() => {
      const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
      
      const now = new Date().toISOString()
      
      addTodo({
        id: `confirmed-${Date.now()}`,
        title: shadow.title,
        description: shadow.description,
        date: dateStr,
        startTime: shadow.startTime,
        endTime: shadow.endTime,
        status: 'pending',
        priority: 'medium',
        createdBy: 'ai',
        createdAt: now,
        updatedAt: now,
      })
      
      setConfirming(null)
    }, 800)
  }
  
  if (shadowSchedules.length === 0) {
    return null
  }
  
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-purple-600 mb-4">
        <Sparkles className="w-4 h-4" />
        AI 추천 일정
      </div>
      
      <AnimatePresence>
        {shadowSchedules.map((shadow) => (
          <motion.button
            key={shadow.id}
            onClick={(e) => handleConfirmShadow(shadow, e)}
            disabled={confirming === shadow.id}
            className={`
              w-full text-left p-4 rounded-xl transition-all duration-300
              border-2 border-dashed border-purple-300
              bg-purple-50 bg-opacity-50
              hover:bg-opacity-100 hover:border-solid hover:border-purple-400
              hover:shadow-lg
              disabled:pointer-events-none
              ${confirming === shadow.id ? '' : 'opacity-50'}
            `}
            initial={{ opacity: 0, y: 20 }}
            animate={{ 
              opacity: confirming === shadow.id ? 0 : 0.5,
              y: 0,
              scale: confirming === shadow.id ? 0.8 : 1
            }}
            exit={{
              opacity: 0,
              scale: 0.8,
              x: -400,
              y: -200,
              transition: {
                duration: 0.8,
                ease: [0.6, 0.01, 0.05, 0.95]
              }
            }}
            whileHover={{ 
              scale: 1.02,
              opacity: 1
            }}
            whileTap={{ scale: 0.98 }}
          >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* 시간 */}
              <div className="text-xs text-purple-600 font-medium mb-1">
                {shadow.startTime} - {shadow.endTime}
              </div>
              
              {/* 제목 */}
              <div className="text-sm font-bold text-gray-800 mb-1">
                {shadow.title}
              </div>
              
              {/* 설명 */}
              <div className="text-xs text-gray-600 mb-2">
                {shadow.description}
              </div>
              
              {/* 추천 이유 */}
              <div className="flex items-center gap-1 text-xs text-purple-600">
                <Sparkles className="w-3 h-3" />
                <span>{shadow.reason}</span>
              </div>
            </div>
            
            {/* 추가 버튼 */}
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 hover:bg-purple-200 transition-colors">
              <Plus className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  )
}

// AI 추천 생성 로직 (시간대별 최적 활동)
function generateRecommendation(hour: number): Omit<ShadowSchedule, 'id' | 'startTime' | 'endTime'> | null {
  const recommendations = [
    {
      hour: 9,
      title: '아침 집중 작업',
      description: '뇌가 가장 활발한 시간, 중요한 업무 처리에 최적',
      reason: '오전 골든타임'
    },
    {
      hour: 10,
      title: '창의적 작업 시간',
      description: '아이디어 브레인스토밍이나 기획 작업 추천',
      reason: '창의력 피크'
    },
    {
      hour: 13,
      title: '가벼운 학습',
      description: '점심 후 가벼운 독서나 강의 시청',
      reason: '점심 후 리프레시'
    },
    {
      hour: 14,
      title: '운동 / 산책',
      description: '20-30분 가벼운 운동으로 오후 집중력 향상',
      reason: '오후 에너지 부스트'
    },
    {
      hour: 15,
      title: '단어 암기 / 복습',
      description: '짧은 시간 집중 학습에 최적',
      reason: '단기 집중 최적'
    },
    {
      hour: 16,
      title: '이메일 / 메시지 정리',
      description: '커뮤니케이션 작업 처리',
      reason: '루틴 작업 시간'
    },
    {
      hour: 17,
      title: '하루 정리 & 회고',
      description: '오늘의 성과 정리, 내일 계획 수립',
      reason: '마무리 시간'
    },
    {
      hour: 19,
      title: '저녁 식사 후 휴식',
      description: '가족과 시간 보내기 또는 취미 활동',
      reason: '재충전 필요'
    },
    {
      hour: 20,
      title: '독서 / 자기계발',
      description: '하루의 마지막 학습 시간',
      reason: '저녁 학습 시간'
    },
    {
      hour: 21,
      title: '내일 준비 & 명상',
      description: '내일 옷 준비, 가방 정리, 10분 명상',
      reason: '숙면 준비'
    }
  ]
  
  return recommendations.find(r => r.hour === hour) || null
}
