import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import type { PlanResponse } from '../../types/goalPlanning';
import { generateDirectPlan } from '../../services/goalPlanningService';
import { PlanPreview } from './PlanPreview';
import { PlanEditor } from './PlanEditor';

interface FlipCardPlannerProps {
  goalTitle: string;
  goalDescription?: string;
  deadline: string; // ISO date string
  onComplete: (plan: PlanResponse) => void;
  onCancel: () => void;
}

type PlannerStep = 'generating' | 'preview' | 'edit';

export function FlipCardPlanner({
  goalTitle,
  goalDescription,
  deadline,
  onComplete,
  onCancel,
}: FlipCardPlannerProps) {
  const [step, setStep] = useState<PlannerStep>('generating');
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 컴포넌트 마운트 시 바로 계획 생성
  useEffect(() => {
    generatePlanDirectly();
  }, []);

  const generatePlanDirectly = async () => {
    try {
      setStep('generating');
      const generatedPlan = await generateDirectPlan(goalTitle, goalDescription, deadline);
      setPlan(generatedPlan);
      setStep('preview');
      setError(null);
    } catch (err) {
      console.error('계획 생성 실패:', err);
      setError('계획 생성에 실패했습니다');
    }
  };

  // 편집 모드로 전환
  const handleEdit = () => {
    setStep('edit');
  };

  // 편집 완료
  const handleEditComplete = (editedPlan: PlanResponse) => {
    setPlan(editedPlan);
    setStep('preview');
  };

  // 계획 적용
  const handleApplyPlan = () => {
    if (plan) {
      onComplete(plan);
    }
  };

  // 계획 생성 중
  if (step === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="w-16 h-16 text-primary-500" />
        </motion.div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 mb-2">AI가 맞춤 계획을 생성하고 있어요</p>
          <p className="text-gray-600">웹에서 최신 학습 자료를 검색하고 있습니다...</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0.3 }}
                animate={{ opacity: 1 }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  repeatType: 'reverse',
                  delay: i * 0.1,
                }}
                className="w-2 h-2 bg-primary-500 rounded-full"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 에러 발생
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-6 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <span className="text-3xl">❌</span>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 mb-2">오류가 발생했습니다</p>
          <p className="text-gray-600 mb-6">{error}</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onCancel}
            className="px-8 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-colors"
          >
            돌아가기
          </motion.button>
        </div>
      </div>
    );
  }

  // 단계별 렌더링
  return (
    <div className="min-h-[600px] py-8">
      {step === 'edit' && plan && (
        <div className="max-w-5xl mx-auto">
          <PlanEditor
            initialPlan={plan}
            onSave={handleEditComplete}
            onCancel={() => setStep('preview')}
          />
        </div>
      )}

      {step === 'preview' && plan && (
        <div className="max-w-5xl mx-auto">
          <PlanPreview
            plan={plan}
            onApply={handleApplyPlan}
            onEdit={handleEdit}
            onCancel={onCancel}
          />
        </div>
      )}
    </div>
  );
}
