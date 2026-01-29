import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

interface YesNoButtonsProps {
  onSubmit: (value: boolean) => void;
}

export function YesNoButtons({ onSubmit }: YesNoButtonsProps) {
  const [submitted, setSubmitted] = useState(false);

  const handleClick = (value: boolean) => {
    if (submitted) return; // 이미 제출된 경우 무시
    
    setSubmitted(true);
    onSubmit(value);
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Yes 버튼 */}
      <motion.button
        whileHover={{ scale: submitted ? 1 : 1.05 }}
        whileTap={{ scale: submitted ? 1 : 0.95 }}
        onClick={() => handleClick(true)}
        disabled={submitted}
        className={`flex flex-col items-center justify-center gap-4 py-12 bg-gradient-to-br from-green-400 to-emerald-500 text-white rounded-3xl shadow-2xl hover:shadow-green-500/50 transition-all ${
          submitted ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <Check className="w-16 h-16 stroke-[3]" />
        <span className="text-2xl font-black">YES</span>
        <span className="text-sm opacity-90">네, 있어요</span>
      </motion.button>

      {/* No 버튼 */}
      <motion.button
        whileHover={{ scale: submitted ? 1 : 1.05 }}
        whileTap={{ scale: submitted ? 1 : 0.95 }}
        onClick={() => handleClick(false)}
        disabled={submitted}
        className={`flex flex-col items-center justify-center gap-4 py-12 bg-gradient-to-br from-red-400 to-rose-500 text-white rounded-3xl shadow-2xl hover:shadow-red-500/50 transition-all ${
          submitted ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <X className="w-16 h-16 stroke-[3]" />
        <span className="text-2xl font-black">NO</span>
        <span className="text-sm opacity-90">아니요, 없어요</span>
      </motion.button>
    </div>
  );
}
