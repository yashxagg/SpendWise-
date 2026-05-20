import React from 'react';
import { motion } from 'framer-motion';

interface GaugeProps {
  value: number;
  max: number;
  label: string;
  darkMode?: boolean;
}

const Gauge: React.FC<GaugeProps> = ({ value, max, label, darkMode }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`relative flex flex-col items-center justify-center p-6 rounded-3xl premium-shadow ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
      <svg className="w-48 h-48 transform -rotate-90">
        {/* Background circle */}
        <circle
          cx="96"
          cy="96"
          r={radius}
          stroke="currentColor"
          strokeWidth="12"
          fill="transparent"
          className={darkMode ? "text-slate-800" : "text-slate-100"}
        />
        {/* Progress circle */}
        <motion.circle
          cx="96"
          cy="96"
          r={radius}
          stroke="currentColor"
          strokeWidth="12"
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className={percentage > 90 ? "text-red-400" : "text-emerald-400"}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>₹{value.toLocaleString()}</span>
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-4 text-sm text-slate-500 font-medium">
        {percentage.toFixed(0)}% of ₹{max.toLocaleString()} limit
      </div>
    </div>
  );
};

export default Gauge;
