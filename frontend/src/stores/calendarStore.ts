import { create } from 'zustand'
import { Todo, ViewMode } from '@/types/calendar'
import { format, subDays } from 'date-fns'
import { getTodosForDate, checkConflicts } from '@/utils/scheduleUtils'

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
  addTodos: (todos: Todo[]) => void
  updateTodo: (id: string, updates: Partial<Todo>) => void
  deleteTodo: (id: string) => void
  clearAllTodos: () => void
  getTodosByDate: (date: string) => Todo[]
  getAiTodos: () => Todo[]
  /** 전날 일정 복사 시 복사 대상 + 시간 중복으로 제외된 목록 반환 (상태 변경 없음). */
  copyTodosFromPreviousDay: () => { toCopy: Todo[]; excluded: { title: string; startTime: string; endTime: string }[] }
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

  addTodos: (newTodos) => set((state) => ({
    todos: [...state.todos, ...newTodos],
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
   * 전날 일정을 현재 선택된 날짜로 복사할 때 쓸 목록 반환 (상태 변경 없음).
   * 대상 날짜에 이미 일정이 있는 시간대는 복사 제외하고 excluded에 담아 반환.
   * @returns { toCopy } 서버 저장 후 addTodos로 반영, { excluded } 토스트 안내용
   */
  copyTodosFromPreviousDay: () => {
    const { selectedDate, todos } = get()
    const currentDateStr = format(selectedDate, 'yyyy-MM-dd')
    const previousDate = subDays(selectedDate, 1)
    const previousDateStr = format(previousDate, 'yyyy-MM-dd')

    const previousTodos = todos.filter(todo => todo.date === previousDateStr)
    if (previousTodos.length === 0) return { toCopy: [], excluded: [] }

    const existingOnTarget = getTodosForDate(todos, currentDateStr)
    const toCopy: Todo[] = []
    const excluded: { title: string; startTime: string; endTime: string }[] = []

    for (const todo of previousTodos) {
      if (todo.startTime && todo.endTime) {
        const conflict = checkConflicts(todo.startTime, todo.endTime, existingOnTarget)
        if (conflict.hasConflict) {
          excluded.push({
            title: todo.title,
            startTime: todo.startTime,
            endTime: todo.endTime,
          })
          continue
        }
      }
      toCopy.push({
        ...todo,
        id: `${Date.now()}-${Math.random()}`,
        date: currentDateStr,
        status: 'pending' as const,
        createdBy: 'user' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }
    return { toCopy, excluded }
  },
}))
