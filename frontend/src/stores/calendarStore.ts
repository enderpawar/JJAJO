import { create } from 'zustand'
import { Todo, ViewMode } from '@/types/calendar'

interface CalendarStore {
  // 현재 선택된 날짜
  selectedDate: Date
  
  // 현재 보고 있는 월
  currentMonth: Date
  
  // 뷰 모드 (월간/주간)
  viewMode: ViewMode
  
  // 모든 일정 목록
  todos: Todo[]
  
  // Actions
  setSelectedDate: (date: Date) => void
  setCurrentMonth: (date: Date) => void
  setViewMode: (mode: ViewMode) => void
  addTodo: (todo: Todo) => void
  updateTodo: (id: string, updates: Partial<Todo>) => void
  deleteTodo: (id: string) => void
  getTodosByDate: (date: string) => Todo[]
  getAiTodos: () => Todo[]
}

/**
 * 캘린더 전역 상태 관리
 */
export const useCalendarStore = create<CalendarStore>((set, get) => ({
  selectedDate: new Date(),
  currentMonth: new Date(),
  viewMode: 'month',
  todos: [],
  
  setSelectedDate: (date) => set({ selectedDate: date }),
  
  setCurrentMonth: (date) => set({ currentMonth: date }),
  
  setViewMode: (mode) => set({ viewMode: mode }),
  
  addTodo: (todo) => set((state) => ({
    todos: [...state.todos, todo],
  })),
  
  updateTodo: (id, updates) => set((state) => ({
    todos: state.todos.map((todo) =>
      todo.id === id ? { ...todo, ...updates, updatedAt: new Date().toISOString() } : todo
    ),
  })),
  
  deleteTodo: (id) => set((state) => ({
    todos: state.todos.filter((todo) => todo.id !== id),
  })),
  
  getTodosByDate: (date) => {
    const todos = get().todos
    return todos.filter((todo) => todo.date === date)
  },
  
  getAiTodos: () => {
    const todos = get().todos
    return todos.filter((todo) => todo.createdBy === 'ai')
  },
}))
