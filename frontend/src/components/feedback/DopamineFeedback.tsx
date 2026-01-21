import { useEffect, useState } from 'react'
import { useCalendarStore } from '../../stores/calendarStore'

/**
 * 🎉 즉각적 도파민 피드백 시스템
 * 
 * ADHD 연구 기반: 보상 지연 장애(Delay Aversion) 극복
 * - 작은 작업 완료 시 즉각적인 시각적 피드백
 * - 축하 애니메이션 + 긍정적 메시지
 * - 연속 완료 시 콤보 시스템
 */
export function DopamineFeedback() {
  const { todos } = useCalendarStore()
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationMessage, setCelebrationMessage] = useState('')
  const [completedCount, setCompletedCount] = useState(0)
  const [comboCount, setComboCount] = useState(0)
  const [lastCompletedId, setLastCompletedId] = useState<string>('')

  useEffect(() => {
    // 새로 완료된 일정 감지
    const newCompletedCount = todos.filter(t => t.completed).length

    if (newCompletedCount > completedCount) {
      const justCompleted = todos.find(
        t => t.completed && t.id !== lastCompletedId
      )

      if (justCompleted) {
        setLastCompletedId(justCompleted.id)
        triggerCelebration(justCompleted.title)
      }
    }

    setCompletedCount(newCompletedCount)
  }, [todos])

  const triggerCelebration = (taskTitle: string) => {
    const newCombo = comboCount + 1
    setComboCount(newCombo)

    const messages = [
      '🎉 완료! 멋져요!',
      '✨ 잘하고 있어요!',
      '🔥 집중력 최고!',
      '💪 계속 이대로!',
      '🌟 완벽해요!',
      '🚀 속도감 있네요!',
    ]

    const comboMessages = [
      `🔥 ${newCombo}연속 완료! 불타오른다!`,
      `⚡ ${newCombo}콤보! 멈출 수 없어!`,
      `🌪️ ${newCombo}연속! 폭풍 진행 중!`,
      `💥 ${newCombo}콤보! 당신은 전설!`,
    ]

    const message = newCombo >= 3 
      ? comboMessages[Math.min(newCombo - 3, comboMessages.length - 1)]
      : messages[Math.floor(Math.random() * messages.length)]

    setCelebrationMessage(`${message}\n"${taskTitle}" 완료!`)
    setShowCelebration(true)

    // 3초 후 자동 닫기
    setTimeout(() => {
      setShowCelebration(false)
    }, 3000)

    // 5분 후 콤보 초기화
    setTimeout(() => {
      setComboCount(0)
    }, 5 * 60 * 1000)
  }

  if (!showCelebration) return null

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[100]">
      {/* 배경 오버레이 */}
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm animate-fadeIn" />

      {/* 축하 카드 */}
      <div className="relative bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl shadow-2xl p-8 animate-bounceIn text-white text-center min-w-[400px]">
        {/* 파티클 효과 */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white rounded-full animate-particle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                opacity: Math.random() * 0.7 + 0.3,
              }}
            />
          ))}
        </div>

        {/* 메시지 */}
        <div className="relative z-10">
          <div className="text-6xl mb-4 animate-bounce">
            {comboCount >= 3 ? '🔥' : '🎉'}
          </div>
          <div className="text-2xl font-bold mb-2 whitespace-pre-line">
            {celebrationMessage}
          </div>
          {comboCount >= 3 && (
            <div className="text-lg font-medium opacity-90 mt-4 animate-pulse">
              콤보를 유지하세요! 🚀
            </div>
          )}
        </div>

        {/* 닫기 버튼 */}
        <button
          onClick={() => setShowCelebration(false)}
          className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
