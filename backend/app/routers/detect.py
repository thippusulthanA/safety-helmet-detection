import shutil
import uuid
from pathlib import Path
from typing import Optional
import cv2
import numpy as np
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..schemas import ImageDetectionResponse, VideoDetectionResponse
from ..services.detector import YOLOv8Detector
from ..services.compliance import ComplianceEngine
from ..services.video import VideoJobManager, process_video_background

router = APIRouter(prefix="/api/detect", tags=["Detection"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".avi", ".mov", ".m4v"}


@router.post("/image", response_model=ImageDetectionResponse)
async def detect_image(
    file: UploadFile = File(...),
    conf: float = Form(settings.CONF_THRESHOLD_DEFAULT),
    iou: float = Form(settings.IOU_THRESHOLD_DEFAULT),
    db: Session = Depends(get_db)
):
    """
    Runs safety helmet detection on an uploaded image.
    Color codes bounding boxes (green=helmet, red=head/violation, blue=person).
    If violations are detected, persists violation details and snapshot in database.
    """
    # Validate content type
    if file.content_type and file.content_type.lower() not in ALLOWED_IMAGE_TYPES:
        suffix = Path(file.filename or "").suffix.lower()
        if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported image type '{file.content_type}'. Supported: JPEG, PNG, WebP."
            )

    contents = await file.read()
    if len(contents) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image size exceeds maximum limit of {settings.MAX_UPLOAD_SIZE_MB} MB."
        )

    # Decode image from buffer
    nparr = np.frombuffer(contents, np.uint8)
    image_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image_bgr is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to decode image. File may be corrupted or invalid."
        )

    detector = YOLOv8Detector.get_instance()
    result = detector.predict(image_bgr, conf_threshold=conf, iou_threshold=iou)

    snapshot_path = None
    # If violation detected, record to DB
    if result["status"] == "ALERT":
        snapshot_path = ComplianceEngine.save_snapshot(result["annotated_np"], prefix="img")
        ComplianceEngine.log_violation(
            db=db,
            source_type="image",
            source_name=file.filename or "uploaded_image.jpg",
            count=result["counts"]["head"],
            total_persons=result["counts"]["person"],
            snapshot_path=snapshot_path,
            inference_ms=result["inference_ms"]
        )

    return ImageDetectionResponse(
        detections=result["detections"],
        counts=result["counts"],
        status=result["status"],
        inference_ms=result["inference_ms"],
        annotated_image=result["annotated_image"],
        snapshot_path=snapshot_path
    )


@router.post("/video", response_model=VideoDetectionResponse)
async def detect_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    conf: float = Form(settings.CONF_THRESHOLD_DEFAULT),
    iou: float = Form(settings.IOU_THRESHOLD_DEFAULT)
):
    """
    Submits a video file for asynchronous safety helmet detection processing.
    Returns a job_id to monitor processing progress.
    """
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported video extension '{ext}'. Supported: .mp4, .avi, .mov"
        )

    temp_id = uuid.uuid4().hex
    temp_dir = settings.STATIC_DIR / "temp"
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_video_path = temp_dir / f"{temp_id}_{file.filename}"

    # Read and enforce max size
    total_size = 0
    with open(temp_video_path, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):  # 1MB chunks
            total_size += len(chunk)
            if total_size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
                temp_video_path.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"Video size exceeds limit of {settings.MAX_UPLOAD_SIZE_MB} MB."
                )
            buffer.write(chunk)

    manager = VideoJobManager.get_instance()
    job_id = manager.create_job(file.filename or "video.mp4")

    # Dispatch background worker
    background_tasks.add_task(
        process_video_background,
        job_id=job_id,
        input_path=str(temp_video_path),
        conf=conf,
        iou=iou
    )

    return VideoDetectionResponse(
        job_id=job_id,
        status="pending",
        progress=0.0
    )


@router.get("/video/{job_id}", response_model=VideoDetectionResponse)
async def get_video_job_status(job_id: str):
    """
    Polls the status, progress percentage, and results of an ongoing or completed video job.
    """
    manager = VideoJobManager.get_instance()
    job = manager.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video job '{job_id}' not found."
        )

    return VideoDetectionResponse(**job)

