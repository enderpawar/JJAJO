import { useState, useEffect } from 'react'
import { X, Zap, Clock, CheckCircle, Plus, Trash2, Hand } from 'lucide-react'
import { format } from 'date-fns'
import { useCalendarStore } from '@/stores/calendarStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { createSchedule } from '@/services/scheduleService'
import { suggestSchedulePlacement, timeToMinutes, minutesToTime } from '@/utils/scheduleUtils'
interface Task {
  id: string
  title: string
  durationHours: number
  startTime?: string
  endTime?: string
}

type ScheduleMode = 'ai' | 'manual'

interface QuickScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  initialDate?: string
  initialStartTime?: string
  initialTitle?: string
  initialPriority?: 'high' | 'medium' | 'low'
}

export function QuickScheduleModal({
  isOpen,
  onClose,
  initialDate,
  initialStartTime,
  initialTitle = '',
  initialPriority = 'medium',
}: QuickScheduleModalProps) {
  const { todos, addTodo, selectedDate } = useCalendarStore()
  const { settings } = useSettingsStore()

  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('ai')
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: initialTitle, durationHours: 2 }
  ])
  const [targetDate, setTargetDate] = useState(
    initialDate || format(selectedDate || new Date(), 'yyyy-MM-dd')
  )
  const [allowMultipleDays, setAllowMultipleDays] = useState(false)
  const [overrideConflict, setOverrideConflict] = useState(false)

  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [isSavingManual, setIsSavingManual] = useState(false)

  // 모달이 열릴 때마다 상태 초기화
  useEffect(() => {
    if (isOpen) {
      setShowPreview(false)
      setSuggestions([])
      setScheduleMode('ai')

      // initialStartTime으로 종료 시간 계산 (기본 2시간)
      const defaultStart = initialStartTime || '09:00'
      const startMins = timeToMinutes(defaultStart)
      const endMins = startMins + 120
      const defaultEnd = minutesToTime(endMins)

      setTasks([{
        id: '1',
        title: initialTitle || '',
        durationHours: 2,
        startTime: defaultStart,
        endTime: defaultEnd,
      }])

      setTargetDate(initialDate || format(selectedDate || new Date(), 'yyyy-MM-dd'))
      setAllowMultipleDays(false)
      setOverrideConflict(false)
    }
  }, [isOpen, initialDate, initialStartTime, initialTitle, selectedDate])
  
  // initialStartTime은 저장만 하고 자동 배치는 하지 않음
  // 사용자가 "AI 비서가 시간 배치하기" 버튼을 눌러야 함

  // Task 추가
  const handleAddTask = () => {
    const lastTask = tasks[tasks.length - 1]
    const baseStart = lastTask?.endTime || lastTask?.startTime || '09:00'
    const baseStartMins = timeToMinutes(baseStart)
    const newEndMins = baseStartMins + 60
    const newTask: Task = {
      id: Date.now().toString(),
      title: '',
      durationHours: 1,
      startTime: baseStart,
      endTime: minutesToTime(newEndMins),
    }
    setTasks([...tasks, newTask])
  }

  // Task 제거
  const handleRemoveTask = (taskId: string) => {
    if (tasks.length === 1) {
      alert('최소 1개의 일정은 필요합니다')
      return
    }
    setTasks(tasks.filter(t => t.id !== taskId))
  }

  // Task 업데이트 (직접 모드에서 startTime/duration 변경 시 endTime 자동 계산)
  const handleUpdateTask = (taskId: string, field: keyof Task, value: any) => {
    setTasks(tasks.map(t => {
      if (t.id !== taskId) return t
      const updated = { ...t, [field]: value }
      if (field === 'startTime' && scheduleMode === 'manual' && value) {
        const mins = timeToMinutes(value)
        updated.endTime = minutesToTime(mins + t.durationHours * 60)
      } else if (field === 'durationHours' && scheduleMode === 'manual' && t.startTime) {
        const mins = timeToMinutes(t.startTime)
        updated.endTime = minutesToTime(mins + (value as number) * 60)
      } else if (field === 'endTime') {
        // endTime 수동 변경 시 durationHours 재계산
        if (t.startTime && value) {
          const startMins = timeToMinutes(t.startTime)
          const endMins = timeToMinutes(value)
          updated.durationHours = Math.max(0.5, (endMins - startMins) / 60)
        }
      }
      return updated
    }))
  }

  // 자동 시간 배치 분석 (다중 tasks)
  const handleAnalyze = () => {
    const emptyTasks = tasks.filter(t => !t.title.trim())
    if (emptyTasks.length > 0) {
      alert('모든 할 일 제목을 입력해주세요')
      return
    }

    setIsAnalyzing(true)

    setTimeout(() => {
      const newSuggestions: any[] = []
      let currentDate = targetDate
      let usedTodos = [...todos]
      
      // 각 task를 순차적으로 배치
      tasks.forEach((task) => {
        const durationMinutes = task.durationHours * 60
        const result = suggestSchedulePlacement(
          currentDate,
          durationMinutes,
          usedTodos,
          settings.timeSlotPreferences,
          allowMultipleDays
        )

        newSuggestions.push({
          taskId: task.id,
          taskTitle: task.title,
          ...result
        })

        // 배치된 시간을 usedTodos에 추가하여 다음 task가 겹치지 않도록
        if (result.canPlace && result.suggestion) {
          usedTodos.push({
            id: `temp-${task.id}`,
            title: task.title,
            date: currentDate,
            startTime: result.suggestion.startTime,
            endTime: result.suggestion.endTime,
            status: 'pending',
            priority: initialPriority,
            createdBy: 'ai',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        }
      })

      setSuggestions(newSuggestions)
      setShowPreview(true)
      setIsAnalyzing(false)
    }, 500)
  }

  // 일정 확정 (다중 tasks) — 원격 DB 저장 후 스토어 반영
  const handleConfirm = async () => {
    if (suggestions.length === 0) return

    let successCount = 0
    const toAdd: { title: string; date: string; startTime: string; endTime: string; priority: typeof initialPriority; createdBy: 'user' | 'ai' }[] = []

    suggestions.forEach((sug) => {
      if (sug.canPlace && sug.suggestion) {
        toAdd.push({
          title: sug.taskTitle,
          date: targetDate,
          startTime: sug.suggestion.startTime,
          endTime: sug.suggestion.endTime,
          priority: initialPriority,
          createdBy: 'ai',
        })
      } else if (sug.conflicts && overrideConflict && sug.suggestion) {
        toAdd.push({
          title: sug.taskTitle,
          date: targetDate,
          startTime: sug.suggestion.startTime,
          endTime: sug.suggestion.endTime,
          priority: initialPriority,
          createdBy: 'user',
        })
      }
    })

    for (const item of toAdd) {
      try {
        const saved = await createSchedule({
          title: item.title,
          date: item.date,
          startTime: item.startTime,
          endTime: item.endTime,
          status: 'pending',
          priority: item.priority,
          createdBy: item.createdBy,
        })
        addTodo(saved)
        successCount++
      } catch (e) {
        console.error('일정 저장 실패:', e)
        alert(`일정 저장 중 오류가 발생했습니다: ${e instanceof Error ? e.message : '알 수 없음'}`)
      }
    }

    if (successCount > 0) {
      alert(`✅ ${successCount}개의 일정이 추가되었습니다!`)
    }
    resetAndClose()
  }

  // 직접 배치 모드: 사용자가 지정한 시간으로 일정 저장
  const handleManualConfirm = async () => {
    const invalidTasks = tasks.filter(t => !t.title.trim() || !t.startTime || !t.endTime)
    if (invalidTasks.length > 0) {
      alert('모든 할 일의 제목, 시작 시간, 종료 시간을 입력해주세요')
      return
    }

    const invalidTimeRange = tasks.some(t =>
      timeToMinutes(t.endTime!) <= timeToMinutes(t.startTime!)
    )
    if (invalidTimeRange) {
      alert('종료 시간은 시작 시간보다 이후여야 합니다')
      return
    }

    const startMins = (t: Task) => timeToMinutes(t.startTime!)
    const invalidOrder = tasks.some((t, i) => i > 0 && startMins(t) < startMins(tasks[i - 1]))
    if (invalidOrder) {
      alert('시작 시간 순서가 올바른지 확인해주세요')
      return
    }

    setIsSavingManual(true)
    let successCount = 0

    for (const task of tasks) {
      try {
        const saved = await createSchedule({
          title: task.title,
          date: targetDate,
          startTime: task.startTime!,
          endTime: task.endTime!,
          status: 'pending',
          priority: initialPriority,
          createdBy: 'user',
        })
        addTodo(saved)
        successCount++
      } catch (e) {
        console.error('일정 저장 실패:', e)
        alert(`일정 저장 중 오류가 발생했습니다: ${e instanceof Error ? e.message : '알 수 없음'}`)
      }
    }

    if (successCount > 0) {
      alert(`✅ ${successCount}개의 일정이 추가되었습니다!`)
    }
    setIsSavingManual(false)
    resetAndClose()
  }

  const resetAndClose = () => {
    setTasks([{ id: '1', title: '', durationHours: 2 }])
    setSuggestions([])
    setShowPreview(false)
    setScheduleMode('ai')
    setAllowMultipleDays(false)
    setOverrideConflict(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-notion flex items-center justify-center z-[100] p-4">
      <div className="bg-notion-card rounded-lg border border-notion-border shadow-none max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-notion-card border-b border-notion-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-notion-text-primary" />
            <h2 className="text-lg font-semibold text-notion-text-primary">빠른 일정 추가</h2>
          </div>
          <button
            onClick={resetAndClose}
            className="p-1.5 hover:bg-notion-hover rounded-notion transition-colors"
          >
            <X className="w-5 h-5 text-notion-text-secondary" />
          </button>
        </div>

        {/* 폼 */}
        <div className="p-6 space-y-6">
          {/* 배치 모드 선택 */}
          <div className="flex gap-2 p-1 bg-notion-bg rounded-lg border border-notion-border">
            <button
              type="button"
              onClick={() => { setScheduleMode('ai'); setShowPreview(false); setSuggestions([]) }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                scheduleMode === 'ai'
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-notion-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <Zap className="w-4 h-4" />
              AI가 시간 배치
            </button>
            <button
              type="button"
              onClick={() => setScheduleMode('manual')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                scheduleMode === 'manual'
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-notion-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <Hand className="w-4 h-4" />
              직접 시간 지정
            </button>
          </div>

          {/* Tasks 리스트 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">
                {scheduleMode === 'manual' ? '할 일 목록' : '오늘 할 일 목록'} ({tasks.length}개)
              </label>
              <button
                onClick={handleAddTask}
                className="flex items-center gap-1 px-3 py-1.5 bg-accent hover:bg-accent-dark 
                           text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>추가</span>
              </button>
            </div>

            {tasks.map((task, index) => (
              <div key={task.id} className="bg-notion-sidebar border border-notion-border rounded-md p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-accent text-white rounded-full 
                                  flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1 space-y-3">
                    {/* 제목 입력 */}
                    <input
                      type="text"
                      value={task.title}
                      onChange={(e) => handleUpdateTask(task.id, 'title', e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg 
                                 focus:border-primary-500 focus:outline-none"
                      placeholder={`할 일 ${index + 1} (예: 영어 공부하기)`}
                      autoFocus={index === 0}
                    />
                    
                    {/* 직접 모드: 시작/종료 시간 */}
                    {scheduleMode === 'manual' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">시작 시간</label>
                          <input
                            type="time"
                            value={task.startTime || '09:00'}
                            onChange={(e) => handleUpdateTask(task.id, 'startTime', e.target.value)}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">종료 시간</label>
                          <input
                            type="time"
                            value={task.endTime || '11:00'}
                            onChange={(e) => handleUpdateTask(task.id, 'endTime', e.target.value)}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none text-sm"
                          />
                        </div>
                      </div>
                    )}
                    {/* AI 모드: 예상 소요 시간 슬라이더 */}
                    {scheduleMode === 'ai' && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600">예상 소요 시간</span>
                          <span className="text-sm font-bold text-primary-600">
                            {task.durationHours}시간
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="8"
                          step="0.5"
                          value={task.durationHours}
                          onChange={(e) => handleUpdateTask(task.id, 'durationHours', parseFloat(e.target.value))}
                          className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-primary-500"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                          <span>30분</span>
                          <span>4시간</span>
                          <span>8시간</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* 삭제 버튼 */}
                  {tasks.length > 1 && (
                    <button
                      onClick={() => handleRemoveTask(task.id)}
                      className="flex-shrink-0 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="삭제"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 목표 날짜 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              언제 시작할까요?
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="input-field"
            />
          </div>

          {/* 옵션 (AI 모드 전용) */}
          {scheduleMode === 'ai' && (
            <div className="space-y-3 bg-notion-bg border border-notion-border p-4 rounded-md">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowMultipleDays}
                  onChange={(e) => setAllowMultipleDays(e.target.checked)}
                  className="w-5 h-5 text-primary-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  📅 한 번에 배치가 어려우면 여러 날로 나누기
                </span>
              </label>
            </div>
          )}

          {/* AI 모드: 분석 버튼 */}
          {scheduleMode === 'ai' && !showPreview && (
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || tasks.some(t => !t.title.trim())}
              className="w-full bg-gradient-to-r from-primary-500 to-purple-500 
                         hover:from-primary-600 hover:to-purple-600
                         disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed
                         text-white font-bold py-4 px-6 rounded-xl
                         transition-all duration-200 transform hover:scale-105 active:scale-95
                         shadow-lg hover:shadow-xl
                         flex items-center justify-center gap-3"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>AI가 최적의 시간을 찾는 중...</span>
                </>
              ) : (
                <>
                  <Zap className="w-6 h-6" />
                  <span>AI 비서가 시간 배치하기</span>
                </>
              )}
            </button>
          )}

          {/* 직접 모드: 일정 추가 버튼 */}
          {scheduleMode === 'manual' && (
            <button
              onClick={handleManualConfirm}
              disabled={isSavingManual || tasks.some(t => !t.title.trim() || !t.startTime || !t.endTime)}
              className="w-full bg-gradient-to-r from-primary-500 to-purple-500 
                         hover:from-primary-600 hover:to-purple-600
                         disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed
                         text-white font-bold py-4 px-6 rounded-xl
                         transition-all duration-200 transform hover:scale-105 active:scale-95
                         shadow-lg hover:shadow-xl
                         flex items-center justify-center gap-3"
            >
              {isSavingManual ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>일정 추가 중...</span>
                </>
              ) : (
                <>
                  <Hand className="w-6 h-6" />
                  <span>일정 추가하기</span>
                </>
              )}
            </button>
          )}

          {/* 배치 결과 미리보기 (AI 모드, 다중 tasks) */}
          {scheduleMode === 'ai' && showPreview && suggestions.length > 0 && (
            <div className="space-y-3">
              <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4">
                <h3 className="font-bold text-blue-900 text-lg mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  AI 비서가 {suggestions.length}개 일정을 배치했어요!
                </h3>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {suggestions.map((sug, index) => (
                    <div key={sug.taskId} className="bg-notion-bg border border-notion-border rounded-md p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full 
                                        flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800 mb-1">
                            {sug.taskTitle}
                          </div>
                          {sug.canPlace && sug.suggestion ? (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="w-4 h-4" />
                              <span>
                                {targetDate} {sug.suggestion.startTime} ~ {sug.suggestion.endTime}
                              </span>
                              <span className="text-green-600 font-medium">✓ 배치 완료</span>
                            </div>
                          ) : sug.conflicts ? (
                            <div className="text-sm text-yellow-600">
                              ⚠️ 기존 일정과 겹침
                            </div>
                          ) : (
                            <div className="text-sm text-red-600">
                              ❌ 배치 불가
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 충돌 옵션 */}
              {suggestions.some(s => s.conflicts) && (
                <label className="flex items-center gap-3 cursor-pointer bg-yellow-50 p-3 rounded-lg border border-yellow-300">
                  <input
                    type="checkbox"
                    checked={overrideConflict}
                    onChange={(e) => setOverrideConflict(e.target.checked)}
                    className="w-5 h-5 text-primary-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    겹치는 일정이 있어도 강제로 추가하기
                  </span>
                </label>
              )}

              {/* 액션 버튼 */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowPreview(false)
                    setSuggestions([])
                  }}
                  className="flex-1 btn-secondary py-3"
                >
                  다시 설정
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={suggestions.every(s => !s.canPlace && !overrideConflict)}
                  className="flex-1 btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  모두 확정하기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
