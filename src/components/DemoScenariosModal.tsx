import React from 'react';
import {
  Sparkles,
  X,
  Play,
  Scan,
  Users,
  Route,
  Trash2,
  HeartHandshake,
  GraduationCap,
  Building2,
  CheckCircle2,
  Siren,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectScenario: (scenarioId: string, moduleTarget: string) => void;
}

export const DemoScenariosModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectScenario,
}) => {
  if (!isOpen) return null;

  const scenarios = [
    {
      id: 'demo-1',
      number: '1',
      title: 'Object Detection',
      desc: 'Detect and classify objects in real-time multi-target street scene.',
      icon: Scan,
      module: 'vision-dashboard',
      thumbnail: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=400&q=80',
      badge: 'Core Vision',
    },
    {
      id: 'demo-2',
      number: '2',
      title: 'People Counting',
      desc: 'Count people across virtual entrance lines with direction vectors.',
      icon: Users,
      module: 'vision-dashboard',
      thumbnail: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=400&q=80',
      badge: 'Core Vision',
    },
    {
      id: 'demo-3',
      number: '3',
      title: 'Object Tracking',
      desc: 'Track objects across consecutive frames with temporary tracking IDs.',
      icon: Route,
      module: 'live-analysis',
      thumbnail: 'https://images.unsplash.com/photo-1494783367193-149034c05e8f?auto=format&fit=crop&w=400&q=80',
      badge: 'Core Vision',
    },
    {
      id: 'demo-4',
      number: '4',
      title: 'Waste Classification',
      desc: 'Sort plastics, organics, and paper with disposal container recommendation.',
      icon: Trash2,
      module: 'upload-analyze',
      thumbnail: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=400&q=80',
      badge: 'Classification',
    },
    {
      id: 'demo-5',
      number: '5',
      title: 'ElderGuard Fall Scenario',
      desc: 'Simulate rapid body posture drop, stationary floor alert, and Level 3 escalation.',
      icon: HeartHandshake,
      module: 'elderguard',
      thumbnail: 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?auto=format&fit=crop&w=400&q=80',
      badge: 'Safety Alert',
    },
    {
      id: 'demo-6',
      number: '6',
      title: 'BunkWatch Student Match',
      desc: 'Start authorized class period check, match Arun Kumar (96%), notify CA.',
      icon: GraduationCap,
      module: 'bunkwatch',
      thumbnail: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=400&q=80',
      badge: 'Attendance',
    },
    {
      id: 'demo-7',
      number: '7',
      title: 'CampusPulse Infrastructure',
      desc: 'Inspect emergency exit blockage, calculate 96/100 priority score, notify Warden.',
      icon: Building2,
      module: 'campuspulse',
      thumbnail: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=400&q=80',
      badge: 'Inspection',
    },
    {
      id: 'demo-8',
      number: '8',
      title: 'AmbulanceClear Intelligence',
      desc: 'Emergency-route intelligence: detect 3 blocking vehicles in path, compute clearance score.',
      icon: Siren,
      module: 'ambulanceclear',
      thumbnail: 'https://images.unsplash.com/photo-1587745416684-47953f16f02f?auto=format&fit=crop&w=400&q=80',
      badge: 'Emergency Route',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#0b101d] border border-indigo-500/40 rounded-3xl max-w-5xl w-full p-6 sm:p-8 shadow-2xl relative space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-white">Demo Mode</h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  DEMO ENVIRONMENT
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Interactive scenarios with authentic sample media for hackathon evaluation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scenarios Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map((sc) => {
            const Icon = sc.icon;
            return (
              <div
                key={sc.id}
                onClick={() => {
                  onSelectScenario(sc.id, sc.module);
                  onClose();
                }}
                className="group relative cursor-pointer rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/60 p-4 transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-indigo-500/10 flex flex-col justify-between overflow-hidden"
              >
                {/* Thumbnail Preview */}
                <div className="relative h-28 rounded-xl overflow-hidden bg-slate-950 mb-3">
                  <img
                    src={sc.thumbnail}
                    alt={sc.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-75 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                  <span className="absolute top-2 left-2 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/70 text-cyan-300 border border-white/10">
                    Scenario {sc.number}
                  </span>
                  <span className="absolute bottom-2 right-2 text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/40">
                    {sc.badge}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1.5">
                  <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{sc.title}</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                    {sc.desc}
                  </p>
                </div>

                {/* Action */}
                <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-cyan-400 group-hover:text-amber-300 transition-colors">
                  <span>Start Demo</span>
                  <Play className="w-3 h-3 fill-current group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footnote banner */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400 font-mono">
          Note: This environment runs actual computer vision pipelines and registers real events and alerts into the database.
        </div>
      </div>
    </div>
  );
};
