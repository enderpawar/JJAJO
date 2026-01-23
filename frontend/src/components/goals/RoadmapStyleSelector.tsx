import { motion } from 'framer-motion'
import { Zap, BookOpen, Wrench, ArrowLeft } from 'lucide-react'
import type { RoadmapStyle } from '@/types/goalPlanning'

interface RoadmapStyleSelectorProps {
  goalTitle: string
  styles: RoadmapStyle[]
  onSelectStyle: (style: RoadmapStyle) => void
  onBack: () => void
}

// 난이도에 따른 아이콘
const getDifficultyIcon = (difficulty: string) => {
  switch (difficulty) {
    case 'high':
      return <Zap className="w-8 h-8 text-red-500" />
    case 'medium':
      return <BookOpen className="w-8 h-8 text-blue-500" />
    case 'low':
      return <Wrench className="w-8 h-8 text-green-500" />
    default:
      return <BookOpen className="w-8 h-8 text-gray-500" />
  }
}

// 스타일 ID에 따른 배경색
const getStyleBackground = (styleId: string) => {
  switch (styleId) {
    case 'intensive':
      return 'bg-gradient-to-br from-red-50 to-orange-50'
    case 'solid':
      return 'bg-gradient-to-br from-blue-50 to-indigo-50'
    case 'practical':
      return 'bg-gradient-to-br from-green-50 to-emerald-50'
    default:
      return 'bg-gray-50'
  }
}

// 스타일 ID에 따른 테두리 색상
const getStyleBorder = (styleId: string) => {
  switch (styleId) {
    case 'intensive':
      return 'hover:border-red-400 hover:shadow-red-100'
    case 'solid':
      return 'hover:border-blue-400 hover:shadow-blue-100'
    case 'practical':
      return 'hover:border-green-400 hover:shadow-green-100'
    default:
      return 'hover:border-gray-400'
  }
}

export function RoadmapStyleSelector({ 
  goalTitle, 
  styles, 
  onSelectStyle, 
  onBack 
}: RoadmapStyleSelectorProps) {
  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">학습 스타일을 선택하세요</h2>
          <p className="text-gray-600 mt-1">목표: <span className="font-semibold">{goalTitle}</span></p>
        </div>
      </div>

      {/* 스타일 카드들 */}
      <div className="grid grid-cols-1 gap-5">
        {styles.map((style) => (
          <motion.div
            key={style.styleId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02, y: -2 }}
            onClick={() => onSelectStyle(style)}
            className={`p-6 border-2 border-gray-200 rounded-2xl cursor-pointer transition-all ${getStyleBorder(style.styleId)} ${getStyleBackground(style.styleId)} shadow-md hover:shadow-xl`}
          >
            <div className="flex items-start gap-5">
              {/* 아이콘 영역 */}
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                style.difficulty === 'high' ? 'bg-red-100' :
                style.difficulty === 'medium' ? 'bg-blue-100' :
                'bg-green-100'
              } flex-shrink-0`}>
                {getDifficultyIcon(style.difficulty)}
              </div>

              {/* 내용 영역 */}
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2 text-gray-900">{style.styleName}</h3>
                <p className="text-gray-700 mb-4 leading-relaxed">{style.description}</p>

                {/* 특징 배지들 */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-3 py-1 bg-white/80 rounded-full text-sm font-medium text-gray-700 shadow-sm">
                    📅 {style.totalWeeks}주
                  </span>
                  <span className="px-3 py-1 bg-white/80 rounded-full text-sm font-medium text-gray-700 shadow-sm">
                    ⏱️ 주당 {style.weeklyHours}시간
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium shadow-sm ${
                    style.difficulty === 'high' ? 'bg-red-100 text-red-700' :
                    style.difficulty === 'medium' ? 'bg-blue-100 text-blue-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {style.difficulty === 'high' ? '🔥 고강도' :
                     style.difficulty === 'medium' ? '⚖️ 중강도' :
                     '🌱 저강도'}
                  </span>
                </div>

                {/* 특징 리스트 */}
                <ul className="space-y-2 mb-4">
                  {style.features.map((feature, idx) => (
                    <li key={idx} className="text-sm text-gray-800 flex items-start">
                      <span className="text-primary-500 mr-2 mt-0.5">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* 추천 대상 */}
                <div className="mt-4 p-3 bg-white/60 rounded-lg border border-gray-200">
                  <div className="text-sm text-gray-600 mb-1">👤 추천 대상</div>
                  <div className="font-semibold text-gray-900">{style.targetAudience}</div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 설명 텍스트 */}
      <div className="text-center text-sm text-gray-500 py-4">
        자신에게 맞는 학습 스타일을 선택하면, 주차별 맞춤 학습 자료를 추천해드립니다.
      </div>
    </div>
  )
}
