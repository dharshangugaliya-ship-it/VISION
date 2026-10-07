import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Layers,
  Sparkles,
  Calendar,
  Eye,
  GraduationCap,
  HeartHandshake,
  Building2,
  ArrowRight,
} from 'lucide-react';
import { DonutChart } from '../components/DonutChart';
import { TrendChart } from '../components/TrendChart';

export const AnalyticsView: React.FC = () => {
  const [timeRange, setTimeRange] = useState('7d');

  const eventDistributionSegments = [
    { label: 'Low', value: 128, percent: 52, color: '#38bdf8' },
    { label: 'Medium', value: 69, percent: 28, color: '#f59e0b' },
    { label: 'High', value: 37, percent: 15, color: '#f97316' },
    { label: 'Critical', value: 13, percent: 5, color: '#ef4444' },
  ];

  const moduleUsageSegments = [
    { label: 'Core Vision', value: 437, percent: 35, color: '#06b6d4' },
    { label: 'CampusPulse', value: 337, percent: 27, color: '#a855f7' },
    { label: 'BunkWatch', value: 274, percent: 22, color: '#f43f5e' },
    { label: 'ElderGuard', value: 200, percent: 16, color: '#10b981' },
  ];

  const topEventTypes = [
    { type: 'Person detected', count: 184 },
    { type: 'Vehicle detected', count: 102 },
    { type: 'Waste classified', count: 76 },
    { type: 'Crowd threshold exceeded', count: 54 },
    { type: 'Restricted entry polygon', count: 42 },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Range Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Analytics Engine</h2>
          <p className="text-xs text-slate-400">
            Cross-module telemetry, neural inferences, and operational safety metrics
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-3 py-1 rounded-lg transition-all ${
              timeRange === '7d' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-3 py-1 rounded-lg transition-all ${
              timeRange === '30d' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setTimeRange('custom')}
            className={`px-3 py-1 rounded-lg transition-all ${
              timeRange === 'custom' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Custom
          </button>
        </div>
      </div>

      {/* Row 1: Detection Trends (8 cols) + Event Distribution Donut (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-white">Detection Trends</h3>
              <div className="flex items-center gap-4 text-[11px] font-mono">
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span> People
                </span>
                <span className="flex items-center gap-1.5 text-purple-400">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span> Vehicles
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Objects
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-6">Aggregate daily detections across institutional edge nodes</p>
          </div>

          <div className="py-2">
            <TrendChart
              points={[142, 168, 195, 210, 245, 180, 144]}
              labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
              strokeColor="#06b6d4"
              height={140}
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
            <span>WEEKLY SURGE: +18.4%</span>
            <span className="text-emerald-400 font-bold">PEAK OCCUPANCY: FRIDAY 245</span>
          </div>
        </div>

        {/* Event Distribution (4 cols) */}
        <div className="lg:col-span-4 glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-white">Event Distribution</h3>
              <span className="text-[10px] font-mono text-slate-500">247 Events</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">Severity breakdown calculated by Decision Engine</p>
          </div>

          <div className="py-2 flex justify-center">
            <DonutChart
              segments={eventDistributionSegments}
              centerLabel="247"
              centerSub="Total Events"
              size={160}
            />
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>Critical Severity:</span>
            <span className="text-rose-400 font-bold">5% (Triaged)</span>
          </div>
        </div>
      </div>

      {/* Row 2: Module Usage (4 cols) + Top Event Types (4 cols) + AI Insights (4 cols) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
        {/* Module Usage (4 cols) */}
        <div className="lg:col-span-4 glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-white">Module Usage</h3>
              <span className="text-[10px] font-mono text-cyan-400">1,248 Runs</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">Distribution of computing workloads by module</p>
          </div>

          <div className="py-2 flex justify-center">
            <DonutChart
              segments={moduleUsageSegments}
              centerLabel="1,248"
              centerSub="Total Analyses"
              size={160}
            />
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>Leading Module:</span>
            <span className="text-cyan-400 font-bold">Core Vision (35%)</span>
          </div>
        </div>

        {/* Top Event Types (4 cols) */}
        <div className="lg:col-span-4 glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white mb-1">Top Event Types</h3>
            <p className="text-xs text-slate-400 mb-4">Highest occurrence events recorded across campuses</p>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {topEventTypes.map((item, i) => (
              <div
                key={i}
                className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] text-slate-400">
                    {i + 1}
                  </span>
                  <span className="text-slate-200 font-semibold">{item.type}</span>
                </div>
                <span className="font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                  {item.count}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-500 text-center">
            Logged across 8 active institutional cameras
          </div>
        </div>

        {/* AI Operational Insights (4 cols) */}
        <div className="lg:col-span-4 glass-panel rounded-2xl p-6 border border-cyan-500/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-300" />
                <span>AI Operational Insights</span>
              </h3>
              <span className="text-[10px] font-mono text-cyan-400">Live Synthesis</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">Autonomous intelligence deductions across module data</p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-1">
              <span className="text-purple-300 font-bold block flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>CampusPulse Recommendation</span>
              </span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Most campus safety events occurred near the main entrance between 12:00 PM and 2:00 PM during student transit.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-1">
              <span className="text-rose-300 font-bold block flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>BunkWatch Audit</span>
              </span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                18 student identifications occurred during the current active period check outside CSE-A.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1">
              <span className="text-emerald-300 font-bold block flex items-center gap-1.5">
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>ElderGuard Baseline</span>
              </span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Two prolonged inactivity events were detected today. Resident mobility resumed within configured safety thresholds.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] font-mono text-cyan-400 flex items-center justify-between cursor-pointer hover:underline">
            <span>Export Telemetry Report</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
};
