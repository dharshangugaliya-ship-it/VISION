import React from 'react';

interface Segment {
  label: string;
  value: number;
  color: string;
  percent: number;
}

interface Props {
  segments: Segment[];
  centerLabel?: string;
  centerSub?: string;
  size?: number;
}

export const DonutChart: React.FC<Props> = ({
  segments,
  centerLabel = '47',
  centerSub = 'Total Events',
  size = 180,
}) => {
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth={strokeWidth}
          />
          {segments.map((seg, i) => {
            const strokeDasharray = `${(seg.percent / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
            accumulatedPercent += seg.percent;

            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-2xl font-bold text-white tracking-tight">{centerLabel}</span>
          <span className="text-[11px] font-medium text-slate-400">{centerSub}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-1.5 flex-1 min-w-[120px]">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }}></span>
              <span className="text-slate-300 font-medium">{seg.label}</span>
            </div>
            <span className="font-mono text-slate-400 font-semibold">{seg.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
