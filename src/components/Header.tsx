import React from 'react';
import { Search, Bell, Sparkles, ChevronDown } from 'lucide-react';
import { UserRole } from '../types/vision';

interface Props {
  activeTab: string;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  activeAlertCount: number;
  onOpenAlerts: () => void;
  onOpenDemo: () => void;
}

export const Header: React.FC<Props> = ({
  activeTab,
  userRole,
  setUserRole,
  activeAlertCount,
  onOpenAlerts,
  onOpenDemo,
}) => {
  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'overview':
        return { title: 'Overview Dashboard', desc: 'A unified view of all modules and real-time activity' };
      case 'vision-dashboard':
        return { title: 'Vision Dashboard', desc: 'Explore core computer vision capabilities' };
      case 'live-analysis':
        return { title: 'Live Analysis', desc: 'Real-time multi-camera detection, tracking & spatial zones' };
      case 'upload-analyze':
        return { title: 'Upload & Analyze', desc: 'High-throughput computer vision pipeline for images & videos' };
      case 'elderguard':
        return { title: 'ElderGuard', desc: 'AI-powered elder safety monitoring & fall alert escalation' };
      case 'bunkwatch':
        return { title: 'BunkWatch', desc: 'Authorized session-based campus attendance & bunk verification' };
      case 'campuspulse':
        return { title: 'CampusPulse', desc: 'AI campus safety & infrastructure inspection system' };
      case 'ambulanceclear':
        return { title: 'AmbulanceClear', desc: 'Emergency-route intelligence — Real-time path clearance & blockage analysis' };
      case 'analytics':
        return { title: 'Analytics Engine', desc: 'Comprehensive telemetry, detection trends & risk distribution' };
      case 'alerts':
        return { title: 'Alert Center', desc: 'Prioritized event feed with triage & assignment workflows' };
      case 'settings':
        return { title: 'Platform Settings', desc: 'Camera topologies, confidence thresholds & role privileges' };
      default:
        return { title: 'VisionGuard', desc: 'Real-Time CV Intelligence Platform' };
    }
  };

  const { title, desc } = getTabTitle(activeTab);

  return (
    <header className="h-16 border-b border-slate-800/80 bg-[#0a0f1d]/90 backdrop-blur-md px-6 flex items-center justify-between z-20 shrink-0">
      {/* Title & Description */}
      <div>
        <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          {title}
        </h2>
        <p className="text-xs text-slate-400 hidden sm:block">{desc}</p>
      </div>

      {/* Middle Search Input */}
      <div className="hidden lg:flex items-center relative w-72">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
        <input
          type="text"
          placeholder="Search cameras, events, students..."
          className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-all font-mono"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Engine status indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-[11px] font-mono text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>CV ENGINE ONLINE</span>
        </div>

        {/* Demo Button */}
        <button
          onClick={onOpenDemo}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold transition-all shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span className="hidden sm:inline">Demo Scenarios</span>
        </button>

        {/* Alerts Bell */}
        <button
          onClick={onOpenAlerts}
          className="relative p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          title="Active Alerts"
        >
          <Bell className="w-4 h-4" />
          {activeAlertCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white font-mono text-[9px] font-bold flex items-center justify-center animate-bounce">
              {activeAlertCount}
            </span>
          )}
        </button>

        {/* Role Switcher */}
        <div className="relative group">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300">
            <span className="text-slate-400 text-[10px] font-mono uppercase">Role:</span>
            <span className="font-semibold text-white capitalize">{userRole}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <div className="absolute right-0 mt-1 w-40 bg-slate-900 border border-slate-800 rounded-xl shadow-xl py-1 hidden group-hover:block z-50">
            <button
              onClick={() => setUserRole('admin')}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-800 flex items-center justify-between ${userRole === 'admin' ? 'text-cyan-400 font-semibold' : 'text-slate-300'}`}
            >
              <span>Administrator</span>
              {userRole === 'admin' && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>}
            </button>
            <button
              onClick={() => setUserRole('ca')}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-800 flex items-center justify-between ${userRole === 'ca' ? 'text-cyan-400 font-semibold' : 'text-slate-300'}`}
            >
              <span>Dr. Priya (CA)</span>
              {userRole === 'ca' && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>}
            </button>
            <button
              onClick={() => setUserRole('operator')}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-800 flex items-center justify-between ${userRole === 'operator' ? 'text-cyan-400 font-semibold' : 'text-slate-300'}`}
            >
              <span>CV Operator</span>
              {userRole === 'operator' && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
