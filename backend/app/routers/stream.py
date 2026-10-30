import time
import base64
import json
import cv2
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from ..config import settings
from ..database import SessionLocal
from ..services.detector import YOLOv8Detector
from ..services.compliance import ComplianceEngine, StreamDebouncer

router = APIRouter(tags=["Stream"])


@router.websocket("/api/stream")
async def websocket_stream_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time video/webcam frame inference.
    Client sends JSON {"frame": "data:image/jpeg;base64,..."} or raw base64.
    Server processes with YOLOv8, applies 3-frame debouncer, records violations,
    and returns detections, counts, status, inference_ms, and stream FPS.
    """
    await websocket.accept()

    detector = YOLOv8Detector.get_instance()
    debouncer = StreamDebouncer(required_frames=settings.DEBOUNCE_FRAMES, cooldown_frames=30)
    db: Session = SessionLocal()

    last_time = time.time()

    try:
        while True:
            data = await websocket.receive_text()
            now = time.time()
            fps = round(1.0 / max(0.001, (now - last_time)), 1)
            last_time = now

            # Parse input payload
            try:
                payload = json.loads(data)
                frame_data = payload.get("frame", "")
                conf = float(payload.get("conf", settings.CONF_THRESHOLD_DEFAULT))
                iou = float(payload.get("iou", settings.IOU_THRESHOLD_DEFAULT))
            except Exception:
                frame_data = data
                conf = settings.CONF_THRESHOLD_DEFAULT
                iou = settings.IOU_THRESHOLD_DEFAULT

            # Strip base64 header if present
            if "," in frame_data:
                frame_data = frame_data.split(",", 1)[1]

            try:
                img_bytes = base64.b64decode(frame_data)
                np_arr = np.frombuffer(img_bytes, np.uint8)
                frame_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            except Exception:
                await websocket.send_json({"error": "Invalid base64 image data"})
                continue

            if frame_bgr is None:
                await websocket.send_json({"error": "Failed to decode frame"})
                continue

            # Run detection
            result = detector.predict(frame_bgr, conf_threshold=conf, iou_threshold=iou)
            counts = result["counts"]
            is_alert = counts["head"] > 0

            # Debounce compliance check
            is_debounced, should_log = debouncer.update(is_alert)
            if should_log:
                snapshot_url = ComplianceEngine.save_snapshot(result["annotated_np"], prefix="stream")
                ComplianceEngine.log_violation(
                    db=db,
                    source_type="stream",
                    source_name="webcam",
                    count=counts["head"],
                    total_persons=counts["person"],
                    snapshot_path=snapshot_url,
                    inference_ms=result["inference_ms"]
                )

            response = {
                "detections": result["detections"],
                "counts": counts,
                "status": "ALERT" if is_alert else "SAFE",
                "debounced_alert": is_debounced,
                "fps": fps,
                "inference_ms": result["inference_ms"],
                "alert": is_alert
            }

            await websocket.send_json(response)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.close()
        except Exception:
            pass
    finally:
        db.close()

