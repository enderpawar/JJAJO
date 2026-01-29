import { motion } from 'framer-motion';
import { Target, Calendar, Clock, Sparkles, TrendingUp, Sprout, Zap, Rocket, BookOpen, Video, GraduationCap, FileText, Link, ExternalLink } from 'lucide-react';
import type { PlanResponse } from '../../types/goalPlanning';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

interface PlanPreviewProps {
  plan: PlanResponse;
  onApply: () => void;
  onEdit?: () => void;
  onCancel: () => void;
}

// 헬퍼 함수들
const getStageColor = (stage: string) => {
  switch(stage) {
    case '기초': return 'bg-green-500 text-white';
    case '기본': return 'bg-blue-500 text-white';
    case '심화': return 'bg-purple-500 text-white';
    default: return 'bg-gray-500 text-white';
  }
};

const getStageIcon = (stage: string) => {
  switch(stage) {
    case '기초': return <Sprout className="w-8 h-8" />;
    case '기본': return <Zap className="w-8 h-8" />;
    case '심화': return <Rocket className="w-8 h-8" />;
    default: return <Target className="w-8 h-8" />;
  }
};

const getResourceIcon = (type: string) => {
  switch(type) {
    case 'book': return <BookOpen className="w-4 h-4 text-blue-600" />;
    case 'video': return <Video className="w-4 h-4 text-red-600" />;
    case 'course': return <GraduationCap className="w-4 h-4 text-purple-600" />;
    case 'article': return <FileText className="w-4 h-4 text-green-600" />;
    default: return <Link className="w-4 h-4 text-gray-600" />;
  }
};

export function PlanPreview({ plan, onApply, onEdit, onCancel }: PlanPreviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden"
    >
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-primary-500 to-purple-500 px-8 py-8">
        <div className="flex items-center gap-3 mb-3">
          <Sparkles className="w-8 h-8 text-white" />
          <h2 className="text-3xl font-black text-white">AI 맞춤 계획</h2>
        </div>
        <p className="text-white/90 text-lg">
          목표 달성을 위한 최적의 로드맵이 준비되었습니다
        </p>
      </div>

      {/* 컨텐츠 */}
      <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto">
        {/* 전략 설명 */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-2xl border-2 border-blue-100">
          <div className="flex items-start gap-3 mb-3">
            <TrendingUp className="w-6 h-6 text-primary-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">ADHD 맞춤 전략</h3>
              <p className="text-gray-700 leading-relaxed">{plan.strategy}</p>
            </div>
          </div>
          
          {plan.differentiator && (
            <div className="mt-4 pt-4 border-t border-blue-200">
              <p className="text-sm text-gray-600 leading-relaxed">
                <strong className="text-primary-600">차별점:</strong> {plan.differentiator}
              </p>
            </div>
          )}
        </div>

        {/* 마일스톤 - 수평 진행 차트 */}
        {plan.milestones && plan.milestones.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Target className="w-5 h-5 text-primary-500" />
              <h3 className="font-bold text-gray-900 text-xl">학습 로드맵</h3>
              <span className="text-sm text-gray-500">({plan.milestones.length}단계)</span>
            </div>
            
            <div className="relative py-8">
              {/* 진행 바 배경 */}
              <div className="absolute top-12 left-0 right-0 h-1 bg-gradient-to-r from-green-200 via-blue-200 to-purple-200 rounded-full" />
              
              {/* 마일스톤 노드들 */}
              <div className="relative flex justify-between">
                {plan.milestones.map((milestone, index) => (
                  <motion.div 
                    key={index} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.15 }}
                    className="relative flex flex-col items-center"
                    style={{ flex: 1 }}
                  >
                    {/* 단계 아이콘 */}
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${getStageColor(milestone.learningStage || '기초')}`}>
                      {getStageIcon(milestone.learningStage || '기초')}
                    </div>
                    
                    {/* 단계 정보 */}
                    <div className="mt-4 text-center max-w-[180px]">
                      <div className="text-xs font-bold text-primary-600 mb-1">
                        {milestone.learningStage || '기초'}
                      </div>
                      <div className="text-sm font-semibold text-gray-900 mb-2">
                        {milestone.title}
                      </div>
                      {milestone.keyTopics && milestone.keyTopics.length > 0 && (
                        <div className="text-xs text-gray-500 mb-2">
                          {milestone.keyTopics.join(' · ')}
                        </div>
                      )}
                      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                        <span>📅 {format(parseISO(milestone.targetDate), 'M/d', { locale: ko })}</span>
                        <span>⏱️ {milestone.estimatedHours}h</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 첫 주 일정 */}
        {plan.schedules && plan.schedules.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-purple-500" />
              <h3 className="font-bold text-gray-900 text-xl">첫 주 일정</h3>
              <span className="text-sm text-gray-500">({plan.schedules.length}개)</span>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {plan.schedules.slice(0, 10).map((schedule, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white border border-gray-200 rounded-xl hover:border-primary-300 hover:shadow-md transition-all overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-600 min-w-[80px]">
                        <Clock className="w-4 h-4" />
                        <span>{schedule.startTime}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-semibold text-gray-900">{schedule.title}</div>
                          <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            schedule.priority === 'high' ? 'bg-red-100 text-red-700' :
                            schedule.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {schedule.priority}
                          </div>
                        </div>
                        {schedule.description && (
                          <div className="text-sm text-gray-600 mb-3">{schedule.description}</div>
                        )}
                        
                        {/* 학습 자료 섹션 */}
                        {schedule.resources && schedule.resources.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <div className="text-xs font-semibold text-primary-600 flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              추천 학습 자료
                            </div>
                            <div className="space-y-2">
                              {schedule.resources.map((resource, idx) => (
                                <a
                                  key={idx}
                                  href={resource.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors group cursor-pointer"
                                >
                                  {/* 자료 타입 아이콘 */}
                                  <div className="flex-shrink-0">
                                    {getResourceIcon(resource.type)}
                                  </div>
                                  
                                  {/* 자료 정보 */}
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-semibold text-gray-900 truncate">
                                      {resource.title}
                                    </div>
                                    <div className="text-xs text-gray-600 truncate">
                                      {resource.platform} · {resource.description}
                                    </div>
                                  </div>
                                  
                                  {/* 링크 아이콘 */}
                                  <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-primary-500 flex-shrink-0" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-4 px-8 py-6 border-t bg-gray-50">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onCancel}
          className="flex-1 py-4 bg-gray-200 text-gray-700 rounded-2xl font-bold text-lg hover:bg-gray-300 transition-colors"
        >
          취소
        </motion.button>
        {onEdit && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onEdit}
            className="flex-1 py-4 bg-blue-500 text-white rounded-2xl font-bold text-lg hover:bg-blue-600 transition-colors"
          >
            수정하기
          </motion.button>
        )}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onApply}
          className="flex-1 py-4 bg-gradient-to-r from-primary-500 to-purple-500 text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all"
        >
          이 계획 적용하기
        </motion.button>
      </div>
    </motion.div>
  );
}
