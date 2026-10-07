import React, { useState, useEffect } from 'react';
import {
  HeartHandshake,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Video,
  Activity,
  PhoneCall,
  RotateCcw,
  User,
  MapPin,
  CheckCircle2,
  BellRing,
  Sparkles,
} from 'lucide-react';
import { ElderGuardStatus, ElderTimelineEvent } from '../types/vision';
import { BoundingBoxOverlay } from '../components/BoundingBoxOverlay';
import { TrendChart } from '../components/TrendChart';
import { api } from '../services/api';

interface Props {
  onRefreshGlobalStats: () => void;
}

export const ElderGuardView: React.FC<Props> = ({ onRefreshGlobalStats }) => {
  const [status, setStatus] = useState<ElderGuardStatus>({
    status: 'SAFE',
    currentActivity: 'Walking',
    lastMovementSecondsAgo: 18,
    alertsToday: 2,
    fallSensitivity: 85,
    inactivityThresholdSec: 30,
    monitoredCamera: 'Living Room Cam 02',
    monitoredResident: 'Arthur Vance (Age 78)',
    safeZones: ['Living Room', 'Reading Nook', 'Kitchen Corridor'],
  });

  const [timeline, setTimeline] = useState<ElderTimelineEvent[]>([
    { id: '1', time: '08:12', activity: 'Walking', severity: 'safe', location: 'Bedroom to Kitchen' },
    { id: '2', time: '09:03', activity: 'Sitting', severity: 'safe', location: 'Living Room Armchair' },
    { id: '3', time: '10:21', activity: 'Kitchen', severity: 'safe', location: 'Kitchen Counter' },
    { id: '4', time: '11:45', activity: 'Sitting', severity: 'safe', location: 'Reading Nook' },
    { id: '5', time: '14:32', activity: 'Possible Fall', severity: 'high', location: 'Living Room Floor', inactivitySeconds: 32 },
    { id: '6', time: '14:33', activity: 'No Movement', severity: 'high', location: 'Living Room Floor', inactivitySeconds: 94 },
  ]);

  const [simulating, setSimulating] = useState(false);
  const [timerCount, setTimerCount] = useState(18);

  useEffect(() => {
    // Tick movement seconds
    const interval = setInterval(() => {
      setTimerCount((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSimulateFall = async () => {
    setSimulating(true);
    try {
      const res = await api.triggerElderFall();
      setStatus(res.elderStatus);
      setTimeline((prev) => [res.timelineItem, ...prev]);
      setTimerCount(38);
      onRefreshGlobalStats();
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  const handleResetSafe = async () => {
    try {
      const res = await api.resetElderSafe();
      setStatus(res.elderStatus);
      setTimerCount(2);
      onRefreshGlobalStats();
    } catch (err) {
      console.error(err);
    }
  };

  const isAlertState = status.status === 'ALERT';

  // Dynamic bounding box depending on posture
  const elderBox = isAlertState
    ? [
        {
          id: 'elder-fall',
          label: 'POSSIBLE FALL (Floor Level)',
          confidence: 96,
          ymin: 720,
          xmin: 240,
          ymax: 890,
          xmax: 720,
          trackId: 'RESIDENT #01',
          color: '#ef4444',
        },
      ]
    : [
        {
          id: 'elder-walk',
          label: 'Person 0.92 (Upright Posture)',
          confidence: 92,
          ymin: 220,
          xmin: 340,
          ymax: 820,
          xmax: 540,
          trackId: 'RESIDENT #01',
          color: '#10b981',
        },
      ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Status Banner */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">ElderGuard</h2>
              <span
                className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                  isAlertState
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isAlertState ? 'bg-rose-400' : 'bg-emerald-400'
                  }`}
                ></span>
                {status.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Resident: <span className="text-slate-200 font-semibold">{status.monitoredResident}</span> • Active Camera: {status.monitoredCamera}
            </p>
          </div>
        </div>

        {/* Quick status stats */}
        <div className="flex items-center gap-6 text-xs font-mono">
          <div className="text-right">
            <span className="text-slate-500 block text-[10px]">CURRENT ACTIVITY</span>
            <span className={`font-bold ${isAlertState ? 'text-rose-400' : 'text-emerald-400'}`}>
              {status.currentActivity}
            </span>
          </div>

          <div className="text-right">
            <span className="text-slate-500 block text-[10px]">LAST MOVEMENT</span>
            <span className="text-white font-bold">{timerCount} sec ago</span>
          </div>

          <div className="text-right">
            <span className="text-slate-500 block text-[10px]">ALERTS TODAY</span>
            <span className="text-amber-400 font-bold">{status.alertsToday}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isAlertState ? (
            <button
              onClick={handleResetSafe}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Safe</span>
            </button>
          ) : (
            <button
              onClick={handleSimulateFall}
              disabled={simulating}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600 border border-rose-500/50 hover:border-rose-400 text-rose-200 hover:text-white font-bold text-xs shadow-lg transition-all"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Simulate Fall Event</span>
            </button>
          )}

          <button
            onClick={() => alert('Emergency alert dispatched to primary caregiver and family contact phone.')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all"
          >
            <PhoneCall className="w-3.5 h-3.5 text-cyan-400" />
            <span>Caregiver</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Video Stream + Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video stream (2 cols) */}
        <div className="lg:col-span-2 glass-panel rounded-2xl overflow-hidden border border-slate-800 flex flex-col">
          {/* Top Video bar */}
          <div className="p-3.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span className="text-xs font-mono font-bold text-white">LIVING ROOM CAMERA</span>
              <span className="text-[10px] font-mono text-slate-500">FEED 02</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <span>POSE TRACKING: ACTIVE</span>
            </div>
          </div>

          {/* Video display */}
          <div className="relative h-[360px] sm:h-[420px] w-full bg-black overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?auto=format&fit=crop&w=1200&q=80"
              alt="Elder Room Stream"
              className="w-full h-full object-cover opacity-85"
            />

            {/* Bounding box and posture tracking */}
            <BoundingBoxOverlay boxes={elderBox} />

            {/* Virtual Floor Reference Guideline */}
            <div className="absolute bottom-[20%] left-0 right-0 h-0.5 border-b border-dashed border-emerald-500/40 flex items-center justify-between px-4">
              <span className="text-[9px] font-mono text-emerald-400/80 bg-slate-950/70 px-1.5 py-0.5 rounded">
                NORMAL FLOOR PLANE LEVEL
              </span>
            </div>

            {/* Emergency HUD Banner if in alert */}
            {isAlertState && (
              <div className="absolute top-4 left-4 right-4 bg-rose-950/90 border-2 border-rose-500/90 rounded-xl p-4 shadow-2xl backdrop-blur-md animate-pulse">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                      ⚠️ LEVEL 3 — CONFIRMED SAFETY CONCERN
                    </h4>
                    <p className="text-xs text-rose-200 mt-0.5">
                      Rapid downward velocity followed by 38s stationary floor posture. Action: Check resident immediately.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side: Recent Alerts */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">Recent Alerts</h3>
              <span className="text-[10px] font-mono text-slate-400">Escalation Engine</span>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-rose-500/30 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Possible Fall</span>
                    <span className="text-[9px] font-mono uppercase bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded border border-rose-500/40">
                      HIGH
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 mt-1 block">14:32 • Living Room</span>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-amber-500/30 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">Prolonged Inactivity</span>
                    <span className="text-[9px] font-mono uppercase bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/40">
                      MEDIUM
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 mt-1 block">11:26 • Bedroom Armchair</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">Resolved</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-300">Unusual Posture</span>
                    <span className="text-[9px] font-mono uppercase bg-sky-500/20 text-sky-300 px-1.5 py-0.2 rounded border border-sky-500/40">
                      LOW
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 mt-1 block">09:18 • Reading Nook</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">Resolved</span>
              </div>
            </div>
          </div>

          {/* Safe Zones config card */}
          <div className="pt-4 mt-4 border-t border-slate-800">
            <span className="text-[10px] font-mono uppercase text-slate-500 block mb-2 font-semibold">
              AUTHORIZED SAFE ZONES
            </span>
            <div className="flex flex-wrap gap-1.5">
              {status.safeZones.map((zone, i) => (
                <span
                  key={i}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-900 text-cyan-300 border border-slate-800"
                >
                  {zone}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Activity Timeline + Activity Level Sparkline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline (2 cols) */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Activity Timeline</h3>
              <p className="text-xs text-slate-400">Chronological telemetry of detected body poses</p>
            </div>
            <span className="text-[11px] font-mono text-cyan-400">Real-time Stream</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {timeline.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-xl border flex flex-col justify-between ${
                  item.severity === 'high' || item.severity === 'critical'
                    ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400">{item.time}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      item.severity === 'high' || item.severity === 'critical'
                        ? 'bg-rose-500 animate-ping'
                        : 'bg-emerald-400'
                    }`}
                  ></span>
                </div>
                <div className="text-xs font-bold mt-2 truncate">{item.activity}</div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">{item.location}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Level chart (1 col) */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-white">Activity Level</h3>
              <span className="text-[10px] font-mono text-slate-500">Last 12 Hours</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">Relative movement velocity index</p>
          </div>
          <TrendChart points={[8, 14, 25, 18, 32, 28, isAlertState ? 4 : 22]} strokeColor="#10b981" />
        </div>
      </div>
    </div>
  );
};
