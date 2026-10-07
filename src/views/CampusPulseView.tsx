import React, { useState, useEffect } from 'react';
import {
  Building2,
  ShieldAlert,
  AlertTriangle,
  Droplet,
  Trash2,
  Users,
  MapPin,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  X,
  Filter,
  Sparkles,
} from 'lucide-react';
import { CampusHealthScores, CampusIssue } from '../types/vision';
import { HealthScoreGauge } from '../components/HealthScoreGauge';
import { api } from '../services/api';

interface Props {
  onRefreshGlobalStats: () => void;
}

export const CampusPulseView: React.FC<Props> = ({ onRefreshGlobalStats }) => {
  const [healthScores, setHealthScores] = useState<CampusHealthScores>({
    overall: 82,
    safety: 88,
    cleanliness: 76,
    infrastructure: 81,
    crowding: 84,
  });

  const [issues, setIssues] = useState<CampusIssue[]>([
    {
      id: 'iss-01',
      title: 'Emergency Exit Blocked',
      type: 'Safety',
      location: 'Block A — 2nd Floor Exit',
      detectedTime: '20:32',
      evidenceUrl: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=600&q=80',
      confidence: 94,
      severity: 'critical',
      priorityScore: 96,
      status: 'new',
      impactMetrics: { safetyImpact: 'Critical', peopleAffected: 'High', persistence: '8 min' },
    },
    {
      id: 'iss-02',
      title: 'Water Leakage Puddle',
      type: 'Infrastructure',
      location: 'Science Block Corridor',
      detectedTime: '19:47',
      evidenceUrl: 'https://images.unsplash.com/photo-1584467735815-f778f274e296?auto=format&fit=crop&w=600&q=80',
      confidence: 91,
      severity: 'high',
      priorityScore: 81,
      status: 'in_progress',
      assignedTo: 'Facilities Crew',
      impactMetrics: { safetyImpact: 'High', peopleAffected: 'Medium', persistence: '22 min' },
    },
    {
      id: 'iss-03',
      title: 'Overflowing Bin Station',
      type: 'Cleanliness',
      location: 'Central Cafeteria Courtyard',
      detectedTime: '18:21',
      evidenceUrl: 'https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?auto=format&fit=crop&w=600&q=80',
      confidence: 89,
      severity: 'medium',
      priorityScore: 61,
      status: 'acknowledged',
      assignedTo: 'Sanitation Team',
      impactMetrics: { safetyImpact: 'Low', peopleAffected: 'High', persistence: '45 min' },
    },
    {
      id: 'iss-04',
      title: 'Crowd Congestion Surge',
      type: 'Crowding',
      location: 'Auditorium Exit Gate 3',
      detectedTime: '17:05',
      evidenceUrl: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=600&q=80',
      confidence: 88,
      severity: 'medium',
      priorityScore: 68,
      status: 'resolved',
      assignedTo: 'Campus Security',
      impactMetrics: { safetyImpact: 'Medium', peopleAffected: 'High', persistence: '14 min' },
    },
  ]);

  const [selectedIssue, setSelectedIssue] = useState<CampusIssue | null>(issues[0]);
  const [filterType, setFilterType] = useState<string>('all');

  const handleUpdateStatus = async (issueId: string, newStatus: string) => {
    try {
      const res = await api.updateCampusIssueStatus(issueId, newStatus);
      if (res.success) {
        setIssues((prev) => prev.map((i) => (i.id === issueId ? res.issue : i)));
        setHealthScores(res.healthScores);
        if (selectedIssue?.id === issueId) {
          setSelectedIssue(res.issue);
        }
        onRefreshGlobalStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredIssues =
    filterType === 'all' ? issues : issues.filter((i) => i.type.toLowerCase() === filterType.toLowerCase());

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'critical':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'high':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'medium':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Section: Health Score + Breakdown + Priority Issues */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-12 gap-5">
        {/* Health Score Gauge (3 cols) */}
        <div className="lg:col-span-3 glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
            Campus Health Score
          </span>
          <HealthScoreGauge score={healthScores.overall} size={150} />
          <p className="text-[11px] text-slate-400 mt-3 font-mono">
            Dynamically evaluated from active safety, cleanliness & infrastructure defects
          </p>
        </div>

        {/* Category Breakdown Progress Bars (5 cols) */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Category Breakdown</h3>
            <p className="text-xs text-slate-400">Institutional safety & facility compliance ratios</p>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {/* Safety */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Safety</span>
                </span>
                <span className="text-cyan-400 font-bold">{healthScores.safety}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 rounded-full transition-all duration-700"
                  style={{ width: `${healthScores.safety}%` }}
                ></div>
              </div>
            </div>

            {/* Cleanliness */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cleanliness</span>
                </span>
                <span className="text-emerald-400 font-bold">{healthScores.cleanliness}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all duration-700"
                  style={{ width: `${healthScores.cleanliness}%` }}
                ></div>
              </div>
            </div>

            {/* Infrastructure */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Droplet className="w-3.5 h-3.5 text-amber-400" />
                  <span>Infrastructure</span>
                </span>
                <span className="text-amber-400 font-bold">{healthScores.infrastructure}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-700"
                  style={{ width: `${healthScores.infrastructure}%` }}
                ></div>
              </div>
            </div>

            {/* Crowding */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  <span>Crowding</span>
                </span>
                <span className="text-purple-400 font-bold">{healthScores.crowding}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-400 rounded-full transition-all duration-700"
                  style={{ width: `${healthScores.crowding}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Priority Issues (4 cols) */}
        <div className="lg:col-span-4 glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">Top Priority Issues</h3>
              <span className="text-[10px] font-mono text-cyan-400">Ranked by Risk</span>
            </div>

            <div className="space-y-2.5">
              {issues.slice(0, 3).map((iss) => (
                <div
                  key={iss.id}
                  onClick={() => setSelectedIssue(iss)}
                  className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-cyan-500/40 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-200 group-hover:text-white truncate block">
                      {iss.title}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 truncate block mt-0.5">
                      {iss.location}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-black text-rose-400 block">
                      {iss.priorityScore}/100
                    </span>
                    <span
                      className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.2 rounded border ${getSeverityBadge(
                        iss.severity
                      )}`}
                    >
                      {iss.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-500 text-center">
            Priority Engine = Severity + Impact + Persistence
          </div>
        </div>
      </div>

      {/* Main Section: Interactive Campus Sector Map (8 cols) + Evidence & Status Panel (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Campus Map / Floorplan View */}
        <div className="lg:col-span-8 glass-panel rounded-2xl overflow-hidden border border-slate-800 flex flex-col">
          <div className="p-3.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold text-white">CAMPUS SPATIAL TOPOLOGY</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span> Critical
              </span>
              <span className="flex items-center gap-1 text-orange-400">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span> High
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Medium
              </span>
            </div>
          </div>

          {/* Interactive stylized campus layout canvas */}
          <div className="relative h-[380px] sm:h-[440px] w-full bg-slate-950 overflow-hidden cyber-grid">
            <img
              src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80"
              alt="Campus Aerial Map"
              className="w-full h-full object-cover opacity-40 filter contrast-125 saturate-50"
            />

            {/* Simulated architectural zones */}
            <div className="absolute top-[15%] left-[20%] w-[25%] h-[30%] border border-cyan-500/30 bg-cyan-950/20 rounded-xl flex items-center justify-center p-2 text-[10px] font-mono text-cyan-400/80 pointer-events-none">
              BLOCK A (ADMIN & LABS)
            </div>
            <div className="absolute top-[50%] left-[15%] w-[35%] h-[35%] border border-purple-500/30 bg-purple-950/20 rounded-xl flex items-center justify-center p-2 text-[10px] font-mono text-purple-400/80 pointer-events-none">
              SCIENCE BLOCK & RESEARCH
            </div>
            <div className="absolute top-[25%] right-[15%] w-[30%] h-[40%] border border-emerald-500/30 bg-emerald-950/20 rounded-xl flex items-center justify-center p-2 text-[10px] font-mono text-emerald-400/80 pointer-events-none">
              CAFETERIA & AUDITORIUM
            </div>

            {/* Clickable Pins for active issues */}
            {/* Pin 1: Block A Emergency Exit (Critical) */}
            <div
              onClick={() => setSelectedIssue(issues[0])}
              className="absolute top-[28%] left-[32%] cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group z-20"
            >
              <div className="relative flex items-center justify-center">
                <span className="w-8 h-8 rounded-full bg-rose-500/30 animate-ping absolute"></span>
                <div className="w-6 h-6 rounded-full bg-rose-600 border-2 border-white flex items-center justify-center text-white shadow-xl shadow-rose-600/50 group-hover:scale-125 transition-transform">
                  <ShieldAlert className="w-3 h-3" />
                </div>
              </div>

              {/* Pin Callout Card */}
              <div className="absolute left-8 top-1/2 -translate-y-1/2 w-48 bg-slate-900/95 border border-rose-500/60 p-2.5 rounded-xl shadow-2xl backdrop-blur-md hidden group-hover:block z-30 pointer-events-none">
                <span className="text-[9px] font-mono text-rose-400 font-bold uppercase block">
                  CRITICAL • 96/100
                </span>
                <span className="text-xs font-bold text-white block mt-0.5">
                  Emergency Exit Blocked
                </span>
                <span className="text-[10px] font-mono text-slate-400 block">
                  Block A — 2nd Floor
                </span>
              </div>
            </div>

            {/* Pin 2: Science Block Water Leakage (High) */}
            <div
              onClick={() => setSelectedIssue(issues[1])}
              className="absolute top-[65%] left-[28%] cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group z-20"
            >
              <div className="relative flex items-center justify-center">
                <span className="w-7 h-7 rounded-full bg-orange-500/30 animate-ping absolute"></span>
                <div className="w-5 h-5 rounded-full bg-orange-600 border-2 border-white flex items-center justify-center text-white shadow-xl shadow-orange-600/50 group-hover:scale-125 transition-transform">
                  <Droplet className="w-2.5 h-2.5" />
                </div>
              </div>
            </div>

            {/* Pin 3: Cafeteria Overflowing Bin (Medium) */}
            <div
              onClick={() => setSelectedIssue(issues[2])}
              className="absolute top-[42%] right-[26%] cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group z-20"
            >
              <div className="relative flex items-center justify-center">
                <div className="w-5 h-5 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center text-slate-950 shadow-xl group-hover:scale-125 transition-transform">
                  <Trash2 className="w-2.5 h-2.5" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Issue Detail & Evidence Frame Panel (4 cols) */}
        <div className="lg:col-span-4 glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase">
                Issue Inspection & Evidence
              </span>
              {selectedIssue && (
                <span
                  className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${getSeverityBadge(
                    selectedIssue.severity
                  )}`}
                >
                  {selectedIssue.severity}
                </span>
              )}
            </div>

            {selectedIssue ? (
              <div className="space-y-4">
                {/* Evidence Image */}
                <div className="relative rounded-xl overflow-hidden border border-slate-700 aspect-video bg-black">
                  <img
                    src={selectedIssue.evidenceUrl}
                    alt={selectedIssue.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/80 px-2 py-0.5 rounded text-[9px] font-mono text-cyan-300">
                    CONFIDENCE: {selectedIssue.confidence}%
                  </div>
                </div>

                {/* Details */}
                <div>
                  <h4 className="text-base font-bold text-white">{selectedIssue.title}</h4>
                  <p className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-cyan-400" />
                    <span>{selectedIssue.location}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-slate-500 block text-[9px]">PRIORITY SCORE</span>
                    <span className="text-rose-400 font-bold">{selectedIssue.priorityScore} / 100</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">DETECTED AT</span>
                    <span className="text-slate-200">{selectedIssue.detectedTime}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">PEOPLE AFFECTED</span>
                    <span className="text-slate-200">{selectedIssue.impactMetrics.peopleAffected}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">PERSISTENCE</span>
                    <span className="text-slate-200">{selectedIssue.impactMetrics.persistence}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-500">
                Select an issue on the map or list to inspect evidence
              </div>
            )}
          </div>

          {/* Workflow Status Progression Buttons */}
          {selectedIssue && (
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                CURRENT STATUS: <span className="text-cyan-400 uppercase">{selectedIssue.status}</span>
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleUpdateStatus(selectedIssue.id, 'in_progress')}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                >
                  In Progress
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedIssue.id, 'resolved')}
                  className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold transition-all shadow-md shadow-emerald-600/30"
                >
                  Mark Resolved
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
