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
}

export const BoundingBoxOverlay: React.FC<Props> = ({
  boxes,
  showLabels = true,
  showConfidence = true,
  showTracks = true,
  showCountingLine = false,
  showRestrictedZone = false,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
      {/* Optional Counting Line Overlay */}
      {showCountingLine && (
        <div className="absolute top-1/2 left-0 right-0 h-0.5 border-b-2 border-dashed border-amber-400/80 flex items-center justify-between px-4 z-10">
          <span className="text-[10px] font-mono font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded shadow">
            COUNTING LINE ▲ ENTRY / ▼ EXIT
          </span>
          <span className="text-[10px] font-mono text-amber-300 bg-slate-900/80 px-2 py-0.5 rounded border border-amber-400/40">
            TOTAL CROSSED: 23
          </span>
        </div>
      )}

      {/* Optional Restricted Zone Polygon Overlay */}
      {showRestrictedZone && (
        <div className="absolute top-[20%] right-[10%] w-[35%] h-[45%] border-2 border-rose-500/80 bg-rose-500/15 rounded-lg flex items-start justify-end p-2 z-10">
          <span className="text-[10px] font-mono font-bold bg-rose-600 text-white px-2 py-0.5 rounded shadow animate-pulse flex items-center gap-1">
            ⚠️ RESTRICTED ZONE
          </span>
        </div>
      )}

      {/* Detected Bounding Boxes */}
      {boxes.map((box) => {
        // Assume coordinates 0-1000 scale, normalize to percentage
        const top = (box.ymin / 1000) * 100;
        const left = (box.xmin / 1000) * 100;
        const width = ((box.xmax - box.xmin) / 1000) * 100;
        const height = ((box.ymax - box.ymin) / 1000) * 100;
        const color = box.color || '#38bdf8';

        return (
          <div
            key={box.id}
            className="absolute transition-all duration-300"
            style={{
              top: `${Math.max(0, top)}%`,
              left: `${Math.max(0, left)}%`,
              width: `${Math.min(100, Math.max(5, width))}%`,
              height: `${Math.min(100, Math.max(5, height))}%`,
              border: `2px solid ${color}`,
              boxShadow: `0 0 12px ${color}40`,
              backgroundColor: `${color}15`,
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
                className="absolute -top-6 left-0 flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-white rounded whitespace-nowrap shadow-lg backdrop-blur-sm"
                style={{ backgroundColor: color }}
              >
                <span>{box.label}</span>
                {showConfidence && (
                  <span className="opacity-90 text-[9px] font-normal">
                    {box.confidence > 1 ? `${box.confidence}%` : `${Math.round(box.confidence * 100)}%`}
                  </span>
                )}
                {showTracks && box.trackId && (
                  <span className="bg-black/40 px-1 rounded text-[9px] text-cyan-200">
                    {box.trackId}
                  </span>
                )}
              </div>
            )}

            {/* Tracking vector indicator */}
            {showTracks && (
              <div className="absolute bottom-1 right-1 text-[9px] font-mono text-cyan-300 bg-slate-900/80 px-1 rounded border border-cyan-500/30">
                VEL: 1.2 m/s
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
