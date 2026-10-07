import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Play,
  Square,
  Camera,
  CheckCircle,
  AlertCircle,
  Bell,
  Search,
  Filter,
  Users,
  ShieldCheck,
  Send,
  Sparkles,
} from 'lucide-react';
import { BunkSession, BunkMatchEvent, StudentProfile } from '../types/vision';
import { BoundingBoxOverlay } from '../components/BoundingBoxOverlay';
import { api } from '../services/api';

interface Props {
  onRefreshGlobalStats: () => void;
}

export const BunkWatchView: React.FC<Props> = ({ onRefreshGlobalStats }) => {
  const [session, setSession] = useState<BunkSession>({
    id: 'bunk-sess-01',
    className: 'CSE - A',
    subject: 'Computer Networks',
    period: 3,
    caId: 'ca-priya',
    caName: 'Dr. Priya',
    camera: 'Block B Cam 04',
    startTime: new Date().toISOString(),
    status: 'active',
    durationSec: 512,
    identifiedCount: 18,
    matchCount: 15,
    unmatchedCount: 3,
  });

  const [matches, setMatches] = useState<BunkMatchEvent[]>([
    {
      id: 'bm-01',
      sessionId: 'bunk-sess-01',
      studentId: 'std-104',
      studentName: 'Arun Kumar',
      regNumber: '23CSE104',
      department: 'CSE',
      year: 'II',
      section: 'A',
      caName: 'Dr. Priya',
      timestamp: '11:42',
      location: 'Block B Corridor',
      confidence: 96,
      status: 'matched',
      capturedImage: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80',
      registeredPhoto: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80',
      notificationSent: true,
    },
    {
      id: 'bm-02',
      sessionId: 'bunk-sess-01',
      studentId: 'std-118',
      studentName: 'Priya Sundaram',
      regNumber: '23CSE118',
      department: 'CSE',
      year: 'II',
      section: 'A',
      caName: 'Dr. Priya',
      timestamp: '11:45',
      location: 'Canteen Garden',
      confidence: 94,
      status: 'matched',
      capturedImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      registeredPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      notificationSent: true,
    },
    {
      id: 'bm-03',
      sessionId: 'bunk-sess-01',
      studentId: 'std-126',
      studentName: 'Rahul Mohan',
      regNumber: '23CSE126',
      department: 'CSE',
      year: 'II',
      section: 'A',
      caName: 'Dr. Priya',
      timestamp: '11:48',
      location: 'Ground Floor Parking',
      confidence: 78,
      status: 'review_required',
      capturedImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      registeredPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      notificationSent: false,
    },
  ]);

  const [activeMatch, setActiveMatch] = useState<BunkMatchEvent | null>(matches[0]);
  const [seconds, setSeconds] = useState(512);
  const [isScanning, setIsScanning] = useState(false);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  useEffect(() => {
    if (session.status === 'active') {
      const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
      return () => clearInterval(timer);
    }
  }, [session.status]);

  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleToggleSession = async () => {
    if (session.status === 'active') {
      await api.stopBunkSession();
      setSession((prev) => ({ ...prev, status: 'completed' }));
    } else {
      const res = await api.startBunkSession({
        className: 'CSE - A',
        subject: 'Computer Networks',
        period: 3,
        caName: 'Dr. Priya',
        camera: 'Block B Cam 04',
      });
      setSession(res.session);
      setSeconds(0);
    }
  };

  const handleScanFrame = async () => {
    setIsScanning(true);
    try {
      const res = await api.scanBunkFrame();
      if (res.matchFound) {
        setMatches((prev) => [res.match, ...prev]);
        setActiveMatch(res.match);
        setSession(res.session);
        setNotificationToast(`Bunk notification sent to ${res.match.caName} for ${res.match.studentName}`);
        setTimeout(() => setNotificationToast(null), 4000);
        onRefreshGlobalStats();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSendNotification = () => {
    if (!activeMatch) return;
    setNotificationToast(`Authorized notification dispatched to ${activeMatch.caName} (${activeMatch.regNumber})`);
    setTimeout(() => setNotificationToast(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Active Session Status Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-rose-500/30 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-600 text-white">
                BunkWatch
              </span>
              <span className="text-xs font-semibold text-slate-200">
                Class: <strong className="text-white">{session.className}</strong>
              </span>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <span className="text-xs text-slate-300 hidden sm:inline">
                Subject: <strong className="text-white">{session.subject}</strong>
              </span>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <span className="text-xs text-slate-300 hidden sm:inline">
                CA: <strong className="text-cyan-300">{session.caName}</strong>
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
              Authorized session checking active camera outside designated classroom
            </div>
          </div>
        </div>

        {/* Timer & Controls */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-black/60 border border-slate-700/80 text-sm font-mono font-black text-rose-400">
            {formatTimer(seconds)}
          </div>

          <button
            onClick={handleToggleSession}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
              session.status === 'active'
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-emerald-600/30'
            }`}
          >
            {session.status === 'active' ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Session</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Bunk Check</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Row: Camera Feed (2 cols) + Student Match Card (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera Feed */}
        <div className="lg:col-span-2 glass-panel rounded-2xl overflow-hidden border border-slate-800 flex flex-col">
          <div className="p-3.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span className="text-xs font-mono font-bold text-white">BLOCK B CORRIDOR</span>
              <span className="text-[10px] font-mono text-slate-500">CAM 04</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleScanFrame}
                disabled={session.status !== 'active' || isScanning}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-600/30 hover:bg-cyan-600 border border-cyan-500/50 text-cyan-200 hover:text-slate-950 text-xs font-semibold font-mono transition-all disabled:opacity-50"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{isScanning ? 'ANALYZING...' : 'CAPTURE & MATCH'}</span>
              </button>
            </div>
          </div>

          <div className="relative h-[360px] sm:h-[400px] w-full bg-black overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80"
              alt="Corridor Feed"
              className="w-full h-full object-cover opacity-80"
            />

            {/* Bounding Box Overlays */}
            <BoundingBoxOverlay
              boxes={[
                {
                  id: 'face-1',
                  label: 'Arun Kumar (Match 96%)',
                  confidence: 96,
                  ymin: 240,
                  xmin: 410,
                  ymax: 780,
                  xmax: 580,
                  trackId: '23CSE104',
                  color: '#22c55e',
                },
                {
                  id: 'face-2',
                  label: 'Student #02 (Verifying)',
                  confidence: 82,
                  ymin: 310,
                  xmin: 180,
                  ymax: 810,
                  xmax: 340,
                  trackId: 'STD-18',
                  color: '#38bdf8',
                },
              ]}
            />
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 divide-x divide-slate-800 bg-slate-950/60 p-3 text-center text-xs font-mono">
            <div>
              <span className="text-slate-500 block text-[10px]">DETECTED STUDENTS</span>
              <span className="text-lg font-bold text-white">{session.identifiedCount}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">VALID MATCHES</span>
              <span className="text-lg font-bold text-emerald-400">{session.matchCount}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">UNMATCHED / REVIEW</span>
              <span className="text-lg font-bold text-amber-400">{session.unmatchedCount}</span>
            </div>
          </div>
        </div>

        {/* Student Match Card */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase">
                Student Verification
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Match Found
              </span>
            </div>

            {activeMatch ? (
              <div className="space-y-4">
                {/* Side-by-side Photo Comparison: Captured vs Enrolled */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center space-y-1">
                    <span className="text-[9px] font-mono text-slate-400 block uppercase">
                      Captured Frame
                    </span>
                    <div className="relative rounded-xl overflow-hidden border border-cyan-500/40 aspect-square">
                      <img
                        src={activeMatch.capturedImage}
                        alt="Captured"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded text-[8px] font-mono text-cyan-300">
                        Cam 04
                      </span>
                    </div>
                  </div>

                  <div className="text-center space-y-1">
                    <span className="text-[9px] font-mono text-slate-400 block uppercase">
                      Registered Profile
                    </span>
                    <div className="relative rounded-xl overflow-hidden border border-emerald-500/40 aspect-square">
                      <img
                        src={activeMatch.registeredPhoto}
                        alt="Registered"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 right-1 bg-emerald-950/80 px-1 py-0.5 rounded text-[8px] font-mono text-emerald-300">
                        ID Card
                      </span>
                    </div>
                  </div>
                </div>

                {/* Profile Details */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-extrabold text-white">{activeMatch.studentName}</h3>
                    <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                      {activeMatch.confidence}% Match
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-500 block text-[9px]">REG NUMBER</span>
                      <span className="text-slate-200 font-semibold">{activeMatch.regNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">DEPARTMENT</span>
                      <span className="text-slate-200 font-semibold">{activeMatch.department}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">YEAR / SECTION</span>
                      <span className="text-slate-200 font-semibold">
                        {activeMatch.year} - {activeMatch.section}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">ASSIGNED CA</span>
                      <span className="text-cyan-300 font-semibold">{activeMatch.caName}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs">
                No active student selected
              </div>
            )}
          </div>

          {/* Action button */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <button
              onClick={handleSendNotification}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send CA Notification</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Table: Recent Identifications */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Recent Identifications</h3>
            <p className="text-xs text-slate-400">
              Verified face detections matched against enrolled classroom rosters
            </p>
          </div>
          <span className="text-[11px] font-mono text-cyan-400">Total: {matches.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3">Time</th>
                <th className="p-3">Student Name</th>
                <th className="p-3">Reg Number</th>
                <th className="p-3">Location</th>
                <th className="p-3">Confidence</th>
                <th className="p-3">CA Officer</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {matches.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setActiveMatch(item)}
                  className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  <td className="p-3 text-slate-400">{item.timestamp}</td>
                  <td className="p-3 font-semibold text-white">{item.studentName}</td>
                  <td className="p-3 text-cyan-400">{item.regNumber}</td>
                  <td className="p-3">{item.location}</td>
                  <td className="p-3 font-bold text-emerald-400">{item.confidence}%</td>
                  <td className="p-3 text-slate-400">{item.caName}</td>
                  <td className="p-3">
                    <span
                      className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        item.status === 'matched'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      {item.status === 'matched' ? '● Match' : 'Review'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Notification Toast */}
      {notificationToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-rose-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-rose-400 animate-bounce">
          <Bell className="w-5 h-5 text-amber-200" />
          <span className="text-xs font-semibold">{notificationToast}</span>
        </div>
      )}
    </div>
  );
};
