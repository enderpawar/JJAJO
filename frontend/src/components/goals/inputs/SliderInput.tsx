import { useState } from 'react';
import { motion } from 'framer-motion';

interface SliderInputProps {
  min: number;
  max: number;
  step: number;
  unit: string;
  onSubmit: (value: number) => void;
}

export function SliderInput({ min, max, step, unit, onSubmit }: SliderInputProps) {
  const [value, setValue] = useState(Math.floor((min + max) / 2));
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (submitted) return; // 이미 제출된 경우 무시
    
    setSubmitted(true);
    onSubmit(value);
  };

  return (
    <div className="space-y-6">
      {/* 현재 값 표시 */}
      <div className="text-center">
        <motion.div
          key={value}
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-6xl font-black text-primary-500 mb-2"
        >
          {value}
        </motion.div>
        <div className="text-2xl font-medium text-gray-600">{unit}</div>
      </div>

      {/* 슬라이더 */}
      <div className="px-4">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-full h-3 bg-gray-200 rounded-full appearance-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-8
                     [&::-webkit-slider-thumb]:h-8
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-gradient-to-br
                     [&::-webkit-slider-thumb]:from-primary-500
                     [&::-webkit-slider-thumb]:to-purple-500
                     [&::-webkit-slider-thumb]:shadow-lg
                     [&::-webkit-slider-thumb]:cursor-pointer
                     [&::-webkit-slider-thumb]:hover:scale-110
                     [&::-webkit-slider-thumb]:transition-transform"
        />
        <div className="flex justify-between text-sm text-gray-400 mt-2">
          <span>{min}{unit}</span>
          <span>{max}{unit}</span>
        </div>
      </div>

      {/* 제출 버튼 */}
      <motion.button
        whileHover={{ scale: submitted ? 1 : 1.02 }}
        whileTap={{ scale: submitted ? 1 : 0.98 }}
        onClick={handleSubmit}
        disabled={submitted}
        className={`w-full py-4 bg-gradient-to-r from-primary-500 to-purple-500 text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all ${
          submitted ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {submitted ? '제출됨' : '다음'}
      </motion.button>
    </div>
  );
}
