import { create } from 'zustand'
import type { Goal } from '@/types/goal'

interface GoalState {
  goals: Goal[]
  addGoal: (goal: Goal) => void
  updateGoal: (id: string, updates: Partial<Goal>) => void
  deleteGoal: (id: string) => void
  getGoalById: (id: string) => Goal | undefined
  getActiveGoals: () => Goal[]
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],

  addGoal: (goal) =>
    set((state) => ({
      goals: [...state.goals, goal],
    })),

  updateGoal: (id, updates) =>
    set((state) => ({
      goals: state.goals.map((goal) =>
        goal.id === id ? { ...goal, ...updates } : goal
      ),
    })),

  deleteGoal: (id) =>
    set((state) => ({
      goals: state.goals.filter((goal) => goal.id !== id),
    })),

  getGoalById: (id) => get().goals.find((goal) => goal.id === id),

  getActiveGoals: () =>
    get().goals.filter(
      (goal) => goal.status !== 'completed' && goal.status !== 'cancelled'
    ),
}))
