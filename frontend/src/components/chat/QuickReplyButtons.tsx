import { Clock, Calendar, Zap } from 'lucide-react'
import type { QuickReply } from '@/types/chat'

interface QuickReplyButtonsProps {
  quickReplies: QuickReply[]
  onSelect: (value: string) => void
  disabled?: boolean
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  clock: Clock,
  calendar: Calendar,
  zap: Zap,
}

export default function QuickReplyButtons({ quickReplies, onSelect, disabled }: QuickReplyButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {quickReplies.map((reply) => {
        const Icon = reply.icon ? iconMap[reply.icon] : null
        
        return (
          <button
            key={reply.id}
            onClick={() => onSelect(reply.value)}
            disabled={disabled}
            className="flex items-center gap-2 bg-white hover:bg-purple-50 border-2 border-purple-200 hover:border-purple-400 text-gray-700 hover:text-purple-700 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
          >
            {Icon && <Icon className="w-4 h-4" />}
            <span>{reply.text}</span>
          </button>
        )
      })}
    </div>
  )
}
