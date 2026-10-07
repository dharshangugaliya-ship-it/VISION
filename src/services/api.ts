import {
  CoreStats,
  VisionEvent,
  AlertItem,
  BunkSession,
  BunkMatchEvent,
  StudentProfile,
  ElderGuardStatus,
  ElderTimelineEvent,
  CampusIssue,
  CampusHealthScores,
  AnalysisSessionResult,
} from '../types/vision';

export const api = {
  async getStats(): Promise<CoreStats> {
    const res = await fetch('/api/stats');
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  async getEvents(module = 'all'): Promise<VisionEvent[]> {
    const res = await fetch(`/api/events?module=${module}`);
    if (!res.ok) throw new Error('Failed to fetch events');
    return res.json();
  },

  async getAlerts(filters?: { module?: string; severity?: string; status?: string }): Promise<AlertItem[]> {
    const params = new URLSearchParams();
    if (filters?.module) params.append('module', filters.module);
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.status) params.append('status', filters.status);
    const res = await fetch(`/api/alerts?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch alerts');
    return res.json();
  },

  async handleAlertAction(id: string, action: 'acknowledge' | 'resolve' | 'assign', assignedUser?: string) {
    const res = await fetch(`/api/alerts/${id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, assignedUser }),
    });
    if (!res.ok) throw new Error('Failed to update alert');
    return res.json();
  },

  async getBunkSession(): Promise<{
    session: BunkSession;
    students: StudentProfile[];
    matches: BunkMatchEvent[];
  }> {
    const res = await fetch('/api/bunkwatch/session');
    if (!res.ok) throw new Error('Failed to fetch bunk session');
    return res.json();
  },

  async startBunkSession(config: {
    className: string;
    subject: string;
    period: number;
    caName: string;
    camera: string;
  }): Promise<{ success: boolean; session: BunkSession }> {
    const res = await fetch('/api/bunkwatch/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error('Failed to start bunk session');
    return res.json();
  },

  async stopBunkSession(): Promise<{ success: boolean; session: BunkSession }> {
    const res = await fetch('/api/bunkwatch/session/stop', {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to stop bunk session');
    return res.json();
  },

  async scanBunkFrame(frameBase64?: string): Promise<{
    matchFound: boolean;
    match: BunkMatchEvent;
    session: BunkSession;
    alertCreated: AlertItem;
  }> {
    const res = await fetch('/api/bunkwatch/scan-frame', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frameBase64 }),
    });
    if (!res.ok) throw new Error('Failed to scan bunk frame');
    return res.json();
  },

  async getElderStatus(): Promise<{
    elderStatus: ElderGuardStatus;
    timeline: ElderTimelineEvent[];
  }> {
    const res = await fetch('/api/elderguard/status');
    if (!res.ok) throw new Error('Failed to fetch elder status');
    return res.json();
  },

  async triggerElderFall(): Promise<{
    elderStatus: ElderGuardStatus;
    alert: AlertItem;
    timelineItem: ElderTimelineEvent;
  }> {
    const res = await fetch('/api/elderguard/simulate-fall', {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to trigger elder fall');
    return res.json();
  },

  async resetElderSafe(): Promise<{ elderStatus: ElderGuardStatus }> {
    const res = await fetch('/api/elderguard/reset', {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to reset elder safe');
    return res.json();
  },

  async getCampusPulseData(): Promise<{
    healthScores: CampusHealthScores;
    issues: CampusIssue[];
  }> {
    const res = await fetch('/api/campuspulse/data');
    if (!res.ok) throw new Error('Failed to fetch campuspulse data');
    return res.json();
  },

  async updateCampusIssueStatus(id: string, status: string): Promise<{
    success: boolean;
    issue: CampusIssue;
    healthScores: CampusHealthScores;
  }> {
    const res = await fetch(`/api/campuspulse/issue/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update campus issue status');
    return res.json();
  },

  async getEngineStatus(): Promise<{
    geminiKeyConfigured: boolean;
    geminiActive: boolean;
    model: string;
    pipelineVersion: string;
    activeMode: string;
    features: string[];
  }> {
    const res = await fetch('/api/engine-status');
    if (!res.ok) throw new Error('Failed to fetch engine status');
    return res.json();
  },

  async createAlert(alert: Partial<AlertItem>): Promise<{ success: boolean; alert: AlertItem }> {
    const res = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert),
    });
    if (!res.ok) throw new Error('Failed to create alert');
    return res.json();
  },

  async createEvent(event: Partial<VisionEvent>): Promise<{ success: boolean; event: VisionEvent }> {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    if (!res.ok) throw new Error('Failed to create event');
    return res.json();
  },

  async analyzeVision(params: {
    imageBase64?: string;
    mode?: string;
    moduleType?: string;
    cameraLabel?: string;
    clientMotionBoxes?: any[];
  }): Promise<AnalysisSessionResult & {
    summary?: string;
    engine?: string;
    geminiActive?: boolean;
    geminiKeyConfigured?: boolean;
  }> {
    const res = await fetch('/api/vision/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Failed to analyze vision');
    return res.json();
  },

  async getAnalytics(): Promise<{
    totalEvents: number;
    eventsBySeverity: Record<string, number>;
    detectionTrends: Array<{ day: string; people: number; vehicles: number; objects: number }>;
    moduleUsage: Array<{ name: string; percentage: number; count: number }>;
    topEventTypes: Array<{ type: string; count: number }>;
  }> {
    const res = await fetch('/api/analytics');
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  async getDemoScenarios(): Promise<Array<{
    id: string;
    title: string;
    module: string;
    description: string;
    mode: string;
    thumbnail: string;
  }>> {
    const res = await fetch('/api/demo/scenarios');
    if (!res.ok) throw new Error('Failed to fetch demo scenarios');
    return res.json();
  },
};
