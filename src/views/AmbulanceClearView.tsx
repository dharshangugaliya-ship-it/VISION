import React, { useState, useEffect } from 'react';
import {
  Siren,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Gauge,
  Car,
  Bus,
  Bike,
  User,
  Radio,
  CheckCircle2,
  RefreshCw,
  Zap,
  Activity,
  Layers,
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Route,
  ArrowDown,
  Camera,
} from 'lucide-react';
import { AmbulanceClearState, AmbulanceVehicleDetection } from '../types/vision';
import { api } from '../services/api';

interface Props {
  onRefreshGlobalStats?: () => void;
}

export const AmbulanceClearView: React.FC<Props> = ({ onRefreshGlobalStats }) => {
  const [data, setData] = useState<AmbulanceClearState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeCamIndex, setActiveCamIndex] = useState(0);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [showEmergencyCorridor, setShowEmergencyCorridor] = useState(true);
  const [showYieldVectors, setShowYieldVectors] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const cameras = [
    {
      id: 'cam-04',
      name: 'Cam 04 — Arterial Ring Road (Junction 7)',
      location: 'Sector 4B Arterial Ring',
      image: 'https://images.unsplash.com/photo-1545459720-aac8509eb02c?auto=format&fit=crop&w=1200&q=80',
    },
    {
      id: 'cam-02',
      name: 'Cam 02 — Hospital Expressway North Approach',
      location: 'Corridor North — 1.2km to Trauma Center',
      image: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80',
    },
    {
      id: 'cam-09',
      name: 'Cam 09 — Downtown Flyover Merge',
      location: 'Central Flyover Ramp A',
      image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80',
    },
  ];

  const fetchState = async () => {
    try {
      const state = await api.getAmbulanceClearState();
      setData(state);
    } catch (err) {
      console.warn('Could not fetch ambulanceclear state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (action: 'block_traffic' | 'partial_clear' | 'full_clear' | 'toggle_preemption' | 'reset') => {
    setActionLoading(true);
    try {
      const updated = await api.simulateAmbulanceAction(action);
      setData(updated);
      if (onRefreshGlobalStats) onRefreshGlobalStats();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePreemption = async () => {
    setActionLoading(true);
    try {
      const updated = await api.triggerSignalPreemption();
      setData(updated);
      if (onRefreshGlobalStats) onRefreshGlobalStats();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Generate ASCII block progress bar like ██████░░░░ 64%
  const renderAsciiProgressBar = (score: number) => {
    const totalBlocks = 10;
    const filledBlocks = Math.round((score / 100) * totalBlocks);
    const filledStr = '█'.repeat(Math.max(0, Math.min(totalBlocks, filledBlocks)));
    const emptyStr = '░'.repeat(Math.max(0, totalBlocks - filledBlocks));
    return `${filledStr}${emptyStr}  ${score}%`;
  };

  const scoreColor = (score: number) => {
    if (score < 45) return { text: 'text-rose-400', bg: 'bg-rose-500', border: 'border-rose-500/50', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40', status: 'CRITICAL — PATH BLOCKED' };
    if (score < 75) return { text: 'text-amber-400', bg: 'bg-amber-500', border: 'border-amber-500/50', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40', status: 'RESTRICTED — PARTIAL CLEARANCE' };
    return { text: 'text-emerald-400', bg: 'bg-emerald-500', border: 'border-emerald-500/50', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', status: 'OPTIMAL — GREEN CORRIDOR' };
  };

  const stateData = data || {
    ambulanceStatus: 'ACTIVE' as const,
    clearanceScore: 64,
    trafficDensity: 'HIGH' as const,
    blockedVehiclesCount: 3,
    estimatedDelaySec: 18,
    ambulanceSpeedKmh: 14,
    activeCamera: 'Cam 04 — Arterial Ring Road (Junction 7)',
    routeCorridorName: 'Arterial Central Corridor 4B',
    destinationHospital: 'Metro General Trauma Center',
    etaMinutes: 4.8,
    availableLaneSpaceMeters: 2.2,
    roadOccupancyPercent: 78,
    ambulanceMovement: 'Crawling (<10 km/h)' as const,
    breakdownScores: {
      roadClearance: 35,
      blockingPenalty: -24,
      trafficDensityFactor: -12,
      ambulanceMovementScore: 15,
      availableLaneSpaceScore: 18,
    },
    lanes: [
      { id: 1, name: 'Lane 1 (Left Transit)', type: 'general' as const, occupancyPercent: 72, vehicleCount: 6, isPathBlocked: false, yieldingState: 'Yielding Left' as const },
      { id: 2, name: 'Lane 2 (Emergency Central)', type: 'emergency_primary' as const, occupancyPercent: 88, vehicleCount: 4, isPathBlocked: true, yieldingState: 'Blocked' as const },
      { id: 3, name: 'Lane 3 (Right Shoulder Buffer)', type: 'shoulder' as const, occupancyPercent: 35, vehicleCount: 2, isPathBlocked: false, yieldingState: 'Clear Corridor' as const },
    ],
    vehicles: [
      { id: 'amb-01', type: 'ambulance' as const, label: 'Ambulance (Emergency)', confidence: 99, lane: 2, distanceMeters: 0, speedKmh: 14, status: 'blocking' as const, ymin: 720, xmin: 390, ymax: 960, xmax: 610, trackId: 'AMB-911', color: '#ef4444' },
      { id: 'veh-car-01', type: 'car' as const, label: 'Sedan (Path Blocker 1)', confidence: 95, lane: 2, distanceMeters: 12, speedKmh: 4, status: 'blocking' as const, ymin: 510, xmin: 410, ymax: 670, xmax: 570, trackId: 'CAR-104', color: '#ef4444' },
      { id: 'veh-car-02', type: 'car' as const, label: 'Silver SUV (Path Blocker 2)', confidence: 93, lane: 2, distanceMeters: 24, speedKmh: 0, status: 'blocking' as const, ymin: 360, xmin: 420, ymax: 490, xmax: 560, trackId: 'SUV-218', color: '#ef4444' },
      { id: 'veh-car-03', type: 'car' as const, label: 'Hatchback (Path Blocker 3)', confidence: 91, lane: 2, distanceMeters: 38, speedKmh: 0, status: 'blocking' as const, ymin: 240, xmin: 430, ymax: 340, xmax: 550, trackId: 'CAR-309', color: '#ef4444' },
      { id: 'veh-bus-01', type: 'bus' as const, label: 'City Bus', confidence: 96, lane: 1, distanceMeters: 28, speedKmh: 8, status: 'yielding' as const, ymin: 280, xmin: 160, ymax: 530, xmax: 340, trackId: 'BUS-08', color: '#a855f7' },
      { id: 'veh-moto-01', type: 'motorcycle' as const, label: 'Motorcycle', confidence: 89, lane: 3, distanceMeters: 18, speedKmh: 12, status: 'clear' as const, ymin: 440, xmin: 690, ymax: 540, xmax: 770, trackId: 'MOTO-14', color: '#f59e0b' },
      { id: 'veh-ped-01', type: 'pedestrian' as const, label: 'Pedestrian (Refuge)', confidence: 92, lane: 3, distanceMeters: 30, speedKmh: 2, status: 'clear' as const, ymin: 310, xmin: 840, ymax: 410, xmax: 890, trackId: 'PED-02', color: '#38bdf8' },
    ],
    timeline: [
      { id: 'tl-6', timestamp: '20:41:17', event: 'Clearance score: 71', detail: 'Vehicle CAR-104 steering left into Lane 1 buffer; emergency path expanding.', severity: 'medium' as const, clearanceScore: 71, blockedCount: 2 },
      { id: 'tl-5', timestamp: '20:41:13', event: 'Lane partially cleared', detail: 'Shoulder corridor detected 2.8m lateral gap; lead car beginning evasive yield.', severity: 'medium' as const, clearanceScore: 54, blockedCount: 2 },
      { id: 'tl-4', timestamp: '20:41:09', event: 'Clearance score: 32', detail: 'Critical bottleneck: 3 stationary vehicles directly obstructing priority lane.', severity: 'critical' as const, clearanceScore: 32, blockedCount: 3 },
      { id: 'tl-3', timestamp: '20:41:07', event: 'Emergency lane blocked', detail: 'Forward trajectory locked at KP-4 bottleneck. Estimated delay +18 sec.', severity: 'critical' as const, clearanceScore: 41, blockedCount: 3 },
      { id: 'tl-2', timestamp: '20:41:05', event: 'Traffic density increasing', detail: 'Arterial ring road occupancy spiked to 78% during peak signal phase.', severity: 'high' as const, clearanceScore: 58, blockedCount: 2 },
      { id: 'tl-1', timestamp: '20:41:02', event: 'Ambulance detected', detail: 'Emergency beacon signature recognized on Cam 04. Siren acoustic detected.', severity: 'high' as const, clearanceScore: 68, blockedCount: 1 },
    ],
    preemptionActive: false,
  };

  const currentScoreInfo = scoreColor(stateData.clearanceScore);
  const blockingVehicles = stateData.vehicles.filter((v) => v.status === 'blocking' && v.type !== 'ambulance');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* KEY CORE MESSAGE / HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-950/80 via-slate-900 to-indigo-950/80 border border-rose-500/40 p-6 sm:p-7 shadow-2xl">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-0 right-0 p-4 opacity-10 hidden sm:block">
          <Siren className="w-32 h-32 text-rose-400" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold tracking-wider uppercase">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                <Siren className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                AMBULANCECLEAR MODULE
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-mono border border-slate-700">
                Emergency-Route Intelligence
              </span>
              {stateData.preemptionActive && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-mono border border-emerald-500/40 animate-pulse">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  Signal Preemption Active
                </span>
              )}
            </div>

            {/* Core philosophy headline highlighted per user instructions */}
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-snug">
              &ldquo;Don&apos;t just detect the ambulance.{' '}
              <span className="bg-gradient-to-r from-rose-400 via-amber-300 to-cyan-300 bg-clip-text text-transparent">
                Understand whether the road is actually clearing for it.
              </span>
              &rdquo;
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              Real-time traffic-camera spatial intelligence analyzing vehicle trajectories, forward projection cones,
              and emergency corridor clearance. Detects bottlenecks before they cause critical ambulance transit delays.
            </p>
          </div>

          {/* Quick Scenario Triggers */}
          <div className="flex flex-wrap sm:flex-nowrap md:flex-col gap-2 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => handleAction('block_traffic')}
              disabled={actionLoading}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/50 text-rose-200 text-xs font-bold transition-all shadow-md group"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
              <span>Simulate Blockage (32%)</span>
            </button>
            <button
              onClick={() => handleAction('partial_clear')}
              disabled={actionLoading}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 text-amber-200 text-xs font-bold transition-all shadow-md group"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Simulate Yielding (64%)</span>
            </button>
            <button
              onClick={() => handleAction('full_clear')}
              disabled={actionLoading}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 text-emerald-200 text-xs font-bold transition-all shadow-md group"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>Green Corridor (88%)</span>
            </button>
          </div>
        </div>
      </div>

      {/* TOP DASHBOARD METRIC CARDS (Exact match to user specifications) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Ambulance Status */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-rose-500/40 transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Ambulance Status</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Siren className="w-4 h-4 animate-spin text-rose-400" style={{ animationDuration: '3s' }} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black font-mono tracking-tight text-white">
                {stateData.ambulanceStatus}
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-1 flex items-center gap-1.5">
              <span>Unit: AMB-911</span>
              <span>•</span>
              <span className="text-cyan-400">{stateData.ambulanceSpeedKmh} km/h</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between font-mono">
            <span>Destination:</span>
            <span className="text-slate-200 truncate ml-1 font-semibold">Metro Trauma</span>
          </div>
        </div>

        {/* 2. Clearance Score (Exact Display: Clearance Score ██████░░░░ 64%) */}
        <div className={`glass-panel p-5 rounded-2xl border ${currentScoreInfo.border} transition-all flex flex-col justify-between col-span-1 sm:col-span-2 relative overflow-hidden`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Clearance Score</span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${currentScoreInfo.badge}`}>
                {stateData.clearanceScore}/100
              </span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 font-semibold">
              {currentScoreInfo.status}
            </span>
          </div>

          <div className="space-y-2">
            {/* User prompt requested ASCII block display format */}
            <div className="bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800 font-mono text-sm sm:text-base font-bold text-slate-100 flex items-center justify-between shadow-inner">
              <span className="tracking-widest text-emerald-400 select-all">
                {renderAsciiProgressBar(stateData.clearanceScore)}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded ${currentScoreInfo.badge}`}>
                {stateData.clearanceScore < 45 ? 'CRITICAL' : stateData.clearanceScore < 75 ? 'RESTRICTED' : 'CLEAR'}
              </span>
            </div>

            {/* Visual Linear Progress Meter */}
            <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  stateData.clearanceScore < 45
                    ? 'bg-gradient-to-r from-rose-600 to-rose-400'
                    : stateData.clearanceScore < 75
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                    : 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                }`}
                style={{ width: `${stateData.clearanceScore}%` }}
              ></div>
            </div>
          </div>

          <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between font-mono">
            <span>Movement State: <strong className="text-slate-200">{stateData.ambulanceMovement}</strong></span>
            <span>Lateral Space: <strong className="text-cyan-300">{stateData.availableLaneSpaceMeters}m</strong></span>
          </div>
        </div>

        {/* 3. Traffic Density */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Traffic Density</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono tracking-tight text-white">
              {stateData.trafficDensity}
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-1 flex items-center gap-1.5">
              <span>Road Occupancy:</span>
              <span className="text-amber-400 font-semibold">{stateData.roadOccupancyPercent}%</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between font-mono">
            <span>Flow Rate:</span>
            <span className="text-slate-200">14 veh/min</span>
          </div>
        </div>

        {/* 4. Blocked Vehicles & Estimated Delay */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-rose-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Blocked Vehicles</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-rose-400">
                {stateData.blockedVehiclesCount}
              </span>
              <span className="text-xs text-slate-400 font-mono">in path</span>
            </div>
            <div className="text-[11px] font-mono text-slate-300 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>Delay: <strong className="text-amber-300">+{stateData.estimatedDelaySec} sec</strong></span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between font-mono">
            <span>ETA to Trauma:</span>
            <span className="text-cyan-300 font-semibold">4.8 min</span>
          </div>
        </div>
      </div>

      {/* BLOCKAGE DETECTION VISUALIZER + CORRIDOR PROJECTION (Exact user specification) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Traffic Camera Feed with Real CV Bounding Boxes */}
        <div className="lg:col-span-2 glass-panel rounded-2xl border border-slate-800 overflow-hidden flex flex-col">
          {/* Camera Header Bar */}
          <div className="p-4 border-b border-slate-800/80 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  LIVE OPTICAL FEED
                </span>
              </div>
              <span className="text-slate-600">|</span>
              <select
                value={activeCamIndex}
                onChange={(e) => setActiveCamIndex(Number(e.target.value))}
                className="bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              >
                {cameras.map((cam, idx) => (
                  <option key={cam.id} value={idx}>
                    {cam.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Overlay Viewport Controls */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <button
                onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] transition-colors ${
                  showBoundingBoxes
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}
              >
                Boxes
              </button>
              <button
                onClick={() => setShowEmergencyCorridor(!showEmergencyCorridor)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] transition-colors ${
                  showEmergencyCorridor
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}
              >
                Emergency Corridor
              </button>
              <button
                onClick={() => setShowYieldVectors(!showYieldVectors)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] transition-colors ${
                  showYieldVectors
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}
              >
                Yield Vectors
              </button>
            </div>
          </div>

          {/* Video Feed Canvas Area */}
          <div className="relative aspect-video w-full bg-black overflow-hidden flex items-center justify-center select-none">
            <img
              src={cameras[activeCamIndex].image}
              alt="Live Traffic Camera Stream"
              className="w-full h-full object-cover opacity-85 brightness-95"
            />

            {/* Cyber scanline effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent h-20 animate-scan pointer-events-none"></div>

            {/* Virtual Lane Demarcation Guides */}
            {showEmergencyCorridor && (
              <div className="absolute inset-0 pointer-events-none z-10">
                {/* Lane 1 boundary */}
                <div className="absolute top-0 bottom-0 left-[35%] w-0.5 border-r border-dashed border-white/40"></div>
                {/* Lane 2 Emergency corridor boundaries (Highlighted in amber or flashing rose when blocked) */}
                <div
                  className={`absolute top-0 bottom-0 left-[35%] right-[35%] transition-all ${
                    stateData.blockedVehiclesCount > 0
                      ? 'border-x-2 border-rose-500/70 bg-rose-500/10 shadow-[0_0_20px_rgba(244,63,94,0.15)]'
                      : 'border-x-2 border-emerald-500/70 bg-emerald-500/10'
                  }`}
                >
                  {/* Flashing Corridor Label */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-950/90 border border-rose-500/60 px-3 py-1 rounded-full text-[10px] font-mono font-bold text-rose-300 flex items-center gap-1.5 shadow-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                    <span>EMERGENCY CORRIDOR (LANE 2)</span>
                  </div>

                  {/* Bottleneck Warning Banner when vehicles are blocking */}
                  {stateData.blockedVehiclesCount > 0 && (
                    <div className="absolute top-[48%] left-1/2 -translate-x-1/2 -translate-y-1/2 bg-rose-950/90 border-2 border-rose-500 px-4 py-1.5 rounded-xl text-center shadow-2xl backdrop-blur-md animate-pulse">
                      <div className="text-xs font-black font-mono text-white flex items-center gap-1.5 justify-center">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
                        ⚠️ PATH BLOCKED
                      </div>
                      <div className="text-[10px] font-mono text-rose-300 mt-0.5">
                        {stateData.blockedVehiclesCount} vehicles detected in emergency path
                      </div>
                    </div>
                  )}
                </div>
                {/* Lane 3 boundary */}
                <div className="absolute top-0 bottom-0 right-[35%] w-0.5 border-r border-dashed border-white/40"></div>
              </div>
            )}

            {/* Simulated Bounding Boxes Overlay */}
            {showBoundingBoxes && (
              <div className="absolute inset-0 pointer-events-none z-20">
                {stateData.vehicles.map((v) => {
                  const top = (v.ymin / 1000) * 100;
                  const left = (v.xmin / 1000) * 100;
                  const width = ((v.xmax - v.xmin) / 1000) * 100;
                  const height = ((v.ymax - v.ymin) / 1000) * 100;
                  const isAmbulance = v.type === 'ambulance';
                  const isBlocking = v.status === 'blocking' && !isAmbulance;

                  return (
                    <div
                      key={v.id}
                      className={`absolute transition-all duration-300 ${
                        isAmbulance ? 'ring-2 ring-rose-500 ring-offset-1 ring-offset-black' : ''
                      } ${isBlocking ? 'animate-pulse' : ''}`}
                      style={{
                        top: `${top}%`,
                        left: `${left}%`,
                        width: `${width}%`,
                        height: `${height}%`,
                        border: `2px solid ${v.color}`,
                        backgroundColor: `${v.color}20`,
                      }}
                    >
                      {/* Bounding box label */}
                      <div
                        className="absolute -top-6 left-0 px-2 py-0.5 text-[9px] font-mono font-bold text-white rounded whitespace-nowrap shadow-md flex items-center gap-1"
                        style={{ backgroundColor: v.color }}
                      >
                        {isAmbulance && <Siren className="w-3 h-3 text-white animate-spin" />}
                        <span>{v.label}</span>
                        <span className="opacity-80">({v.confidence}%)</span>
                      </div>

                      {/* Yielding vector indicator */}
                      {showYieldVectors && (
                        <div className="absolute bottom-1 right-1 text-[8px] font-mono px-1 rounded bg-black/80 text-cyan-200 border border-slate-700">
                          {isAmbulance ? 'ACTIVE 14km/h' : isBlocking ? '⚠️ BLOCKING' : 'YIELDING 8km/h'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Corner camera telemetry badge */}
            <div className="absolute bottom-3 left-3 bg-slate-950/85 px-3 py-1 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-300 z-30 flex items-center gap-3">
              <span>FPS: 29.8</span>
              <span>•</span>
              <span>RES: 1080p</span>
              <span>•</span>
              <span className="text-emerald-400">YOLOv8-EMERGENCY RT</span>
            </div>
          </div>

          {/* Quick Signal Preemption Action Footbar */}
          <div className="p-4 bg-slate-900/40 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
              <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span>Smart Traffic Signal Controller:</span>
              <span className={stateData.preemptionActive ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                {stateData.preemptionActive ? 'Preempted (Green Wave Active)' : 'Standard Cyclic Timing'}
              </span>
            </div>

            <button
              onClick={handlePreemption}
              disabled={actionLoading}
              className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 shadow-lg ${
                stateData.preemptionActive
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-500/20'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>{stateData.preemptionActive ? 'Extend Green Wave (+30s)' : 'Dispatch Signal Preemption'}</span>
            </button>
          </div>
        </div>

        {/* Right Col: Blockage Detection Schematic (Matches Prompt Diagram) */}
        <div className="space-y-6">
          {/* Visual Blockage Diagram Panel */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Blockage Detection Schematic
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                {stateData.blockedVehiclesCount} BLOCKED
              </span>
            </div>

            {/* Schematic representation as specified in the prompt:
                🚑 Ambulance
                       ↓
                🚗 🚗 🚗
                       ↓
                ⚠️ PATH BLOCKED
                Display: 3 vehicles detected in emergency path. */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 text-center space-y-3 font-mono">
              {/* Ambulance */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-600/20 border border-rose-500/40 text-xs font-bold text-rose-300">
                <span className="text-base">🚑</span>
                <span>Ambulance (Lead Emergency)</span>
              </div>

              {/* Down Arrow */}
              <div className="flex justify-center text-slate-500">
                <ArrowDown className="w-4 h-4 animate-bounce text-slate-400" />
              </div>

              {/* Blocking Vehicles */}
              <div className="p-3 rounded-xl bg-slate-900 border border-rose-500/40 flex items-center justify-center gap-3">
                <div className="flex items-center gap-1.5 text-base">
                  <span>🚗</span>
                  <span>🚗</span>
                  <span>🚗</span>
                </div>
                <div className="text-left text-[11px] font-mono text-slate-300">
                  <div className="font-bold text-white">Stationary Vehicles</div>
                  <div className="text-[10px] text-rose-400">CAR-104 • SUV-218 • CAR-309</div>
                </div>
              </div>

              {/* Down Arrow */}
              <div className="flex justify-center text-slate-500">
                <ArrowDown className="w-4 h-4 animate-bounce text-slate-400" />
              </div>

              {/* Path Blocked Alert Banner */}
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/60 text-center space-y-1">
                <div className="text-xs font-black text-rose-300 flex items-center justify-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>⚠️ PATH BLOCKED</span>
                </div>
                <div className="text-xs font-mono text-white font-semibold">
                  {stateData.blockedVehiclesCount} vehicles detected in emergency path.
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Lateral pinch point: {stateData.availableLaneSpaceMeters}m (Min required: 3.2m)
                </div>
              </div>
            </div>

            {/* List of Blocking Vehicles */}
            <div className="space-y-2">
              <div className="text-xs font-mono text-slate-400 font-semibold uppercase tracking-wider">
                Detected Blocking Entities
              </div>
              {blockingVehicles.map((veh, i) => (
                <div
                  key={veh.id}
                  className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-rose-500/20 text-rose-400 flex items-center justify-center text-[10px] font-bold">
                      {i + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-200">{veh.label}</div>
                      <div className="text-[10px] text-slate-400">{veh.trackId} • Lane {veh.lane}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-400 font-bold">{veh.distanceMeters}m ahead</div>
                    <div className="text-[10px] text-slate-500">{veh.speedKmh} km/h</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Emergency Clearance Score Calculator Breakdown */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Gauge className="w-4 h-4 text-cyan-400" />
                Score Calculation Breakdown
              </h3>
              <span className={`text-xs font-mono font-bold ${currentScoreInfo.text}`}>
                {stateData.clearanceScore} / 100
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-slate-300">
                <span>Road Clearance Factor</span>
                <span className="text-emerald-400 font-bold">+{stateData.breakdownScores.roadClearance} pts</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Blocking Vehicles ({stateData.blockedVehiclesCount})</span>
                <span className="text-rose-400 font-bold">{stateData.breakdownScores.blockingPenalty} pts</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Traffic Density ({stateData.trafficDensity})</span>
                <span className="text-amber-400 font-bold">{stateData.breakdownScores.trafficDensityFactor} pts</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Ambulance Movement Vector</span>
                <span className="text-cyan-400 font-bold">+{stateData.breakdownScores.ambulanceMovementScore} pts</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Available Lateral Lane Space</span>
                <span className="text-indigo-400 font-bold">+{stateData.breakdownScores.availableLaneSpaceScore} pts</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-bold text-sm text-white">
                <span>Emergency Clearance Score</span>
                <span className={currentScoreInfo.text}>{stateData.clearanceScore}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TIMELINE SECTION (Matches User Prompt Specification) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Timeline Feed */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Emergency Route Intelligence Timeline</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Timestamped sequence of vehicle detection, clearance scores, and corridor obstructions
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
              Corridor 4B
            </span>
          </div>

          <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {stateData.timeline.map((item, idx) => {
              const isRecent = idx === 0;
              const sevColor =
                item.severity === 'critical'
                  ? 'bg-rose-500 text-rose-300 border-rose-500/40'
                  : item.severity === 'high'
                  ? 'bg-orange-500 text-orange-300 border-orange-500/40'
                  : item.severity === 'medium'
                  ? 'bg-amber-500 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-500 text-emerald-300 border-emerald-500/40';

              return (
                <div key={item.id} className="relative group">
                  {/* Timeline node icon */}
                  <span
                    className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-[#0b101b] ${
                      item.severity === 'critical'
                        ? 'bg-rose-500'
                        : item.severity === 'safe'
                        ? 'bg-emerald-400'
                        : 'bg-amber-400'
                    } ${isRecent ? 'ring-4 ring-rose-500/20 animate-pulse' : ''}`}
                  ></span>

                  <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {item.timestamp}
                        </span>
                        <span className="text-sm font-bold text-white">{item.event}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-400">
                          Score: <strong className="text-slate-200">{item.clearanceScore}%</strong>
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border bg-opacity-20 ${sevColor}`}>
                          {item.severity.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">{item.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Road Occupancy & Lane Matrix */}
        <div className="space-y-6">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Lane Occupancy Matrix</h3>
              </div>
              <span className="text-xs font-mono text-slate-400">3 Lanes</span>
            </div>

            <div className="space-y-3">
              {stateData.lanes.map((lane) => (
                <div
                  key={lane.id}
                  className={`p-3 rounded-xl border ${
                    lane.type === 'emergency_primary'
                      ? 'bg-rose-950/20 border-rose-500/40'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      {lane.name}
                      {lane.type === 'emergency_primary' && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          PRIMARY
                        </span>
                      )}
                    </span>
                    <span
                      className={`text-[11px] font-bold ${
                        lane.occupancyPercent > 80
                          ? 'text-rose-400'
                          : lane.occupancyPercent > 50
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {lane.occupancyPercent}% Occupied
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full ${
                        lane.occupancyPercent > 80
                          ? 'bg-rose-500'
                          : lane.occupancyPercent > 50
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      }`}
                      style={{ width: `${lane.occupancyPercent}%` }}
                    ></div>
                  </div>

                  <div className="mt-2 text-[10px] font-mono text-slate-400 flex items-center justify-between">
                    <span>Vehicles: <strong className="text-slate-200">{lane.vehicleCount}</strong></span>
                    <span className="text-cyan-300">{lane.yieldingState}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Summary Note */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 font-mono leading-relaxed">
              💡 <strong>Intelligent Preemption Rule:</strong> When emergency central corridor drops below 50% clearance,
              automatic V2X broadcast commands preceding signal phases to flush vehicular queues into left and right shoulders.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
