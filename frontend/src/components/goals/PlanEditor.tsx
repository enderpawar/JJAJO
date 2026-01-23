import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Save, Trash2, Plus, Calendar, Clock } from 'lucide-react'
import type { PlanResponse, Milestone, ScheduleRecommendation, LearningResource } from '@/types/goalPlanning'

interface PlanEditorProps {
  initialPlan: PlanResponse
  onSave: (editedPlan: PlanResponse) => void
  onCancel: () => void
}

export function PlanEditor({ initialPlan, onSave, onCancel }: PlanEditorProps) {
  const [plan, setPlan] = useState<PlanResponse>(initialPlan)
  const [activeTab, setActiveTab] = useState<'milestones' | 'schedules'>('milestones')

  // 마일스톤 편집
  const handleEditMilestone = (index: number, field: keyof Milestone, value: any) => {
    const newMilestones = [...plan.milestones]
    newMilestones[index] = { ...newMilestones[index], [field]: value }
    setPlan({ ...plan, milestones: newMilestones })
  }

  // 마일스톤 삭제
  const handleDeleteMilestone = (index: number) => {
    const newMilestones = plan.milestones.filter((_, i) => i !== index)
    setPlan({ ...plan, milestones: newMilestones })
  }

  // 마일스톤 추가
  const handleAddMilestone = () => {
    const newMilestone: Milestone = {
      title: '새 마일스톤',
      description: '설명을 입력하세요',
      targetDate: new Date().toISOString().split('T')[0],
      estimatedHours: 10,
      orderIndex: plan.milestones.length + 1,
      learningStage: '기초',
      keyTopics: []
    }
    setPlan({ ...plan, milestones: [...plan.milestones, newMilestone] })
  }

  // 일정 편집
  const handleEditSchedule = (index: number, field: keyof ScheduleRecommendation, value: any) => {
    const newSchedules = [...plan.schedules]
    newSchedules[index] = { ...newSchedules[index], [field]: value }
    setPlan({ ...plan, schedules: newSchedules })
  }

  // 일정 삭제
  const handleDeleteSchedule = (index: number) => {
    const newSchedules = plan.schedules.filter((_, i) => i !== index)
    setPlan({ ...plan, schedules: newSchedules })
  }

  // 일정 추가
  const handleAddSchedule = () => {
    const newSchedule: ScheduleRecommendation = {
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '10:30',
      title: '새 일정',
      description: '설명을 입력하세요',
      type: 'work',
      priority: 'medium',
      energyLevel: 'medium',
      resources: []
    }
    setPlan({ ...plan, schedules: [...plan.schedules, newSchedule] })
  }

  const handleSave = () => {
    onSave(plan)
  }

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto">
      {/* 헤더 */}
      <div className="sticky top-0 bg-white z-10 pb-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold text-gray-900">계획 편집</h2>
          </div>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            <span>저장</span>
          </button>
        </div>

        {/* 탭 */}
        <div className="flex gap-4 mt-4">
          <button
            onClick={() => setActiveTab('milestones')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'milestones'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            📍 마일스톤 ({plan.milestones.length})
          </button>
          <button
            onClick={() => setActiveTab('schedules')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'schedules'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            📅 첫 주 일정 ({plan.schedules.length})
          </button>
        </div>
      </div>

      {/* 마일스톤 편집 */}
      {activeTab === 'milestones' && (
        <div className="space-y-4">
          {plan.milestones.map((milestone, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 border-2 border-gray-200 rounded-xl bg-white"
            >
              <div className="flex items-start justify-between mb-3">
                <input
                  value={milestone.title}
                  onChange={(e) => handleEditMilestone(idx, 'title', e.target.value)}
                  className="flex-1 font-semibold text-lg p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  onClick={() => handleDeleteMilestone(idx)}
                  className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <textarea
                value={milestone.description}
                onChange={(e) => handleEditMilestone(idx, 'description', e.target.value)}
                className="w-full text-sm p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 mb-3"
                rows={2}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">학습 단계</label>
                  <select
                    value={milestone.learningStage}
                    onChange={(e) => handleEditMilestone(idx, 'learningStage', e.target.value as '기초' | '기본' | '심화')}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="기초">기초</option>
                    <option value="기본">기본</option>
                    <option value="심화">심화</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    목표 날짜
                  </label>
                  <input
                    type="date"
                    value={milestone.targetDate}
                    onChange={(e) => handleEditMilestone(idx, 'targetDate', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    예상 시간
                  </label>
                  <input
                    type="number"
                    value={milestone.estimatedHours}
                    onChange={(e) => handleEditMilestone(idx, 'estimatedHours', parseInt(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </motion.div>
          ))}

          <button
            onClick={handleAddMilestone}
            className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition-colors flex items-center justify-center gap-2 text-gray-600 hover:text-primary-600"
          >
            <Plus className="w-5 h-5" />
            <span>마일스톤 추가</span>
          </button>
        </div>
      )}

      {/* 일정 편집 */}
      {activeTab === 'schedules' && (
        <div className="space-y-4">
          {plan.schedules.map((schedule, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 border-2 border-gray-200 rounded-xl bg-white"
            >
              <div className="flex items-start justify-between mb-3">
                <input
                  value={schedule.title}
                  onChange={(e) => handleEditSchedule(idx, 'title', e.target.value)}
                  className="flex-1 font-semibold text-lg p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  onClick={() => handleDeleteSchedule(idx)}
                  className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <textarea
                value={schedule.description}
                onChange={(e) => handleEditSchedule(idx, 'description', e.target.value)}
                className="w-full text-sm p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 mb-3"
                rows={2}
              />

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">날짜</label>
                  <input
                    type="date"
                    value={schedule.date}
                    onChange={(e) => handleEditSchedule(idx, 'date', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">시작 시간</label>
                  <input
                    type="time"
                    value={schedule.startTime}
                    onChange={(e) => handleEditSchedule(idx, 'startTime', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">종료 시간</label>
                  <input
                    type="time"
                    value={schedule.endTime}
                    onChange={(e) => handleEditSchedule(idx, 'endTime', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">타입</label>
                  <select
                    value={schedule.type}
                    onChange={(e) => handleEditSchedule(idx, 'type', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="work">학습</option>
                    <option value="break">휴식</option>
                    <option value="review">복습</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">우선순위</label>
                  <select
                    value={schedule.priority}
                    onChange={(e) => handleEditSchedule(idx, 'priority', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="high">높음</option>
                    <option value="medium">중간</option>
                    <option value="low">낮음</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">에너지</label>
                  <select
                    value={schedule.energyLevel}
                    onChange={(e) => handleEditSchedule(idx, 'energyLevel', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="high">높음</option>
                    <option value="medium">중간</option>
                    <option value="low">낮음</option>
                  </select>
                </div>
              </div>
            </motion.div>
          ))}

          <button
            onClick={handleAddSchedule}
            className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition-colors flex items-center justify-center gap-2 text-gray-600 hover:text-primary-600"
          >
            <Plus className="w-5 h-5" />
            <span>일정 추가</span>
          </button>
        </div>
      )}

      {/* 하단 버튼 */}
      <div className="sticky bottom-0 bg-white pt-4 border-t flex gap-4">
        <button
          onClick={onCancel}
          className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors font-semibold"
        >
          취소
        </button>
        <button
          onClick={handleSave}
          className="flex-1 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-semibold flex items-center justify-center gap-2"
        >
          <Save className="w-5 h-5" />
          <span>저장하고 적용</span>
        </button>
      </div>
    </div>
  )
}
