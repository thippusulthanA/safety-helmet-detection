import React from "react";
import {
  HardHat,
  Cpu,
  Layers,
  Terminal,
  CheckCircle2,
} from "lucide-react";

export const About: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-fade-in pb-16">
      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mb-2">
          <HardHat className="w-3.5 h-3.5" />
          <span>Industrial Vision AI Architecture</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Safety Helmet Detection at Construction Sites
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          An automated computer vision safety monitoring system powered by fine-tuned Ultralytics YOLOv8, FastAPI, and React. Built to uphold OSHA workplace head protection standards.
        </p>
      </div>

      {/* Target Classes Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-amber-500" />
          <span>Target Classification Schema</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Class 0: Helmet */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-500/30 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                Class 0: helmet
              </span>
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            </div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Compliant Hard Hat</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Workers actively wearing protective safety helmets (yellow, white, blue, or orange ANSI/ISEA Z89.1 certified). Bounding box rendered in safety green.
            </p>
          </div>

          {/* Class 1: Head */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-red-500/30 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/15 text-red-600 dark:text-red-400">
                Class 1: head
              </span>
              <div className="w-3 h-3 rounded-full bg-red-500 animate-ping"></div>
            </div>
            <h3 className="font-extrabold text-base text-red-600 dark:text-red-400">Violation (No Helmet)</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Workers with bare or unhelmeted heads. Automatically triggers the visual ALERT banner, sounds audible alarm tone, and commits snapshot to the database after debouncing.
            </p>
          </div>

          {/* Class 2: Person */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-blue-500/30 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400">
                Class 2: person
              </span>
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            </div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Worker Body</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Worker bounding box used for site occupancy tracking and spatial context correlation between bodies and headgear.
            </p>
          </div>
        </div>
      </div>

      {/* System Architecture Details */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-amber-500" />
          <span>Pipeline & Engineering Highlights</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-slate-600 dark:text-slate-400">
          <div className="space-y-2">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Singleton YOLOv8s Lifecycle</span>
            </h4>
            <p className="leading-relaxed">
              The neural network is loaded once at FastAPI startup into GPU VRAM (or CPU fallback). Inference latency benchmarks at ~15-30ms per frame.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>3-Frame Temporal Debouncing</span>
            </h4>
            <p className="leading-relaxed">
              In live video and camera streams, transient occlusions and blur can cause flicker. A violation must persist across 3 consecutive frames before triggering persistent database snapshots.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Bidirectional WebSocket Streaming</span>
            </h4>
            <p className="leading-relaxed">
              The browser captures camera frames at ~10 FPS, serializes to JPEG, and receives bounding box coordinates, confidence scores, and real-time FPS with zero HTTP overhead.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Audit Logging & Analytics</span>
            </h4>
            <p className="leading-relaxed">
              Every confirmed safety incident is cataloged in SQLite with timestamps, source origins, and file snapshots. Compliant with OSHA recordkeeping requirements.
            </p>
          </div>
        </div>
      </div>

      {/* Dataset & Training Guide */}
      <div className="rounded-3xl bg-slate-900 text-white p-8 space-y-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Terminal className="w-5 h-5 text-amber-400" />
            <span>Kaggle Dataset Training Instructions</span>
          </h2>
          <span className="font-mono text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300">
            backend/ml
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          The ML pipeline uses the open <strong>Kaggle Hard Hat Detection Dataset</strong> (5,000 annotated images). To train the model locally or on Google Colab:
        </p>

        <div className="space-y-3 font-mono text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300">
            <span className="text-slate-500"># 1. Convert VOC XML annotations to YOLO format (70/20/10 split)</span>
            <br />
            python backend/ml/voc_to_yolo.py --xml_dir ./data/annotations --images_dir ./data/images
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300">
            <span className="text-slate-500"># 2. Train YOLOv8s with mosaic, HSV augmentation, 100 epochs</span>
            <br />
            python backend/ml/train.py --data backend/ml/data.yaml --epochs 100 --batch 16 --imgsz 640
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300">
            <span className="text-slate-500"># 3. Evaluate Precision, Recall, and mAP on test split</span>
            <br />
            python backend/ml/evaluate.py --weights backend/models/best.pt --split test
          </div>
        </div>
      </div>
    </div>
  );
};
