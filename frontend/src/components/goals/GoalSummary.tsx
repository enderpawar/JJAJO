import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Target, Clock, TrendingUp, Heart, Sparkles } from 'lucide-react'
import type { GoalSummary as GoalSummaryType } from '@/types/goalPlanning'

interface GoalSummaryProps {
  goalTitle: string
  summary: GoalSummaryType
  onContinue: () => void
  onBack: () => void
}

// 난이도에 따른 색상 및 아이콘
const getDifficultyConfig = (level: string) => {
  switch (level) {
    case 'high':
      return {
        color: 'from-red-500 to-orange-500',
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        label: '🔥 도전적',
        ring: 'ring-red-200'
      }
    case 'medium':
      return {
        color: 'from-blue-500 to-indigo-500',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700',
        label: '⚖️ 적정',
        ring: 'ring-blue-200'
      }
    case 'low':
      return {
        color: 'from-green-500 to-emerald-500',
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        label: '🌱 수월',
        ring: 'ring-green-200'
      }
    default:
      return {
        color: 'from-gray-500 to-gray-600',
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-700',
        label: '기본',
        ring: 'ring-gray-200'
      }
  }
}

export function GoalSummary({ goalTitle, summary, onContinue, onBack }: GoalSummaryProps) {
  const difficultyConfig = getDifficultyConfig(summary.difficultyLevel)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary-500" />
            목표 분석 완료
          </h2>
          <p className="text-gray-600 mt-1">AI가 분석한 당신의 목표에 대한 인사이트입니다</p>
        </div>
      </div>

      {/* 목표 제목 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-primary-50 to-blue-50 p-6 rounded-2xl border-2 border-primary-200"
      >
        <div className="flex items-center gap-3 mb-2">
          <Target className="w-6 h-6 text-primary-600" />
          <h3 className="text-xl font-bold text-gray-900">목표</h3>
        </div>
        <p className="text-2xl font-semibold text-primary-700">{goalTitle}</p>
      </motion.div>

      {/* 목표 분석 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white p-6 rounded-2xl border-2 border-gray-200 shadow-sm"
      >
        <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-500" />
          목표 분석
        </h3>
        <p className="text-gray-700 leading-relaxed">{summary.goalAnalysis}</p>
      </motion.div>

      {/* 주요 정보 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`${difficultyConfig.bgColor} p-5 rounded-xl border-2 ${difficultyConfig.ring}`}
        >
          <div className="text-sm text-gray-600 mb-1">난이도</div>
          <div className={`text-2xl font-bold ${difficultyConfig.textColor}`}>
            {difficultyConfig.label}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-purple-50 p-5 rounded-xl border-2 ring-purple-200"
        >
          <div className="text-sm text-gray-600 mb-1 flex items-center gap-1">
            <Clock className="w-4 h-4" />
            예상 기간
          </div>
          <div className="text-2xl font-bold text-purple-700">
            {summary.estimatedWeeks}주
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-amber-50 p-5 rounded-xl border-2 ring-amber-200"
        >
          <div className="text-sm text-gray-600 mb-1">주당 학습 시간</div>
          <div className="text-2xl font-bold text-amber-700">
            {summary.estimatedHoursPerWeek}시간
          </div>
        </motion.div>
      </div>

      {/* 추천 학습 방식 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-2xl border-2 border-indigo-200"
      >
        <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          ADHD 친화적 학습 방식
        </h3>
        <p className="text-gray-700 leading-relaxed">{summary.learningApproach}</p>
      </motion.div>

      {/* 핵심 권장사항 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white p-6 rounded-2xl border-2 border-gray-200 shadow-sm"
      >
        <h3 className="text-lg font-bold text-gray-900 mb-4">핵심 권장사항</h3>
        <div className="space-y-3">
          {summary.keyRecommendations.map((recommendation, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 + idx * 0.05 }}
              className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                {idx + 1}
              </div>
              <p className="flex-1 text-gray-700">{recommendation}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* 동기부여 메시지 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-gradient-to-r from-pink-50 to-rose-50 p-6 rounded-2xl border-2 border-pink-200"
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <Heart className="w-8 h-8 text-pink-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">응원의 메시지</h3>
            <p className="text-gray-700 leading-relaxed text-lg">{summary.motivationalMessage}</p>
          </div>
        </div>
      </motion.div>

      {/* 액션 버튼 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="flex justify-between pt-4"
      >
        <button
          onClick={onBack}
          className="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-semibold"
        >
          이전으로
        </button>
        <button
          onClick={onContinue}
          className="px-8 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-lg transition-all font-semibold flex items-center gap-2 shadow-lg"
        >
          <span>로드맵 선택하기</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </motion.div>
    </div>
  )
}
