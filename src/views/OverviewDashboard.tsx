import React, { useState } from 'react';
import {
  Users,
  Eye,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  TrendingUp,
  Activity,
  ArrowUpRight,
  Filter,
  Clock,
  MapPin,
  ChevronRight,
  X,
  Siren,
} from 'lucide-react';
import { CoreStats, VisionEvent } from '../types/vision';
import { DonutChart } from '../components/DonutChart';
import { TrendChart } from '../components/TrendChart';

interface Props {
  stats: CoreStats;
  events: VisionEvent[];
  onNavigate: (tab: string) => void;
}

export const OverviewDashboard: React.FC<Props> = ({ stats, events, onNavigate }) => {
  const [selectedEvent, setSelectedEvent] = useState<VisionEvent | null>(null);

  const riskSegments = [
    { label: 'Safe', value: 24, percent: 52, color: '#10b981' },
    { label: 'Low', value: 13, percent: 28, color: '#38bdf8' },
    { label: 'Medium', value: 7, percent: 15, color: '#f59e0b' },
    { label: 'High', value: 2, percent: 5, color: '#f97316' },
    { label: 'Critical', value: 1, percent: 5, color: '#ef4444' },
  ];

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'high':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'medium':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'low':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 6 Key Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Objects Detected */}
        <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium truncate">Objects Detected</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Eye className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {stats.objectsDetected.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 mt-1">
            <TrendingUp className="w-3 h-3" />
            <span>+12%</span>
          </div>
        </div>

        {/* People Tracked */}
        <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium truncate">People Tracked</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {stats.peopleTracked.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 mt-1">
            <TrendingUp className="w-3 h-3" />
            <span>+6%</span>
          </div>
        </div>

        {/* Events Detected */}
        <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium truncate">Events Detected</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {stats.eventsDetected.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 mt-1">
            <TrendingUp className="w-3 h-3" />
            <span>+15%</span>
          </div>
        </div>

        {/* Active Alerts */}
        <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group hover:border-rose-500/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium truncate">Active Alerts</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono text-rose-300">
            {stats.activeAlerts}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono text-rose-400 mt-1">
            <span>+5%</span>
          </div>
        </div>

        {/* High-Risk Events */}
        <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group hover:border-red-500/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium truncate">High-Risk Events</span>
            <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono text-red-400">
            {stats.highRiskEvents}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono text-amber-400 mt-1">
            <span>+2%</span>
          </div>
        </div>

        {/* Analyses Completed */}
        <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium truncate">Analyses Done</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {stats.analysesCompleted.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 mt-1">
            <TrendingUp className="w-3 h-3" />
            <span>+11%</span>
          </div>
        </div>
      </div>

      {/* AmbulanceClear Active Emergency Route Spotlight Banner */}
      <div
        onClick={() => onNavigate('ambulanceclear')}
        className="cursor-pointer glass-panel p-4 sm:p-5 rounded-2xl border border-rose-500/40 bg-gradient-to-r from-rose-950/40 via-slate-900/80 to-indigo-950/40 hover:border-rose-400/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group shadow-lg shadow-rose-950/20"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 group-hover:scale-110 transition-transform">
            <Siren className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                AMBULANCECLEAR
              </span>
              <span className="text-xs font-bold text-white">Active Emergency Route Intelligence</span>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                Score: 64% (Restricted)
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Unit AMB-911 tracked on Arterial Ring Road (Junction 7). 3 vehicles detected in emergency path (+18s delay).
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-rose-300 font-semibold shrink-0 group-hover:translate-x-1 transition-transform">
          <span>Open Clearance Command</span>
          <ChevronRight className="w-4 h-4 text-rose-400" />
        </div>
      </div>

      {/* Middle Row: Recent Activity & Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity List (2 cols) */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Recent Activity</h3>
              <p className="text-xs text-slate-400">Live operational events streamed from the Event Engine</p>
            </div>
            <button
              onClick={() => onNavigate('alerts')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition-colors"
            >
              <span>View All Alerts</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-800/60">
            {events.slice(0, 6).map((evt) => (
              <div
                key={evt.id}
                onClick={() => setSelectedEvent(evt)}
                className="py-3 px-2 rounded-xl hover:bg-slate-800/40 cursor-pointer transition-colors flex items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="text-xs font-mono text-slate-400 w-11 shrink-0">
                    {evt.timestamp}
                  </div>
                  <div className="w-2 h-2 rounded-full bg-cyan-400 group-hover:scale-125 transition-transform shrink-0"></div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-200 group-hover:text-white truncate">
                      {evt.title}
                    </p>
                    <p className="text-xs text-slate-400 truncate flex items-center gap-2 mt-0.5">
                      <span className="capitalize text-slate-300 font-medium">
                        {evt.module === 'core'
                          ? 'Core Vision'
                          : evt.module === 'elderguard'
                          ? 'ElderGuard'
                          : evt.module === 'bunkwatch'
                          ? 'BunkWatch'
                          : 'CampusPulse'}
                      </span>
                      <span>•</span>
                      <span className="font-mono text-slate-500">{evt.location}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${getSeverityBadge(
                      evt.severity
                    )}`}
                  >
                    {evt.severity}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Distribution Radial/Donut (1 col) */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white tracking-tight">Risk Distribution</h3>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
                Decision Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Categorization of all processed events by danger threshold.
            </p>
          </div>

          <div className="py-2 flex justify-center">
            <DonutChart
              segments={riskSegments}
              centerLabel={String(stats.eventsDetected)}
              centerSub="Total Events"
              size={170}
            />
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between font-mono">
            <span>High + Critical:</span>
            <span className="text-rose-400 font-bold">10% (Action Required)</span>
          </div>
        </div>
      </div>

      {/* Bottom Row: Events Trend Line Chart */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Events Trend</h3>
            <p className="text-xs text-slate-400">Activity volume over the past 24-hour monitoring cycle</p>
          </div>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
            Last 24 Hours
          </span>
        </div>
        <TrendChart points={[14, 22, 38, 56, 42, 68, 47]} strokeColor="#06b6d4" />
      </div>

      {/* Detailed Event Inspection Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-cyan-500/30 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4 max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${getSeverityBadge(
                  selectedEvent.severity
                )}`}
              >
                {selectedEvent.severity}
              </span>
              <span className="text-xs font-mono text-slate-400 uppercase">
                {selectedEvent.module}
              </span>
            </div>

            <h3 className="text-lg font-bold text-white">{selectedEvent.title}</h3>

            <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
              {selectedEvent.description}
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">TIME RECORDED</span>
                <span className="text-slate-200 font-semibold">{selectedEvent.timestamp}</span>
              </div>
              <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">LOCATION</span>
                <span className="text-slate-200 font-semibold">{selectedEvent.location}</span>
              </div>
              <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">MODEL CONFIDENCE</span>
                <span className="text-cyan-400 font-semibold">{selectedEvent.confidence}%</span>
              </div>
              <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">TRIAGE STATUS</span>
                <span className="text-emerald-400 font-semibold uppercase">{selectedEvent.status}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-medium"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedEvent(null);
                  onNavigate('alerts');
                }}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-600/30"
              >
                Go to Alerts Center
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
