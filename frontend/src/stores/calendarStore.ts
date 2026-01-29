import { create } from 'zustand'
import { Todo, ViewMode } from '@/types/calendar'
import { format, subDays } from 'date-fns'

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
  setTodos: (todos: Todo[]) => void
  addTodo: (todo: Todo) => void
  updateTodo: (id: string, updates: Partial<Todo>) => void
  deleteTodo: (id: string) => void
  clearAllTodos: () => void
  getTodosByDate: (date: string) => Todo[]
  getAiTodos: () => Todo[]
  copyTodosFromPreviousDay: () => number
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

  setTodos: (todos) => set({ todos }),

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
  
  clearAllTodos: () => set({ todos: [] }),
  
  getTodosByDate: (date) => {
    const todos = get().todos
    return todos.filter((todo) => todo.date === date)
  },
  
  getAiTodos: () => {
    const todos = get().todos
    return todos.filter((todo) => todo.createdBy === 'ai')
  },

  /**
   * 전날 일정을 현재 선택된 날짜로 복사
   * @returns 복사된 일정 개수
   */
  copyTodosFromPreviousDay: () => {
    const { selectedDate, todos } = get()
    const currentDateStr = format(selectedDate, 'yyyy-MM-dd')
    const previousDate = subDays(selectedDate, 1)
    const previousDateStr = format(previousDate, 'yyyy-MM-dd')

    // 전날 일정 찾기
    const previousTodos = todos.filter(todo => todo.date === previousDateStr)

    if (previousTodos.length === 0) {
      return 0
    }

    // 전날 일정을 오늘 날짜로 복사 (시간은 동일하게 유지)
    const copiedTodos: Todo[] = previousTodos.map(todo => ({
      ...todo,
      id: `${Date.now()}-${Math.random()}`,
      date: currentDateStr,
      status: 'pending' as const,
      createdBy: 'user' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))

    // 복사된 일정 추가
    set(state => ({
      todos: [...state.todos, ...copiedTodos]
    }))

    return copiedTodos.length
  },
}))
