import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Sliders,
  Camera,
  Bell,
  Cpu,
  CheckCircle2,
  Save,
  Users,
} from 'lucide-react';
import { UserRole } from '../types/vision';

interface Props {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
}

export const SettingsView: React.FC<Props> = ({ userRole, setUserRole }) => {
  const [detThreshold, setDetThreshold] = useState(85);
  const [faceThreshold, setFaceThreshold] = useState(90);
  const [fallSensitivity, setFallSensitivity] = useState(85);
  const [inactivityThreshold, setInactivityThreshold] = useState(30);
  const [savedToast, setSavedToast] = useState(false);

  const handleSave = () => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          Platform Settings & Privileges
        </h2>
        <p className="text-xs text-slate-400">
          Configure computer vision thresholds, role privileges, and edge camera topologies
        </p>
      </div>

      {/* Role-Based Access Control Card */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Active Operational Role</h3>
            <p className="text-xs text-slate-400">Switch role context to evaluate permissions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            onClick={() => setUserRole('admin')}
            className={`p-4 rounded-xl border text-left transition-all ${
              userRole === 'admin'
                ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-lg shadow-cyan-500/10'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span className="text-sm font-bold block">Administrator</span>
            <span className="text-[11px] opacity-80 block mt-1">
              Full access to all modules, analytics, and alert triage.
            </span>
          </button>

          <button
            onClick={() => setUserRole('ca')}
            className={`p-4 rounded-xl border text-left transition-all ${
              userRole === 'ca'
                ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-lg shadow-cyan-500/10'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span className="text-sm font-bold block">Dr. Priya (CA)</span>
            <span className="text-[11px] opacity-80 block mt-1">
              Authorized to start BunkWatch checks and receive bunk notifications.
            </span>
          </button>

          <button
            onClick={() => setUserRole('operator')}
            className={`p-4 rounded-xl border text-left transition-all ${
              userRole === 'operator'
                ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-lg shadow-cyan-500/10'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span className="text-sm font-bold block">CV Operator</span>
            <span className="text-[11px] opacity-80 block mt-1">
              Can upload media, run analyses, and monitor authorized camera streams.
            </span>
          </button>
        </div>
      </div>

      {/* Model & Detection Thresholds */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Detection & Confidence Thresholds</h3>
            <p className="text-xs text-slate-400">Configure cutoff sensitivities to reduce false positives</p>
          </div>
        </div>

        <div className="space-y-4 font-mono text-xs">
          {/* Object detection threshold */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-slate-300">Object Detection Confidence Cutoff</span>
              <span className="text-cyan-400 font-bold">{detThreshold}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="99"
              value={detThreshold}
              onChange={(e) => setDetThreshold(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>

          {/* Face match threshold */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-slate-300">BunkWatch Face Verification Cutoff</span>
              <span className="text-rose-400 font-bold">{faceThreshold}%</span>
            </div>
            <input
              type="range"
              min="70"
              max="99"
              value={faceThreshold}
              onChange={(e) => setFaceThreshold(Number(e.target.value))}
              className="w-full accent-rose-400"
            />
          </div>

          {/* Fall sensitivity */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-slate-300">ElderGuard Fall Velocity Sensitivity</span>
              <span className="text-emerald-400 font-bold">{fallSensitivity}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="99"
              value={fallSensitivity}
              onChange={(e) => setFallSensitivity(Number(e.target.value))}
              className="w-full accent-emerald-400"
            />
          </div>

          {/* Inactivity threshold */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-slate-300">Floor Inactivity Trigger Duration</span>
              <span className="text-amber-400 font-bold">{inactivityThreshold} seconds</span>
            </div>
            <input
              type="range"
              min="10"
              max="120"
              value={inactivityThreshold}
              onChange={(e) => setInactivityThreshold(Number(e.target.value))}
              className="w-full accent-amber-400"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-2">
        {savedToast ? (
          <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 animate-pulse">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings saved & deployed to edge nodes</span>
          </span>
        ) : (
          <span></span>
        )}

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/30 transition-all"
        >
          <Save className="w-4 h-4" />
          <span>Save Configuration</span>
        </button>
      </div>
    </div>
  );
};
