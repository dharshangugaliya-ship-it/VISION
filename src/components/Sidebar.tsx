import React from 'react';
import {
  LayoutDashboard,
  Eye,
  Video,
  UploadCloud,
  HeartHandshake,
  GraduationCap,
  Building2,
  BarChart3,
  Bell,
  Settings,
  Sparkles,
  ShieldCheck,
  Siren,
} from 'lucide-react';
import { UserRole } from '../types/vision';

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeAlertCount: number;
  userRole: UserRole;
  onOpenDemo: () => void;
}

export const Sidebar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  activeAlertCount,
  userRole,
  onOpenDemo,
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'vision-dashboard', label: 'Vision Dashboard', icon: Eye },
    { id: 'live-analysis', label: 'Live Analysis', icon: Video, badge: 'LIVE' },
    { id: 'upload-analyze', label: 'Upload & Analyze', icon: UploadCloud },
    { id: 'elderguard', label: 'ElderGuard', icon: HeartHandshake, color: 'text-emerald-400' },
    { id: 'bunkwatch', label: 'BunkWatch', icon: GraduationCap, color: 'text-rose-400' },
    { id: 'campuspulse', label: 'CampusPulse', icon: Building2, color: 'text-purple-400' },
    { id: 'ambulanceclear', label: 'AmbulanceClear', icon: Siren, color: 'text-rose-400', badge: 'NEW' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'alerts', label: 'Alerts', icon: Bell, alertCount: activeAlertCount },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0a0f1d] border-r border-slate-800/80 flex flex-col h-screen shrink-0 select-none">
      {/* Brand Logo Header */}
      <div className="p-5 border-b border-slate-800/60 flex items-center gap-3">
        <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <ShieldCheck className="w-6 h-6 text-white" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-[#0a0f1d] rounded-full animate-ping"></span>
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-[#0a0f1d] rounded-full"></span>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent">
              VisionGuard
            </h1>
          </div>
          <p className="text-[10px] font-mono tracking-wider text-cyan-400/80 uppercase">
            CV Intelligence Engine
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/10 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-cyan-400' : item.color || 'text-slate-400'
                  }`}
                />
                <span className={isActive ? 'text-white font-semibold' : ''}>{item.label}</span>
              </div>

              {/* Badges */}
              {item.badge && (
                <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                  {item.badge}
                </span>
              )}
              {item.alertCount !== undefined && item.alertCount > 0 && (
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-sm shadow-rose-600/40">
                  {item.alertCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Demo Mode Action Banner */}
      <div className="px-3 pb-3">
        <button
          onClick={onOpenDemo}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-indigo-900/40 via-purple-900/40 to-blue-900/40 border border-indigo-500/30 hover:border-indigo-400/60 text-slate-200 text-xs font-semibold shadow-lg hover:shadow-indigo-500/20 transition-all group"
        >
          <Sparkles className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
          <span>Interactive Demo Scenarios</span>
        </button>
      </div>

      {/* User / Role Footer */}
      <div className="p-3 border-t border-slate-800/60 bg-[#070b16]">
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow">
              {userRole === 'admin' ? 'AD' : userRole === 'ca' ? 'CA' : 'OP'}
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold text-slate-200 truncate">
                {userRole === 'admin' ? 'Administrator' : userRole === 'ca' ? 'Dr. Priya (CA)' : 'CV Operator'}
              </div>
              <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Connected
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
            {userRole}
          </span>
        </div>
      </div>
    </aside>
  );
};
