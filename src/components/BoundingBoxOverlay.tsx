import React from 'react';
import { BoundingBox } from '../types/vision';

interface Props {
  boxes: BoundingBox[];
  width?: number | string;
  height?: number | string;
  showLabels?: boolean;
  showConfidence?: boolean;
  showTracks?: boolean;
  showCountingLine?: boolean;
  showRestrictedZone?: boolean;
  scale?: number; // if boxes are 0-1000 normalized
  countingStats?: { entries: number; exits: number };
  onZoneViolation?: (box: BoundingBox) => void;
}

export const BoundingBoxOverlay: React.FC<Props> = ({
  boxes,
  showLabels = true,
  showConfidence = true,
  showTracks = true,
  showCountingLine = false,
  showRestrictedZone = false,
  countingStats = { entries: 14, exits: 9 },
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
      {/* SVG Layer for Real-Time Spatial Trajectory Vectors */}
      {showTracks && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {boxes.map((box) => {
            if (!box.trajectory || box.trajectory.length < 2) return null;
            const color = box.color || '#38bdf8';
            const pointsString = box.trajectory
              .map(([x, y]) => `${(x / 10).toFixed(1)}%,${(y / 10).toFixed(1)}%`)
              .join(' ');

            return (
              <g key={`traj-${box.id}`}>
                {/* Motion path polyline */}
                <polyline
                  points={box.trajectory
                    .map(([x, y]) => `${(x / 1000) * 100}% ${(y / 1000) * 100}%`)
                    .join(', ')}
                  fill="none"
                  stroke={color}
                  strokeWidth="2.5"
                  strokeDasharray="4 3"
                  opacity="0.8"
                  filter="url(#glow)"
                />
                {/* Historical point trail dots */}
                {box.trajectory.map(([x, y], idx) => (
                  <circle
                    key={`dot-${idx}`}
                    cx={`${(x / 1000) * 100}%`}
                    cy={`${(y / 1000) * 100}%`}
                    r={idx === box.trajectory!.length - 1 ? 4 : 2}
                    fill={color}
                    opacity={(idx + 1) / box.trajectory!.length}
                  />
                ))}
              </g>
            );
          })}
        </svg>
      )}

      {/* Virtual Counting Line Overlay */}
      {showCountingLine && (
        <div className="absolute top-1/2 left-0 right-0 h-0.5 border-b-2 border-dashed border-amber-400/90 flex items-center justify-between px-4 z-10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded shadow flex items-center gap-1">
              <span>COUNTING TRIPWIRE</span>
              <span className="text-[8px] opacity-80">▲ ENTRY / ▼ EXIT</span>
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono text-amber-300 bg-slate-950/85 px-2.5 py-0.5 rounded-lg border border-amber-400/50 backdrop-blur-md">
            <span>IN: <strong className="text-white">{countingStats.entries}</strong></span>
            <span>•</span>
            <span>OUT: <strong className="text-white">{countingStats.exits}</strong></span>
          </div>
        </div>
      )}

      {/* Restricted Zone Polygon Overlay */}
      {showRestrictedZone && (
        <div className="absolute top-[18%] right-[8%] w-[38%] h-[46%] border-2 border-rose-500/90 bg-rose-500/15 rounded-xl flex flex-col justify-between p-2.5 z-10 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold bg-rose-600 text-white px-2 py-0.5 rounded shadow animate-pulse flex items-center gap-1">
              <span>⚠️ RESTRICTED ZONE</span>
            </span>
            <span className="text-[9px] font-mono text-rose-300/80 bg-slate-950/70 px-1.5 py-0.5 rounded border border-rose-500/40">
              TRIPWIRE ACTIVE
            </span>
          </div>
          <div className="text-[9px] font-mono text-rose-200/90 bg-slate-950/60 p-1 rounded text-right">
            UNAUTHORIZED ENTRY PROHIBITED
          </div>
        </div>
      )}

      {/* Detected Bounding Boxes */}
      {boxes.map((box) => {
        // Assume coordinates 0-1000 scale, normalize to percentage
        const top = (box.ymin / 1000) * 100;
        const left = (box.xmin / 1000) * 100;
        const width = ((box.xmax - box.xmin) / 1000) * 100;
        const height = ((box.ymax - box.ymin) / 1000) * 100;

        // Check if inside restricted zone: right top quadrant (xmin > 540, ymin < 640)
        const inRestricted = showRestrictedZone && box.xmin > 540 && box.ymin < 640;
        const color = inRestricted ? '#ef4444' : box.color || '#38bdf8';

        return (
          <div
            key={box.id}
            className={`absolute transition-all duration-150 z-20 ${
              inRestricted ? 'animate-pulse' : ''
            }`}
            style={{
              top: `${Math.max(0, top)}%`,
              left: `${Math.max(0, left)}%`,
              width: `${Math.min(100, Math.max(4, width))}%`,
              height: `${Math.min(100, Math.max(4, height))}%`,
              border: `2px solid ${color}`,
              boxShadow: inRestricted
                ? '0 0 20px rgba(239, 68, 68, 0.7)'
                : `0 0 12px ${color}50`,
              backgroundColor: inRestricted ? 'rgba(239, 68, 68, 0.25)' : `${color}18`,
            }}
          >
            {/* Corner targeting reticles */}
            <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-white"></div>
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-white"></div>
            <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-white"></div>
            <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-white"></div>

            {/* Label Badge */}
            {showLabels && (
              <div
                className="absolute -top-6 left-0 flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono font-semibold text-white rounded whitespace-nowrap shadow-lg backdrop-blur-md"
                style={{ backgroundColor: color }}
              >
                <span>{inRestricted ? `⚠️ ${box.label} (RESTRICTED)` : box.label}</span>
                {showConfidence && (
                  <span className="opacity-90 text-[9px] font-normal">
                    {box.confidence > 1 ? `${box.confidence}%` : `${Math.round(box.confidence * 100)}%`}
                  </span>
                )}
                {showTracks && box.trackId && (
                  <span className="bg-black/50 px-1 rounded text-[9px] text-cyan-200">
                    {box.trackId}
                  </span>
                )}
              </div>
            )}

            {/* Tracking vector / velocity indicator */}
            {showTracks && (
              <div className="absolute bottom-1 right-1 text-[9px] font-mono text-cyan-300 bg-slate-950/85 px-1.5 py-0.5 rounded border border-cyan-500/40 backdrop-blur-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                <span>{box.speed || '1.2 m/s'}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
