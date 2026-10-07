import React from 'react';

interface Props {
  score: number; // 0-100
  size?: number;
}

export const HealthScoreGauge: React.FC<Props> = ({ score = 82, size = 160 }) => {
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  let color = '#22c55e'; // green
  let statusText = 'Good';
  if (score < 60) {
    color = '#ef4444';
    statusText = 'Critical';
  } else if (score < 75) {
    color = '#f59e0b';
    statusText = 'Attention';
  } else if (score >= 90) {
    color = '#10b981';
    statusText = 'Optimal';
  }

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="rgba(255, 255, 255, 0.06)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <div className="flex items-baseline gap-0.5">
          <span className="text-3xl font-black text-white font-mono tracking-tight">{score}</span>
          <span className="text-xs text-slate-400 font-mono">/100</span>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5" style={{ color, backgroundColor: `${color}18` }}>
          {statusText}
        </span>
      </div>
    </div>
  );
};
