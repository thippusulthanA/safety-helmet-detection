from datetime import datetime
from typing import List, Optional, Dict
from pydantic import BaseModel, Field, ConfigDict

# ----------------- Health Schemas -----------------
class HealthResponse(BaseModel):
    status: str = "ok"
    model_name: str
    device: str
    demo_mode: bool
    version: str = "1.0.0"

# ----------------- Detection Schemas -----------------
class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float

class DetectionItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    class_id: int
    class_name: str = Field(..., alias="class")
    confidence: float
    bbox: List[float] = Field(..., description="[x1, y1, x2, y2]")

class DetectionCounts(BaseModel):
    helmet: int = 0
    head: int = 0
    person: int = 0

class ImageDetectionResponse(BaseModel):
    detections: List[DetectionItem]
    counts: DetectionCounts
    status: str = Field(..., description="'SAFE' or 'ALERT'")
    inference_ms: float
    annotated_image: str = Field(..., description="Base64 encoded JPEG")
    snapshot_path: Optional[str] = None

# ----------------- Video Schemas -----------------
class VideoJobSummary(BaseModel):
    total_frames: int = 0
    processed_frames: int = 0
    violation_frames: int = 0
    total_violations_logged: int = 0
    avg_inference_ms: float = 0.0
    status: str = "SAFE"
    duration_seconds: float = 0.0

class VideoDetectionResponse(BaseModel):
    job_id: str
    status: str = Field(..., description="'pending', 'processing', 'completed', 'failed'")
    progress: float = Field(0.0, description="Percentage 0 to 100")
    annotated_video_url: Optional[str] = None
    summary: Optional[VideoJobSummary] = None
    error: Optional[str] = None

# ----------------- Stream Frame Schemas -----------------
class StreamFrameResponse(BaseModel):
    detections: List[DetectionItem]
    counts: DetectionCounts
    status: str = Field(..., description="'SAFE' or 'ALERT'")
    fps: float
    inference_ms: float
    alert: bool

# ----------------- Log Schemas -----------------
class ViolationLogItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    timestamp: datetime
    source_type: str
    source_name: str
    count: int
    total_persons: Optional[int] = 0
    snapshot_path: Optional[str] = None
    inference_ms: Optional[float] = 0.0

class PaginatedLogsResponse(BaseModel):
    items: List[ViolationLogItem]
    total: int
    page: int
    limit: int
    total_pages: int

# ----------------- Stats Schemas -----------------
class DailyViolation(BaseModel):
    date: str
    count: int

class StatsResponse(BaseModel):
    total_scans: int
    total_violations: int
    compliance_rate: float
    violation_rate: float
    avg_inference_time_ms: float
    violations_per_day: List[DailyViolation]
