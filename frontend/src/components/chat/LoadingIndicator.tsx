import { Loader2, Brain, MessageCircle, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

interface LoadingIndicatorProps {
  isConversationalMode?: boolean
}

export default function LoadingIndicator({ isConversationalMode }: LoadingIndicatorProps) {
  const [stage, setStage] = useState(0)

  const stages = isConversationalMode
    ? ['대화 분석 중', '맥락 이해 중', '응답 생성 중']
    : ['메시지 처리 중', '일정 확인 중', '응답 생성 중']

  useEffect(() => {
    const interval = setInterval(() => {
      setStage((prev) => (prev + 1) % stages.length)
    }, 1500)

    return () => clearInterval(interval)
  }, [stages.length])

  return (
    <div className="flex justify-start">
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg px-4 py-3 border border-purple-100">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
            <Sparkles className="w-2 h-2 text-purple-300 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
              {isConversationalMode ? (
                <Brain className="w-4 h-4 text-purple-500" />
              ) : (
                <MessageCircle className="w-4 h-4 text-purple-500" />
              )}
              <span>{stages[stage]}</span>
            </p>
            <div className="flex gap-1 mt-1">
              {stages.map((_, index) => (
                <div
                  key={index}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    index === stage ? 'w-4 bg-purple-500' : 'w-2 bg-purple-200'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
