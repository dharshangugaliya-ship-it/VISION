export type ModuleType = 'core' | 'elderguard' | 'bunkwatch' | 'campuspulse' | 'ambulanceclear';
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical' | 'safe';
export type UserRole = 'admin' | 'ca' | 'operator';

export type AmbulanceStatus = 'ACTIVE' | 'IDLE' | 'CRITICAL_BLOCKED' | 'CLEARED' | 'EN_ROUTE';
export type TrafficDensity = 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';

export interface AmbulanceVehicleDetection {
  id: string;
  type: 'ambulance' | 'car' | 'bus' | 'motorcycle' | 'pedestrian';
  label: string;
  confidence: number;
  lane: number; // 1 (Left), 2 (Center / Emergency Corridor), 3 (Right)
  distanceMeters: number; // ahead of ambulance
  speedKmh: number;
  status: 'blocking' | 'yielding' | 'clear' | 'stationary' | 'cutting_in';
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
  trackId: string;
  color: string;
}

export interface LaneStatus {
  id: number;
  name: string;
  type: 'general' | 'emergency_primary' | 'shoulder';
  occupancyPercent: number;
  vehicleCount: number;
  isPathBlocked: boolean;
  yieldingState: 'Yielding Left' | 'Blocked' | 'Clear Corridor' | 'Yielding Right';
}

export interface AmbulanceClearTimelineItem {
  id: string;
  timestamp: string;
  event: string;
  detail: string;
  severity: SeverityLevel;
  clearanceScore: number;
  blockedCount: number;
}

export interface AmbulanceClearState {
  ambulanceStatus: AmbulanceStatus;
  clearanceScore: number; // 0 - 100
  trafficDensity: TrafficDensity;
  blockedVehiclesCount: number;
  estimatedDelaySec: number;
  ambulanceSpeedKmh: number;
  activeCamera: string;
  routeCorridorName: string;
  destinationHospital: string;
  etaMinutes: number;
  availableLaneSpaceMeters: number;
  roadOccupancyPercent: number;
  ambulanceMovement: 'Stationary / Trapped' | 'Crawling (<10 km/h)' | 'Slowing Down' | 'Cruising (45 km/h)';
  breakdownScores: {
    roadClearance: number;
    blockingPenalty: number;
    trafficDensityFactor: number;
    ambulanceMovementScore: number;
    availableLaneSpaceScore: number;
  };
  lanes: LaneStatus[];
  vehicles: AmbulanceVehicleDetection[];
  timeline: AmbulanceClearTimelineItem[];
  preemptionActive: boolean;
}

export interface BoundingBox {
  id: string;
  label: string;
  confidence: number;
  ymin: number; // 0 to 1000 or 0 to 1 normalized
  xmin: number;
  ymax: number;
  xmax: number;
  color?: string;
  trackId?: string;
  speed?: string;
  trajectory?: [number, number][];
}

export interface VisionEvent {
  id: string;
  module: ModuleType;
  title: string;
  description: string;
  severity: SeverityLevel;
  confidence: number;
  timestamp: string;
  location: string;
  evidenceUrl?: string;
  status: 'new' | 'acknowledged' | 'in_progress' | 'resolved';
  metadata?: Record<string, any>;
}

export interface AlertItem {
  id: string;
  module: ModuleType;
  eventType: string;
  title: string;
  severity: SeverityLevel;
  confidence: number;
  timestamp: string;
  location: string;
  evidenceUrl?: string;
  status: 'new' | 'acknowledged' | 'in_progress' | 'resolved';
  assignedUser?: string;
  resolvedAt?: string;
}

export interface AttendanceSessionRecord {
  id: string;
  date: string;
  subject: string;
  className: string;
  entryTime?: string;
  exitTime?: string;
  timeSpentMinutes: number;
  expectedDurationMinutes: number;
  status: 'on_time' | 'late_entry' | 'early_exit' | 'missed' | 'anomaly';
  lateMinutes?: number;
  earlyExitMinutes?: number;
}

export interface AttendanceAnomaly {
  id: string;
  type: 'rapid_exit' | 'borderline_threshold' | 'unusual_dwell' | 'pattern_deviation';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  detectedTime: string;
}

export interface BunkRiskAssessment {
  score: number; // 0 to 100
  level: 'low' | 'moderate' | 'high';
  factors: string[];
  attendanceRate: number; // percentage
  missedClassesCount: number;
  lateEntriesCount: number;
  earlyExitsCount: number;
  totalClassesHeld: number;
  needsFacultyReview: boolean;
}

export interface StudentProfile {
  id: string;
  name: string;
  registrationNumber: string;
  department: string;
  year: string;
  section: string;
  assignedCaId: string;
  assignedCaName: string;
  registeredPhoto: string;
  status: 'enrolled' | 'flagged' | 'excused';
  attendanceStatus?: 'present' | 'not_detected';
  attendanceTime?: string;
  exitTime?: string;
  timeSpentMinutes?: number;
  isLate?: boolean;
  lateMinutes?: number;
  isEarlyExit?: boolean;
  earlyExitMinutes?: number;
  verificationCount?: number;
  lastConfidence?: number;
  matchedTrackId?: string;
  bunkRisk?: BunkRiskAssessment;
  anomalies?: AttendanceAnomaly[];
  history?: AttendanceSessionRecord[];
}

export interface BunkSession {
  id: string;
  classId?: string;
  className: string;
  subject: string;
  room?: string;
  period: number;
  caId: string;
  caName: string;
  camera: string;
  startTime: string;
  endTime?: string;
  expectedDurationMinutes?: number;
  gracePeriodMinutes?: number;
  status: 'active' | 'completed' | 'paused' | 'idle';
  durationSec?: number;
  identifiedCount: number;
  matchCount: number;
  unmatchedCount: number;
}

export interface BunkMatchEvent {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  regNumber: string;
  department: string;
  year: string;
  section: string;
  caName: string;
  timestamp: string;
  location: string;
  confidence: number;
  capturedImage: string;
  registeredPhoto: string;
  status: 'matched' | 'unmatched' | 'review_required';
  notificationSent: boolean;
}

export interface ElderGuardStatus {
  status: 'SAFE' | 'OBSERVATION' | 'WARNING' | 'ALERT';
  currentActivity: 'Walking' | 'Sitting' | 'Kitchen' | 'Resting' | 'Possible Fall' | 'No Movement';
  lastMovementSecondsAgo: number;
  alertsToday: number;
  fallSensitivity: number; // 1-100
  inactivityThresholdSec: number;
  monitoredCamera: string;
  monitoredResident: string;
  safeZones: string[];
}

export interface ElderTimelineEvent {
  id: string;
  time: string;
  activity: string;
  severity: SeverityLevel;
  location: string;
  evidenceUrl?: string;
  inactivitySeconds?: number;
}

export interface CampusIssue {
  id: string;
  title: string;
  type: 'Safety' | 'Cleanliness' | 'Infrastructure' | 'Crowding';
  location: string;
  detectedTime: string;
  evidenceUrl: string;
  confidence: number;
  severity: SeverityLevel;
  priorityScore: number; // 0 - 100
  status: 'new' | 'acknowledged' | 'in_progress' | 'resolved';
  assignedTo?: string;
  impactMetrics: {
    safetyImpact: 'Low' | 'Medium' | 'High' | 'Critical';
    peopleAffected: 'Low' | 'Medium' | 'High';
    persistence: string;
  };
}

export interface CampusHealthScores {
  overall: number;
  safety: number;
  cleanliness: number;
  infrastructure: number;
  crowding: number;
}

export interface CoreStats {
  objectsDetected: number;
  peopleTracked: number;
  eventsDetected: number;
  activeAlerts: number;
  highRiskEvents: number;
  analysesCompleted: number;
}

export interface AnalysisSessionResult {
  analysisId: string;
  module: ModuleType;
  inputType: 'image' | 'video' | 'camera';
  timestamp: string;
  processingTimeMs: number;
  objectsDetected: BoundingBox[];
  peopleCount?: {
    current: number;
    entries: number;
    exits: number;
    peak: number;
  };
  trackingData?: {
    activeTracks: number;
    trajectories: Record<string, [number, number][]>;
  };
  wasteClassification?: {
    item: string;
    category: 'Plastic' | 'Organic' | 'Paper' | 'Metal' | 'Glass' | 'General Waste';
    confidence: number;
    disposalGuide: string;
    recyclable: boolean;
  };
  defectDetection?: {
    defectType: string;
    confidence: number;
    severity: SeverityLevel;
    impactDescription: string;
  };
  safetyAssessment?: {
    violationsFound: boolean;
    violationDetails?: string;
    severity: SeverityLevel;
    priorityScore: number;
  };
  generatedEvents: VisionEvent[];
  annotatedImageUrl?: string;
}
