/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LandingHeroView } from './views/LandingHeroView';
import { OverviewDashboard } from './views/OverviewDashboard';
import { VisionDashboard } from './views/VisionDashboard';
import { LiveAnalysisView } from './views/LiveAnalysisView';
import { UploadAnalyzeView } from './views/UploadAnalyzeView';
import { ElderGuardView } from './views/ElderGuardView';
import { BunkWatchView } from './views/BunkWatchView';
import { CampusPulseView } from './views/CampusPulseView';
import { AnalyticsView } from './views/AnalyticsView';
import { AlertsCenterView } from './views/AlertsCenterView';
import { SettingsView } from './views/SettingsView';
import { DemoScenariosModal } from './components/DemoScenariosModal';
import { CoreStats, VisionEvent, UserRole } from './types/vision';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('landing');
  const [userRole, setUserRole] = useState<UserRole>('admin');
  const [isDemoOpen, setIsDemoOpen] = useState(false);

  const [stats, setStats] = useState<CoreStats>({
    objectsDetected: 1284,
    peopleTracked: 426,
    eventsDetected: 47,
    activeAlerts: 8,
    highRiskEvents: 3,
    analysesCompleted: 126,
  });

  const [events, setEvents] = useState<VisionEvent[]>([]);

  const refreshGlobalData = async () => {
    try {
      const [newStats, newEvents] = await Promise.all([
        api.getStats(),
        api.getEvents(),
      ]);
      setStats(newStats);
      setEvents(newEvents);
    } catch (err) {
      console.warn('Could not sync stats with API, using cached state:', err);
    }
  };

  useEffect(() => {
    refreshGlobalData();
    // Poll stats periodically for live real-time dashboard feeling
    const interval = setInterval(refreshGlobalData, 12000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectScenario = (scenarioId: string, moduleTarget: string) => {
    setActiveTab(moduleTarget);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#070b15] text-slate-100 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Persistent Left AI Command Center Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeAlertCount={stats.activeAlerts}
        userRole={userRole}
        onOpenDemo={() => setIsDemoOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-gradient-to-b from-[#0b101f] via-[#080d1a] to-[#050811]">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          userRole={userRole}
          setUserRole={setUserRole}
          activeAlertCount={stats.activeAlerts}
          onOpenAlerts={() => setActiveTab('alerts')}
          onOpenDemo={() => setIsDemoOpen(true)}
        />

        {/* Viewport View Switcher */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
          {activeTab === 'landing' && (
            <LandingHeroView
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenDemo={() => setIsDemoOpen(true)}
            />
          )}

          {activeTab === 'overview' && (
            <OverviewDashboard
              stats={stats}
              events={events}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'vision-dashboard' && <VisionDashboard />}

          {activeTab === 'live-analysis' && <LiveAnalysisView />}

          {activeTab === 'upload-analyze' && (
            <UploadAnalyzeView onRefreshGlobalStats={refreshGlobalData} />
          )}

          {activeTab === 'elderguard' && (
            <ElderGuardView onRefreshGlobalStats={refreshGlobalData} />
          )}

          {activeTab === 'bunkwatch' && (
            <BunkWatchView onRefreshGlobalStats={refreshGlobalData} />
          )}

          {activeTab === 'campuspulse' && (
            <CampusPulseView onRefreshGlobalStats={refreshGlobalData} />
          )}

          {activeTab === 'analytics' && <AnalyticsView />}

          {activeTab === 'alerts' && (
            <AlertsCenterView onRefreshGlobalStats={refreshGlobalData} />
          )}

          {activeTab === 'settings' && (
            <SettingsView userRole={userRole} setUserRole={setUserRole} />
          )}
        </main>
      </div>

      {/* Interactive Demo Scenarios Modal */}
      <DemoScenariosModal
        isOpen={isDemoOpen}
        onClose={() => setIsDemoOpen(false)}
        onSelectScenario={handleSelectScenario}
      />
    </div>
  );
}
