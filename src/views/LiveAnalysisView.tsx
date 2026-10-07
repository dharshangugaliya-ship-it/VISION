import React, { useState, useEffect } from 'react';
import {
  Video,
  Play,
  Pause,
  Camera,
  Maximize2,
  Scan,
  Route,
  ShieldAlert,
  Users,
  Car,
  Layers,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { BoundingBoxOverlay } from '../components/BoundingBoxOverlay';
import { BoundingBox } from '../types/vision';

export const LiveAnalysisView: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [showDetections, setShowDetections] = useState(true);
  const [showTracking, setShowTracking] = useState(true);
  const [showRestrictedZone, setShowRestrictedZone] = useState(true);
  const [activeCamera, setActiveCamera] = useState('Campus Gate A');
  const [snapshotTaken, setSnapshotTaken] = useState(false);

  // Live real-time bounding boxes
  const [boxes, setBoxes] = useState<BoundingBox[]>([
    {
      id: 'liv-1',
      label: 'Person',
      confidence: 96,
      ymin: 220,
      xmin: 160,
      ymax: 760,
      xmax: 360,
      trackId: 'Person #04',
      color: '#38bdf8',
    },
    {
      id: 'liv-2',
      label: 'Vehicle',
      confidence: 91,
      ymin: 380,
      xmin: 620,
      ymax: 790,
      xmax: 920,
      trackId: 'Vehicle #08',
      color: '#a855f7',
    },
    {
      id: 'liv-3',
      label: 'Bicycle',
      confidence: 89,
      ymin: 450,
      xmin: 420,
      ymax: 710,
      xmax: 540,
      trackId: 'Bike #02',
      color: '#22c55e',
    },
  ]);

  const liveEvents = [
    { time: '20:31', title: 'Restricted entry', severity: 'high' },
    { time: '20:28', title: 'Crowd increase', severity: 'medium' },
    { time: '20:25', title: 'Vehicle speed logged', severity: 'low' },
  ];

  const timelineLogs = [
    { time: '20:31:02', title: 'Person detected', module: 'Vision' },
    { time: '20:31:06', title: 'Object tracked', module: 'Tracking' },
    { time: '20:31:14', title: 'Restricted zone entered', module: 'Event Engine' },
    { time: '20:31:17', title: 'Safety event triggered', module: 'Decision Engine' },
  ];

  const cameras = [
    'Campus Gate A',
    'Block B Corridor',
    'Library Lobby',
    'Living Room Cam 02',
    'Central Cafeteria',
    'Auditorium Foyer',
  ];

  const handleSnapshot = () => {
    setSnapshotTaken(true);
    setTimeout(() => setSnapshotTaken(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Camera Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            Live Analysis Stream
          </h2>
          <p className="text-xs text-slate-400">
            Real-time inference pipeline with spatial polygon monitoring and trajectory tracking
          </p>
        </div>

        {/* Camera Selector Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">INPUT SOURCE:</span>
          <select
            value={activeCamera}
            onChange={(e) => setActiveCamera(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-cyan-300 font-mono font-semibold focus:outline-none focus:border-cyan-500"
          >
            {cameras.map((cam) => (
              <option key={cam} value={cam}>
                {cam}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Video Stream (8 cols) + Live Telemetry (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Video Screen (8 cols) */}
        <div className="lg:col-span-8 glass-panel rounded-2xl overflow-hidden border border-slate-800 flex flex-col">
          {/* Stream Info Bar */}
          <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span className="text-xs font-mono font-bold text-white uppercase">{activeCamera}</span>
              <span className="text-[10px] font-mono text-slate-500">LIVE WEBRTC / RTSP</span>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-400">
              <span>FPS: 30.1</span>
              <span>•</span>
              <span>1080p</span>
            </div>
          </div>

          {/* Video Player Display */}
          <div className="relative h-[420px] sm:h-[480px] w-full bg-black overflow-hidden select-none">
            <img
              src="https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1400&q=80"
              alt="Live Feed"
              className="w-full h-full object-cover opacity-85"
            />

            {/* Overlays */}
            {showDetections && (
              <BoundingBoxOverlay
                boxes={boxes}
                showTracks={showTracking}
                showRestrictedZone={showRestrictedZone}
              />
            )}

            {/* Scanline Effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent h-12 w-full animate-scan pointer-events-none"></div>

            {/* Snapshot Toast Feedback */}
            {snapshotTaken && (
              <div className="absolute top-4 right-4 bg-emerald-600 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs font-mono shadow-2xl flex items-center gap-1.5 animate-bounce">
                <span>SNAPSHOT CAPTURED & SAVED TO EVIDENCE</span>
              </div>
            )}
          </div>

          {/* Video Control Bar */}
          <div className="p-3.5 bg-slate-950/80 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                title={isPlaying ? 'Pause Feed' : 'Resume Feed'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              </button>

              <button
                onClick={handleSnapshot}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                title="Capture Snapshot"
              >
                <Camera className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">Snapshot</span>
              </button>
            </div>

            {/* Feature Toggles */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <button
                onClick={() => setShowDetections(!showDetections)}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  showDetections
                    ? 'bg-cyan-600/30 border-cyan-500 text-cyan-200'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                Detection
              </button>

              <button
                onClick={() => setShowTracking(!showTracking)}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  showTracking
                    ? 'bg-blue-600/30 border-blue-500 text-blue-200'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                Tracking
              </button>

              <button
                onClick={() => setShowRestrictedZone(!showRestrictedZone)}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  showRestrictedZone
                    ? 'bg-rose-600/30 border-rose-500 text-rose-200'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                Zone Polygon
              </button>
            </div>
          </div>
        </div>

        {/* Right Side Telemetry & Live Events (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Object Counters Card */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block mb-3">
              Spatial Object Density
            </span>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <Users className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                <span className="text-[10px] font-mono text-slate-500 block">PEOPLE</span>
                <span className="text-xl font-black text-white font-mono">18</span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <Car className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                <span className="text-[10px] font-mono text-slate-500 block">VEHICLES</span>
                <span className="text-xl font-black text-white font-mono">4</span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <Scan className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                <span className="text-[10px] font-mono text-slate-500 block">TOTAL</span>
                <span className="text-xl font-black text-white font-mono">31</span>
              </div>
            </div>
          </div>

          {/* Live Events Stream */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block mb-3">
              Live Events Stream
            </span>

            <div className="space-y-2.5">
              {liveEvents.map((evt, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-500 text-[11px]">{evt.time}</span>
                    <span className="text-white font-semibold">{evt.title}</span>
                  </div>
                  <span
                    className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded border ${
                      evt.severity === 'high'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : evt.severity === 'medium'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                    }`}
                  >
                    {evt.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Event Timeline Trace */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block mb-3">
              Pipeline Event Timeline
            </span>

            <div className="space-y-3 font-mono text-xs">
              {timelineLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-3 text-slate-300">
                  <span className="text-[10px] text-cyan-400 shrink-0">{log.time}</span>
                  <div className="min-w-0">
                    <span className="font-semibold block truncate text-white">{log.title}</span>
                    <span className="text-[9px] text-slate-500 block">{log.module}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
