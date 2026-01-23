import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import type { Question } from '../../types/goalPlanning';
import { SliderInput } from './inputs/SliderInput';
import { YesNoButtons } from './inputs/YesNoButtons';
import { TimeRangePicker } from './inputs/TimeRangePicker';

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: any) => void;
}

export function QuestionCard({ question, questionNumber, totalQuestions, onAnswer }: QuestionCardProps) {
  return (
    <motion.div
      initial={{ x: 300, opacity: 0, rotateY: -15 }}
      animate={{ x: 0, opacity: 1, rotateY: 0 }}
      exit={{ x: -300, opacity: 0, rotateY: 15 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="w-full max-w-2xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden"
    >
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-primary-500 to-purple-500 px-8 py-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/80 font-medium">질문 {questionNumber}/{totalQuestions}</span>
          <div className="h-2 w-32 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
              className="h-full bg-white rounded-full"
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white">
          {question.questionText}
        </h2>
      </div>

      {/* 컨텐츠 */}
      <div className="p-8 space-y-6">
        {/* Rationale (왜 묻는지) */}
        {question.rationale && (
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl">
            <Lightbulb className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700 leading-relaxed">
              {question.rationale}
            </p>
          </div>
        )}

        {/* 질문 타입별 입력 */}
        <div className="mt-8">
          {question.type === 'SLIDER' && (
            <SliderInput
              min={question.options.min as number}
              max={question.options.max as number}
              step={question.options.step as number}
              unit={question.options.unit as string}
              onSubmit={onAnswer}
            />
          )}

          {question.type === 'YESNO' && (
            <YesNoButtons onSubmit={onAnswer} />
          )}

          {question.type === 'TIME_PICKER' && (
            <TimeRangePicker
              periods={question.options.periods as string[]}
              onSubmit={onAnswer}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}
