import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Sunset, Moon, CloudMoon } from 'lucide-react';

interface TimeRangePickerProps {
  periods: string[];
  onSubmit: (value: string) => void;
}

const PERIOD_ICONS = {
  '오전': Sun,
  '오후': Sunset,
  '저녁': Moon,
  '새벽': CloudMoon,
};

const PERIOD_COLORS = {
  '오전': 'from-yellow-400 to-orange-400',
  '오후': 'from-orange-400 to-red-400',
  '저녁': 'from-indigo-500 to-purple-500',
  '새벽': 'from-blue-900 to-indigo-900',
};

export function TimeRangePicker({ periods, onSubmit }: TimeRangePickerProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSelect = (period: string) => {
    if (submitted) return; // 이미 제출된 경우 무시
    
    setSelected(period);
    setSubmitted(true);
    
    // 자동 제출
    setTimeout(() => {
      onSubmit(period);
    }, 300);
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {periods.map((period) => {
        const Icon = PERIOD_ICONS[period as keyof typeof PERIOD_ICONS] || Sun;
        const colorClass = PERIOD_COLORS[period as keyof typeof PERIOD_COLORS] || 'from-gray-400 to-gray-500';

        return (
          <motion.button
            key={period}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSelect(period)}
            className={`flex flex-col items-center justify-center gap-3 py-10 bg-gradient-to-br ${colorClass} text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all ${
              selected === period ? 'ring-4 ring-white ring-offset-4' : ''
            }`}
          >
            <Icon className="w-12 h-12" />
            <span className="text-xl font-bold">{period}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
