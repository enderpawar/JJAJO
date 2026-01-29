import { useMemo } from 'react'
import { useCalendarStore } from '@/stores/calendarStore'
import { updateSchedule } from '@/services/scheduleService'
import { Clock, CheckCircle, PlayCircle, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { motion } from 'framer-motion'

/**
 * 🎯 FocusSpotlight: Current Task Giant Card
 * 
 * Concept: "Focus on ONE thing"
 * - 현재 또는 가장 가까운 미래의 태스크 1개만 거대하게 렌더링
 * - 나머지 일정은 투명도 30%로 배경으로 밀어내기
 * - 화면 중앙 집중
 */
export function FocusSpotlight() {
  const { todos, updateTodo } = useCalendarStore()
  
  // 현재 시간 기준으로 "지금 해야 할" 또는 "다음에 할" 태스크 찾기
  const { focusTask, upcomingTasks, pastTasks } = useMemo(() => {
    const now = new Date()
    const todayStr = format(now, 'yyyy-MM-dd')
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    
    // 오늘의 미완료 일정만 필터링
    const todayTodos = todos.filter(
      t => t.date === todayStr && t.status !== 'completed'
    ).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
    
    const current = todayTodos.find(
      t => (t.startTime ?? '') <= currentTimeStr && (t.endTime ?? '') > currentTimeStr
    )
    const next = todayTodos.find(t => (t.startTime ?? '') > currentTimeStr)
    const past = todayTodos.filter(t => (t.endTime ?? '') <= currentTimeStr)
    const upcoming = todayTodos.filter(
      t => (t.startTime ?? '') > currentTimeStr && t !== next
    )
    
    return {
      focusTask: current || next,
      upcomingTasks: current ? [next, ...upcoming].filter(Boolean) : upcoming,
      pastTasks: past
    }
  }, [todos])
  
  // 태스크 완료 토글 (원격 DB 동기화)
  const handleToggleComplete = (taskId: string, completed: boolean) => {
    const status = completed ? 'completed' : 'pending'
    updateTodo(taskId, { status })
    updateSchedule(taskId, { status }).catch(() => {})
  }
  
  // 포커스 태스크가 없을 때
  if (!focusTask) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
        {/* 배경 장식 */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 w-64 h-64 bg-primary-500 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500 rounded-full blur-3xl" />
        </div>
        
        <div className="text-center relative z-10">
          {/* 아이콘 */}
          <div className="w-40 h-40 bg-white rounded-3xl shadow-2xl flex items-center justify-center mx-auto mb-8 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-purple-500 rounded-3xl opacity-10 animate-pulse" />
            <Clock className="w-20 h-20 text-gray-300 relative z-10" />
            <div className="absolute -top-2 -right-2 w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center animate-bounce">
              <span className="text-2xl">👻</span>
            </div>
          </div>
          
          {/* 메시지 */}
          <h3 className="text-4xl font-bold text-gray-800 mb-4">
            현재 진행 중인 일정이 없습니다
          </h3>
          <p className="text-xl text-gray-600 mb-8">
            오른쪽에서 AI 추천 일정을 골라보세요
          </p>
          
          {/* 화살표 애니메이션 */}
          <div className="flex items-center justify-center gap-2 text-purple-500 animate-pulse">
            <span className="text-lg font-medium">클릭하면 여기로 날아옵니다</span>
            <div className="flex gap-1">
              <span className="animate-bounce" style={{ animationDelay: '0ms' }}>→</span>
              <span className="animate-bounce" style={{ animationDelay: '100ms' }}>→</span>
              <span className="animate-bounce" style={{ animationDelay: '200ms' }}>→</span>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // 현재 시간 체크
  const now = new Date()
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const st = focusTask.startTime ?? ''
  const et = focusTask.endTime ?? ''
  const isCurrent = st && et && st <= currentTimeStr && et > currentTimeStr
  const isUpcoming = st > currentTimeStr
  
  return (
    <div className="flex-1 relative bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
      {/* 배경 태스크들 (흐리게) */}
      <div className="absolute inset-0 p-8 opacity-30 overflow-y-auto">
        <div className="space-y-3">
          {/* 지난 태스크 */}
          {pastTasks.map((task) => (
            <div
              key={task.id}
              className="bg-gray-300 rounded-lg p-4 text-sm"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-gray-700 line-through">
                  {task.title}
                </span>
              </div>
            </div>
          ))}
          
          {/* 다가오는 태스크 */}
          {upcomingTasks.map((task) => task ? (
            <div
              key={task.id}
              className="bg-white rounded-lg p-4 text-sm border border-gray-200"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-600">
                  {task.startTime ?? ''} {task.title}
                </span>
              </div>
            </div>
          ) : null)}
        </div>
      </div>
      
      {/* 포커스 태스크 (거대하게) */}
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <motion.div 
          className="w-full max-w-2xl"
          initial={{ opacity: 0, scale: 0.8, x: 400, y: 200 }}
          animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
          transition={{
            duration: 0.8,
            ease: [0.6, 0.01, 0.05, 0.95]
          }}
        >
          {/* 거대 카드 */}
          <motion.div 
            className={`
              relative bg-white rounded-3xl shadow-2xl p-12 transform
              ${isCurrent ? 'ring-4 ring-primary-500 ring-offset-4' : ''}
              ${isUpcoming ? 'ring-4 ring-purple-500 ring-offset-4' : ''}
            `}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            {/* 상태 배지 */}
            <div className="absolute top-6 right-6">
              {isCurrent ? (
                <div className="flex items-center gap-2 bg-primary-500 text-white px-4 py-2 rounded-full text-sm font-bold animate-pulse">
                  <PlayCircle className="w-5 h-5" />
                  진행 중
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-purple-500 text-white px-4 py-2 rounded-full text-sm font-bold">
                  <AlertCircle className="w-5 h-5" />
                  다음 일정
                </div>
              )}
            </div>
            
            {/* 시간 정보 */}
            <div className="flex items-center gap-4 mb-6 text-gray-500">
              <Clock className="w-8 h-8" />
              <div>
                <div className="text-3xl font-bold text-gray-800">
                  {st || '-'}
                </div>
                <div className="text-lg">
                  {et ? `${et}까지` : ''}
                </div>
              </div>
            </div>
            
            {/* 태스크 제목 */}
            <h2 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
              {focusTask.title}
            </h2>
            
            {/* 설명 */}
            {focusTask.description && (
              <p className="text-xl text-gray-600 mb-8">
                {focusTask.description}
              </p>
            )}
            
            {/* 액션 버튼 */}
            <div className="flex gap-4">
              {isCurrent ? (
                <>
                  <button
                    onClick={() => handleToggleComplete(focusTask.id, true)}
                    className="flex-1 bg-primary-500 hover:bg-primary-600 text-white px-8 py-4 rounded-xl text-lg font-bold transition-colors shadow-lg hover:shadow-xl"
                  >
                    ✅ 완료하기
                  </button>
                  <button className="px-8 py-4 border-2 border-gray-300 hover:border-gray-400 rounded-xl text-lg font-medium transition-colors">
                    ⏰ 연기하기
                  </button>
                </>
              ) : (
                <button className="flex-1 bg-purple-500 hover:bg-purple-600 text-white px-8 py-4 rounded-xl text-lg font-bold transition-colors shadow-lg hover:shadow-xl">
                  🚀 지금 시작하기
                </button>
              )}
            </div>
            
            {/* 진행률 바 (현재 진행 중인 경우) */}
            {isCurrent && (
              <div className="mt-8">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>진행률</span>
                  <span>{calculateProgress(focusTask)}%</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-1000"
                    style={{ width: `${calculateProgress(focusTask)}%` }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

function calculateProgress(task: { startTime?: string; endTime?: string }): number {
  const sa = task.startTime ?? ''
  const ea = task.endTime ?? ''
  if (!sa || !ea) return 0
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const [startHour, startMinute] = sa.split(':').map(Number)
  const [endHour, endMinute] = ea.split(':').map(Number)
  const startMinutes = startHour * 60 + startMinute
  const endMinutes = endHour * 60 + endMinute
  const totalDuration = endMinutes - startMinutes
  const elapsed = currentMinutes - startMinutes
  if (totalDuration <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)))
}
