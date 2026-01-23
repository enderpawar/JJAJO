import { useState } from 'react'
import { X, Sparkles, Brain } from 'lucide-react'
import { format } from 'date-fns'
import type { GoalFormData, GoalPriority, GoalCategory } from '@/types/goal'
import { useGoalStore } from '@/stores/goalStore'
import { useCalendarStore } from '@/stores/calendarStore'
import { generateDailySchedule, type DailyScheduleResponse } from '@/services/scheduleService'
import { FlipCardPlanner } from './FlipCardPlanner'
import type { PlanResponse } from '@/types/goalPlanning'

interface GoalModalProps {
  isOpen: boolean
  onClose: () => void
}

export function GoalModal({ isOpen, onClose }: GoalModalProps) {
  const { addGoal } = useGoalStore()
  const { selectedDate } = useCalendarStore()

  const [formData, setFormData] = useState<GoalFormData>({
    title: '',
    description: '',
    deadline: '',
    priority: 'medium',
    category: 'personal',
    estimatedHours: 10,
  })
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedSchedule, setGeneratedSchedule] = useState<DailyScheduleResponse | null>(null)
  const [showFlipCardPlanner, setShowFlipCardPlanner] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const newGoal = {
      id: `goal-${Date.now()}`,
      ...formData,
      status: 'not_started' as const,
      milestones: [],
      completedHours: 0,
    }

    addGoal(newGoal)
    onClose()

    // 폼 초기화
    resetForm()
  }
  
  const handleAIPlanningClick = () => {
    if (!formData.title) {
      alert('목표 제목을 입력해주세요')
      return
    }
    if (!formData.deadline) {
      alert('마감일을 선택해주세요')
      return
    }
    setShowFlipCardPlanner(true)
  }

  const handlePlanComplete = (plan: PlanResponse) => {
    // 1. 목표 생성
    const newGoal = {
      id: `goal-${Date.now()}`,
      ...formData,
      status: 'in_progress' as const,
      milestones: plan.milestones.map((m) => ({
        id: `milestone-${Date.now()}-${m.orderIndex}`,
        goalId: '',
        title: m.title,
        description: m.description,
        targetDate: m.targetDate,
        status: 'not_started' as const,
        estimatedHours: m.estimatedHours,
        orderIndex: m.orderIndex,
      })),
      completedHours: 0,
    }
    
    addGoal(newGoal)

    // 2. 일정 생성
    const { addTodo } = useCalendarStore.getState()
    
    plan.schedules.forEach((schedule, index) => {
      addTodo({
        id: `ai-plan-${Date.now()}-${index}`,
        title: schedule.title,
        description: schedule.description,
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

    alert(`✅ 계획이 적용되었습니다!\n- 목표 1개\n- 마일스톤 ${plan.milestones.length}개\n- 일정 ${plan.schedules.length}개`)
    
    onClose()
    resetForm()
    setShowFlipCardPlanner(false)
  }

  const handleGenerateSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 목표 먼저 저장
    const newGoal = {
      id: `goal-${Date.now()}`,
      ...formData,
      status: 'not_started' as const,
      milestones: [],
      completedHours: 0,
    }
    
    addGoal(newGoal)
    setIsGenerating(true)
    
    try {
      // AI 일정 생성 API 호출
      const schedule = await generateDailySchedule({
        goalId: newGoal.id,
        goalTitle: formData.title,
        goalDescription: formData.description,
        estimatedHours: formData.estimatedHours,
        priority: formData.priority,
        targetDate: selectedDate || new Date(),
        workStartTime: '09:00',
        workEndTime: '18:00',
        breakDuration: 15,
      })
      
      console.log('생성된 일정:', schedule)
      setGeneratedSchedule(schedule)
      
      // TODO: 미리보기 모달 표시
      // 지금은 바로 타임라인에 추가
      addScheduleToTimeline(schedule)
      
      onClose()
      resetForm()
    } catch (error) {
      console.error('일정 생성 실패:', error)
      alert('일정 생성에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsGenerating(false)
    }
  }
  
  const addScheduleToTimeline = (schedule: DailyScheduleResponse) => {
    const { addTodo } = useCalendarStore.getState()
    const targetDateStr = format(selectedDate || new Date(), 'yyyy-MM-dd')
    
    schedule.schedule.forEach((item, index) => {
      addTodo({
        id: `ai-schedule-${Date.now()}-${index}`,
        title: item.title,
        description: item.description,
        date: targetDateStr,
        startTime: item.startTime,
        endTime: item.endTime,
        status: 'pending',
        priority: item.priority as 'high' | 'medium' | 'low',
        createdBy: 'ai',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    })
    
    alert(`✅ ${schedule.schedule.length}개의 일정이 생성되었습니다!`)
  }
  
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      deadline: '',
      priority: 'medium',
      category: 'personal',
      estimatedHours: 10,
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* FlipCardPlanner 모드 */}
        {showFlipCardPlanner ? (
          <div className="p-6">
            <FlipCardPlanner
              goalTitle={formData.title}
              goalDescription={formData.description}
              deadline={formData.deadline}
              onComplete={handlePlanComplete}
              onCancel={() => setShowFlipCardPlanner(false)}
            />
          </div>
        ) : (
          <>
            {/* 헤더 */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-2xl font-bold text-gray-900">새 목표 만들기</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 폼 */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 제목 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              목표 제목 *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="input-field"
              placeholder="예: TOEIC 800점 달성하기"
              required
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              설명
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="input-field resize-none"
              rows={4}
              placeholder="목표에 대한 세부 설명을 입력하세요"
            />
          </div>

          {/* 마감일 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              마감일 *
            </label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) =>
                setFormData({ ...formData, deadline: e.target.value })
              }
              className="input-field"
              required
            />
          </div>

          {/* 카테고리 & 우선순위 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                카테고리
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    category: e.target.value as GoalCategory,
                  })
                }
                className="input-field"
              >
                <option value="work">업무</option>
                <option value="study">학습</option>
                <option value="health">건강</option>
                <option value="personal">개인</option>
                <option value="hobby">취미</option>
                <option value="other">기타</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                우선순위
              </label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: e.target.value as GoalPriority,
                  })
                }
                className="input-field"
              >
                <option value="high">높음</option>
                <option value="medium">보통</option>
                <option value="low">낮음</option>
              </select>
            </div>
          </div>

          {/* 예상 시간 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              예상 소요 시간 (시간)
            </label>
            <input
              type="number"
              value={formData.estimatedHours}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  estimatedHours: parseInt(e.target.value) || 0,
                })
              }
              className="input-field"
              min="1"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              목표 달성에 필요한 총 시간을 입력하세요
            </p>
          </div>

          {/* 버튼 */}
          <div className="space-y-3 pt-4">
            {/* AI 계획 수립 버튼 (NEW - 메인) */}
            <button
              type="button"
              onClick={handleAIPlanningClick}
              disabled={isGenerating || !formData.title || !formData.deadline}
              className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 
                         hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600
                         disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed
                         text-white font-black py-5 px-6 rounded-2xl
                         transition-all duration-200 transform hover:scale-105 active:scale-95
                         shadow-2xl hover:shadow-pink-500/50
                         flex items-center justify-center gap-3 text-lg"
            >
              <Brain className="w-7 h-7" />
              <span>🧠 AI 계획 수립 (대화형)</span>
            </button>
            
            <p className="text-xs text-gray-500 text-center">
              AI와 대화하며 맞춤형 학습 계획을 수립합니다 (웹 검색 기반 최신 정보 반영)
            </p>

            {/* AI 일정 생성 버튼 (기존) */}
            <button
              type="button"
              onClick={handleGenerateSchedule}
              disabled={isGenerating || !formData.title || !formData.deadline}
              className="w-full bg-gradient-to-r from-purple-500 to-primary-500 
                         hover:from-purple-600 hover:to-primary-600
                         disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed
                         text-white font-bold py-4 px-6 rounded-xl
                         transition-all duration-200 transform hover:scale-105 active:scale-95
                         shadow-lg hover:shadow-xl
                         flex items-center justify-center gap-3"
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>AI가 일정 생성 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6" />
                  <span>✨ AI가 하루 일정 짜기</span>
                </>
              )}
            </button>
            
            <p className="text-xs text-gray-500 text-center">
              AI가 목표를 분석하여 최적의 하루 일정을 자동으로 생성합니다
            </p>
            
            {/* 기본 버튼들 */}
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isGenerating}
                className="btn-secondary"
              >
                취소
              </button>
              <button 
                type="submit" 
                disabled={isGenerating}
                className="btn-primary"
              >
                목표만 생성
              </button>
            </div>
          </div>
        </form>
          </>
        )}
      </div>
    </div>
  )
}
