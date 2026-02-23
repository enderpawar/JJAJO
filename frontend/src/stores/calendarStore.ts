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

  /** 짜조 고스트 일정 (미확정 미리보기). 확정 시 todos로 이전 후 비움 */
  ghostPlans: Todo[]

  // 대량 시간표 저장 진행 여부 (백그라운드 인디케이터용)
  isBulkSavingTimetable: boolean

  /** 확인 모달 등이 열려 있을 때 캘린더 날짜 선택 하이라이트를 숨길지 */
  selectionDimmed: boolean
  
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
  /** 해당 연·월에 속한 일정만 제거 (currentMonth 기준 월간 비우기용). month는 0–11 */
  clearTodosInMonth: (year: number, month: number) => void
  getTodosByDate: (date: string) => Todo[]
  setIsBulkSavingTimetable: (value: boolean) => void
  setSelectionDimmed: (dimmed: boolean) => void
  /** 전날 일정 복사 시 복사 대상 + 시간 중복으로 제외된 목록 반환 (상태 변경 없음). */
  copyTodosFromPreviousDay: () => { toCopy: Todo[]; excluded: { title: string; startTime: string; endTime: string }[] }
  /** 짜조 고스트 일정 설정 (타임라인 미리보기용) */
  setGhostPlans: (plans: Todo[]) => void
  /** 고스트 일정 확정 (해당 날짜 전체 교체): 대상 날짜 기존 todos 제거 후 ghostPlans로 교체. */
  applyGhostPlansReplaceDate: () => { applied: Todo[]; removed: Todo[] }
  /** 고스트 일정 취소: ghostPlans 비우기 */
  clearGhostPlans: () => void
}

/**
 * 캘린더 전역 상태 관리
 */
export const useCalendarStore = create<CalendarStore>((set, get) => ({
  selectedDate: new Date(),
  currentMonth: new Date(),
  viewMode: 'week',
  todos: [],
  ghostPlans: [],
  isBulkSavingTimetable: false,
  selectionDimmed: false,
  
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

  clearTodosInMonth: (year, month) => set((state) => ({
    todos: state.todos.filter((t) => {
      const d = new Date(t.date + 'T12:00:00')
      return d.getFullYear() !== year || d.getMonth() !== month
    }),
  })),

  getTodosByDate: (date) => {
    const todos = get().todos
    return todos.filter((todo) => {
      const end = todo.endDate || todo.date
      return todo.date <= date && date <= end
    })
  },

  setIsBulkSavingTimetable: (value) => set({ isBulkSavingTimetable: value }),

  setSelectionDimmed: (dimmed) => set({ selectionDimmed: dimmed }),

  setGhostPlans: (plans) => set({ ghostPlans: plans }),

  applyGhostPlansReplaceDate: () => {
    const state = get()
    if (state.ghostPlans.length === 0) return { applied: [], removed: [] }

    const targetDate = state.ghostPlans[0].date
    const removed = targetDate
      ? state.todos.filter((t) => t.date === targetDate)
      : []

    const confirmed = state.ghostPlans.map((t) => ({
      ...t,
      isGhost: false,
      id: t.id.startsWith('ghost-') ? `opt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}` : t.id,
    }))

    const remaining = targetDate
      ? state.todos.filter((t) => t.date !== targetDate)
      : state.todos

    set({ ghostPlans: [], todos: [...remaining, ...confirmed] })
    return { applied: confirmed, removed }
  },

  clearGhostPlans: () => set({ ghostPlans: [] }),

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
        endDate: undefined,
        status: 'pending' as const,
        createdBy: 'user' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }
    return { toCopy, excluded }
  },
}))
