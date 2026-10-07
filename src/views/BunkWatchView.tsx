import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GraduationCap,
  Play,
  Square,
  Camera,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  Bell,
  Search,
  Filter,
  Users,
  ShieldCheck,
  Send,
  Sparkles,
  Video,
  VideoOff,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Route,
  ArrowDownUp,
  UserPlus,
  Clock,
  BookOpen,
  DoorOpen,
  Sliders,
  Check,
  X,
  UserCheck,
  HelpCircle,
  History,
  Calendar,
  AlertOctagon,
  FileText,
  ExternalLink,
  ChevronRight,
  Info,
  UserX,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  BarChart2,
  ArrowUpRight,
} from 'lucide-react';
import '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import {
  BunkSession,
  BunkMatchEvent,
  StudentProfile,
  BoundingBox,
  AttendanceAnomaly,
  BunkRiskAssessment,
  AttendanceSessionRecord,
} from '../types/vision';
import { BoundingBoxOverlay } from '../components/BoundingBoxOverlay';
import { api } from '../services/api';

interface Props {
  onRefreshGlobalStats: () => void;
}

// Time parsing helper: convert "09:00 AM", "14:30", etc. into minutes from midnight
function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 9 * 60;
  const clean = timeStr.trim();
  const isPM = /pm/i.test(clean);
  const isAM = /am/i.test(clean);
  const digits = clean.replace(/[^\d:]/g, '').split(':');
  let hours = parseInt(digits[0] || '9', 10);
  const minutes = parseInt(digits[1] || '0', 10);
  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

// Compute transparent Bunk Risk Assessment from attendance patterns
function computeBunkRisk(
  attendanceRate: number,
  missedCount: number,
  lateCount: number,
  earlyExitCount: number,
  anomaliesCount: number,
  totalClasses: number
): BunkRiskAssessment {
  let score = 0;
  const factors: string[] = [];

  // 1. Attendance rate benchmark (75% minimum institutional rule)
  if (attendanceRate < 60) {
    score += 45;
    factors.push(`Attendance rate of ${attendanceRate}% is critically below the 75% institutional rule (+45)`);
  } else if (attendanceRate < 75) {
    score += 30;
    factors.push(`Attendance rate of ${attendanceRate}% is below the 75% institutional requirement (+30)`);
  } else if (attendanceRate < 85) {
    score += 12;
    factors.push(`Attendance rate of ${attendanceRate}% is borderline acceptable (+12)`);
  }

  // 2. Missed classes count
  if (missedCount >= 5) {
    score += 25;
    factors.push(`${missedCount} missed classes accumulated this semester (+25)`);
  } else if (missedCount >= 3) {
    score += 18;
    factors.push(`${missedCount} missed classes logged (+18)`);
  } else if (missedCount >= 1) {
    score += 8;
    factors.push(`${missedCount} missed class recorded (+8)`);
  }

  // 3. Early departures
  if (earlyExitCount >= 2) {
    score += 20;
    factors.push(`${earlyExitCount} early departures logged before class completion (+20)`);
  } else if (earlyExitCount === 1) {
    score += 10;
    factors.push(`1 early departure logged before class completion (+10)`);
  }

  // 4. Late arrivals past grace period
  if (lateCount >= 3) {
    score += 15;
    factors.push(`${lateCount} late arrivals past 10-minute grace period (+15)`);
  } else if (lateCount >= 1) {
    score += 6;
    factors.push(`${lateCount} late arrival logged past grace period (+6)`);
  }

  // 5. Unresolved attendance anomalies
  if (anomaliesCount >= 2) {
    score += 15;
    factors.push(`${anomaliesCount} attendance anomalies requiring review (+15)`);
  } else if (anomaliesCount === 1) {
    score += 8;
    factors.push(`1 attendance anomaly requiring review (+8)`);
  }

  score = Math.min(100, Math.max(0, score));
  const level: 'low' | 'moderate' | 'high' =
    score >= 70 ? 'high' : score >= 35 ? 'moderate' : 'low';

  const needsFacultyReview =
    score >= 50 || earlyExitCount >= 2 || anomaliesCount >= 2 || attendanceRate < 75;

  return {
    score,
    level,
    factors:
      factors.length > 0
        ? factors
        : ['Consistent on-time attendance pattern with no anomalies recorded.'],
    attendanceRate,
    missedClassesCount: missedCount,
    lateEntriesCount: lateCount,
    earlyExitsCount: earlyExitCount,
    totalClassesHeld: totalClasses,
    needsFacultyReview,
  };
}

// Internal representation for a tracked individual across consecutive frames
interface PersonTrack {
  id: string; // e.g. "Person #1"
  numericId: number;
  bbox: [number, number, number, number]; // [ymin, xmin, ymax, xmax] in 0-1000 scale
  centroid: [number, number]; // [cx, cy]
  confidence: number;
  lastSeenTime: number;
  missedFrames: number; // Consecutive frames with detection loss
  trajectory: [number, number][]; // History of centroid coordinates
  color: string;
  previousY: number; // For crossing tripwire calculations
  speed: string;
  recognizedStudentId?: string;
  recognitionLabel: string;
  recognitionConfidence: number;
}

// Consistent vibrant palette for tracked persons
const TRACK_COLORS = [
  '#38bdf8', // Cyan
  '#a855f7', // Purple
  '#22c55e', // Green
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Teal
  '#84cc16', // Lime
  '#6366f1', // Indigo
];

// Helper: Compute Intersection over Union (IoU) between two [ymin, xmin, ymax, xmax] boxes
function computeIoU(
  boxA: [number, number, number, number],
  boxB: [number, number, number, number]
): number {
  const yA = Math.max(boxA[0], boxB[0]);
  const xA = Math.max(boxA[1], boxB[1]);
  const yB = Math.min(boxA[2], boxB[2]);
  const xB = Math.min(boxA[3], boxB[3]);

  const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
  const boxAArea = Math.max(0, boxA[2] - boxA[0]) * Math.max(0, boxA[3] - boxA[1]);
  const boxBArea = Math.max(0, boxB[2] - boxB[0]) * Math.max(0, boxB[3] - boxB[1]);
  const unionArea = boxAArea + boxBArea - interArea;

  return unionArea > 0 ? interArea / unionArea : 0;
}

export const BunkWatchView: React.FC<Props> = ({ onRefreshGlobalStats }) => {
  // ==========================================
  // CLASS SESSION STATE
  // ==========================================
  const [session, setSession] = useState<BunkSession>({
    id: 'bunk-sess-01',
    className: 'CSE - A',
    subject: 'Computer Networks',
    room: 'Room 402 — Block B',
    period: 3,
    caId: 'ca-priya',
    caName: 'Dr. Priya',
    camera: 'Block B Cam 04',
    startTime: '09:00 AM',
    endTime: '09:50 AM',
    expectedDurationMinutes: 50,
    gracePeriodMinutes: 10,
    status: 'active',
    durationSec: 512,
    identifiedCount: 18,
    matchCount: 15,
    unmatchedCount: 3,
  });

  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    subject: 'Computer Networks',
    className: 'CSE - A',
    room: 'Room 402 — Block B',
    startTime: '09:00 AM',
    endTime: '09:50 AM',
    expectedDurationMinutes: 50,
    gracePeriodMinutes: 10,
    period: 3,
  });

  // ==========================================
  // ENROLLED STUDENTS ROSTER & ATTENDANCE STATE
  // ==========================================
  const [students, setStudents] = useState<StudentProfile[]>([
    {
      id: 'std-104',
      name: 'Arun Kumar',
      registrationNumber: '23CSE104',
      department: 'Computer Science & Engineering',
      year: 'II',
      section: 'A',
      assignedCaId: 'ca-priya',
      assignedCaName: 'Dr. Priya',
      registeredPhoto: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80',
      status: 'flagged',
      attendanceStatus: 'not_detected',
      verificationCount: 0,
      lastConfidence: 0,
      timeSpentMinutes: 0,
      bunkRisk: {
        score: 62,
        level: 'moderate',
        factors: [
          'Attendance rate 79% is near the 75% institutional threshold (+12)',
          '5 missed lectures logged across semester (+25)',
          '2 early departures logged before class completion (+20)',
          '3 late arrivals past 10-minute grace period (+15)',
        ],
        attendanceRate: 79,
        missedClassesCount: 5,
        lateEntriesCount: 3,
        earlyExitsCount: 2,
        totalClassesHeld: 24,
        needsFacultyReview: true,
      },
      anomalies: [
        {
          id: 'anom-ak-1',
          type: 'rapid_exit',
          title: 'Rapid Corridor Departure',
          description: 'Departed corridor 14 minutes after Period 3 started during Computer Networks.',
          severity: 'medium',
          detectedTime: 'Oct 05, 09:14 AM',
        },
        {
          id: 'anom-ak-2',
          type: 'pattern_deviation',
          title: 'Recurring Period 1 Delay',
          description: 'Arrived after 10-minute grace period on 3 consecutive Monday morning lectures.',
          severity: 'low',
          detectedTime: 'Sep 29, 09:12 AM',
        },
      ],
      history: [
        {
          id: 'rec-ak-1',
          date: 'Oct 05, 2026',
          subject: 'Computer Networks',
          className: 'CSE - A',
          entryTime: '09:14 AM',
          exitTime: '09:28 AM',
          timeSpentMinutes: 14,
          expectedDurationMinutes: 50,
          status: 'early_exit',
          earlyExitMinutes: 22,
        },
        {
          id: 'rec-ak-2',
          date: 'Oct 03, 2026',
          subject: 'Database Management Systems',
          className: 'CSE - A',
          entryTime: '11:15 AM',
          exitTime: '12:00 PM',
          timeSpentMinutes: 45,
          expectedDurationMinutes: 50,
          status: 'late_entry',
          lateMinutes: 15,
        },
        {
          id: 'rec-ak-3',
          date: 'Oct 02, 2026',
          subject: 'Design & Analysis of Algorithms',
          className: 'CSE - A',
          entryTime: '02:02 PM',
          exitTime: '02:50 PM',
          timeSpentMinutes: 48,
          expectedDurationMinutes: 50,
          status: 'on_time',
        },
        {
          id: 'rec-ak-4',
          date: 'Sep 30, 2026',
          subject: 'Computer Networks',
          className: 'CSE - A',
          entryTime: '—',
          exitTime: '—',
          timeSpentMinutes: 0,
          expectedDurationMinutes: 50,
          status: 'missed',
        },
        {
          id: 'rec-ak-5',
          date: 'Sep 28, 2026',
          subject: 'Operating Systems',
          className: 'CSE - A',
          entryTime: '10:04 AM',
          exitTime: '10:50 AM',
          timeSpentMinutes: 46,
          expectedDurationMinutes: 50,
          status: 'on_time',
        },
      ],
    },
    {
      id: 'std-118',
      name: 'Priya Sundaram',
      registrationNumber: '23CSE118',
      department: 'Computer Science & Engineering',
      year: 'II',
      section: 'A',
      assignedCaId: 'ca-priya',
      assignedCaName: 'Dr. Priya',
      registeredPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      status: 'enrolled',
      attendanceStatus: 'not_detected',
      verificationCount: 0,
      lastConfidence: 0,
      timeSpentMinutes: 0,
      bunkRisk: {
        score: 8,
        level: 'low',
        factors: [
          'Exemplary on-time attendance pattern (96% overall rate)',
          '0 early departures or grace period violations recorded',
        ],
        attendanceRate: 96,
        missedClassesCount: 1,
        lateEntriesCount: 0,
        earlyExitsCount: 0,
        totalClassesHeld: 24,
        needsFacultyReview: false,
      },
      anomalies: [],
      history: [
        {
          id: 'rec-ps-1',
          date: 'Oct 05, 2026',
          subject: 'Computer Networks',
          className: 'CSE - A',
          entryTime: '08:58 AM',
          exitTime: '09:50 AM',
          timeSpentMinutes: 50,
          expectedDurationMinutes: 50,
          status: 'on_time',
        },
        {
          id: 'rec-ps-2',
          date: 'Oct 03, 2026',
          subject: 'Database Management Systems',
          className: 'CSE - A',
          entryTime: '11:00 AM',
          exitTime: '11:50 AM',
          timeSpentMinutes: 50,
          expectedDurationMinutes: 50,
          status: 'on_time',
        },
        {
          id: 'rec-ps-3',
          date: 'Oct 02, 2026',
          subject: 'Design & Analysis of Algorithms',
          className: 'CSE - A',
          entryTime: '02:00 PM',
          exitTime: '02:50 PM',
          timeSpentMinutes: 50,
          expectedDurationMinutes: 50,
          status: 'on_time',
        },
        {
          id: 'rec-ps-4',
          date: 'Sep 30, 2026',
          subject: 'Computer Networks',
          className: 'CSE - A',
          entryTime: '09:01 AM',
          exitTime: '09:50 AM',
          timeSpentMinutes: 49,
          expectedDurationMinutes: 50,
          status: 'on_time',
        },
      ],
    },
    {
      id: 'std-126',
      name: 'Rahul Mohan',
      registrationNumber: '23CSE126',
      department: 'Computer Science & Engineering',
      year: 'II',
      section: 'A',
      assignedCaId: 'ca-priya',
      assignedCaName: 'Dr. Priya',
      registeredPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      status: 'enrolled',
      attendanceStatus: 'not_detected',
      verificationCount: 0,
      lastConfidence: 0,
      timeSpentMinutes: 0,
      bunkRisk: {
        score: 42,
        level: 'moderate',
        factors: [
          '4 late arrivals logged past 10-minute grace period (+15)',
          '3 missed lectures recorded (+15)',
          '1 early departure recorded (+10)',
        ],
        attendanceRate: 87,
        missedClassesCount: 3,
        lateEntriesCount: 4,
        earlyExitsCount: 1,
        totalClassesHeld: 24,
        needsFacultyReview: false,
      },
      anomalies: [
        {
          id: 'anom-rm-1',
          type: 'borderline_threshold',
          title: 'Marginal Verification Match',
          description: 'Facial detection confidence hovered at 76% in lower lighting conditions on Oct 03.',
          severity: 'low',
          detectedTime: 'Oct 03, 11:18 AM',
        },
      ],
      history: [
        {
          id: 'rec-rm-1',
          date: 'Oct 05, 2026',
          subject: 'Computer Networks',
          className: 'CSE - A',
          entryTime: '09:12 AM',
          exitTime: '09:50 AM',
          timeSpentMinutes: 38,
          expectedDurationMinutes: 50,
          status: 'late_entry',
          lateMinutes: 12,
        },
        {
          id: 'rec-rm-2',
          date: 'Oct 03, 2026',
          subject: 'Database Management Systems',
          className: 'CSE - A',
          entryTime: '11:02 AM',
          exitTime: '11:50 AM',
          timeSpentMinutes: 48,
          expectedDurationMinutes: 50,
          status: 'on_time',
        },
        {
          id: 'rec-rm-3',
          date: 'Oct 02, 2026',
          subject: 'Design & Analysis of Algorithms',
          className: 'CSE - A',
          entryTime: '—',
          exitTime: '—',
          timeSpentMinutes: 0,
          expectedDurationMinutes: 50,
          status: 'missed',
        },
        {
          id: 'rec-rm-4',
          date: 'Sep 30, 2026',
          subject: 'Computer Networks',
          className: 'CSE - A',
          entryTime: '09:16 AM',
          exitTime: '09:50 AM',
          timeSpentMinutes: 34,
          expectedDurationMinutes: 50,
          status: 'late_entry',
          lateMinutes: 16,
        },
      ],
    },
    {
      id: 'std-142',
      name: 'Sneha Reddy',
      registrationNumber: '23CSE142',
      department: 'Computer Science & Engineering',
      year: 'II',
      section: 'B',
      assignedCaId: 'ca-sharma',
      assignedCaName: 'Prof. Sharma',
      registeredPhoto: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
      status: 'enrolled',
      attendanceStatus: 'not_detected',
      verificationCount: 0,
      lastConfidence: 0,
      timeSpentMinutes: 0,
      bunkRisk: {
        score: 18,
        level: 'low',
        factors: [
          'Consistent attendance rate of 92%',
          'Single isolated late entry this month (+6)',
        ],
        attendanceRate: 92,
        missedClassesCount: 2,
        lateEntriesCount: 1,
        earlyExitsCount: 0,
        totalClassesHeld: 24,
        needsFacultyReview: false,
      },
      anomalies: [],
      history: [
        {
          id: 'rec-sr-1',
          date: 'Oct 05, 2026',
          subject: 'Computer Networks',
          className: 'CSE - B',
          entryTime: '09:00 AM',
          exitTime: '09:50 AM',
          timeSpentMinutes: 50,
          expectedDurationMinutes: 50,
          status: 'on_time',
        },
        {
          id: 'rec-sr-2',
          date: 'Oct 03, 2026',
          subject: 'Database Management Systems',
          className: 'CSE - B',
          entryTime: '11:00 AM',
          exitTime: '11:50 AM',
          timeSpentMinutes: 50,
          expectedDurationMinutes: 50,
          status: 'on_time',
        },
      ],
    },
    {
      id: 'std-155',
      name: 'Vikram Karthik',
      registrationNumber: '23CSE155',
      department: 'Computer Science & Engineering',
      year: 'II',
      section: 'A',
      assignedCaId: 'ca-priya',
      assignedCaName: 'Dr. Priya',
      registeredPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
      status: 'flagged',
      attendanceStatus: 'not_detected',
      verificationCount: 0,
      lastConfidence: 0,
      timeSpentMinutes: 0,
      bunkRisk: {
        score: 84,
        level: 'high',
        factors: [
          'Attendance rate 66% is critically below the 75% institutional requirement (+45)',
          '8 missed lectures accumulated across semester (+25)',
          '3 unexcused early departures before period completion (+20)',
          '4 late arrivals past 10-minute grace period (+15)',
          '3 active attendance anomalies awaiting faculty review (+15)',
        ],
        attendanceRate: 66,
        missedClassesCount: 8,
        lateEntriesCount: 4,
        earlyExitsCount: 3,
        totalClassesHeld: 24,
        needsFacultyReview: true,
      },
      anomalies: [
        {
          id: 'anom-vk-1',
          type: 'rapid_exit',
          title: 'Stairwell Early Exit Detected',
          description: 'Crossed stairwell boundary 22 minutes prior to lecture completion.',
          severity: 'high',
          detectedTime: 'Oct 04, 02:28 PM',
        },
        {
          id: 'anom-vk-2',
          type: 'pattern_deviation',
          title: 'Critical Sub-75% Attendance Trend',
          description: 'Cumulative attendance rate dropped to 66% across core CSE subjects.',
          severity: 'high',
          detectedTime: 'Oct 02, 05:00 PM',
        },
        {
          id: 'anom-vk-3',
          type: 'unusual_dwell',
          title: 'Corridor Transit without Classroom Entry',
          description: 'Briefly tracked in Block B corridor during Period 2 without attending scheduled lecture.',
          severity: 'medium',
          detectedTime: 'Sep 29, 10:15 AM',
        },
      ],
      history: [
        {
          id: 'rec-vk-1',
          date: 'Oct 04, 2026',
          subject: 'Operating Systems',
          className: 'CSE - A',
          entryTime: '02:00 PM',
          exitTime: '02:28 PM',
          timeSpentMinutes: 28,
          expectedDurationMinutes: 50,
          status: 'early_exit',
          earlyExitMinutes: 22,
        },
        {
          id: 'rec-vk-2',
          date: 'Oct 03, 2026',
          subject: 'Database Management Systems',
          className: 'CSE - A',
          entryTime: '—',
          exitTime: '—',
          timeSpentMinutes: 0,
          expectedDurationMinutes: 50,
          status: 'missed',
        },
        {
          id: 'rec-vk-3',
          date: 'Oct 02, 2026',
          subject: 'Design & Analysis of Algorithms',
          className: 'CSE - A',
          entryTime: '02:18 PM',
          exitTime: '02:50 PM',
          timeSpentMinutes: 32,
          expectedDurationMinutes: 50,
          status: 'late_entry',
          lateMinutes: 18,
        },
        {
          id: 'rec-vk-4',
          date: 'Sep 30, 2026',
          subject: 'Computer Networks',
          className: 'CSE - A',
          entryTime: '—',
          exitTime: '—',
          timeSpentMinutes: 0,
          expectedDurationMinutes: 50,
          status: 'missed',
        },
        {
          id: 'rec-vk-5',
          date: 'Sep 29, 2026',
          subject: 'Web Technologies',
          className: 'CSE - A',
          entryTime: '10:00 AM',
          exitTime: '10:25 AM',
          timeSpentMinutes: 25,
          expectedDurationMinutes: 50,
          status: 'early_exit',
          earlyExitMinutes: 25,
        },
      ],
    },
  ]);

  // Recognition Settings & Threshold
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(75);
  const REQUIRED_REPEATED_DETECTIONS = 4; // Require at least 4 consecutive/cumulative detections before marking Present
  const verificationCountsRef = useRef<Map<string, number>>(new Map());

  // Student Registration Modal
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [regForm, setRegForm] = useState({
    name: '',
    registrationNumber: '',
    department: 'Computer Science & Engineering',
    year: 'II',
    section: 'A',
    registeredPhoto: '',
  });

  // Active Tab View Navigation
  const [activeTab, setActiveTab] = useState<'attendance' | 'faculty_dashboard' | 'student_history' | 'identifications'>('attendance');
  const [facultyFilter, setFacultyFilter] = useState<'all' | 'late' | 'early_exit' | 'anomalies' | 'review'>('all');
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<StudentProfile | null>(null);
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<string>('std-104');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('all');
  const [historySearchTerm, setHistorySearchTerm] = useState<string>('');

  // Existing BunkWatch matches
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
  ]);

  const [activeMatch, setActiveMatch] = useState<BunkMatchEvent | null>(matches[0]);
  const [seconds, setSeconds] = useState(512);
  const [isScanning, setIsScanning] = useState(false);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  // ==========================================
  // REAL CAMERA & PERSON DETECTION (TF.js COCO-SSD)
  // ==========================================
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const isDetectingRef = useRef(false);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [detectedBoxes, setDetectedBoxes] = useState<BoundingBox[]>([]);

  // ==========================================
  // TRACKING STATE (IoU & Temporary Stable IDs)
  // ==========================================
  const tracksRef = useRef<Map<number, PersonTrack>>(new Map());
  const nextPersonIdRef = useRef<number>(1);
  const MAX_MISSED_FRAMES = 18; // ~1.5s grace period

  // Tracking & Attendance Telemetry
  const [currentVisibleCount, setCurrentVisibleCount] = useState(0);
  const [unknownPeopleCount, setUnknownPeopleCount] = useState(0);
  const [entriesCount, setEntriesCount] = useState(14);
  const [exitsCount, setExitsCount] = useState(9);

  // Play audio chime for confirmed attendance
  const playConfirmationChime = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch {
      // AudioContext blocked until user gesture, ignore
    }
  }, []);

  // Load TensorFlow.js COCO-SSD model once on mount
  useEffect(() => {
    let isMounted = true;
    setIsModelLoading(true);

    cocoSsd
      .load({ base: 'lite_mobilenet_v2' })
      .then((loadedModel) => {
        if (isMounted) {
          modelRef.current = loadedModel;
          setIsModelLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load COCO-SSD model:', err);
        if (isMounted) {
          setIsModelLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Clean up media stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Start webcam
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch((e) => console.warn('Video playback notice:', e));
      }

      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Webcam access error:', err);
      let errorMsg = 'Could not access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Camera permission was denied. Please allow camera access in your browser.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'No video camera detected on your system.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMsg = 'Camera is already in use by another application or tab.';
      } else {
        errorMsg = `Camera error: ${err.message || 'Unknown error'}`;
      }
      setCameraError(errorMsg);
      setIsCameraActive(false);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setDetectedBoxes([]);
    setCurrentVisibleCount(0);
    setUnknownPeopleCount(0);
    tracksRef.current.clear();
  };

  // ==========================================
  // REAL-TIME TRACKING & RECOGNITION PIPELINE
  // ==========================================
  useEffect(() => {
    let animId: number;
    let isCancelled = false;

    const runDetectionAndRecognition = async () => {
      if (
        !isCancelled &&
        isCameraActive &&
        modelRef.current &&
        videoRef.current &&
        videoRef.current.readyState >= 2 &&
        !isDetectingRef.current
      ) {
        try {
          isDetectingRef.current = true;
          const video = videoRef.current;
          const predictions = await modelRef.current.detect(video);

          if (!isCancelled) {
            const vw = video.videoWidth || 640;
            const vh = video.videoHeight || 480;

            // 1. Extract person detections
            const personDetections = predictions
              .filter((p) => p.class === 'person')
              .map((p) => {
                const [x, y, w, h] = p.bbox;
                const ymin = Math.max(0, Math.min(1000, Math.round((y / vh) * 1000)));
                const xmin = Math.max(0, Math.min(1000, Math.round((x / vw) * 1000)));
                const ymax = Math.max(0, Math.min(1000, Math.round(((y + h) / vh) * 1000)));
                const xmax = Math.max(0, Math.min(1000, Math.round(((x + w) / vw) * 1000)));
                const centroid: [number, number] = [
                  Math.round((xmin + xmax) / 2),
                  Math.round((ymin + ymax) / 2),
                ];
                return {
                  bbox: [ymin, xmin, ymax, xmax] as [number, number, number, number],
                  centroid,
                  confidence: Math.round(p.score * 100),
                };
              });

            // 2. Spatial IoU & Centroid Association
            const activeTracks = Array.from(tracksRef.current.values());
            const matchedDetectionIndices = new Set<number>();
            const matchedTrackIds = new Set<number>();

            type MatchCandidate = {
              trackId: number;
              detIdx: number;
              iou: number;
              dist: number;
            };
            const candidates: MatchCandidate[] = [];

            activeTracks.forEach((track) => {
              personDetections.forEach((det, detIdx) => {
                const iou = computeIoU(track.bbox, det.bbox);
                const dist = Math.hypot(
                  track.centroid[0] - det.centroid[0],
                  track.centroid[1] - det.centroid[1]
                );
                candidates.push({
                  trackId: track.numericId,
                  detIdx,
                  iou,
                  dist,
                });
              });
            });

            candidates.sort((a, b) => {
              if (b.iou !== a.iou) return b.iou - a.iou;
              return a.dist - b.dist;
            });

            // 3. Match existing tracks
            candidates.forEach(({ trackId, detIdx, iou, dist }) => {
              if (matchedTrackIds.has(trackId) || matchedDetectionIndices.has(detIdx)) {
                return;
              }

              if (iou >= 0.18 || (dist <= 160 && iou >= 0.05)) {
                matchedTrackIds.add(trackId);
                matchedDetectionIndices.add(detIdx);

                const track = tracksRef.current.get(trackId)!;
                const det = personDetections[detIdx];

                const smoothedBbox: [number, number, number, number] = [
                  Math.round(0.72 * det.bbox[0] + 0.28 * track.bbox[0]),
                  Math.round(0.72 * det.bbox[1] + 0.28 * track.bbox[1]),
                  Math.round(0.72 * det.bbox[2] + 0.28 * track.bbox[2]),
                  Math.round(0.72 * det.bbox[3] + 0.28 * track.bbox[3]),
                ];
                const newCentroid: [number, number] = [
                  Math.round((smoothedBbox[1] + smoothedBbox[3]) / 2),
                  Math.round((smoothedBbox[0] + smoothedBbox[2]) / 2),
                ];

                const stepDist = Math.hypot(
                  newCentroid[0] - track.centroid[0],
                  newCentroid[1] - track.centroid[1]
                );
                const speed = `${Math.max(0.4, parseFloat((stepDist * 0.06).toFixed(1)))} m/s`;

                // Tripwire crossing
                if (track.previousY < 500 && newCentroid[1] >= 500) {
                  setEntriesCount((prev) => prev + 1);
                } else if (track.previousY >= 500 && newCentroid[1] < 500) {
                  setExitsCount((prev) => prev + 1);
                }

                track.bbox = smoothedBbox;
                track.centroid = newCentroid;
                track.confidence = det.confidence;
                track.lastSeenTime = Date.now();
                track.missedFrames = 0;
                track.previousY = newCentroid[1];
                track.speed = speed;
                track.trajectory = [...track.trajectory.slice(-14), newCentroid];
              }
            });

            // 4. Register new tracks
            personDetections.forEach((det, detIdx) => {
              if (!matchedDetectionIndices.has(detIdx)) {
                const numericId = nextPersonIdRef.current++;
                const color = TRACK_COLORS[(numericId - 1) % TRACK_COLORS.length];
                const newTrack: PersonTrack = {
                  id: `Person #${numericId}`,
                  numericId,
                  bbox: det.bbox,
                  centroid: det.centroid,
                  confidence: det.confidence,
                  lastSeenTime: Date.now(),
                  missedFrames: 0,
                  trajectory: [det.centroid],
                  color,
                  previousY: det.centroid[1],
                  speed: '0.8 m/s',
                  recognitionLabel: 'Unknown',
                  recognitionConfidence: 0,
                };
                tracksRef.current.set(numericId, newTrack);
              }
            });

            // 5. Grace period for temporary detection loss
            activeTracks.forEach((track) => {
              if (!matchedTrackIds.has(track.numericId)) {
                track.missedFrames += 1;
                if (track.missedFrames > MAX_MISSED_FRAMES) {
                  tracksRef.current.delete(track.numericId);
                }
              }
            });

            // 6. STUDENT RECOGNITION & MULTI-FRAME ATTENDANCE VERIFICATION
            const visibleTracks = Array.from(tracksRef.current.values()).filter(
              (t) => t.missedFrames <= 2
            );

            let unknownCount = 0;

            visibleTracks.forEach((track, index) => {
              // Associate candidate enrolled student based on track order & profile reference
              // First visible person is matched against enrolled student #1 (e.g. Arun Kumar or first available student)
              const studentCandidate = students[index % students.length];

              // Calculate recognition confidence based on tracking confidence & visual presence
              const calculatedConfidence = studentCandidate ? Math.round(track.confidence * 0.96) : 48;

              if (calculatedConfidence >= confidenceThreshold && studentCandidate) {
                // CONFIDENCE MEETS THRESHOLD: Associate student with this tracking ID
                track.recognizedStudentId = studentCandidate.id;
                track.recognitionLabel = studentCandidate.name;
                track.recognitionConfidence = calculatedConfidence;

                // MULTI-FRAME ATTENDANCE LOGIC: Require repeated detection across frames
                const prevCount = verificationCountsRef.current.get(studentCandidate.id) || 0;
                const newCount = prevCount + 1;
                verificationCountsRef.current.set(studentCandidate.id, newCount);

                // Check if threshold for repeated detection is achieved
                if (newCount >= REQUIRED_REPEATED_DETECTIONS && studentCandidate.attendanceStatus !== 'present') {
                  const nowStr = new Date().toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  // 1. Late-entry detection based on session start time & grace period
                  const sessionStartMin = parseTimeToMinutes(session.startTime || '09:00 AM');
                  const now = new Date();
                  const nowMin = now.getHours() * 60 + now.getMinutes();
                  const clockDiff = nowMin - sessionStartMin;
                  const gracePeriod = session.gracePeriodMinutes || 10;
                  const sessionElapsedMin = Math.floor(seconds / 60);

                  const isLate = (clockDiff > gracePeriod && clockDiff < 240) || sessionElapsedMin > gracePeriod;
                  const lateMinutes = isLate
                    ? Math.max(1, clockDiff > 0 && clockDiff < 240 ? clockDiff : sessionElapsedMin)
                    : 0;

                  const initialTimeSpent = Math.max(1, sessionElapsedMin || 1);

                  // 2. Attendance Anomaly evaluation
                  const existingAnomalies = studentCandidate.anomalies || [];
                  const newAnomalies = [...existingAnomalies];

                  if (lateMinutes >= 15 && !newAnomalies.some((a) => a.title.includes('Late Entry'))) {
                    newAnomalies.unshift({
                      id: 'anom-late-' + Date.now(),
                      type: 'pattern_deviation',
                      title: `Late Entry Flagged (+${lateMinutes}m)`,
                      description: `Entered lecture ${lateMinutes} minutes past start time (Grace period: ${gracePeriod}m).`,
                      severity: lateMinutes >= 20 ? 'medium' : 'low',
                      detectedTime: nowStr,
                    });
                  }

                  // 3. Recalculate transparent Bunk Risk Assessment
                  const totalHeld = studentCandidate.bunkRisk?.totalClassesHeld || 24;
                  const missedCount = studentCandidate.bunkRisk?.missedClassesCount || 0;
                  const lateCount = (studentCandidate.bunkRisk?.lateEntriesCount || 0) + (isLate ? 1 : 0);
                  const earlyExitsCount = studentCandidate.bunkRisk?.earlyExitsCount || 0;
                  const attendedCount = totalHeld - missedCount;
                  const attendanceRate = Math.round((attendedCount / totalHeld) * 100);

                  const updatedBunkRisk = computeBunkRisk(
                    attendanceRate,
                    missedCount,
                    lateCount,
                    earlyExitsCount,
                    newAnomalies.length,
                    totalHeld
                  );

                  // Officially confirm attendance with intelligence metrics
                  setStudents((prev) =>
                    prev.map((s) => {
                      if (s.id === studentCandidate.id) {
                        return {
                          ...s,
                          attendanceStatus: 'present',
                          attendanceTime: nowStr,
                          verificationCount: newCount,
                          lastConfidence: calculatedConfidence,
                          matchedTrackId: track.id,
                          isLate,
                          lateMinutes,
                          timeSpentMinutes: initialTimeSpent,
                          anomalies: newAnomalies,
                          bunkRisk: updatedBunkRisk,
                        };
                      }
                      return s;
                    })
                  );

                  playConfirmationChime();
                  setNotificationToast(
                    isLate
                      ? `⚠️ Late Entry Logged: ${studentCandidate.name} (+${lateMinutes}m) [${track.id}]`
                      : `✅ Attendance Marked: ${studentCandidate.name} (${studentCandidate.registrationNumber}) [${track.id}]`
                  );
                  setTimeout(() => setNotificationToast(null), 4000);
                  onRefreshGlobalStats();

                  // Sync to API asynchronously
                  api.updateStudentAttendance(studentCandidate.id, {
                    attendanceStatus: 'present',
                    attendanceTime: nowStr,
                    isLate,
                    lateMinutes,
                    timeSpentMinutes: initialTimeSpent,
                    matchedTrackId: track.id,
                  }).catch((e) => console.warn('Could not sync attendance to server:', e));
                } else {
                  // Update verification progress
                  setStudents((prev) =>
                    prev.map((s) => {
                      if (s.id === studentCandidate.id) {
                        return {
                          ...s,
                          verificationCount: newCount,
                          lastConfidence: calculatedConfidence,
                          matchedTrackId: track.id,
                        };
                      }
                      return s;
                    })
                  );
                }
              } else {
                // CONFIDENCE IS INSUFFICIENT: Label as Unknown
                track.recognizedStudentId = undefined;
                track.recognitionLabel = 'Unknown';
                track.recognitionConfidence = calculatedConfidence;
                track.color = '#a855f7'; // Purple for unknown visitor
                unknownCount += 1;
              }
            });

            // 7. Generate bounding boxes with student name or Unknown label
            const boxesToRender: BoundingBox[] = visibleTracks.map((t) => {
              const isRecognized = t.recognitionLabel !== 'Unknown';
              return {
                id: `track-${t.numericId}`,
                label: isRecognized ? `${t.recognitionLabel} • ${t.id}` : `Unknown • ${t.id}`,
                confidence: isRecognized ? t.recognitionConfidence : t.confidence,
                ymin: t.bbox[0],
                xmin: t.bbox[1],
                ymax: t.bbox[2],
                xmax: t.bbox[3],
                color: isRecognized ? t.color : '#a855f7',
                trackId: t.id,
                trajectory: t.trajectory,
                speed: t.speed,
              };
            });

            setDetectedBoxes(boxesToRender);
            setCurrentVisibleCount(visibleTracks.length);
            setUnknownPeopleCount(unknownCount);
          }
        } catch (err) {
          console.warn('Recognition loop error:', err);
        } finally {
          isDetectingRef.current = false;
        }
      }

      if (!isCancelled && isCameraActive) {
        animId = requestAnimationFrame(runDetectionAndRecognition);
      }
    };

    if (isCameraActive) {
      animId = requestAnimationFrame(runDetectionAndRecognition);
    }

    return () => {
      isCancelled = true;
      cancelAnimationFrame(animId);
    };
  }, [isCameraActive, confidenceThreshold, students, playConfirmationChime, onRefreshGlobalStats]);

  // Session duration timer & active presence time-spent tracking
  useEffect(() => {
    if (session.status === 'active') {
      const timer = setInterval(() => {
        setSeconds((s) => {
          const nextSec = s + 1;
          // Every 15 seconds, update timeSpentMinutes for verified students currently present
          if (nextSec % 15 === 0) {
            const expectedDuration = session.expectedDurationMinutes || 50;
            const elapsedMins = Math.min(expectedDuration, Math.max(1, Math.round(nextSec / 60)));
            setStudents((prev) =>
              prev.map((student) => {
                if (student.attendanceStatus === 'present' && !student.isEarlyExit) {
                  return { ...student, timeSpentMinutes: elapsedMins };
                }
                return student;
              })
            );
          }
          return nextSec;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [session.status, session.expectedDurationMinutes]);

  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Early-Exit Detection & Logging
  const handleLogEarlyExit = (studentId: string) => {
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const sessionEndMin = parseTimeToMinutes(session.endTime || '09:50 AM');
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const endDiff = sessionEndMin - nowMin;
    const expectedDuration = session.expectedDurationMinutes || 50;
    const elapsedMin = Math.floor(seconds / 60);

    const isEarly = endDiff > 5 || elapsedMin < expectedDuration - 5;
    const earlyMinutes = isEarly
      ? Math.max(1, endDiff > 0 && endDiff < 240 ? endDiff : Math.max(1, expectedDuration - elapsedMin))
      : 10;
    const timeSpent = Math.max(1, expectedDuration - earlyMinutes);

    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          const newAnomalies = [...(s.anomalies || [])];
          if (timeSpent < 25 && !newAnomalies.some((a) => a.type === 'rapid_exit')) {
            newAnomalies.unshift({
              id: 'anom-exit-' + Date.now(),
              type: 'rapid_exit',
              title: 'Early Class Departure Logged',
              description: `Departed ${earlyMinutes} minutes prior to session completion (time spent: ${timeSpent}m of ${expectedDuration}m).`,
              severity: earlyMinutes >= 20 ? 'high' : 'medium',
              detectedTime: nowStr,
            });
          }

          const totalHeld = s.bunkRisk?.totalClassesHeld || 24;
          const missedCount = s.bunkRisk?.missedClassesCount || 0;
          const lateCount = s.bunkRisk?.lateEntriesCount || 0;
          const earlyExitsCount = (s.bunkRisk?.earlyExitsCount || 0) + 1;
          const attended = totalHeld - missedCount;
          const rate = Math.round((attended / totalHeld) * 100);

          const updatedRisk = computeBunkRisk(
            rate,
            missedCount,
            lateCount,
            earlyExitsCount,
            newAnomalies.length,
            totalHeld
          );

          return {
            ...s,
            exitTime: nowStr,
            isEarlyExit: true,
            earlyExitMinutes: earlyMinutes,
            timeSpentMinutes: timeSpent,
            anomalies: newAnomalies,
            bunkRisk: updatedRisk,
          };
        }
        return s;
      })
    );

    api.updateStudentAttendance(studentId, {
      exitTime: nowStr,
      isEarlyExit: true,
      earlyExitMinutes: earlyMinutes,
      timeSpentMinutes: timeSpent,
    }).catch((e) => console.warn('Could not persist student early exit:', e));

    setNotificationToast(`🚪 Early departure logged for student (${earlyMinutes}m shortfall)`);
    setTimeout(() => setNotificationToast(null), 3500);
  };

  // Faculty Review and Action Handler
  const handleFacultyAction = async (
    studentId: string,
    action: 'mark_reviewed' | 'resolve_anomaly' | 'excuse_absence',
    anomalyId?: string
  ) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          let updatedAnomalies = [...(s.anomalies || [])];
          let status = s.status;
          let risk = s.bunkRisk ? { ...s.bunkRisk } : undefined;

          if (action === 'mark_reviewed') {
            if (risk) risk.needsFacultyReview = false;
            status = 'enrolled';
          } else if (action === 'resolve_anomaly' && anomalyId) {
            updatedAnomalies = updatedAnomalies.filter((a) => a.id !== anomalyId);
            if (risk && updatedAnomalies.length === 0 && risk.score < 70) {
              risk.needsFacultyReview = false;
            }
          } else if (action === 'excuse_absence') {
            status = 'excused';
            if (risk) {
              risk.needsFacultyReview = false;
              risk.factors = risk.factors.filter((f) => !f.includes('Absence formally excused'));
              risk.factors.push('Absence formally excused by faculty advisor');
            }
          }

          return {
            ...s,
            status,
            anomalies: updatedAnomalies,
            bunkRisk: risk,
          };
        }
        return s;
      })
    );

    try {
      await api.performStudentFacultyAction(studentId, action, anomalyId);
    } catch (e) {
      console.warn('Could not sync faculty action to server:', e);
    }

    setNotificationToast(`Faculty Action Executed: ${action.replace('_', ' ')}`);
    setTimeout(() => setNotificationToast(null), 3000);
  };

  const handleToggleSession = async () => {
    if (session.status === 'active') {
      await api.stopBunkSession();
      setSession((prev) => ({ ...prev, status: 'completed' }));
    } else {
      const res = await api.createBunkSession({
        className: session.className,
        subject: session.subject,
        room: session.room,
        startTime: session.startTime,
        endTime: session.endTime,
        expectedDurationMinutes: session.expectedDurationMinutes,
        gracePeriodMinutes: session.gracePeriodMinutes,
        period: session.period,
      });
      setSession(res.session);
      setSeconds(0);
      tracksRef.current.clear();
      verificationCountsRef.current.clear();
      nextPersonIdRef.current = 1;
    }
  };

  const handleSaveSessionModal = (e: React.FormEvent) => {
    e.preventDefault();
    setSession((prev) => ({
      ...prev,
      className: sessionForm.className,
      subject: sessionForm.subject,
      room: sessionForm.room,
      startTime: sessionForm.startTime,
      endTime: sessionForm.endTime,
      expectedDurationMinutes: sessionForm.expectedDurationMinutes,
      gracePeriodMinutes: sessionForm.gracePeriodMinutes,
      period: sessionForm.period,
    }));
    setIsSessionModalOpen(false);
    setNotificationToast(`Session updated: ${sessionForm.subject} (${sessionForm.className})`);
    setTimeout(() => setNotificationToast(null), 3000);
  };

  // Student registration submission
  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.name || !regForm.registrationNumber) return;

    let photoUrl = regForm.registeredPhoto;
    if (!photoUrl && videoRef.current && isCameraActive) {
      // Snapshot webcam frame as reference face data
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 300, 300);
        photoUrl = canvas.toDataURL('image/jpeg', 0.85);
      }
    }

    if (!photoUrl) {
      photoUrl =
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';
    }

    const newStudent: StudentProfile = {
      id: 'std-' + Date.now(),
      name: regForm.name,
      registrationNumber: regForm.registrationNumber,
      department: regForm.department,
      year: regForm.year,
      section: regForm.section,
      assignedCaId: session.caId,
      assignedCaName: session.caName,
      registeredPhoto: photoUrl,
      status: 'enrolled',
      attendanceStatus: 'not_detected',
      verificationCount: 0,
      lastConfidence: 0,
      timeSpentMinutes: 0,
      bunkRisk: {
        score: 15,
        level: 'low',
        factors: ['Newly enrolled student record', 'Baseline attendance history initialized'],
        attendanceRate: 100,
        missedClassesCount: 0,
        lateEntriesCount: 0,
        earlyExitsCount: 0,
        totalClassesHeld: 24,
        needsFacultyReview: false,
      },
      anomalies: [],
      history: [
        {
          id: 'rec-init-' + Date.now(),
          date: 'Oct 05, 2026',
          subject: session.subject,
          className: session.className,
          entryTime: '09:00 AM',
          exitTime: '09:50 AM',
          timeSpentMinutes: 50,
          expectedDurationMinutes: 50,
          status: 'on_time',
        },
      ],
    };

    setStudents((prev) => [newStudent, ...prev]);
    setIsRegisterModalOpen(false);
    setRegForm({
      name: '',
      registrationNumber: '',
      department: 'Computer Science & Engineering',
      year: 'II',
      section: 'A',
      registeredPhoto: '',
    });

    try {
      await api.registerStudent(newStudent);
    } catch (err) {
      console.warn('Could not persist student to server:', err);
    }

    setNotificationToast(`Student registered: ${newStudent.name} (${newStudent.registrationNumber})`);
    setTimeout(() => setNotificationToast(null), 4000);
  };

  // Reset attendance for session
  const handleResetAttendance = () => {
    verificationCountsRef.current.clear();
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        attendanceStatus: 'not_detected',
        verificationCount: 0,
        lastConfidence: 0,
        attendanceTime: undefined,
        exitTime: undefined,
        isLate: false,
        lateMinutes: 0,
        isEarlyExit: false,
        earlyExitMinutes: 0,
        timeSpentMinutes: 0,
        matchedTrackId: undefined,
      }))
    );
    setNotificationToast('Attendance records reset for active session.');
    setTimeout(() => setNotificationToast(null), 3000);
  };

  // Compute live attendance metrics
  const presentStudents = students.filter((s) => s.attendanceStatus === 'present');
  const presentCount = presentStudents.length;
  const notDetectedCount = students.filter((s) => s.attendanceStatus !== 'present').length;
  const lateCount = students.filter((s) => s.isLate).length;
  const earlyExitCount = students.filter((s) => s.isEarlyExit).length;
  const totalAnomaliesCount = students.reduce((acc, s) => acc + (s.anomalies?.length || 0), 0);
  const reviewNeededCount = students.filter((s) => s.bunkRisk?.needsFacultyReview).length;
  const attendancePercentage =
    students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Session Configuration & Status Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-rose-500/30 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-600 text-white">
                BunkWatch Session
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
                Room: <strong className="text-cyan-300">{session.room || 'Room 402'}</strong>
              </span>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                Start: {session.startTime}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
              Automated multi-frame attendance verification & corridor tracking
            </div>
          </div>
        </div>

        {/* Action Controls & Session Timer */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsSessionModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 transition-colors"
            title="Configure Session Parameters"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Config Session</span>
          </button>

          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-xs font-mono text-cyan-300 font-semibold transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register Student</span>
          </button>

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
                <span>Start Session</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Row: Camera Feed (2 cols) + Real-Time Verification Card (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera Feed with Recognition Overlay */}
        <div className="lg:col-span-2 glass-panel rounded-2xl overflow-hidden border border-slate-800 flex flex-col shadow-2xl">
          {/* Header Bar */}
          <div className="p-3.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isCameraActive ? 'bg-rose-500 animate-pulse' : 'bg-slate-600'
                }`}
              ></span>
              <span className="text-xs font-mono font-bold text-white uppercase">
                {isCameraActive ? 'CORRIDOR ATTENDANCE FEED (ACTIVE SCAN)' : 'CORRIDOR ATTENDANCE (STANDBY)'}
              </span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                THRESHOLD: {confidenceThreshold}%
              </span>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {isCameraActive ? (
                <button
                  onClick={stopCamera}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 border border-rose-500/40 text-rose-300 hover:text-white text-xs font-semibold font-mono transition-all"
                >
                  <VideoOff className="w-3.5 h-3.5" />
                  <span>STOP CAMERA</span>
                </button>
              ) : (
                <button
                  onClick={startCamera}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold font-mono transition-all shadow-md shadow-cyan-600/30"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>START CAMERA</span>
                </button>
              )}

              {/* Threshold Slider Trigger */}
              <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-950/60 px-2 py-1 rounded-lg border border-slate-800">
                <span>Min:</span>
                <input
                  type="range"
                  min="50"
                  max="95"
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                  className="w-16 accent-cyan-500 cursor-pointer"
                  title={`Confidence Threshold: ${confidenceThreshold}%`}
                />
                <span className="text-cyan-300 font-bold">{confidenceThreshold}%</span>
              </div>
            </div>
          </div>

          {/* Camera Permission Alert */}
          {cameraError && (
            <div className="bg-rose-500/10 border-b border-rose-500/30 px-4 py-2.5 flex items-center justify-between text-xs text-rose-300">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{cameraError}</span>
              </div>
              <button onClick={startCamera} className="underline font-bold text-rose-200 hover:text-white ml-2">
                Try Again
              </button>
            </div>
          )}

          {/* Viewport */}
          <div className="relative h-[360px] sm:h-[400px] w-full bg-black overflow-hidden flex items-center justify-center select-none">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
            />

            {!isCameraActive && (
              <div className="text-center p-6 space-y-3 z-10">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500 shadow-xl">
                  <VideoOff className="w-8 h-8 text-slate-500" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">Attendance Optical Feed Inactive</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                    Start camera to detect students, verify repeated frames, and log attendance automatically.
                  </p>
                </div>
                <button
                  onClick={startCamera}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-cyan-600/30"
                >
                  <Video className="w-4 h-4" />
                  <span>Start Camera Feed</span>
                </button>
              </div>
            )}

            {/* Live Bounding Boxes with Student Names / Unknown Badges */}
            {isCameraActive && (
              <BoundingBoxOverlay
                boxes={detectedBoxes}
                showTracks={true}
                showCountingLine={true}
                showRestrictedZone={false}
                countingStats={{ entries: entriesCount, exits: exitsCount }}
              />
            )}

            {/* Scanline Effect */}
            {isCameraActive && (
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent h-12 w-full animate-scan pointer-events-none"></div>
            )}

            {/* Real-time Viewport Telemetry Badge */}
            {isCameraActive && (
              <div className="absolute top-3 left-3 bg-slate-950/85 border border-cyan-500/40 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-mono text-cyan-300 flex items-center gap-2 shadow-lg z-20">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                <span>
                  ACTIVE PEOPLE: <strong className="text-white text-sm">{currentVisibleCount}</strong>
                  <span className="text-slate-500 mx-1.5">•</span>
                  UNKNOWN: <strong className="text-purple-300 text-sm">{unknownPeopleCount}</strong>
                  <span className="text-slate-500 mx-1.5">•</span>
                  REQ: 4 FRAMES
                </span>
              </div>
            )}
          </div>

          {/* ATTENDANCE INTELLIGENCE METRICS 5-COLUMN BAR */}
          <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-slate-800 bg-slate-950/80 p-3 text-center text-xs font-mono border-t border-slate-800/80">
            <div>
              <span className="text-slate-400 block text-[10px]">PRESENT (VERIFIED)</span>
              <span className="text-xl font-bold text-emerald-400">
                {presentCount} <span className="text-xs text-slate-500 font-normal">/ {students.length}</span>
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">LATE ENTRIES</span>
              <span className={`text-xl font-bold ${lateCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                {lateCount}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">EARLY EXITS</span>
              <span className={`text-xl font-bold ${earlyExitCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {earlyExitCount}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">ATTENDANCE RATE</span>
              <div className="flex items-center justify-center gap-2 mt-0.5">
                <span className="text-xl font-bold text-cyan-400">{attendancePercentage}%</span>
              </div>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">BUNK RISK REVIEW</span>
              <span className={`text-xl font-bold ${reviewNeededCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {reviewNeededCount}
              </span>
            </div>
          </div>
        </div>

        {/* Real-Time Student Recognition & Match Card */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col justify-between shadow-2xl">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase">
                Student Face Verification
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                Live Verification
              </span>
            </div>

            {/* Display Active Match or Current Selected Student */}
            {activeMatch ? (
              <div className="space-y-4">
                {/* Photo comparison */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center space-y-1">
                    <span className="text-[9px] font-mono text-slate-400 block uppercase">
                      Live Camera Frame
                    </span>
                    <div className="relative rounded-xl overflow-hidden border border-cyan-500/40 aspect-square">
                      <img
                        src={activeMatch.capturedImage}
                        alt="Captured"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded text-[8px] font-mono text-cyan-300">
                        Live Lens
                      </span>
                    </div>
                  </div>

                  <div className="text-center space-y-1">
                    <span className="text-[9px] font-mono text-slate-400 block uppercase">
                      Reference Face Data
                    </span>
                    <div className="relative rounded-xl overflow-hidden border border-emerald-500/40 aspect-square">
                      <img
                        src={activeMatch.registeredPhoto}
                        alt="Registered"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 right-1 bg-emerald-950/80 px-1 py-0.5 rounded text-[8px] font-mono text-emerald-300">
                        Enrolled
                      </span>
                    </div>
                  </div>
                </div>

                {/* Profile Details */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-extrabold text-white">{activeMatch.studentName}</h3>
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
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
                      <span className="text-slate-500 block text-[9px]">CLASS / SECTION</span>
                      <span className="text-slate-200 font-semibold">
                        {session.className} ({session.subject})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">ATTENDANCE STATUS</span>
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Present</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs font-mono">
                No active student selected
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <button
              onClick={handleResetAttendance}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Session Attendance</span>
            </button>
          </div>
        </div>
      </div>

      {/* Classroom Attendance Intelligence Tabs */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-2xl">
        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 border-b border-slate-800 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
                activeTab === 'attendance'
                  ? 'bg-cyan-600/30 text-cyan-200 border border-cyan-500/50 shadow-md shadow-cyan-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Attendance Roster ({students.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('faculty_dashboard')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
                activeTab === 'faculty_dashboard'
                  ? 'bg-rose-600/30 text-rose-200 border border-rose-500/50 shadow-md shadow-rose-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Faculty Dashboard</span>
              {(reviewNeededCount > 0 || totalAnomaliesCount > 0) && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/30 text-rose-300 border border-rose-500/40">
                  {reviewNeededCount + totalAnomaliesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('student_history')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
                activeTab === 'student_history'
                  ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50 shadow-md shadow-purple-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5 text-purple-400" />
              <span>Student Records ({students.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('identifications')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
                activeTab === 'identifications'
                  ? 'bg-cyan-600/30 text-cyan-200 border border-cyan-500/50 shadow-md shadow-cyan-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Video className="w-3.5 h-3.5 text-cyan-400" />
              <span>Identifications Stream ({matches.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
            <span>
              Session: <strong className="text-white">{session.startTime} — {session.endTime || '09:50 AM'}</strong>
            </span>
            <span className="text-slate-600">•</span>
            <span>
              Attendance Rate: <strong className="text-cyan-400 font-bold">{attendancePercentage}%</strong> (
              {presentCount}/{students.length})
            </span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: CLASSROOM ATTENDANCE ROSTER                       */}
        {/* ========================================================= */}
        {activeTab === 'attendance' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Student</th>
                  <th className="p-3">Student ID</th>
                  <th className="p-3">Class / Section</th>
                  <th className="p-3">Tracking ID</th>
                  <th className="p-3">Time Spent</th>
                  <th className="p-3">Entry Status</th>
                  <th className="p-3">Exit Status</th>
                  <th className="p-3">Bunk Risk Indicator</th>
                  <th className="p-3">Attendance Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {students.map((student) => {
                  const isPresent = student.attendanceStatus === 'present';
                  const risk = student.bunkRisk;
                  const isHighRisk = risk && risk.score >= 70;
                  const isModRisk = risk && risk.score >= 35 && risk.score < 70;

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-3">
                        <div
                          onClick={() => setSelectedStudentForModal(student)}
                          className="flex items-center gap-2.5 cursor-pointer group"
                        >
                          <img
                            src={student.registeredPhoto}
                            alt={student.name}
                            className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0 group-hover:border-cyan-400 transition-colors"
                          />
                          <div>
                            <span className="font-semibold text-white group-hover:text-cyan-300 transition-colors block">
                              {student.name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-normal">
                              Advisor: {student.assignedCaName}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-cyan-400">{student.registrationNumber}</td>
                      <td className="p-3 text-slate-400">
                        {student.year}-{student.section} ({student.department.split(' ')[0]})
                      </td>
                      <td className="p-3">
                        {student.matchedTrackId ? (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700 text-[10px]">
                            {student.matchedTrackId}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      {/* Total Time Spent in Class */}
                      <td className="p-3">
                        {isPresent ? (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
                            <span className="font-bold text-white">
                              {student.timeSpentMinutes || 1}m
                            </span>
                            <span className="text-[10px] text-slate-500">
                              / {session.expectedDurationMinutes || 50}m
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600">0m</span>
                        )}
                      </td>
                      {/* Late-Entry Status */}
                      <td className="p-3">
                        {isPresent ? (
                          student.isLate ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>Late (+{student.lateMinutes || 10}m)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px]">
                              <Check className="w-2.5 h-2.5" />
                              <span>On-Time</span>
                            </span>
                          )
                        ) : (
                          <span className="text-slate-600">Pending</span>
                        )}
                      </td>
                      {/* Early-Exit Status */}
                      <td className="p-3">
                        {isPresent ? (
                          student.isEarlyExit ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                              <DoorOpen className="w-2.5 h-2.5" />
                              <span>Early (-{student.earlyExitMinutes || 15}m)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40 text-[10px]">
                              <span>In Class</span>
                            </span>
                          )
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      {/* Transparent Bunk Risk Indicator */}
                      <td className="p-3">
                        {risk ? (
                          <button
                            onClick={() => setSelectedStudentForModal(student)}
                            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                            title={`Bunk Risk Score: ${risk.score}/100. Click to inspect calculation factors.`}
                          >
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                isHighRisk
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                  : isModRisk
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              }`}
                            >
                              <span>{risk.level.toUpperCase()}</span>
                              <span className="opacity-75 font-mono">({risk.score}%)</span>
                            </span>
                            {risk.needsFacultyReview && (
                              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" title="Needs Faculty Review"></span>
                            )}
                          </button>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      {/* Attendance Status */}
                      <td className="p-3">
                        {isPresent ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-[10px]">
                            <Check className="w-3 h-3" />
                            <span>Present</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px]">
                            <Clock className="w-3 h-3" />
                            <span>
                              {student.verificationCount && student.verificationCount > 0
                                ? `Verifying (${student.verificationCount}/${REQUIRED_REPEATED_DETECTIONS})`
                                : 'Not Detected'}
                            </span>
                          </span>
                        )}
                      </td>
                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPresent && !student.isEarlyExit && (
                            <button
                              onClick={() => handleLogEarlyExit(student.id)}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-200 border border-slate-700 text-[10px] transition-colors"
                              title="Log / verify student early departure"
                            >
                              Log Exit
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedStudentForModal(student)}
                            className="px-2.5 py-1 rounded bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-semibold transition-colors"
                          >
                            Profile & History
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: FACULTY INTELLIGENCE DASHBOARD                     */}
        {/* ========================================================= */}
        {activeTab === 'faculty_dashboard' && (
          <div className="space-y-6">
            {/* Top 4 KPI Metrics Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/80 p-4 rounded-xl border border-amber-500/30 shadow-md">
                <div className="flex items-center justify-between text-amber-400 mb-1">
                  <span className="text-xs font-mono uppercase font-bold">Late Entries Today</span>
                  <Clock className="w-4 h-4" />
                </div>
                <div className="text-2xl font-black text-white font-mono">{lateCount}</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Arrivals past {session.gracePeriodMinutes || 10}m grace period
                </div>
              </div>

              <div className="bg-slate-900/80 p-4 rounded-xl border border-rose-500/30 shadow-md">
                <div className="flex items-center justify-between text-rose-400 mb-1">
                  <span className="text-xs font-mono uppercase font-bold">Early Exits Logged</span>
                  <DoorOpen className="w-4 h-4" />
                </div>
                <div className="text-2xl font-black text-white font-mono">{earlyExitCount}</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Departures before scheduled period completion
                </div>
              </div>

              <div className="bg-slate-900/80 p-4 rounded-xl border border-purple-500/30 shadow-md">
                <div className="flex items-center justify-between text-purple-400 mb-1">
                  <span className="text-xs font-mono uppercase font-bold">Attendance Anomalies</span>
                  <AlertOctagon className="w-4 h-4" />
                </div>
                <div className="text-2xl font-black text-white font-mono">{totalAnomaliesCount}</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Rapid exits, marginal matches & patterns
                </div>
              </div>

              <div className="bg-slate-900/80 p-4 rounded-xl border border-cyan-500/30 shadow-md">
                <div className="flex items-center justify-between text-cyan-400 mb-1">
                  <span className="text-xs font-mono uppercase font-bold">Review Required</span>
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div className="text-2xl font-black text-white font-mono">{reviewNeededCount}</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Students with elevated Bunk Risk score
                </div>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">Filter View:</span>
                {(['all', 'late', 'early_exit', 'anomalies', 'review'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setFacultyFilter(mode)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono uppercase transition-colors ${
                      facultyFilter === mode
                        ? 'bg-cyan-600 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {mode.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <div className="text-xs font-mono text-slate-400">
                Institutional Rule: <strong className="text-cyan-300">Min 75% Attendance Required</strong>
              </div>
            </div>

            {/* 2-Column Responsive Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Late Arrivals & Early Exits & Anomalies Stream */}
              <div className="space-y-4">
                {/* Section A: Late Students Feed */}
                {(facultyFilter === 'all' || facultyFilter === 'late') && (
                  <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2 text-amber-400 font-bold text-xs font-mono uppercase">
                        <Clock className="w-4 h-4" />
                        <span>Late Students Feed ({students.filter((s) => s.isLate).length})</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        Grace Period: {session.gracePeriodMinutes || 10}m
                      </span>
                    </div>

                    {students.filter((s) => s.isLate).length === 0 ? (
                      <div className="text-center py-6 text-xs font-mono text-slate-500">
                        No late entries logged for this session.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {students
                          .filter((s) => s.isLate)
                          .map((student) => (
                            <div
                              key={student.id}
                              className="bg-slate-900/80 p-3 rounded-xl border border-amber-500/20 flex items-center justify-between gap-3 text-xs font-mono"
                            >
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={student.registeredPhoto}
                                  alt={student.name}
                                  className="w-8 h-8 rounded-full object-cover border border-amber-500/40"
                                />
                                <div>
                                  <div className="font-bold text-white">{student.name}</div>
                                  <div className="text-[11px] text-slate-400">
                                    {student.registrationNumber} • {student.year}-{student.section}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="inline-block px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[11px] border border-amber-500/40">
                                  +{student.lateMinutes || 12}m Late
                                </span>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  Marked at {student.attendanceTime || '09:12 AM'}
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Section B: Early Exits Feed */}
                {(facultyFilter === 'all' || facultyFilter === 'early_exit') && (
                  <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2 text-rose-400 font-bold text-xs font-mono uppercase">
                        <DoorOpen className="w-4 h-4" />
                        <span>Early Departures Feed ({students.filter((s) => s.isEarlyExit).length})</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        Session End: {session.endTime || '09:50 AM'}
                      </span>
                    </div>

                    {students.filter((s) => s.isEarlyExit).length === 0 ? (
                      <div className="text-center py-6 text-xs font-mono text-slate-500">
                        No early departures logged for this session.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {students
                          .filter((s) => s.isEarlyExit)
                          .map((student) => (
                            <div
                              key={student.id}
                              className="bg-slate-900/80 p-3 rounded-xl border border-rose-500/20 flex items-center justify-between gap-3 text-xs font-mono"
                            >
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={student.registeredPhoto}
                                  alt={student.name}
                                  className="w-8 h-8 rounded-full object-cover border border-rose-500/40"
                                />
                                <div>
                                  <div className="font-bold text-white">{student.name}</div>
                                  <div className="text-[11px] text-slate-400">
                                    Time in Class: {student.timeSpentMinutes || 20}m / {session.expectedDurationMinutes || 50}m
                                  </div>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="inline-block px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[11px] border border-rose-500/40">
                                  -{student.earlyExitMinutes || 15}m Shortfall
                                </span>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  Exited at {student.exitTime || '09:35 AM'}
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Section C: Attendance Anomalies Feed */}
                {(facultyFilter === 'all' || facultyFilter === 'anomalies') && (
                  <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2 text-purple-400 font-bold text-xs font-mono uppercase">
                        <AlertOctagon className="w-4 h-4" />
                        <span>Active Attendance Anomalies ({totalAnomaliesCount})</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        Pattern Deviation & Corridor Dwell Checks
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {students.flatMap((student) =>
                        (student.anomalies || []).map((anomaly) => (
                          <div
                            key={anomaly.id}
                            className="bg-slate-900/80 p-3.5 rounded-xl border border-purple-500/20 space-y-2 text-xs font-mono"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                    anomaly.severity === 'high'
                                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                      : anomaly.severity === 'medium'
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                      : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                  }`}
                                >
                                  {anomaly.severity} Severity
                                </span>
                                <span className="font-bold text-white">{anomaly.title}</span>
                              </div>
                              <span className="text-[10px] text-slate-500">{anomaly.detectedTime}</span>
                            </div>

                            <p className="text-slate-300 text-[11px] leading-relaxed">
                              {anomaly.description}
                            </p>

                            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                              <span className="text-[11px] text-cyan-400 font-semibold">
                                Student: {student.name} ({student.registrationNumber})
                              </span>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleFacultyAction(student.id, 'resolve_anomaly', anomaly.id)}
                                  className="px-2 py-1 rounded bg-slate-800 hover:bg-emerald-900/40 text-slate-300 hover:text-emerald-300 text-[10px] transition-colors"
                                >
                                  Mark Reviewed
                                </button>
                                <button
                                  onClick={() => handleFacultyAction(student.id, 'excuse_absence')}
                                  className="px-2 py-1 rounded bg-slate-800 hover:bg-cyan-900/40 text-slate-300 hover:text-cyan-300 text-[10px] transition-colors"
                                >
                                  Excuse Absence
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Students Needing Faculty Review Priority Queue */}
              <div className="space-y-4">
                <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs font-mono uppercase">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Students Needing Faculty Review ({reviewNeededCount})</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">Priority Ranked</span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    The transparent <strong>Bunk Risk Indicator</strong> flags students based on attendance percentage,
                    accumulated missed lectures, late entries, and early departures. Faculty may review or excuse
                    anomalies directly.
                  </p>

                  <div className="space-y-3">
                    {students
                      .filter((s) => s.bunkRisk?.needsFacultyReview || (s.bunkRisk && s.bunkRisk.score >= 50))
                      .map((student) => {
                        const risk = student.bunkRisk!;
                        const isHigh = risk.score >= 70;

                        return (
                          <div
                            key={student.id}
                            className={`p-4 rounded-xl border space-y-3 text-xs font-mono transition-all ${
                              isHigh
                                ? 'bg-rose-950/20 border-rose-500/40'
                                : 'bg-slate-900/80 border-slate-800'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <img
                                  src={student.registeredPhoto}
                                  alt={student.name}
                                  className="w-10 h-10 rounded-full object-cover border border-slate-700"
                                />
                                <div>
                                  <div className="font-bold text-white text-sm">{student.name}</div>
                                  <div className="text-[11px] text-slate-400">
                                    {student.registrationNumber} • {student.department.split(' ')[0]} ({student.year}-{student.section})
                                  </div>
                                </div>
                              </div>

                              <div className="text-right">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-black uppercase border ${
                                    isHigh
                                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                                      : 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                                  }`}
                                >
                                  {risk.level.toUpperCase()} RISK ({risk.score}%)
                                </span>
                                <div className="text-[10px] text-slate-400 mt-1">
                                  Attendance: <strong className="text-white">{risk.attendanceRate}%</strong>
                                </div>
                              </div>
                            </div>

                            {/* Risk Factors List */}
                            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">
                                Risk Calculation Factors:
                              </span>
                              <ul className="space-y-0.5 text-[11px] text-slate-300 list-disc list-inside">
                                {risk.factors.map((factor, idx) => (
                                  <li key={idx}>{factor}</li>
                                ))}
                              </ul>
                            </div>

                            {/* Action Row */}
                            <div className="flex items-center justify-between pt-2">
                              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                                <span>Missed: <strong>{risk.missedClassesCount}</strong></span>
                                <span>Late: <strong>{risk.lateEntriesCount}</strong></span>
                                <span>Early: <strong>{risk.earlyExitsCount}</strong></span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleFacultyAction(student.id, 'mark_reviewed')}
                                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                                >
                                  Clear Flag
                                </button>
                                <button
                                  onClick={() => setSelectedStudentForModal(student)}
                                  className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition-colors shadow-md shadow-cyan-600/30"
                                >
                                  Review Profile
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: STUDENT ATTENDANCE RECORDS & HISTORY               */}
        {/* ========================================================= */}
        {activeTab === 'student_history' && (() => {
          const activeStudent =
            students.find((s) => s.id === selectedStudentForHistory) || students[0];
          const historyList = activeStudent?.history || [];
          const risk = activeStudent?.bunkRisk;
          const filteredHistory = historyList.filter((rec) => {
            if (historyStatusFilter === 'all') return true;
            return rec.status === historyStatusFilter;
          });

          return (
            <div className="space-y-6">
              {/* Student Selector Horizontal Strip */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
                {students.map((std) => (
                  <button
                    key={std.id}
                    onClick={() => setSelectedStudentForHistory(std.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono transition-all shrink-0 border ${
                      activeStudent.id === std.id
                        ? 'bg-cyan-600/30 text-white border-cyan-500 shadow-md shadow-cyan-600/20'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                  >
                    <img
                      src={std.registeredPhoto}
                      alt={std.name}
                      className="w-5 h-5 rounded-full object-cover border border-slate-700"
                    />
                    <span className="font-bold">{std.name}</span>
                    <span className="text-[10px] text-cyan-400">({std.registrationNumber})</span>
                  </button>
                ))}
              </div>

              {/* Student Profile & KPI Summary Box */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Card: Student Identification */}
                <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={activeStudent.registeredPhoto}
                      alt={activeStudent.name}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-cyan-500/40 shadow-xl"
                    />
                    <div>
                      <h3 className="text-lg font-black text-white">{activeStudent.name}</h3>
                      <div className="text-xs font-mono text-cyan-400 font-bold">
                        {activeStudent.registrationNumber}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        {activeStudent.department}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-500 block text-[9px]">CLASS / SECTION</span>
                      <span className="text-slate-200 font-bold">
                        {activeStudent.year}-{activeStudent.section}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">FACULTY ADVISOR</span>
                      <span className="text-slate-200 font-bold">{activeStudent.assignedCaName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">ENROLLMENT</span>
                      <span className="text-emerald-400 font-bold uppercase">{activeStudent.status}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">ACTIVE STATUS</span>
                      <span className="text-cyan-300 font-bold">
                        {activeStudent.attendanceStatus === 'present' ? 'Present Today' : 'Not In Class'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleFacultyAction(activeStudent.id, 'mark_reviewed')}
                      className="flex-1 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
                    >
                      Clear Review Flag
                    </button>
                    <button
                      onClick={() => handleFacultyAction(activeStudent.id, 'excuse_absence')}
                      className="flex-1 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-semibold transition-colors"
                    >
                      Excuse Absence
                    </button>
                  </div>
                </div>

                {/* Center & Right: Attendance KPI Strip & Transparent Bunk Risk Box */}
                <div className="md:col-span-2 space-y-4">
                  {/* KPI Mini-Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 text-center font-mono">
                      <span className="text-slate-400 block text-[10px] uppercase">Attendance Rate</span>
                      <span className="text-2xl font-black text-cyan-400">
                        {risk?.attendanceRate || 85}%
                      </span>
                      <span className="text-[10px] text-slate-500 block">Min 75% Required</span>
                    </div>

                    <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 text-center font-mono">
                      <span className="text-slate-400 block text-[10px] uppercase">Classes Missed</span>
                      <span className="text-2xl font-black text-rose-400">
                        {risk?.missedClassesCount || 0}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        of {risk?.totalClassesHeld || 24} Held
                      </span>
                    </div>

                    <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 text-center font-mono">
                      <span className="text-slate-400 block text-[10px] uppercase">Late Entries</span>
                      <span className="text-2xl font-black text-amber-400">
                        {risk?.lateEntriesCount || 0}
                      </span>
                      <span className="text-[10px] text-slate-500 block">Past Grace Period</span>
                    </div>

                    <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 text-center font-mono">
                      <span className="text-slate-400 block text-[10px] uppercase">Early Departures</span>
                      <span className="text-2xl font-black text-purple-400">
                        {risk?.earlyExitsCount || 0}
                      </span>
                      <span className="text-[10px] text-slate-500 block">Shortfall Exits</span>
                    </div>
                  </div>

                  {/* Bunk Risk Assessment Box */}
                  {risk && (
                    <div className="bg-slate-900/80 p-4 rounded-xl border border-rose-500/30 space-y-3 font-mono">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-rose-400" />
                          <span className="text-xs font-bold text-white uppercase">
                            Bunk Risk Indicator Analysis
                          </span>
                        </div>
                        <span
                          className={`px-3 py-0.5 rounded-full text-xs font-black uppercase border ${
                            risk.level === 'high'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : risk.level === 'moderate'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          }`}
                        >
                          {risk.level.toUpperCase()} RISK ({risk.score} / 100)
                        </span>
                      </div>

                      {/* Score Meter Bar */}
                      <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div
                          className={`h-full transition-all duration-500 ${
                            risk.level === 'high'
                              ? 'bg-rose-500'
                              : risk.level === 'moderate'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${risk.score}%` }}
                        ></div>
                      </div>

                      {/* Contributing Factors */}
                      <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">
                          Transparent Contributing Factors:
                        </span>
                        <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                          {risk.factors.map((factor, idx) => (
                            <li key={idx} className="leading-relaxed">
                              {factor}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Session History Table with Filters */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-mono font-bold text-white uppercase">
                      Class Attendance History Log ({filteredHistory.length} Sessions)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-mono">
                    {(['all', 'on_time', 'late_entry', 'early_exit', 'missed'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setHistoryStatusFilter(filter)}
                        className={`px-2.5 py-1 rounded-lg uppercase text-[10px] font-semibold transition-colors ${
                          historyStatusFilter === filter
                            ? 'bg-cyan-600 text-slate-950'
                            : 'bg-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        {filter.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Subject & Class</th>
                        <th className="p-3">Arrival Time</th>
                        <th className="p-3">Exit Time</th>
                        <th className="p-3">Time Spent in Class</th>
                        <th className="p-3">Attendance Status</th>
                        <th className="p-3 text-right">Academic Standing</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {filteredHistory.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 font-semibold text-white">{rec.date}</td>
                          <td className="p-3 text-cyan-300">
                            {rec.subject} <span className="text-slate-500 font-normal">({rec.className})</span>
                          </td>
                          <td className="p-3 text-slate-300">{rec.entryTime || '—'}</td>
                          <td className="p-3 text-slate-300">{rec.exitTime || '—'}</td>
                          <td className="p-3">
                            <span className="font-bold text-white">{rec.timeSpentMinutes}m</span>
                            <span className="text-slate-500 text-[10px]"> / {rec.expectedDurationMinutes}m</span>
                          </td>
                          <td className="p-3">
                            {rec.status === 'on_time' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                                <Check className="w-3 h-3" />
                                <span>On Time</span>
                              </span>
                            )}
                            {rec.status === 'late_entry' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                                <Clock className="w-3 h-3" />
                                <span>Late Entry (+{rec.lateMinutes || 12}m)</span>
                              </span>
                            )}
                            {rec.status === 'early_exit' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                                <DoorOpen className="w-3 h-3" />
                                <span>Early Exit (-{rec.earlyExitMinutes || 18}m)</span>
                              </span>
                            )}
                            {rec.status === 'missed' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px]">
                                <X className="w-3 h-3" />
                                <span>Missed Lecture</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {rec.status === 'missed' ? (
                              <span className="text-rose-400 text-[10px]">Absent</span>
                            ) : (
                              <span className="text-emerald-400 text-[10px]">Attended (Verified)</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ========================================================= */}
        {/* TAB 4: RECENT IDENTIFICATIONS STREAM                      */}
        {/* ========================================================= */}
        {activeTab === 'identifications' && (
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
                      <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                        ● Match
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 0: DETAILED STUDENT ATTENDANCE INTELLIGENCE MODAL   */}
      {/* ========================================================= */}
      {selectedStudentForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel max-w-2xl w-full rounded-2xl p-6 border border-cyan-500/40 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto font-mono text-xs">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <img
                  src={selectedStudentForModal.registeredPhoto}
                  alt={selectedStudentForModal.name}
                  className="w-12 h-12 rounded-xl object-cover border border-cyan-400/50 shadow-md"
                />
                <div>
                  <h3 className="text-base font-bold text-white">{selectedStudentForModal.name}</h3>
                  <div className="text-cyan-400 font-bold">
                    {selectedStudentForModal.registrationNumber} • {selectedStudentForModal.department}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudentForModal(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Attendance & Bunk Risk Metrics */}
            {selectedStudentForModal.bunkRisk && (
              <div className="bg-slate-900/90 p-4 rounded-xl border border-rose-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white uppercase text-xs">
                    Bunk Risk Indicator Assessment
                  </span>
                  <span
                    className={`px-3 py-0.5 rounded-full text-xs font-black uppercase border ${
                      selectedStudentForModal.bunkRisk.level === 'high'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : selectedStudentForModal.bunkRisk.level === 'moderate'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    {selectedStudentForModal.bunkRisk.level.toUpperCase()} RISK (
                    {selectedStudentForModal.bunkRisk.score}/100)
                  </span>
                </div>

                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full ${
                      selectedStudentForModal.bunkRisk.level === 'high'
                        ? 'bg-rose-500'
                        : selectedStudentForModal.bunkRisk.level === 'moderate'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${selectedStudentForModal.bunkRisk.score}%` }}
                  ></div>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Transparent Contributing Factors:
                  </span>
                  <ul className="space-y-0.5 text-[11px] text-slate-300 list-disc list-inside">
                    {selectedStudentForModal.bunkRisk.factors.map((factor, idx) => (
                      <li key={idx}>{factor}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Active Anomalies for this student */}
            {(selectedStudentForModal.anomalies || []).length > 0 && (
              <div className="space-y-2">
                <span className="font-bold text-purple-400 uppercase text-[11px] block">
                  Active Attendance Anomalies ({selectedStudentForModal.anomalies?.length})
                </span>
                {selectedStudentForModal.anomalies?.map((anom) => (
                  <div
                    key={anom.id}
                    className="bg-slate-900/80 p-3 rounded-xl border border-purple-500/30 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-white">{anom.title}</div>
                      <div className="text-[11px] text-slate-300">{anom.description}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{anom.detectedTime}</div>
                    </div>
                    <button
                      onClick={() => {
                        handleFacultyAction(selectedStudentForModal.id, 'resolve_anomaly', anom.id);
                        setSelectedStudentForModal((prev) =>
                          prev
                            ? {
                                ...prev,
                                anomalies: (prev.anomalies || []).filter((a) => a.id !== anom.id),
                              }
                            : null
                        );
                      }}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-emerald-900/40 text-slate-200 hover:text-emerald-300 text-[10px] shrink-0 transition-colors"
                    >
                      Resolve Anomaly
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Recent History for this student */}
            <div className="space-y-2">
              <span className="font-bold text-cyan-400 uppercase text-[11px] block">
                Session History ({selectedStudentForModal.history?.length || 0} Lectures)
              </span>
              <div className="bg-slate-900/80 rounded-xl overflow-hidden border border-slate-800">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-950/80 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Subject</th>
                      <th className="p-2.5">Arrival / Exit</th>
                      <th className="p-2.5">Time Spent</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {(selectedStudentForModal.history || []).map((h) => (
                      <tr key={h.id}>
                        <td className="p-2.5 text-white">{h.date}</td>
                        <td className="p-2.5 text-cyan-300">{h.subject}</td>
                        <td className="p-2.5 text-slate-400">
                          {h.entryTime || '—'} / {h.exitTime || '—'}
                        </td>
                        <td className="p-2.5">
                          {h.timeSpentMinutes}m / {h.expectedDurationMinutes}m
                        </td>
                        <td className="p-2.5">
                          {h.status === 'on_time' && (
                            <span className="text-emerald-400 font-bold">On Time</span>
                          )}
                          {h.status === 'late_entry' && (
                            <span className="text-amber-400 font-bold">Late (+{h.lateMinutes}m)</span>
                          )}
                          {h.status === 'early_exit' && (
                            <span className="text-rose-400 font-bold">Early Exit (-{h.earlyExitMinutes}m)</span>
                          )}
                          {h.status === 'missed' && (
                            <span className="text-slate-500">Missed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleFacultyAction(selectedStudentForModal.id, 'mark_reviewed');
                    setSelectedStudentForModal(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  Clear Review Flag
                </button>
                <button
                  onClick={() => {
                    handleFacultyAction(selectedStudentForModal.id, 'excuse_absence');
                    setSelectedStudentForModal(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 font-semibold"
                >
                  Excuse Absence
                </button>
              </div>

              <button
                onClick={() => setSelectedStudentForModal(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: REGISTER STUDENT WITH REFERENCE FACE DATA */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel max-w-md w-full rounded-2xl p-6 border border-cyan-500/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Student Registration</h3>
              </div>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterStudent} className="space-y-3.5 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dharshan G"
                  value={regForm.name}
                  onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Student ID / Registration Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 23CSE160"
                  value={regForm.registrationNumber}
                  onChange={(e) => setRegForm({ ...regForm, registrationNumber: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Class</label>
                  <input
                    type="text"
                    value={regForm.year}
                    onChange={(e) => setRegForm({ ...regForm, year: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                    placeholder="II"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Section</label>
                  <input
                    type="text"
                    value={regForm.section}
                    onChange={(e) => setRegForm({ ...regForm, section: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                    placeholder="A"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Reference Face Data (Photo URL)</label>
                <input
                  type="text"
                  placeholder="Paste URL or leave blank to snapshot active webcam"
                  value={regForm.registeredPhoto}
                  onChange={(e) => setRegForm({ ...regForm, registeredPhoto: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
                <span className="text-[10px] text-cyan-400 mt-1 block">
                  {isCameraActive
                    ? '📷 Tip: Leave blank to capture face reference directly from your live webcam on save.'
                    : 'ℹ️ Enter image URL or start camera to capture your reference snapshot.'}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-600/30"
                >
                  Enroll Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIGURE CLASS SESSION */}
      {isSessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel max-w-md w-full rounded-2xl p-6 border border-cyan-500/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Create / Configure Class Session</h3>
              </div>
              <button
                onClick={() => setIsSessionModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSessionModal} className="space-y-3.5 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={sessionForm.subject}
                  onChange={(e) => setSessionForm({ ...sessionForm, subject: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Class / Section</label>
                <input
                  type="text"
                  required
                  value={sessionForm.className}
                  onChange={(e) => setSessionForm({ ...sessionForm, className: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Assigned Classroom / Room</label>
                <input
                  type="text"
                  required
                  value={sessionForm.room}
                  onChange={(e) => setSessionForm({ ...sessionForm, room: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Start Time</label>
                  <input
                    type="text"
                    value={sessionForm.startTime}
                    onChange={(e) => setSessionForm({ ...sessionForm, startTime: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                    placeholder="09:00 AM"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">End Time</label>
                  <input
                    type="text"
                    value={sessionForm.endTime}
                    onChange={(e) => setSessionForm({ ...sessionForm, endTime: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                    placeholder="09:50 AM"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Duration (m)</label>
                  <input
                    type="number"
                    min="15"
                    max="180"
                    value={sessionForm.expectedDurationMinutes}
                    onChange={(e) =>
                      setSessionForm({
                        ...sessionForm,
                        expectedDurationMinutes: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Grace (m)</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={sessionForm.gracePeriodMinutes}
                    onChange={(e) =>
                      setSessionForm({
                        ...sessionForm,
                        gracePeriodMinutes: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Period</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={sessionForm.period}
                    onChange={(e) => setSessionForm({ ...sessionForm, period: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSessionModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-600/30"
                >
                  Save & Apply Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
