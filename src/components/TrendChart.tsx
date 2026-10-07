import React from 'react';

interface Props {
  points?: number[];
  labels?: string[];
  height?: number;
  strokeColor?: string;
  fillGradientId?: string;
}

export const TrendChart: React.FC<Props> = ({
  points = [12, 19, 28, 45, 34, 52, 38],
  labels = ['6AM', '10AM', '12PM', '2PM', '4PM', '6PM', '8PM'],
  height = 90,
  strokeColor = '#06b6d4',
  fillGradientId = 'trendGradient',
}) => {
  const max = Math.max(...points, 60);
  const min = Math.min(...points, 0);
  const width = 500;
  const paddingX = 20;
  const paddingY = 10;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;

  const coords = points.map((val, idx) => {
    const x = paddingX + (idx / (points.length - 1)) * innerWidth;
    const y = height - paddingY - ((val - min) / (max - min)) * innerHeight;
    return { x, y };
  });

  // Generate smooth SVG bezier path
  let pathD = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i];
    const p1 = coords[i + 1];
    const mx = (p0.x + p1.x) / 2;
    pathD += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  const areaD = `${pathD} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`;

  return (
    <div className="w-full">
      <div className="relative w-full" style={{ height }}>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id={fillGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.4" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill={`url(#${fillGradientId})`} />
          <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
          {coords.map((c, i) => (
            <circle
              key={i}
              cx={c.x}
              cy={c.y}
              r="3.5"
              fill="#0f172a"
              stroke={strokeColor}
              strokeWidth="2"
              className="transition-transform hover:scale-150"
            />
          ))}
        </svg>
      </div>
      <div className="flex justify-between px-2 pt-2 text-[10px] font-mono text-slate-500">
        {labels.map((lbl, idx) => (
          <span key={idx}>{lbl}</span>
        ))}
      </div>
    </div>
  );
};
