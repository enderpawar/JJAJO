import { useEffect, useState } from 'react'
import { useCalendarStore } from '../../stores/calendarStore'

/**
 * 🧠 External Scaffolding (외적 보조 장치)
 * 
 * ADHD 연구 기반: 작업 기억(Working Memory) 약점 보완
 * - 현재 진행 중인 작업을 화면 상단에 항상 고정
 * - 시각적 타이머로 남은 시간 표시
 * - 즉각적인 도파민 피드백
 */
export function CurrentTaskSticky() {
  const { todos } = useCalendarStore()
  const [currentTask, setCurrentTask] = useState<any>(null)
  const [remainingTime, setRemainingTime] = useState<string>('')
  const [progress, setProgress] = useState<number>(0)

  useEffect(() => {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const todayTodos = todos.filter(t => t.date === todayStr && t.status !== 'completed')
    const activeTodo = todayTodos.find(t => {
      const st = t.startTime ?? ''
      const et = t.endTime ?? ''
      return st && et && st <= currentTimeStr && et > currentTimeStr
    })

    setCurrentTask(activeTodo || null)

    // 1초마다 타이머 업데이트
    const interval = setInterval(() => {
      if (activeTodo?.startTime && activeTodo?.endTime) {
        const nowTime = new Date()
        const [endHour, endMinute] = activeTodo.endTime.split(':').map(Number)
        const endTime = new Date(nowTime)
        endTime.setHours(endHour, endMinute, 0, 0)

        const [startHour, startMinute] = activeTodo.startTime.split(':').map(Number)
        const startTime = new Date(nowTime)
        startTime.setHours(startHour, startMinute, 0, 0)

        const totalMs = endTime.getTime() - startTime.getTime()
        const remainingMs = endTime.getTime() - nowTime.getTime()
        const elapsedMs = totalMs - remainingMs

        if (remainingMs > 0) {
          const minutes = Math.floor(remainingMs / 60000)
          const seconds = Math.floor((remainingMs % 60000) / 1000)
          setRemainingTime(`${minutes}:${String(seconds).padStart(2, '0')}`)
          setProgress((elapsedMs / totalMs) * 100)
        } else {
          setRemainingTime('완료!')
          setProgress(100)
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [todos])

  if (!currentTask) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-black dark:bg-white text-white dark:text-black shadow-lg border-b-2 border-accent">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* 작업 정보 */}
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-white/20 dark:bg-black/20 rounded-full">
              <span className="text-2xl">🎯</span>
            </div>
            <div>
              <div className="text-sm font-medium opacity-90">지금 하는 중</div>
              <div className="text-lg font-bold">{currentTask.title}</div>
            </div>
          </div>

          {/* 타이머 */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm opacity-90">남은 시간</div>
              <div className="text-2xl font-mono font-bold">{remainingTime}</div>
            </div>
            <div className="w-16 h-16 relative">
              <svg className="transform -rotate-90 w-16 h-16">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="white"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                {Math.round(progress)}%
              </div>
            </div>
          </div>
        </div>

        {/* 진행 바 */}
        <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
