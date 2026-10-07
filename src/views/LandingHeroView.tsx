import React from 'react';
import {
  Eye,
  HeartHandshake,
  GraduationCap,
  Building2,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Layers,
  Activity,
  AlertTriangle,
  Sparkles,
  Siren,
} from 'lucide-react';

interface Props {
  onNavigate: (tab: string) => void;
  onOpenDemo: () => void;
}

export const LandingHeroView: React.FC<Props> = ({ onNavigate, onOpenDemo }) => {
  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Hero Banner Container */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c1326] via-[#0f172a] to-[#15102a] border border-cyan-500/20 p-8 sm:p-12 shadow-2xl cyber-grid">
        {/* Glow ambient spots */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-medium">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            NEXT-GEN COMPUTER VISION INTELLIGENCE
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
              VisionGuard
            </h1>
            <p className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-cyan-300 via-sky-200 to-indigo-300 bg-clip-text text-transparent">
              From Seeing Objects to Understanding Situations.
            </p>
          </div>

          <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed max-w-2xl">
            A real-time computer-vision intelligence platform that detects, tracks, understands and prioritizes real-world events across institutional campuses and safety environments.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => onNavigate('overview')}
              className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Explore Vision AI</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenDemo}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white font-semibold text-sm border border-slate-700 hover:border-slate-600 transition-all shadow-md group"
            >
              <Sparkles className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
              <span>Try Live Demo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Core Progression Pipeline Callout */}
      <div className="bg-[#0f172a]/70 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
        <div className="text-xs font-mono uppercase text-cyan-400 font-bold tracking-wider mb-4 flex items-center gap-2">
          <Cpu className="w-4 h-4" />
          <span>The VisionGuard Architectural Differentiator</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-center">
          {[
            { step: '01', title: 'RAW VIDEO', sub: 'Frames Ingest' },
            { step: '02', title: 'VISION', sub: 'Extraction' },
            { step: '03', title: 'DETECTION', sub: 'Bounding Boxes' },
            { step: '04', title: 'TRACKING', sub: 'Persistent IDs' },
            { step: '05', title: 'CONTEXT', sub: 'Spatial Logic' },
            { step: '06', title: 'EVENT', sub: 'Situation Formed' },
            { step: '07', title: 'RISK', sub: 'Priority Score' },
            { step: '08', title: 'ACTION', sub: 'Triaged Alert' },
          ].map((item, i) => (
            <div
              key={i}
              className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 transition-colors group"
            >
              <div className="text-[10px] font-mono text-slate-500 group-hover:text-cyan-400">
                {item.step}
              </div>
              <div className="text-xs font-bold text-white tracking-wide mt-0.5">
                {item.title}
              </div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5">{item.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 5 Core Intelligence Module Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
        {/* Core Vision */}
        <div
          onClick={() => onNavigate('vision-dashboard')}
          className="group relative cursor-pointer rounded-2xl bg-gradient-to-b from-slate-900/90 to-[#0c1326] border border-cyan-500/20 hover:border-cyan-400/60 p-6 transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-cyan-500/10 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                Core Vision
              </h3>
              <p className="text-xs font-mono text-cyan-400/80 mt-0.5">Detect • Track • Classify</p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Object detection, people counting with virtual tripwires, trajectory tracking, waste sorting, and surface defect inspection.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between text-xs text-cyan-400 font-semibold">
            <span>Explore Engine</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* ElderGuard */}
        <div
          onClick={() => onNavigate('elderguard')}
          className="group relative cursor-pointer rounded-2xl bg-gradient-to-b from-slate-900/90 to-[#0c1326] border border-emerald-500/20 hover:border-emerald-400/60 p-6 transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-emerald-500/10 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                ElderGuard
              </h3>
              <p className="text-xs font-mono text-emerald-400/80 mt-0.5">Detect • Assess • Alert</p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Fall detection through multi-frame velocity, body posture orientation, stationary floor thresholds, and 3-tier emergency escalation.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between text-xs text-emerald-400 font-semibold">
            <span>Open ElderGuard</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* BunkWatch */}
        <div
          onClick={() => onNavigate('bunkwatch')}
          className="group relative cursor-pointer rounded-2xl bg-gradient-to-b from-slate-900/90 to-[#0c1326] border border-rose-500/20 hover:border-rose-400/60 p-6 transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-rose-500/10 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white group-hover:text-rose-300 transition-colors">
                BunkWatch
              </h3>
              <p className="text-xs font-mono text-rose-400/80 mt-0.5">Verify • Identify • Notify</p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Authorized session-based attendance validation matching corridor frames against enrolled profiles with instant CA alerts.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between text-xs text-rose-400 font-semibold">
            <span>Start Session</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* CampusPulse */}
        <div
          onClick={() => onNavigate('campuspulse')}
          className="group relative cursor-pointer rounded-2xl bg-gradient-to-b from-slate-900/90 to-[#0c1326] border border-purple-500/20 hover:border-purple-400/60 p-6 transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-purple-500/10 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
                CampusPulse
              </h3>
              <p className="text-xs font-mono text-purple-400/80 mt-0.5">Detect • Prioritize • Resolve</p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              AI campus health inspection scanning fire escape blockages, structural fractures, water leaks, and congestion with priority scoring.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between text-xs text-purple-400 font-semibold">
            <span>Inspect Campus</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* AmbulanceClear */}
        <div
          onClick={() => onNavigate('ambulanceclear')}
          className="group relative cursor-pointer rounded-2xl bg-gradient-to-b from-slate-900/90 to-[#190c18] border border-rose-500/30 hover:border-rose-400/70 p-6 transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-rose-500/10 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
              <Siren className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white group-hover:text-rose-300 transition-colors">
                  AmbulanceClear
                </h3>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  NEW
                </span>
              </div>
              <p className="text-xs font-mono text-rose-400/80 mt-0.5">Emergency-Route Intelligence</p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Detect ambulances, analyze whether traffic is actually yielding, evaluate blockage corridors, and compute clearance scores.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between text-xs text-rose-400 font-semibold">
            <span>Analyze Route</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};
