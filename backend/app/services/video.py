import os
import uuid
import time
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional
import cv2
import numpy as np
from sqlalchemy.orm import Session

from ..config import settings
from .detector import YOLOv8Detector
from .compliance import ComplianceEngine, StreamDebouncer
from ..database import SessionLocal

class VideoJobManager:
    """Manages asynchronous video detection jobs in memory."""
    _instance: Optional["VideoJobManager"] = None

    def __init__(self):
        self.jobs: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def get_instance(cls) -> "VideoJobManager":
        if cls._instance is None:
            cls._instance = VideoJobManager()
        return cls._instance

    def create_job(self, filename: str) -> str:
        job_id = str(uuid.uuid4())
        self.jobs[job_id] = {
            "job_id": job_id,
            "filename": filename,
            "status": "pending",
            "progress": 0.0,
            "annotated_video_url": None,
            "summary": None,
            "error": None
        }
        return job_id

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        return self.jobs.get(job_id)

    def update_job(self, job_id: str, **kwargs):
        if job_id in self.jobs:
            self.jobs[job_id].update(kwargs)


def process_video_background(job_id: str, input_path: str, conf: float = 0.25, iou: float = 0.70):
    """
    Background worker that runs frame-by-frame inference on the uploaded video,
    annotates each frame, debounces violations, stores violation snapshots in DB,
    and writes out the resulting video for web playback.
    """
    manager = VideoJobManager.get_instance()
    detector = YOLOv8Detector.get_instance()
    debouncer = StreamDebouncer(required_frames=settings.DEBOUNCE_FRAMES, cooldown_frames=20)

    manager.update_job(job_id, status="processing", progress=1.0)

    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        manager.update_job(job_id, status="failed", error="Failed to open input video")
        return

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1

    output_filename = f"processed_{job_id}.mp4"
    output_path = settings.VIDEO_OUTPUT_DIR / output_filename

    # Try MP4V codec
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))

    db: Session = SessionLocal()

    frame_idx = 0
    total_inference_ms = 0.0
    violation_frames_count = 0
    total_violations_logged = 0

    try:
        while True:
            ret, frame = cap.read()
            if not ret or frame is None:
                break

            frame_idx += 1

            # Run detection
            result = detector.predict(frame, conf_threshold=conf, iou_threshold=iou)
            annotated_frame = result["annotated_np"]
            counts = result["counts"]
            inference_ms = result["inference_ms"]
            total_inference_ms += inference_ms

            is_alert = counts["head"] > 0
            if is_alert:
                violation_frames_count += 1

            # Debounce compliance
            is_debounced, should_log = debouncer.update(is_alert)
            if should_log:
                snapshot_url = ComplianceEngine.save_snapshot(annotated_frame, prefix=f"vid_{job_id[:6]}")
                ComplianceEngine.log_violation(
                    db=db,
                    source_type="video",
                    source_name=Path(input_path).name,
                    count=counts["head"],
                    total_persons=counts["person"],
                    snapshot_path=snapshot_url,
                    inference_ms=inference_ms
                )
                total_violations_logged += 1

            # Write annotated frame
            out.write(annotated_frame)

            # Update progress periodically
            if frame_idx % 5 == 0 or frame_idx == total_frames:
                progress = min(99.0, round((frame_idx / total_frames) * 100, 1))
                manager.update_job(job_id, progress=progress)

        cap.release()
        out.release()

        avg_inference_ms = round(total_inference_ms / max(1, frame_idx), 2)
        overall_status = "ALERT" if total_violations_logged > 0 or violation_frames_count > 0 else "SAFE"
        duration_seconds = round(frame_idx / fps, 2)

        summary = {
            "total_frames": total_frames,
            "processed_frames": frame_idx,
            "violation_frames": violation_frames_count,
            "total_violations_logged": total_violations_logged,
            "avg_inference_ms": avg_inference_ms,
            "status": overall_status,
            "duration_seconds": duration_seconds
        }

        manager.update_job(
            job_id,
            status="completed",
            progress=100.0,
            annotated_video_url=f"/static/processed_videos/{output_filename}",
            summary=summary
        )

    except Exception as e:
        manager.update_job(job_id, status="failed", error=str(e))
    finally:
        db.close()
        if cap.isOpened():
            cap.release()

