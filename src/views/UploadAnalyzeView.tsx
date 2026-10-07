import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileVideo,
  FileImage,
  Camera,
  Play,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { BoundingBoxOverlay } from '../components/BoundingBoxOverlay';
import { AnalysisSessionResult, BoundingBox } from '../types/vision';
import { api } from '../services/api';

interface Props {
  onRefreshGlobalStats: () => void;
}

export const UploadAnalyzeView: React.FC<Props> = ({ onRefreshGlobalStats }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mode, setMode] = useState<string>('detection');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisSessionResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pipelineSteps = [
    { title: 'Uploading Media', desc: 'Transferring payload to CV engine' },
    { title: 'Extracting Frames', desc: 'Decoding RGB raster and tensors' },
    { title: 'Running CV Model', desc: 'Executing neural inference' },
    { title: 'Spatial Tracking', desc: 'Resolving coordinates & tripwires' },
    { title: 'Saving Results', desc: 'Writing detections & alerts to DB' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
        setAnalysisResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUseSampleImage = (type: string) => {
    let url = 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1000&q=80';
    if (type === 'waste') {
      url = 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=1000&q=80';
    } else if (type === 'defects') {
      url = 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=1000&q=80';
    } else if (type === 'counting') {
      url = 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1000&q=80';
    }
    setSelectedImage(url);
    setMode(type);
    setAnalysisResult(null);
  };

  const runAnalysis = async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    setCurrentStep(0);

    // Progressive step indicator
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < 3) return prev + 1;
        return prev;
      });
    }, 400);

    try {
      const result = await api.analyzeVision({
        imageBase64: selectedImage.startsWith('data:') ? selectedImage : undefined,
        mode,
        moduleType: 'core',
        cameraLabel: 'Uploaded Media Analysis',
      });

      clearInterval(stepInterval);
      setCurrentStep(4);
      setAnalysisResult(result);
      onRefreshGlobalStats();
    } catch (err) {
      console.error('Upload analysis failed:', err);
    } finally {
      clearInterval(stepInterval);
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Upload & Analyze</h2>
          <p className="text-xs text-slate-400">
            Submit image or video frames to the real computer vision inference pipeline
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">ANALYSIS MODE:</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-cyan-300 font-mono font-semibold focus:outline-none focus:border-cyan-500"
          >
            <option value="detection">Object Detection</option>
            <option value="counting">People Counting</option>
            <option value="waste">Waste Classification</option>
            <option value="defects">Defect Inspection</option>
            <option value="safety">Safety Violation</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload & Media Preview Canvas (7 cols) */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase">
              Input Media Workspace
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleUseSampleImage('detection')}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-cyan-400 border border-slate-800 hover:border-cyan-500"
              >
                Sample 1
              </button>
              <button
                onClick={() => handleUseSampleImage('waste')}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-cyan-400 border border-slate-800 hover:border-cyan-500"
              >
                Waste Sample
              </button>
              <button
                onClick={() => handleUseSampleImage('defects')}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-cyan-400 border border-slate-800 hover:border-cyan-500"
              >
                Defect Sample
              </button>
            </div>
          </div>

          {/* Media Display / Drop Area */}
          <div className="relative h-[340px] sm:h-[400px] w-full rounded-2xl bg-black overflow-hidden border border-slate-800 flex items-center justify-center">
            {selectedImage ? (
              <>
                <img
                  src={selectedImage}
                  alt="Uploaded media"
                  className="w-full h-full object-cover"
                />
                {/* Overlaid bounding boxes after analysis */}
                {analysisResult && (
                  <BoundingBoxOverlay
                    boxes={analysisResult.objectsDetected}
                    showCountingLine={mode === 'counting'}
                    showRestrictedZone={mode === 'safety'}
                  />
                )}
              </>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer text-center p-8 border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-2xl transition-colors space-y-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-sm font-bold text-white block">
                    Click to select an Image or Frame
                  </span>
                  <span className="text-xs text-slate-500 block mt-1">
                    PNG, JPG, WEBP or MP4 (Max 50MB)
                  </span>
                </div>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,video/*"
              className="hidden"
            />
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 border border-slate-800 transition-colors"
            >
              Choose New File
            </button>

            <button
              onClick={runAnalysis}
              disabled={!selectedImage || isProcessing}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/30 transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start CV Analysis</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Multi-Step Pipeline Telemetry & Results (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* 5-Stage Pipeline Progress Bar */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block mb-4">
              Real Model Execution Pipeline
            </span>

            <div className="space-y-3">
              {pipelineSteps.map((step, idx) => {
                const isDone = currentStep > idx || (!isProcessing && analysisResult !== null);
                const isCurrent = isProcessing && currentStep === idx;

                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-mono transition-all ${
                      isDone
                        ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                        : isCurrent
                        ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300 animate-pulse'
                        : 'bg-slate-900/40 border-slate-800/80 text-slate-500'
                    }`}
                  >
                    <div>
                      <span className="font-bold block">{step.title}</span>
                      <span className="text-[10px] opacity-75">{step.desc}</span>
                    </div>

                    <div>
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : isCurrent ? (
                        <span className="text-xs font-bold text-cyan-400">●</span>
                      ) : (
                        <span className="text-xs text-slate-600">○</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Results Summary Box */}
          {analysisResult && (
            <div className="glass-panel rounded-2xl p-5 border border-cyan-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white uppercase">
                  Inference Results
                </span>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                  {analysisResult.processingTimeMs}ms
                </span>
              </div>

              {/* Objects Breakdown */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-slate-400 block">
                  DETECTED ENTITIES ({analysisResult.objectsDetected.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {analysisResult.objectsDetected.map((obj) => (
                    <span
                      key={obj.id}
                      className="text-xs font-mono px-2 py-1 rounded bg-slate-900 text-slate-200 border border-slate-700 flex items-center gap-1.5"
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: obj.color || '#38bdf8' }}></span>
                      <span>{obj.label}</span>
                      <strong className="text-cyan-400">{obj.confidence}%</strong>
                    </span>
                  ))}
                </div>
              </div>

              {/* Specialized Modules output if present */}
              {analysisResult.wasteClassification && (
                <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/40 text-xs font-mono space-y-1">
                  <span className="text-cyan-400 font-bold block">
                    WASTE CLASSIFICATION: {analysisResult.wasteClassification.category}
                  </span>
                  <p className="text-slate-300 text-[11px]">
                    Recommended Bin: {analysisResult.wasteClassification.disposalGuide}
                  </p>
                </div>
              )}

              {analysisResult.defectDetection && (
                <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-xs font-mono space-y-1">
                  <span className="text-rose-400 font-bold block">
                    DEFECT: {analysisResult.defectDetection.defectType}
                  </span>
                  <p className="text-slate-300 text-[11px]">
                    {analysisResult.defectDetection.impactDescription}
                  </p>
                </div>
              )}

              {/* Status Note */}
              <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Result synced to Central Database & Analytics</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
