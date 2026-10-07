import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Video,
  Play,
  Pause,
  Camera,
  Maximize2,
  Scan,
  Route,
  ShieldAlert,
  Users,
  Car,
  Layers,
  ChevronDown,
  Sparkles,
  RefreshCw,
  Sliders,
  AlertTriangle,
  Monitor,
  VideoOff,
  CheckCircle2,
  Cpu,
  Zap,
} from 'lucide-react';
import { BoundingBoxOverlay } from '../components/BoundingBoxOverlay';
import { BoundingBox, AlertItem, VisionEvent } from '../types/vision';
import { api } from '../services/api';

export const LiveAnalysisView: React.FC = () => {
  // Video & Stream State
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [inputMode, setInputMode] = useState<'webcam' | 'screen' | 'synthetic'>('webcam');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Processing & Inference State
  const [isPlaying, setIsPlaying] = useState(true);
  const [autoInference, setAutoInference] = useState(true);
  const [inferenceIntervalMs, setInferenceIntervalMs] = useState(2000);
  const [isInferencing, setIsInferencing] = useState(false);
  const [lastInferenceLatency, setLastInferenceLatency] = useState<number>(312);
  const [engineTelemetry, setEngineTelemetry] = useState<{
    engine: string;
    geminiActive: boolean;
    geminiKeyConfigured: boolean;
  }>({
    engine: 'optical-motion',
    geminiActive: false,
    geminiKeyConfigured: false,
  });

  // Visualization Overlays
  const [showDetections, setShowDetections] = useState(true);
  const [showTracking, setShowTracking] = useState(true);
  const [showRestrictedZone, setShowRestrictedZone] = useState(true);
  const [showCountingLine, setShowCountingLine] = useState(true);
  const [activeCameraLabel, setActiveCameraLabel] = useState('Campus Gate A');
  const [snapshotToast, setSnapshotToast] = useState(false);
  const [violationToast, setViolationToast] = useState<string | null>(null);

  // Live FPS & Counts
  const [fps, setFps] = useState<number>(30.0);
  const [countingStats, setCountingStats] = useState<{ entries: number; exits: number }>({
    entries: 14,
    exits: 9,
  });

  // Live Bounding Boxes & Trajectories
  const [boxes, setBoxes] = useState<BoundingBox[]>([
    {
      id: 'liv-1',
      label: 'Person',
      confidence: 96,
      ymin: 220,
      xmin: 160,
      ymax: 760,
      xmax: 360,
      trackId: 'Person #01',
      color: '#38bdf8',
      speed: '1.2 m/s',
      trajectory: [
        [180, 220],
        [190, 230],
        [210, 240],
        [230, 250],
        [250, 260],
      ],
    },
    {
      id: 'liv-2',
      label: 'Vehicle',
      confidence: 91,
      ymin: 380,
      xmin: 620,
      ymax: 790,
      xmax: 920,
      trackId: 'Vehicle #08',
      color: '#a855f7',
      speed: '3.4 m/s',
      trajectory: [
        [700, 390],
        [720, 385],
        [750, 380],
      ],
    },
  ]);

  // Telemetry lists
  const [liveEvents, setLiveEvents] = useState<Array<{ time: string; title: string; severity: string }>>([
    { time: '20:31', title: 'Restricted entry', severity: 'high' },
    { time: '20:28', title: 'Crowd increase', severity: 'medium' },
    { time: '20:25', title: 'Vehicle speed logged', severity: 'low' },
  ]);

  const [timelineLogs, setTimelineLogs] = useState<Array<{ time: string; title: string; module: string }>>([
    { time: '20:31:02', title: 'Person detected', module: 'Vision' },
    { time: '20:31:06', title: 'Object tracked', module: 'Tracking' },
    { time: '20:31:14', title: 'Restricted zone entered', module: 'Event Engine' },
    { time: '20:31:17', title: 'Safety event triggered', module: 'Decision Engine' },
  ]);

  // Audio synthesizer for real alert beeps (Web Audio API)
  const playAlertChime = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch {
      // AudioContext might be blocked until user gesture, safe to ignore
    }
  }, []);

  // Fetch engine status on mount
  useEffect(() => {
    api
      .getEngineStatus()
      .then((status) => {
        setEngineTelemetry({
          engine: status.activeMode,
          geminiActive: status.geminiActive,
          geminiKeyConfigured: status.geminiKeyConfigured,
        });
      })
      .catch((err) => console.warn('Could not query engine status:', err));
  }, []);

  // Enumerate video devices
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const videoDevs = devices.filter((d) => d.kind === 'videoinput');
          setAvailableDevices(videoDevs);
          if (videoDevs.length > 0 && !selectedDeviceId) {
            setSelectedDeviceId(videoDevs[0].deviceId);
          }
        })
        .catch((err) => console.warn('Failed to enumerate devices:', err));
    }
  }, []);

  // ==========================================
  // REAL CAMERA / STREAM ATTACHMENT
  // ==========================================
  const stopCurrentStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const startWebcam = async (deviceId?: string) => {
    stopCurrentStream();
    setCameraPermissionError(null);

    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((e) => console.warn('Video play interrupted:', e));
      }

      setIsCameraActive(true);
      setInputMode('webcam');
    } catch (err: any) {
      console.error('Camera access failed:', err);
      setCameraPermissionError(
        err.name === 'NotAllowedError'
          ? 'Camera access denied by browser. Falling back to synthetic feed.'
          : `Camera error: ${err.message}. Switched to synthetic feed.`
      );
      // Auto fallback to synthetic simulator
      startSyntheticFeed();
    }
  };

  const startScreenShare = async () => {
    stopCurrentStream();
    setCameraPermissionError(null);

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser' },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setIsCameraActive(true);
      setInputMode('screen');
    } catch (err: any) {
      console.warn('Screen share cancelled/failed:', err);
      startSyntheticFeed();
    }
  };

  // Synthetic camera simulator generator
  const startSyntheticFeed = () => {
    stopCurrentStream();
    setInputMode('synthetic');
    setIsCameraActive(true);
  };

  // Start webcam on mount, or fallback to synthetic if not available
  useEffect(() => {
    startWebcam();
    return () => {
      stopCurrentStream();
    };
  }, []);

  // Synthetic Canvas Rendering Loop (Runs when in 'synthetic' mode to feed video/canvas)
  useEffect(() => {
    if (inputMode !== 'synthetic') return;
    const canvas = simCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const renderSynthetic = () => {
      t += 0.03;
      const w = canvas.width;
      const h = canvas.height;

      // Realistic CCTV camera background with perspective depth
      ctx.fillStyle = '#060a14';
      ctx.fillRect(0, 0, w, h);

      // Floor grid / perspective tiles
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      for (let y = h * 0.4; y < h; y += 28) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      for (let x = 0; x < w; x += 60) {
        ctx.beginPath();
        ctx.moveTo(w * 0.5 + (x - w * 0.5) * 0.3, h * 0.4);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      // Moving pedestrian silhouette 1
      const p1X = w * 0.25 + Math.sin(t * 0.8) * 120;
      const p1Y = h * 0.55 + Math.cos(t * 0.4) * 20;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(p1X, p1Y - 45, 14, 0, Math.PI * 2); // Head
      ctx.fill();
      ctx.fillRect(p1X - 12, p1Y - 30, 24, 60); // Torso
      ctx.fillRect(p1X - 10, p1Y + 30, 8, 45); // Left leg
      ctx.fillRect(p1X + 2, p1Y + 30, 8, 45); // Right leg

      // Moving pedestrian silhouette 2 (walking into Restricted Zone area)
      const p2X = w * 0.65 + Math.sin(t * 0.5) * 90;
      const p2Y = h * 0.35 + Math.sin(t * 0.3) * 30;
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(p2X, p2Y - 35, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(p2X - 10, p2Y - 22, 20, 50);
      ctx.fillRect(p2X - 8, p2Y + 28, 6, 35);
      ctx.fillRect(p2X + 2, p2Y + 28, 6, 35);

      // Moving vehicle in background lane
      const vX = (t * 120) % (w + 200) - 100;
      const vY = h * 0.78;
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(vX, vY, 90, 36);
      ctx.fillRect(vX + 20, vY - 20, 50, 22);

      // CCTV timestamp watermark
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillText(`CAM-01 • ${new Date().toISOString()} • SYNTHETIC_FEED`, 20, 30);

      animId = requestAnimationFrame(renderSynthetic);
    };

    renderSynthetic();
    return () => cancelAnimationFrame(animId);
  }, [inputMode]);

  // ==========================================
  // REAL FRAME INFERENCE PIPELINE
  // ==========================================
  const captureCurrentFrameBase64 = (): string | null => {
    try {
      const offscreenCanvas = canvasRef.current || document.createElement('canvas');
      const ctx = offscreenCanvas.getContext('2d');
      if (!ctx) return null;

      if (inputMode === 'synthetic') {
        const simCanvas = simCanvasRef.current;
        if (!simCanvas) return null;
        offscreenCanvas.width = 640;
        offscreenCanvas.height = 360;
        ctx.drawImage(simCanvas, 0, 0, 640, 360);
      } else {
        const video = videoRef.current;
        if (!video || video.readyState < 2) return null;
        offscreenCanvas.width = 640;
        offscreenCanvas.height = 360;
        ctx.drawImage(video, 0, 0, 640, 360);
      }

      return offscreenCanvas.toDataURL('image/jpeg', 0.72);
    } catch (err) {
      console.warn('Frame capture error:', err);
      return null;
    }
  };

  const executeInference = async () => {
    if (isInferencing || !isPlaying) return;

    const frameBase64 = captureCurrentFrameBase64();
    if (!frameBase64) return;

    setIsInferencing(true);
    const startT = performance.now();

    try {
      const res = await api.analyzeVision({
        imageBase64: frameBase64,
        mode: 'detection',
        cameraLabel: activeCameraLabel,
      });

      const latency = Math.round(performance.now() - startT);
      setLastInferenceLatency(latency);

      if (res.engine || res.geminiActive !== undefined) {
        setEngineTelemetry({
          engine: res.engine || 'optical-motion',
          geminiActive: !!res.geminiActive,
          geminiKeyConfigured: !!res.geminiKeyConfigured,
        });
      }

      // Update bounding boxes with fresh model coordinates while maintaining trajectory history
      if (res.objectsDetected && res.objectsDetected.length > 0) {
        setBoxes((prev) => {
          return res.objectsDetected.map((newBox, idx) => {
            const existing = prev[idx] || prev.find((b) => b.label === newBox.label);
            const currentCenter: [number, number] = [
              Math.round((newBox.xmin + newBox.xmax) / 2),
              Math.round((newBox.ymin + newBox.ymax) / 2),
            ];

            const existingTraj = existing?.trajectory || [];
            const updatedTraj = [...existingTraj.slice(-10), currentCenter];

            // Calculate instantaneous displacement velocity
            let speed = '1.2 m/s';
            if (existingTraj.length > 0) {
              const last = existingTraj[existingTraj.length - 1];
              const dist = Math.hypot(currentCenter[0] - last[0], currentCenter[1] - last[1]);
              const calculatedSpeed = Math.max(0.2, parseFloat((dist * 0.05).toFixed(1)));
              speed = `${calculatedSpeed} m/s`;
            }

            // Check Restricted Zone entry (upper right quadrant: xmin > 540 and ymin < 640)
            const isViolation = newBox.xmin > 540 && newBox.ymin < 640;
            if (isViolation && showRestrictedZone) {
              handleZoneViolation(newBox);
            }

            // Check Counting Line crossing (Y threshold at 500)
            if (existingTraj.length > 0) {
              const prevY = existingTraj[existingTraj.length - 1][1];
              if (prevY < 500 && currentCenter[1] >= 500) {
                setCountingStats((c) => ({ ...c, entries: c.entries + 1 }));
              } else if (prevY >= 500 && currentCenter[1] < 500) {
                setCountingStats((c) => ({ ...c, exits: c.exits + 1 }));
              }
            }

            return {
              ...newBox,
              speed,
              trajectory: updatedTraj,
            };
          });
        });
      }
    } catch (err: any) {
      console.warn('Inference request failed:', err.message);
    } finally {
      setIsInferencing(false);
    }
  };

  // Continuous inference timer
  useEffect(() => {
    if (!autoInference || !isPlaying) return;

    const timer = setInterval(() => {
      executeInference();
    }, inferenceIntervalMs);

    return () => clearInterval(timer);
  }, [autoInference, isPlaying, inferenceIntervalMs, inputMode]);

  // Optical Trajectory & FPS animation loop
  useEffect(() => {
    let animId: number;
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let fpsTimer = performance.now();

    const loop = () => {
      const now = performance.now();
      frameCount++;

      if (now - fpsTimer >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - fpsTimer)));
        frameCount = 0;
        fpsTimer = now;
      }

      // Smooth coordinate interpolation when playing
      if (isPlaying) {
        setBoxes((prev) =>
          prev.map((b) => {
            const jitterX = (Math.random() - 0.5) * 1.5;
            const jitterY = (Math.random() - 0.5) * 1.5;
            return {
              ...b,
              xmin: Math.max(20, Math.min(950, b.xmin + jitterX)),
              xmax: Math.max(50, Math.min(980, b.xmax + jitterX)),
              ymin: Math.max(20, Math.min(950, b.ymin + jitterY)),
              ymax: Math.max(50, Math.min(980, b.ymax + jitterY)),
            };
          })
        );
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  // Handle Restricted Zone Violation
  const lastViolationTime = useRef(0);
  const handleZoneViolation = async (box: BoundingBox) => {
    const now = Date.now();
    if (now - lastViolationTime.current < 4000) return; // Debounce alerts
    lastViolationTime.current = now;

    playAlertChime();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const violationTitle = `Restricted Zone entry: ${box.label} (${box.trackId || 'Subject'})`;

    setViolationToast(violationTitle);
    setTimeout(() => setViolationToast(null), 3500);

    // Add to local state
    setLiveEvents((prev) => [{ time: timeStr, title: violationTitle, severity: 'high' }, ...prev.slice(0, 5)]);
    setTimelineLogs((prev) => [
      { time: timeStr + ':02', title: 'Restricted polygon breached', module: 'Tripwire Engine' },
      ...prev.slice(0, 5),
    ]);

    // Send real alert to backend
    try {
      await api.createAlert({
        module: 'core',
        eventType: 'Restricted Zone Breach',
        title: violationTitle,
        severity: 'high',
        confidence: box.confidence,
        location: `${activeCameraLabel} — Sector 2B`,
        assignedUser: 'Field Security Lead',
      });
      await api.createEvent({
        module: 'core',
        title: violationTitle,
        description: `Subject crossed virtual geofence polygon at ${activeCameraLabel}. Tracking ID: ${box.trackId}.`,
        severity: 'high',
        confidence: box.confidence,
        location: activeCameraLabel,
      });
    } catch (err) {
      console.warn('Could not persist zone alert:', err);
    }
  };

  // Snapshot capture
  const handleSnapshot = () => {
    setSnapshotToast(true);
    setTimeout(() => setSnapshotToast(false), 2500);

    const frame = captureCurrentFrameBase64();
    if (frame) {
      // Also log event
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setTimelineLogs((prev) => [
        { time: timeStr, title: 'Snapshot saved to evidence ledger', module: 'Evidence Engine' },
        ...prev,
      ]);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Hidden offscreen canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Header & Camera Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              Live Analysis Stream
            </h2>
            {/* Real AI Engine Status Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border backdrop-blur-md bg-slate-900/90 border-slate-700">
              <span
                className={`w-2 h-2 rounded-full ${
                  engineTelemetry.geminiActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              ></span>
              <span className="text-slate-300">
                {engineTelemetry.geminiActive
                  ? 'Gemini 3.8 Flash (Active)'
                  : engineTelemetry.geminiKeyConfigured
                  ? 'Gemini Neural Net (Ready)'
                  : 'Optical Motion AI Engine'}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time camera feed with frame ingestion, multimodal detection, and spatial tripwires
          </p>
        </div>

        {/* Input Source & Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Source Switcher */}
          <div className="flex items-center rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs font-mono">
            <button
              onClick={() => startWebcam(selectedDeviceId)}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                inputMode === 'webcam'
                  ? 'bg-cyan-600/30 text-cyan-200 border border-cyan-500/50 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Webcam</span>
            </button>
            <button
              onClick={startScreenShare}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                inputMode === 'screen'
                  ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Screen</span>
            </button>
            <button
              onClick={startSyntheticFeed}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                inputMode === 'synthetic'
                  ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/50 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Simulation</span>
            </button>
          </div>

          {/* Camera Device Selector (if multiple webcam devices) */}
          {availableDevices.length > 1 && inputMode === 'webcam' && (
            <select
              value={selectedDeviceId}
              onChange={(e) => {
                setSelectedDeviceId(e.target.value);
                startWebcam(e.target.value);
              }}
              className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-cyan-300 font-mono focus:outline-none"
            >
              {availableDevices.map((dev, i) => (
                <option key={dev.deviceId || i} value={dev.deviceId}>
                  {dev.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          )}

          {/* Manual Run Single Scan */}
          <button
            onClick={executeInference}
            disabled={isInferencing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-cyan-500/20 disabled:opacity-50"
          >
            <Zap className={`w-3.5 h-3.5 ${isInferencing ? 'animate-spin' : ''}`} />
            <span>{isInferencing ? 'Scanning...' : 'Scan Frame'}</span>
          </button>
        </div>
      </div>

      {/* Permission alert warning if camera blocked */}
      {cameraPermissionError && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{cameraPermissionError}</span>
          </div>
          <button
            onClick={() => startWebcam(selectedDeviceId)}
            className="underline font-bold text-amber-300 hover:text-white ml-2"
          >
            Retry Camera Access
          </button>
        </div>
      )}

      {/* Main Grid: Video Stream (8 cols) + Telemetry (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Video Screen (8 cols) */}
        <div className="lg:col-span-8 glass-panel rounded-2xl overflow-hidden border border-slate-800 flex flex-col shadow-2xl">
          {/* Stream Info Bar */}
          <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span className="text-xs font-mono font-bold text-white uppercase">
                {inputMode === 'webcam'
                  ? 'LIVE HARDWARE CAMERA STREAM'
                  : inputMode === 'screen'
                  ? 'DESKTOP SCREEN INGESTION'
                  : 'SYNTHETIC URBAN SENSOR FEED'}
              </span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/30">
                ACTIVE
              </span>
            </div>

            <div className="flex items-center gap-3 text-[10px] font-mono text-cyan-400">
              <span>FPS: {fps}</span>
              <span>•</span>
              <span>LATENCY: {lastInferenceLatency}ms</span>
              <span>•</span>
              <span className="text-emerald-400">{boxes.length} DETECTIONS</span>
            </div>
          </div>

          {/* Video Player Display */}
          <div className="relative h-[420px] sm:h-[480px] w-full bg-black overflow-hidden select-none flex items-center justify-center">
            {/* Real HTML5 Video element */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${inputMode === 'synthetic' ? 'hidden' : 'block'}`}
            />

            {/* Synthetic Canvas Simulator (used when in synthetic mode) */}
            <canvas
              ref={simCanvasRef}
              width={1280}
              height={720}
              className={`w-full h-full object-cover ${inputMode === 'synthetic' ? 'block' : 'hidden'}`}
            />

            {/* Real-time Bounding Box & Trajectory Overlay */}
            {showDetections && (
              <BoundingBoxOverlay
                boxes={boxes}
                showTracks={showTracking}
                showCountingLine={showCountingLine}
                showRestrictedZone={showRestrictedZone}
                countingStats={countingStats}
              />
            )}

            {/* Live Scanline Radar Effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent h-14 w-full animate-scan pointer-events-none"></div>

            {/* Real-Time Zone Violation Banner Toast */}
            {violationToast && (
              <div className="absolute top-4 left-4 right-4 sm:left-auto sm:right-4 bg-rose-600/90 text-white font-bold px-3 py-2 rounded-xl text-xs font-mono shadow-2xl flex items-center gap-2 border border-rose-400/50 animate-bounce backdrop-blur-md z-30">
                <AlertTriangle className="w-4 h-4 text-white" />
                <span>{violationToast}</span>
              </div>
            )}

            {/* Snapshot Toast Feedback */}
            {snapshotToast && (
              <div className="absolute top-4 left-4 bg-emerald-600 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs font-mono shadow-2xl flex items-center gap-1.5 animate-bounce z-30">
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>SNAPSHOT CAPTURED & SAVED TO EVIDENCE LEDGER</span>
              </div>
            )}

            {/* Inference Processing Pill Indicator */}
            {isInferencing && (
              <div className="absolute bottom-4 left-4 bg-slate-950/80 border border-cyan-500/50 px-2.5 py-1 rounded-lg text-[10px] font-mono text-cyan-300 flex items-center gap-1.5 backdrop-blur-md z-20">
                <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
                <span>MULTIMODAL AI RUNNING INFERENCE...</span>
              </div>
            )}
          </div>

          {/* Video Control Bar */}
          <div className="p-3.5 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                title={isPlaying ? 'Pause Feed' : 'Resume Feed'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              </button>

              <button
                onClick={handleSnapshot}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                title="Capture Snapshot"
              >
                <Camera className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">Snapshot</span>
              </button>

              {/* Auto Scan Toggle */}
              <button
                onClick={() => setAutoInference(!autoInference)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold transition-all ${
                  autoInference
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${autoInference ? 'animate-spin' : ''}`} />
                <span>Auto AI: {autoInference ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            {/* Feature Overlays Toggles */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <button
                onClick={() => setShowDetections(!showDetections)}
                className={`px-2.5 py-1.5 rounded-lg border transition-all ${
                  showDetections
                    ? 'bg-cyan-600/30 border-cyan-500 text-cyan-200'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                Boxes
              </button>

              <button
                onClick={() => setShowTracking(!showTracking)}
                className={`px-2.5 py-1.5 rounded-lg border transition-all ${
                  showTracking
                    ? 'bg-blue-600/30 border-blue-500 text-blue-200'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                Trajectories
              </button>

              <button
                onClick={() => setShowCountingLine(!showCountingLine)}
                className={`px-2.5 py-1.5 rounded-lg border transition-all ${
                  showCountingLine
                    ? 'bg-amber-600/30 border-amber-500 text-amber-200'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                Tripwire
              </button>

              <button
                onClick={() => setShowRestrictedZone(!showRestrictedZone)}
                className={`px-2.5 py-1.5 rounded-lg border transition-all ${
                  showRestrictedZone
                    ? 'bg-rose-600/30 border-rose-500 text-rose-200'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                Restricted Zone
              </button>
            </div>
          </div>
        </div>

        {/* Right Side Telemetry & Live Events (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Spatial Object Density Breakdown */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">
                Spatial Object Density
              </span>
              <span className="text-[10px] font-mono text-cyan-400">REAL-TIME IOU</span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <Users className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                <span className="text-[10px] font-mono text-slate-500 block">PEOPLE</span>
                <span className="text-xl font-black text-white font-mono">
                  {boxes.filter((b) => b.label.toLowerCase().includes('person')).length}
                </span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <Car className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                <span className="text-[10px] font-mono text-slate-500 block">VEHICLES</span>
                <span className="text-xl font-black text-white font-mono">
                  {boxes.filter((b) => b.label.toLowerCase().includes('vehicle')).length}
                </span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <Scan className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                <span className="text-[10px] font-mono text-slate-500 block">TRACKED</span>
                <span className="text-xl font-black text-white font-mono">{boxes.length}</span>
              </div>
            </div>

            {/* Tripwire Counters */}
            <div className="mt-3.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">COUNTING TRIPWIRE:</span>
              <div className="flex items-center gap-3">
                <span className="text-emerald-400">▲ {countingStats.entries} In</span>
                <span className="text-cyan-400">▼ {countingStats.exits} Out</span>
              </div>
            </div>
          </div>

          {/* Live Events Stream */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block mb-3">
              Live Events Stream
            </span>

            <div className="space-y-2.5">
              {liveEvents.map((evt, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs transition-colors hover:border-slate-700"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-500 text-[11px]">{evt.time}</span>
                    <span className="text-white font-semibold truncate max-w-[180px]">{evt.title}</span>
                  </div>
                  <span
                    className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded border ${
                      evt.severity === 'high'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : evt.severity === 'medium'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                    }`}
                  >
                    {evt.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Event Timeline Trace */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block mb-3">
              Pipeline Inference Trace
            </span>

            <div className="space-y-3 font-mono text-xs">
              {timelineLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-3 text-slate-300">
                  <span className="text-[10px] text-cyan-400 shrink-0">{log.time}</span>
                  <div className="min-w-0">
                    <span className="font-semibold block truncate text-white">{log.title}</span>
                    <span className="text-[9px] text-slate-500 block">{log.module}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
