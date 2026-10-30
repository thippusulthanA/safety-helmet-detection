import React, { useState, useRef } from "react";
import {
  UploadCloud,
  Sliders,
  ShieldCheck,
  AlertTriangle,
  Download,
  RefreshCw,
  AlertOctagon,
  Image as ImageIcon,
  CheckCircle,
} from "lucide-react";
import { detectImage } from "../services/api";
import { ImageDetectionResponse } from "../services/types";

export const ImageDetection: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ImageDetectionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Threshold sliders
  const [conf, setConf] = useState<number>(0.25);
  const [iou, setIou] = useState<number>(0.70);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) {
      setError("Please select a valid image file (JPEG, PNG, WebP).");
      return;
    }
    setError(null);
    setFile(selectedFile);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalPreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const response = await detectImage(file, conf, iou);
      setResult(response);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Inference failed. Check backend connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadResult = () => {
    if (!result?.annotated_image) return;
    const link = document.createElement("a");
    link.href = `data:image/jpeg;base64,${result.annotated_image}`;
    link.download = `annotated_${file?.name || "safety_helmet_result.jpg"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const loadSampleImage = async (type: "safe" | "violation") => {
    // Generate synthetic canvas image with helmet or bare head for rapid 1-click test
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw construction background
    ctx.fillStyle = "#334155";
    ctx.fillRect(0, 0, 640, 480);
    ctx.fillStyle = "#64748b";
    ctx.fillRect(50, 100, 200, 380);
    ctx.fillRect(350, 80, 250, 400);

    // Draw worker silhouette
    // Body
    ctx.fillStyle = "#2563eb";
    ctx.fillRect(260, 240, 120, 200);

    // Head
    ctx.fillStyle = "#fed7aa";
    ctx.beginPath();
    ctx.arc(320, 200, 45, 0, Math.PI * 2);
    ctx.fill();

    if (type === "safe") {
      // Yellow Hard Hat
      ctx.fillStyle = "#eab308";
      ctx.beginPath();
      ctx.arc(320, 185, 52, Math.PI, 0, false);
      ctx.fill();
      ctx.fillRect(260, 185, 120, 16);
    } else {
      // Dark Hair / Exposed Head (Violation)
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.arc(320, 175, 42, Math.PI, 0, false);
      ctx.fill();
    }

    canvas.toBlob((blob) => {
      if (blob) {
        const sampleFile = new File([blob], `sample_${type}.jpg`, { type: "image/jpeg" });
        handleFileChange(sampleFile);
      }
    }, "image/jpeg");
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ImageIcon className="w-7 h-7 text-amber-500" />
            <span>Image Helmet Detection</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Upload construction site photos to evaluate PPE helmet compliance and identify exposed head violations.
          </p>
        </div>

        {/* Preset Sample Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Quick Test:</span>
          <button
            onClick={() => loadSampleImage("safe")}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20 transition-colors"
          >
            Sample (Helmet)
          </button>
          <button
            onClick={() => loadSampleImage("violation")}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/25 hover:bg-red-500/20 transition-colors"
          >
            Sample (No Helmet)
          </button>
        </div>
      </div>

      {/* Main Grid: Upload & Controls on Left, Results on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Upload & Parameters */}
        <div className="lg:col-span-5 space-y-6">
          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-500 rounded-3xl p-8 text-center cursor-pointer bg-white dark:bg-slate-900 transition-all group shadow-sm hover:shadow-md"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
            />

            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-8 h-8" />
            </div>

            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              {file ? file.name : "Drag & drop site photo here"}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Supports JPEG, PNG, WebP up to 100MB
            </p>

            {file && (
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>File ready for detection ({Math.round(file.size / 1024)} KB)</span>
              </div>
            )}
          </div>

          {/* Threshold Sliders Panel */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <Sliders className="w-4 h-4 text-amber-500" />
                <span>Inference Parameters</span>
              </div>
              <span className="text-xs text-slate-400 font-mono">YOLOv8 Tuning</span>
            </div>

            {/* Confidence Slider */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <label className="text-slate-600 dark:text-slate-300">Confidence Threshold</label>
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-amber-600 dark:text-amber-400">
                  {conf.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.95"
                step="0.05"
                value={conf}
                onChange={(e) => setConf(parseFloat(e.target.value))}
                className="w-full accent-amber-500 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>0.10 (High Recall)</span>
                <span>0.95 (High Precision)</span>
              </div>
            </div>

            {/* IoU Slider */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <label className="text-slate-600 dark:text-slate-300">NMS IoU Threshold</label>
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-amber-600 dark:text-amber-400">
                  {iou.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.30"
                max="0.90"
                step="0.05"
                value={iou}
                onChange={(e) => setIou(parseFloat(e.target.value))}
                className="w-full accent-amber-500 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>0.30 (Strict overlap)</span>
                <span>0.90 (Loose overlap)</span>
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={handleAnalyze}
              disabled={!file || loading}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all ${
                !file || loading
                  ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                  : "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20 active:scale-98"
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Running YOLOv8 Detection...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>Run Helmet Detection</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right Column: Visualization & Breakdown */}
        <div className="lg:col-span-7 space-y-6">
          {/* Safety Status Banner */}
          {result && (
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                result.status === "ALERT"
                  ? "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 animate-pulse-red"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl ${
                    result.status === "ALERT" ? "bg-red-500/20 text-red-600" : "bg-emerald-500/20 text-emerald-600"
                  }`}
                >
                  {result.status === "ALERT" ? (
                    <AlertTriangle className="w-6 h-6 animate-bounce" />
                  ) : (
                    <ShieldCheck className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h4 className="text-base font-extrabold tracking-tight">
                    STATUS: {result.status === "ALERT" ? "SAFETY VIOLATION DETECTED" : "FULL COMPLIANCE (SAFE)"}
                  </h4>
                  <p className="text-xs opacity-90">
                    {result.status === "ALERT"
                      ? `${result.counts.head} unhelmeted worker(s) detected. Logged to SQLite audit trail.`
                      : "All workers are properly wearing safety hard hats."}
                  </p>
                </div>
              </div>

              <span className="hidden sm:inline font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-white/40 dark:bg-slate-900/40">
                {result.inference_ms} ms
              </span>
            </div>
          )}

          {/* Image Display Area */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {result ? "Detection Visualization" : "Image Preview"}
              </h3>

              {result && (
                <button
                  onClick={handleDownloadResult}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Annotated</span>
                </button>
              )}
            </div>

            <div className="p-4 bg-slate-950 min-h-[380px] flex items-center justify-center">
              {result ? (
                <img
                  src={`data:image/jpeg;base64,${result.annotated_image}`}
                  alt="YOLOv8 Detection Result"
                  className="max-h-[500px] w-auto object-contain rounded-lg shadow-xl"
                />
              ) : originalPreview ? (
                <img
                  src={originalPreview}
                  alt="Original Preview"
                  className="max-h-[500px] w-auto object-contain rounded-lg shadow-md opacity-90"
                />
              ) : (
                <div className="text-center text-slate-500 py-16">
                  <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No image loaded yet</p>
                  <p className="text-xs text-slate-600 mt-1">Upload a photo to see bounding boxes</p>
                </div>
              )}
            </div>

            {/* Counts Breakdown Badges */}
            {result && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-around gap-4 text-xs">
                {/* Helmet Badge */}
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="font-medium text-slate-600 dark:text-slate-400">Wearing Helmet:</span>
                  <span className="px-2 py-0.5 rounded-md font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {result.counts.helmet}
                  </span>
                </div>

                {/* Head / Violation Badge */}
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="font-medium text-slate-600 dark:text-slate-400">Head (No Helmet):</span>
                  <span className="px-2 py-0.5 rounded-md font-bold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20">
                    {result.counts.head}
                  </span>
                </div>

                {/* Person Badge */}
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="font-medium text-slate-600 dark:text-slate-400">Total Workers:</span>
                  <span className="px-2 py-0.5 rounded-md font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    {result.counts.person}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
