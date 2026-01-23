import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, BookOpen, Video, GraduationCap, CheckCircle, ExternalLink, ShoppingCart, PlayCircle, Youtube } from 'lucide-react'
import type { RoadmapStyle, WeekOptions, ResourceOption } from '@/types/goalPlanning'
import { generateWeekOptions } from '@/services/goalPlanningService'

interface WeekCustomizerProps {
  goalTitle: string
  selectedStyle: RoadmapStyle
  onComplete: (selectedOptions: Map<number, ResourceOption>) => void
  onBack: () => void
}

// 자료 타입에 따른 아이콘
const getResourceIcon = (type: string) => {
  switch (type) {
    case 'book':
      return <BookOpen className="w-5 h-5" />
    case 'course':
      return <GraduationCap className="w-5 h-5" />
    case 'video':
      return <Video className="w-5 h-5" />
    default:
      return <BookOpen className="w-5 h-5" />
  }
}

// 플랫폼별 아이콘
const getPlatformIcon = (platform: string) => {
  const lowerPlatform = platform.toLowerCase()
  if (lowerPlatform.includes('유튜브') || lowerPlatform.includes('youtube')) {
    return <Youtube className="w-4 h-4 text-red-500" />
  } else if (lowerPlatform.includes('인프런') || lowerPlatform.includes('inflearn')) {
    return <PlayCircle className="w-4 h-4 text-emerald-500" />
  } else if (lowerPlatform.includes('교보') || lowerPlatform.includes('예스24') || lowerPlatform.includes('yes24')) {
    return <ShoppingCart className="w-4 h-4 text-blue-500" />
  } else if (lowerPlatform.includes('유데미') || lowerPlatform.includes('udemy')) {
    return <Video className="w-4 h-4 text-purple-500" />
  } else {
    return <ExternalLink className="w-4 h-4 text-gray-500" />
  }
}

// 플랫폼별 배지 색상
const getPlatformColor = (platform: string) => {
  const lowerPlatform = platform.toLowerCase()
  if (lowerPlatform.includes('유튜브') || lowerPlatform.includes('youtube')) {
    return 'bg-red-50 text-red-700 border-red-200'
  } else if (lowerPlatform.includes('인프런') || lowerPlatform.includes('inflearn')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  } else if (lowerPlatform.includes('교보') || lowerPlatform.includes('예스24')) {
    return 'bg-blue-50 text-blue-700 border-blue-200'
  } else if (lowerPlatform.includes('유데미') || lowerPlatform.includes('udemy')) {
    return 'bg-purple-50 text-purple-700 border-purple-200'
  } else {
    return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

// 주차별 테마 생성 (임시 - 나중에 AI가 생성하도록 개선)
const getWeekTheme = (weekNumber: number, styleId: string) => {
  if (styleId === 'intensive') {
    return `Week ${weekNumber}: 집중 학습 ${weekNumber}주차`
  } else if (styleId === 'solid') {
    return `Week ${weekNumber}: 기초 탄탄 ${weekNumber}주차`
  } else {
    return `Week ${weekNumber}: 실전 프로젝트 ${weekNumber}주차`
  }
}

export function WeekCustomizer({ 
  goalTitle,
  selectedStyle, 
  onComplete, 
  onBack 
}: WeekCustomizerProps) {
  const [currentWeek, setCurrentWeek] = useState(1)
  const [weekOptions, setWeekOptions] = useState<WeekOptions | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<Map<number, ResourceOption>>(new Map())
  const [isLoading, setIsLoading] = useState(false)

  // 각 주차의 옵션 로드
  useEffect(() => {
    loadWeekOptions(currentWeek)
  }, [currentWeek])

  const loadWeekOptions = async (weekNumber: number) => {
    setIsLoading(true)
    try {
      const weekTheme = getWeekTheme(weekNumber, selectedStyle.styleId)
      const options = await generateWeekOptions(
        goalTitle,
        selectedStyle.styleId,
        weekNumber,
        weekTheme
      )
      setWeekOptions(options)
    } catch (error) {
      console.error('주차별 옵션 로드 실패:', error)
      // 에러 발생 시 기본 옵션 사용
      setWeekOptions({
        weekNumber,
        weekTheme: getWeekTheme(weekNumber, selectedStyle.styleId),
        resourceOptions: []
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectOption = (option: ResourceOption) => {
    const newSelections = new Map(selectedOptions)
    newSelections.set(currentWeek, option)
    setSelectedOptions(newSelections)

    // 자동으로 다음 주차로
    if (currentWeek < selectedStyle.totalWeeks) {
      setTimeout(() => setCurrentWeek(currentWeek + 1), 500)
    } else {
      // 마지막 주차면 완료
      setTimeout(() => onComplete(newSelections), 500)
    }
  }

  const handleSkip = () => {
    if (currentWeek < selectedStyle.totalWeeks) {
      setCurrentWeek(currentWeek + 1)
    } else {
      onComplete(selectedOptions)
    }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Week {currentWeek} 교재 선택
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {selectedStyle.styleName} · {goalTitle}
            </p>
          </div>
        </div>
        <span className="text-gray-500 font-medium">
          {currentWeek} / {selectedStyle.totalWeeks}
        </span>
      </div>

      {/* 진행 바 */}
      <div className="h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
        <motion.div
          className="h-full bg-gradient-to-r from-primary-500 to-primary-600"
          initial={{ width: 0 }}
          animate={{ width: `${(currentWeek / selectedStyle.totalWeeks) * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
      </div>

      {/* 주차 테마 */}
      {weekOptions && (
        <div className="bg-gradient-to-r from-primary-50 to-blue-50 p-4 rounded-xl border border-primary-200">
          <p className="text-lg font-semibold text-gray-900">{weekOptions.weekTheme}</p>
        </div>
      )}

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
          <p className="ml-4 text-gray-600">AI가 맞춤 자료를 검색 중입니다...</p>
        </div>
      )}

      {/* 옵션 카드들 */}
      <AnimatePresence mode="wait">
        {!isLoading && weekOptions && (
          <motion.div
            key={currentWeek}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {weekOptions.resourceOptions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>이 주차에 대한 추천 자료가 없습니다.</p>
                <button
                  onClick={handleSkip}
                  className="mt-4 px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                >
                  다음 주차로
                </button>
              </div>
            ) : (
              weekOptions.resourceOptions.map((option, idx) => (
                <motion.div
                  key={option.optionId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ scale: 1.01, y: -2 }}
                  onClick={() => handleSelectOption(option)}
                  className={`p-5 border-2 rounded-xl cursor-pointer transition-all ${
                    option.recommended 
                      ? 'border-primary-400 bg-primary-50 shadow-lg' 
                      : 'border-gray-200 bg-white hover:border-primary-300 hover:shadow-md'
                  }`}
                >
                  {option.recommended && (
                    <div className="inline-flex items-center gap-1 px-3 py-1 bg-primary-500 text-white text-xs rounded-full mb-3">
                      <CheckCircle className="w-3 h-3" />
                      <span>AI 추천</span>
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600">
                      {getResourceIcon(option.type)}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-lg text-gray-900 flex-1">
                          {option.title}
                        </h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border ${getPlatformColor(option.platform)}`}>
                          {getPlatformIcon(option.platform)}
                          <span className="font-medium">{option.platform}</span>
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3 leading-relaxed">{option.description}</p>

                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                          <div className="font-semibold text-green-700 mb-1 flex items-center gap-1">
                            <span>✓</span>
                            <span>장점</span>
                          </div>
                          <p className="text-gray-700">{option.pros}</p>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                          <div className="font-semibold text-orange-700 mb-1 flex items-center gap-1">
                            <span>⚠</span>
                            <span>단점</span>
                          </div>
                          <p className="text-gray-700">{option.cons}</p>
                        </div>
                      </div>

                      {option.url && (
                        <a 
                          href={option.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-primary-400 text-primary-600 hover:bg-primary-50 rounded-lg transition-all font-medium text-sm shadow-sm hover:shadow-md"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>실제 자료 보기</span>
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 하단 버튼 */}
      {!isLoading && (
        <div className="flex justify-between pt-4 border-t">
          <button
            onClick={handleSkip}
            className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            건너뛰기
          </button>
          <div className="text-sm text-gray-500">
            선택한 자료: {selectedOptions.size}/{selectedStyle.totalWeeks}
          </div>
        </div>
      )}
    </div>
  )
}
