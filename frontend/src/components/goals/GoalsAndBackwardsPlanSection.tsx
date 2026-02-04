import { useState } from 'react'
import { Plus, Target } from 'lucide-react'
import { useGoalStore } from '@/stores/goalStore'
import { useCalendarStore } from '@/stores/calendarStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useBackwardsPlanStore } from '@/stores/backwardsPlanStore'
import { requestBackwardsPlan } from '@/services/backwardsPlanService'
import { createSchedule } from '@/services/scheduleService'
import { goalService } from '@/services/goalService'
import { normalizeGoalFromApi } from '@/utils/api'
import { DEFAULT_DAYS_OFF } from '@/types/settings'
import type { Todo } from '@/types/calendar'
import type { BackwardsPlanResult } from '@/types/backwardsPlan'
import type { Goal } from '@/types/goal'
import { GoalList } from './GoalList'
import { AddGoalModal } from './AddGoalModal'
import { BackwardsPlanModal } from '@/components/chat/BackwardsPlanModal'

function calculateDuration(startTime: string, endTime: string): number {
  const [startHour, startMinute] = startTime.split(':').map(Number)
  const [endHour, endMinute] = endTime.split(':').map(Number)
  return Math.max(0, (endHour * 60 + endMinute) - (startHour * 60 + startMinute))
}

export function GoalsAndBackwardsPlanSection() {
  const [addGoalModalOpen, setAddGoalModalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [planningGoal, setPlanningGoal] = useState<Goal | null>(null)
  const todos = useCalendarStore((state) => state.todos)
  const addTodo = useCalendarStore((state) => state.addTodo)
  const addTodosBulk = useCalendarStore((state) => state.addTodos)
  const deleteTodo = useCalendarStore((state) => state.deleteTodo)
  const addGoal = useGoalStore((state) => state.addGoal)
  const updateGoal = useGoalStore((state) => state.updateGoal)
  const deleteGoal = useGoalStore((state) => state.deleteGoal)
  const userSettings = useSettingsStore((state) => state.settings)
  const getActiveGoals = useGoalStore((state) => state.getActiveGoals)

  const {
    isOpen: planModalOpen,
    form: planForm,
    loading: planLoading,
    applying: planApplying,
    error: planError,
    result: planResult,
    openModal: openPlanModal,
    closeModal: closePlanModal,
    setLoading: setPlanLoading,
    setApplying: setPlanApplying,
    setError: setPlanError,
    setResult: setPlanResult,
    updateForm: updatePlanForm,
  } = useBackwardsPlanStore()

  const summarizeTodosForPlan = () =>
    todos
      .filter((todo) => todo.startTime && todo.endTime)
      .map((todo) => ({
        id: todo.id,
        title: todo.title,
        date: todo.date,
        startTime: todo.startTime!,
        endTime: todo.endTime!,
        durationMinutes: calculateDuration(todo.startTime!, todo.endTime!),
      }))

  const handleOpenBackwardsPlanForGoal = (goal: Goal) => {
    setPlanningGoal(goal)
    updatePlanForm({
      preferredDailyHours: '' as number | '',
      totalHours: (goal.estimatedHours ?? 0) > 0 ? Number(goal.estimatedHours) : ('' as number | ''),
    })
    setPlanError(undefined)
    openPlanModal()
  }

  const handleAddGoal = async (title: string, deadline: string, description?: string) => {
    const tempId = `opt-goal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const optimisticGoal: Goal = {
      id: tempId,
      title,
      deadline,
      description: description?.trim() || undefined,
      priority: 'medium',
      status: 'not_started',
      milestones: [],
      category: 'other',
      estimatedHours: 0,
      completedHours: 0,
    }
    addGoal(optimisticGoal)

    goalService
      .createGoal({ title, deadline, description })
      .then((created) => {
        deleteGoal(tempId)
        addGoal(normalizeGoalFromApi(created as unknown as Record<string, unknown>) as Goal)
      })
      .catch((err) => {
        deleteGoal(tempId)
        alert(err instanceof Error ? err.message : '목표 등록에 실패했습니다.')
      })
  }

  const handleEditGoal = async (title: string, deadline: string, description?: string) => {
    if (!editingGoal) return
    const updated = await goalService.updateGoal(editingGoal.id, { title, deadline, description })
    const normalized = normalizeGoalFromApi(updated as unknown as Record<string, unknown>) as Goal
    updateGoal(editingGoal.id, normalized)
  }

  const handleRequestBackwardsPlan = async () => {
    if (!planningGoal) {
      setPlanError('역계산할 목표를 선택해주세요.')
      return
    }
    setPlanError(undefined)
    setPlanResult(undefined)
    setPlanLoading(true)
    try {
      const payload = {
        goalText: planningGoal.title,
        deadline: planningGoal.deadline,
        totalHours:
          planForm.totalHours !== '' && Number(planForm.totalHours) > 0 ? Number(planForm.totalHours) : null,
        preferredDailyHours:
          planForm.preferredDailyHours !== '' && Number(planForm.preferredDailyHours) > 0
            ? Number(planForm.preferredDailyHours)
            : null,
        todos: summarizeTodosForPlan(),
        timeSlotPreferences: userSettings.timeSlotPreferences,
        workStartTime: userSettings.workStartTime,
        workEndTime: userSettings.workEndTime,
        breakDuration: userSettings.breakDuration,
        daysOff: userSettings.daysOff?.length ? userSettings.daysOff : DEFAULT_DAYS_OFF,
      }
      const result = await requestBackwardsPlan(payload)
      setPlanResult(result)
    } catch (error) {
      setPlanError(error instanceof Error ? error.message : '계획 생성 중 오류가 발생했습니다.')
    } finally {
      setPlanLoading(false)
    }
  }

  const handleApplyBackwardsPlan = async () => {
    if (!planResult) return

    const blocks = planResult.planDays.flatMap((day) =>
      day.blocks.map((block) => ({
        date: day.date,
        ...block,
      }))
    ).filter((block) => block.startTime && block.endTime)

    if (blocks.length === 0) {
      setPlanError('배치할 일정 블록이 없습니다.')
      return
    }

    setPlanApplying(true)
    setPlanError(undefined)

    // 낙관적 업데이트: 우선 임시 블록을 캘린더에 즉시 반영
    const now = new Date().toISOString()
    const optimisticTodos: Todo[] = blocks.map((block) => ({
      id: `opt-ai-plan-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      title: block.title,
      description: block.description ?? 'AI가 자동 생성한 작업 블록',
      date: block.date,
      startTime: block.startTime!,
      endTime: block.endTime!,
      status: 'pending',
      priority: (block.priority as Todo['priority']) ?? 'medium',
      createdBy: 'ai',
      createdAt: now,
      updatedAt: now,
    }))

    if (optimisticTodos.length === 1) {
      addTodo(optimisticTodos[0])
    } else {
      addTodosBulk(optimisticTodos)
    }
    closePlanModal()
    setPlanApplying(false)

    // 백그라운드에서 서버 저장 후 임시 블록을 실제 블록으로 교체
    const results = await Promise.allSettled(
      optimisticTodos.map((opt) =>
        createSchedule({
          title: opt.title,
          description: opt.description,
          date: opt.date,
          startTime: opt.startTime,
          endTime: opt.endTime,
          status: opt.status,
          priority: opt.priority,
          createdBy: opt.createdBy,
        }).then((saved) => ({ tempId: opt.id, saved }))
      )
    )

    let failureCount = 0

    for (let i = 0; i < results.length; i += 1) {
      const r = results[i]
      const opt = optimisticTodos[i]
      if (!opt) continue

      if (r.status === 'fulfilled') {
        deleteTodo(r.value.tempId)
        addTodo(r.value.saved)
        continue
      }

      failureCount += 1
      // 실패 시: 임시 블록 제거 후 로컬 fallback 블록으로 대체(새로고침 시 사라질 수 있음)
      deleteTodo(opt.id)
      const fallback: Todo = {
        id: `ai-plan-${Date.now()}-${Math.random()}`,
        title: opt.title,
        description: opt.description,
        date: opt.date,
        startTime: opt.startTime,
        endTime: opt.endTime,
        status: 'pending',
        priority: opt.priority,
        createdBy: 'ai',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      addTodo(fallback)
    }

    if (failureCount > 0) {
      alert(`일부 블록 저장에 실패했습니다. (${failureCount}개)\n네트워크/로그인 상태를 확인해 주세요.`)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-notion-text flex items-center gap-2">
            <Target className="w-4 h-4 text-red-500" />
            목표
          </h3>
          <button
            type="button"
            onClick={() => setAddGoalModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-primary-500/15 text-primary-300 border border-primary-500/30 px-3 py-1.5 text-xs font-semibold hover:bg-primary-500/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            추가
          </button>
        </div>
        <div className="min-h-[120px] max-h-[280px] overflow-y-auto">
          <GoalList
            variant="notion"
            onBackwardsPlanClick={handleOpenBackwardsPlanForGoal}
            onEditGoalClick={(goal) => {
              setEditingGoal(goal)
              setAddGoalModalOpen(true)
            }}
          />
        </div>
      </div>

      <AddGoalModal
        isOpen={addGoalModalOpen}
        onClose={() => {
          setAddGoalModalOpen(false)
          setEditingGoal(null)
        }}
        mode={editingGoal ? 'edit' : 'create'}
        initialValues={
          editingGoal
            ? { title: editingGoal.title, deadline: editingGoal.deadline, description: editingGoal.description }
            : undefined
        }
        onSubmit={editingGoal ? handleEditGoal : handleAddGoal}
      />
      <BackwardsPlanModal
        isOpen={planModalOpen}
        goal={planningGoal ?? undefined}
        form={planForm}
        loading={planLoading}
        applying={planApplying}
        error={planError}
        result={planResult as BackwardsPlanResult | undefined}
        onClose={closePlanModal}
        onSubmit={handleRequestBackwardsPlan}
        onFormChange={updatePlanForm}
        onApply={planResult ? handleApplyBackwardsPlan : undefined}
      />
    </>
  )
}
