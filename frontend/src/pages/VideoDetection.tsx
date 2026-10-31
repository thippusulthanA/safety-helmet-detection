import React, { useState, useEffect, useRef } from "react";
import {
  Video as VideoIcon,
  Play,
  CheckCircle,
  RefreshCw,
  Film,
  AlertOctagon,
} from "lucide-react";
import { submitVideo, getVideoStatus, getMediaUrl } from "../services/api";
import { VideoDetectionResponse } from "../services/types";

export const VideoDetection: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobState, setJobState] = useState<VideoDetectionResponse | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll video status while processing
  useEffect(() => {
    if (!jobId) return;
    if (jobState?.status === "completed" || jobState?.status === "failed") return;

    const interval = setInterval(async () => {
      try {
        const status = await getVideoStatus(jobId);
        setJobState(status);
        if (status.status === "failed") {
          setError(status.error || "Video processing encountered an error.");
        }
      } catch (err: unknown) {
        console.error("Failed to poll video job:", err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [jobId, jobState?.status]);

  const handleFileChange = (selectedFile: File) => {
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (!["mp4", "avi", "mov", "m4v"].includes(ext || "")) {
      setError("Please select a supported video file (.mp4, .avi, .mov).");
      return;
    }
    setError(null);
    setFile(selectedFile);
    setJobId(null);
    setJobState(null);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const response = await submitVideo(file, 0.25, 0.70);
      setJobId(response.job_id);
      setJobState(response);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to upload video. Please verify connection.");
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <VideoIcon className="w-7 h-7 text-amber-500" />
          <span>Video Stream Detection</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Upload recorded CCTV or drone footage for automated frame-by-frame helmet inspection and debounced violation tagging.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Upload & Job Control */}
        <div className="lg:col-span-5 space-y-6">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 rounded-3xl p-8 text-center cursor-pointer bg-white dark:bg-slate-900 transition-all shadow-sm hover:shadow-md"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/avi,video/quicktime"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
            />

            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4">
              <Film className="w-8 h-8" />
            </div>

            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              {file ? file.name : "Select site video recording"}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              MP4, AVI, MOV up to 100MB
            </p>

            {file && (
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Selected: {(file.size / (1024 * 1024)).toFixed(1)} MB</span>
              </div>
            )}
          </div>

          {/* Action Button & Processing Card */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <button
              onClick={handleSubmit}
              disabled={!file || uploading || jobState?.status === "processing"}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all ${
                !file || uploading || jobState?.status === "processing"
                  ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                  : "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20 active:scale-98"
              }`}
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Uploading to server...</span>
                </>
              ) : jobState?.status === "processing" ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Processing Frames ({jobState.progress.toFixed(0)}%)...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Video Inspection</span>
                </>
              )}
            </button>

            {/* Progress Bar */}
            {jobState && (
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-400 capitalize flex items-center gap-1.5">
                    {jobState.status === "processing" && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>}
                    {jobState.status === "completed" && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                    <span>Status: {jobState.status}</span>
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {jobState.progress.toFixed(1)}%
                  </span>
                </div>

                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      jobState.status === "completed" ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                    style={{ width: `${Math.max(3, jobState.progress)}%` }}
                  ></div>
                </div>

                <p className="text-[11px] text-slate-400 text-center font-mono">
                  Job ID: {jobState.job_id.slice(0, 12)}...
                </p>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Video Playback & Summary */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Annotated Video Playback
              </h3>
              {jobState?.status === "completed" && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  Ready
                </span>
              )}
            </div>

            <div className="p-4 bg-slate-950 min-h-[380px] flex items-center justify-center">
              {jobState?.annotated_video_url ? (
                <video
                  controls
                  autoPlay
                  loop
                  className="w-full max-h-[460px] rounded-lg shadow-xl"
                  src={getMediaUrl(jobState.annotated_video_url)}
                >
                  Your browser does not support HTML5 video playback.
                </video>
              ) : jobState?.status === "processing" ? (
                <div className="text-center text-slate-400 py-16 space-y-3">
                  <RefreshCw className="w-10 h-10 mx-auto text-amber-500 animate-spin" />
                  <p className="font-semibold text-slate-200">Processing video frames...</p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Ultralytics YOLOv8 inference running across all frames with 3-frame debounced alert filtering.
                  </p>
                </div>
              ) : (
                <div className="text-center text-slate-500 py-16">
                  <Film className="w-12 h-12 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No video processed yet</p>
                  <p className="text-xs text-slate-600 mt-1">Upload a video to inspect construction activity</p>
                </div>
              )}
            </div>

            {/* Video Summary Metrics */}
            {jobState?.summary && (
              <div className="p-6 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Video Detection Summary
                  </h4>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      jobState.summary.status === "ALERT"
                        ? "bg-red-500/15 text-red-600 border border-red-500/30"
                        : "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                    }`}
                  >
                    {jobState.summary.status === "ALERT" ? "VIOLATIONS DETECTED" : "COMPLIANT (SAFE)"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <p className="text-slate-400">Total Frames</p>
                    <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                      {jobState.summary.total_frames}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <p className="text-slate-400">Duration</p>
                    <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                      {jobState.summary.duration_seconds}s
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <p className="text-slate-400">Violation Events</p>
                    <p className="text-base font-bold text-red-500 mt-0.5">
                      {jobState.summary.total_violations_logged}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <p className="text-slate-400">Avg Latency</p>
                    <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5 font-mono">
                      {jobState.summary.avg_inference_ms} ms
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
