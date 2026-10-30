import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera,
  CameraOff,
  Volume2,
  VolumeX,
  AlertTriangle,
  Activity,
  HardHat,
  User,
  Play,
  Settings2,
} from "lucide-react";
import { StreamFrameResponse } from "../services/types";

export const LiveCamera: React.FC = () => {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [useSimulation, setUseSimulation] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);

  // Live metrics
  const [fps, setFps] = useState<number>(0);
  const [latency, setLatency] = useState<number>(0);
  const [counts, setCounts] = useState<{ helmet: number; head: number; person: number }>({
    helmet: 0,
    head: 0,
    person: 0,
  });
  const [isAlert, setIsAlert] = useState<boolean>(false);

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simCanvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const simTickRef = useRef<number>(0);

  // Audio Context for alarm beeps
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastBeepRef = useRef<number>(0);

  const triggerBeep = useCallback(() => {
    if (!soundEnabled) return;
    const now = Date.now();
    if (now - lastBeepRef.current < 1000) return; // limit beep to once per second
    lastBeepRef.current = now;

    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // High pitch alarm tone
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.warn("Audio beep failed:", e);
    }
  }, [soundEnabled]);

  // Connect WebSocket
  const connectWebSocket = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/stream`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("[Stream] WebSocket connected to", wsUrl);
    };

    ws.onmessage = (event) => {
      try {
        const data: StreamFrameResponse = JSON.parse(event.data);
        if (data.fps !== undefined) setFps(data.fps);
        if (data.inference_ms !== undefined) setLatency(data.inference_ms);
        if (data.counts) setCounts(data.counts);

        const alertActive = data.alert || data.status === "ALERT";
        setIsAlert(alertActive);

        if (alertActive) {
          triggerBeep();
        }

        // Draw bounding boxes on canvas
        drawBoundingBoxes(data);
      } catch (err) {
        console.error("[Stream] Message parse error:", err);
      }
    };

    ws.onerror = (e) => {
      console.error("[Stream] WebSocket error:", e);
    };

    ws.onclose = () => {
      console.log("[Stream] WebSocket disconnected");
    };

    wsRef.current = ws;
  }, [triggerBeep]);

  // Draw overlay on canvas
  const drawBoundingBoxes = (data: StreamFrameResponse) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear previous bounding boxes
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!data.detections || data.detections.length === 0) return;

    data.detections.forEach((det) => {
      const [x1, y1, x2, y2] = det.bbox;
      const w = x2 - x1;
      const h = y2 - y1;

      // Color scheme
      let color = "#3b82f6"; // Blue for worker
      if (det.class === "helmet") color = "#22c55e"; // Green
      if (det.class === "head") color = "#ef4444"; // Red

      // Draw box
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x1, y1, w, h);

      // Label background
      const label = `${det.class.toUpperCase()} ${(det.confidence * 100).toFixed(0)}%`;
      ctx.font = "bold 13px Inter, sans-serif";
      const textWidth = ctx.measureText(label).width;

      ctx.fillStyle = color;
      ctx.fillRect(x1, Math.max(0, y1 - 22), textWidth + 12, 22);

      // Label text
      ctx.fillStyle = det.class === "helmet" ? "#000000" : "#ffffff";
      ctx.fillText(label, x1 + 6, Math.max(16, y1 - 6));
    });
  };

  // Render simulation frame (for machines without camera)
  const renderSimulatedFrame = (): string => {
    const canvas = simCanvasRef.current || document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    simTickRef.current += 1;
    const tick = simTickRef.current;

    // Background scaffolding
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, 640, 480);
    ctx.fillStyle = "#334155";
    ctx.fillRect(60, 60, 520, 20);
    ctx.fillRect(100, 60, 20, 420);
    ctx.fillRect(500, 60, 20, 420);

    // Worker 1: Always compliant (moves slightly)
    const w1_x = 200 + Math.sin(tick * 0.05) * 20;
    ctx.fillStyle = "#2563eb";
    ctx.fillRect(w1_x, 220, 90, 180);
    ctx.fillStyle = "#fde047"; // Yellow Hard Hat
    ctx.beginPath();
    ctx.arc(w1_x + 45, 185, 36, Math.PI, 0, false);
    ctx.fill();
    ctx.fillRect(w1_x + 5, 185, 80, 10);

    // Worker 2: Walks into frame without helmet periodically
    const showViolation = Math.floor(tick / 40) % 2 === 1;
    if (showViolation) {
      const w2_x = 380 + Math.cos(tick * 0.05) * 15;
      ctx.fillStyle = "#475569";
      ctx.fillRect(w2_x, 240, 85, 170);
      ctx.fillStyle = "#fed7aa"; // Exposed Head (Violation)
      ctx.beginPath();
      ctx.arc(w2_x + 42, 205, 30, 0, Math.PI * 2);
      ctx.fill();
    }

    return canvas.toDataURL("image/jpeg", 0.7);
  };

  // Frame capture loop (~10 FPS)
  const startFrameLoop = useCallback(() => {
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);

    frameIntervalRef.current = window.setInterval(() => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      let frameDataUrl = "";

      if (useSimulation) {
        frameDataUrl = renderSimulatedFrame();
      } else if (videoRef.current && videoRef.current.readyState >= 2) {
        const video = videoRef.current;
        const hiddenCanvas = document.createElement("canvas");
        hiddenCanvas.width = video.videoWidth || 640;
        hiddenCanvas.height = video.videoHeight || 480;
        const ctx = hiddenCanvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
          frameDataUrl = hiddenCanvas.toDataURL("image/jpeg", 0.75);
        }
      }

      if (frameDataUrl) {
        ws.send(JSON.stringify({ frame: frameDataUrl, conf: 0.25, iou: 0.7 }));
      }
    }, 100); // 100ms = 10 FPS
  }, [useSimulation]);

  // Start Camera or Simulation
  const startCamera = async () => {
    setCameraError(null);
    setIsActive(true);
    connectWebSocket();

    if (!useSimulation) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15 } },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (err: unknown) {
        console.warn("Hardware camera unavailable, falling back to simulated stream:", err);
        setCameraError("Camera device not detected or permission denied. Switched to Simulation Mode.");
        setUseSimulation(true);
      }
    }

    startFrameLoop();
  };

  // Stop Camera
  const stopCamera = () => {
    setIsActive(false);
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }

    // Stop video tracks
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    // Close WS
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }

    setIsAlert(false);
    setFps(0);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Camera className="w-7 h-7 text-amber-500" />
            <span>Live Video Stream & Camera</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Real-time WebSocket vision stream (~10 FPS). Detects safety helmets and triggers flashing audio-visual alarms on violations.
          </p>
        </div>

        {/* Audio Toggle & Stream Mode */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              soundEnabled
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>Alarm Audio: {soundEnabled ? "ON" : "OFF"}</span>
          </button>

          <button
            onClick={() => {
              const nextMode = !useSimulation;
              setUseSimulation(nextMode);
              if (isActive) {
                stopCamera();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Source: {useSimulation ? "Simulated Video" : "Webcam"}</span>
          </button>
        </div>
      </div>

      {/* Flashing Alert Banner */}
      {isActive && isAlert && (
        <div className="p-4 rounded-2xl bg-red-600 text-white font-extrabold flex items-center justify-between shadow-lg shadow-red-500/20 animate-pulse-red">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 animate-bounce" />
            <div>
              <h3 className="text-base font-black tracking-wide">
                WARNING: HARD HAT COMPLIANCE VIOLATION DETECTED!
              </h3>
              <p className="text-xs font-medium text-red-100">
                Worker identified without protective headgear. Violation snapshot debounced and recorded to audit logs.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline px-3 py-1 rounded-full bg-white text-red-600 text-xs font-bold uppercase tracking-wider">
            Audio Alarm Active
          </span>
        </div>
      )}

      {/* Camera Error / Permission Notice */}
      {cameraError && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-500" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Camera Viewport & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Stream Viewport */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl min-h-[440px] flex items-center justify-center">
            {/* Real Video Element */}
            <video
              ref={videoRef}
              muted
              playsInline
              className={`w-full max-h-[520px] object-contain ${
                useSimulation || !isActive ? "hidden" : "block"
              }`}
            />

            {/* Simulation Canvas Viewport */}
            {useSimulation && isActive && (
              <canvas
                ref={simCanvasRef}
                width={640}
                height={480}
                className="w-full max-h-[520px] object-contain"
              />
            )}

            {/* Bounding Box Drawing Overlay Canvas */}
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
            />

            {/* Inactive Standby View */}
            {!isActive && (
              <div className="text-center text-slate-500 p-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-600">
                  <CameraOff className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-300">Camera Feed Inactive</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Click "Start Live Stream" below to initialize real-time helmet detection inference.
                  </p>
                </div>
                <button
                  onClick={startCamera}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Live Stream</span>
                </button>
              </div>
            )}

            {/* Live Badges Overlay */}
            {isActive && (
              <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600 text-white font-bold text-[11px] tracking-wide uppercase">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                  LIVE
                </span>
                <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-200 font-mono text-[11px]">
                  {fps} FPS
                </span>
                <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-200 font-mono text-[11px]">
                  {latency} ms
                </span>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between">
            {isActive ? (
              <button
                onClick={stopCamera}
                className="px-6 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-2"
              >
                <CameraOff className="w-4 h-4" />
                <span>Stop Stream</span>
              </button>
            ) : (
              <button
                onClick={startCamera}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Stream</span>
              </button>
            )}

            <div className="text-xs text-slate-500 font-medium">
              Mode: <span className="font-semibold text-slate-700 dark:text-slate-300">{useSimulation ? "Synthetic Simulation" : "Physical Camera"}</span>
            </div>
          </div>
        </div>

        {/* Live Metrics Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Activity className="w-4 h-4 text-amber-500" />
              <span>Real-Time Compliance Telemetry</span>
            </h3>

            {/* Helmet Count */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600">
                  <HardHat className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Wearing Helmet</p>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{counts.helmet}</p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold text-emerald-600">Compliant</span>
            </div>

            {/* Violation Count */}
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Head (No Helmet)</p>
                  <p className="text-xl font-black text-red-600 dark:text-red-400">{counts.head}</p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold text-red-600">Violation</span>
            </div>

            {/* Total Workers */}
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-600">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Workers in Frame</p>
                  <p className="text-xl font-black text-blue-600 dark:text-blue-400">{counts.person}</p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold text-blue-600">Tracked</span>
            </div>

            {/* Debounce Logic Explanation */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700 dark:text-slate-300">Debounce Filtering:</p>
              <p>
                To avoid false triggers from momentary occlusion, violations must persist across <strong>3 consecutive frames</strong> before snapshot persistence.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
