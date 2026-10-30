export interface HealthResponse {
  status: string;
  model_name: string;
  device: string;
  demo_mode: boolean;
  version: string;
}

export interface DetectionItem {
  class: string;
  class_id: number;
  confidence: number;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
}

export interface DetectionCounts {
  helmet: number;
  head: number;
  person: number;
}

export interface ImageDetectionResponse {
  detections: DetectionItem[];
  counts: DetectionCounts;
  status: "SAFE" | "ALERT";
  inference_ms: number;
  annotated_image: string; // base64 JPEG
  snapshot_path: string | null;
}

export interface VideoJobSummary {
  total_frames: number;
  processed_frames: number;
  violation_frames: number;
  total_violations_logged: number;
  avg_inference_ms: number;
  status: string;
  duration_seconds: number;
}

export interface VideoDetectionResponse {
  job_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  annotated_video_url?: string | null;
  summary?: VideoJobSummary | null;
  error?: string | null;
}

export interface StreamFrameResponse {
  detections: DetectionItem[];
  counts: DetectionCounts;
  status: "SAFE" | "ALERT";
  debounced_alert?: boolean;
  fps: number;
  inference_ms: number;
  alert: boolean;
  error?: string;
}

export interface ViolationLogItem {
  id: number;
  timestamp: string;
  source_type: string;
  source_name: string;
  count: number;
  total_persons: number;
  snapshot_path: string | null;
  inference_ms: number;
}

export interface PaginatedLogsResponse {
  items: ViolationLogItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface DailyViolation {
  date: string;
  count: number;
}

export interface StatsResponse {
  total_scans: number;
  total_violations: number;
  compliance_rate: number;
  violation_rate: number;
  avg_inference_time_ms: number;
  violations_per_day: DailyViolation[];
}

export type PageId = "dashboard" | "image" | "video" | "stream" | "logs" | "about";

