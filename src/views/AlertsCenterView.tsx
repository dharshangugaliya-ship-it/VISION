import React, { useState, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Clock,
  MapPin,
  Filter,
  UserCheck,
  Check,
  Eye,
  X,
} from 'lucide-react';
import { AlertItem } from '../types/vision';
import { api } from '../services/api';

interface Props {
  onRefreshGlobalStats: () => void;
}

export const AlertsCenterView: React.FC<Props> = ({ onRefreshGlobalStats }) => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);

  const fetchAlertsList = async () => {
    try {
      setLoading(true);
      const data = await api.getAlerts({
        severity: severityFilter,
        module: moduleFilter,
        status: statusFilter,
      });
      setAlerts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertsList();
  }, [severityFilter, moduleFilter, statusFilter]);

  const handleAction = async (id: string, action: 'acknowledge' | 'resolve' | 'assign') => {
    try {
      await api.handleAlertAction(id, action);
      await fetchAlertsList();
      if (selectedAlert?.id === id) {
        setSelectedAlert((prev) => (prev ? { ...prev, status: action === 'resolve' ? 'resolved' : 'in_progress' } : null));
      }
      onRefreshGlobalStats();
    } catch (err) {
      console.error(err);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            Alert Center
          </h2>
          <p className="text-xs text-slate-400">
            Institutional alert triage, emergency escalations, and incident resolution
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-rose-400 bg-rose-950/40 border border-rose-800/40 px-3 py-1.5 rounded-xl">
          <AlertTriangle className="w-4 h-4" />
          <span>{alerts.filter((a) => a.status !== 'resolved').length} Active Unresolved Alerts</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center gap-4 text-xs font-mono">
        {/* Severity */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400">SEVERITY:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Module */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400">MODULE:</span>
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Modules</option>
            <option value="campuspulse">CampusPulse</option>
            <option value="elderguard">ElderGuard</option>
            <option value="bunkwatch">BunkWatch</option>
            <option value="core">Core Vision</option>
          </select>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400">STATUS:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Alerts List Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3.5">Severity</th>
                <th className="p-3.5">Alert Title</th>
                <th className="p-3.5">Module</th>
                <th className="p-3.5">Location</th>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Assigned To</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {alerts.map((alt) => (
                <tr
                  key={alt.id}
                  onClick={() => setSelectedAlert(alt)}
                  className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  <td className="p-3.5">
                    <span
                      className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${getSeverityBadge(
                        alt.severity
                      )}`}
                    >
                      {alt.severity}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold text-white">{alt.title}</td>
                  <td className="p-3.5 uppercase text-cyan-400">{alt.module}</td>
                  <td className="p-3.5 text-slate-400">{alt.location}</td>
                  <td className="p-3.5 text-slate-400">{alt.timestamp}</td>
                  <td className="p-3.5 text-slate-300 font-semibold">{alt.assignedUser || '—'}</td>
                  <td className="p-3.5">
                    <span
                      className={`text-[10px] uppercase font-bold ${
                        alt.status === 'resolved'
                          ? 'text-emerald-400'
                          : alt.status === 'in_progress'
                          ? 'text-amber-400'
                          : 'text-rose-400 animate-pulse'
                      }`}
                    >
                      {alt.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right space-x-1.5" onClick={(e) => e.stopPropagation()}>
                    {alt.status !== 'resolved' && (
                      <>
                        <button
                          onClick={() => handleAction(alt.id, 'assign')}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200"
                        >
                          Assign
                        </button>
                        <button
                          onClick={() => handleAction(alt.id, 'resolve')}
                          className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-[10px] text-slate-950 font-bold"
                        >
                          Resolve
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Alert Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setSelectedAlert(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${getSeverityBadge(
                  selectedAlert.severity
                )}`}
              >
                {selectedAlert.severity}
              </span>
              <span className="text-xs font-mono text-slate-400 uppercase">
                {selectedAlert.module}
              </span>
            </div>

            <h3 className="text-lg font-bold text-white">{selectedAlert.title}</h3>

            <div className="grid grid-cols-2 gap-2.5 text-xs font-mono bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500 block text-[10px]">EVENT TYPE</span>
                <span className="text-white font-semibold">{selectedAlert.eventType}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">LOCATION</span>
                <span className="text-white font-semibold">{selectedAlert.location}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">TIME RECORDED</span>
                <span className="text-white">{selectedAlert.timestamp}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">CURRENT ASSIGNEE</span>
                <span className="text-cyan-300 font-semibold">{selectedAlert.assignedUser || 'Unassigned'}</span>
              </div>
            </div>

            {/* Workflow actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">
                STATUS: <strong className="text-white uppercase">{selectedAlert.status}</strong>
              </span>

              <div className="flex items-center gap-2">
                {selectedAlert.status !== 'resolved' && (
                  <>
                    <button
                      onClick={() => handleAction(selectedAlert.id, 'acknowledge')}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
                    >
                      Acknowledge
                    </button>
                    <button
                      onClick={() => handleAction(selectedAlert.id, 'resolve')}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs"
                    >
                      Resolve Alert
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
