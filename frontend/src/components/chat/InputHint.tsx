import { Lightbulb } from 'lucide-react'

interface InputHintProps {
  hint?: string
  isActive: boolean
}

export default function InputHint({ hint, isActive }: InputHintProps) {
  if (!isActive || !hint) return null

  return (
    <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-2">
      <Lightbulb className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-xs font-medium text-yellow-800 mb-1">다음 질문 힌트</p>
        <p className="text-xs text-yellow-700">{hint}</p>
      </div>
    </div>
  )
}
