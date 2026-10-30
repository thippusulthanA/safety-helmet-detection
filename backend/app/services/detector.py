import os
import time
import base64
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

os.environ["YOLO_OFFLINE"] = "1"
os.environ["YOLO_VERBOSE"] = "False"

import cv2
import numpy as np

try:
    import torch
    from ultralytics import YOLO
except ImportError:
    torch = None
    YOLO = None

from ..config import settings


class YOLOv8Detector:
    """Singleton YOLOv8 detector managing model lifecycle, inference, and visualization."""
    _instance: Optional["YOLOv8Detector"] = None

    def __init__(self):
        self.model = None
        self.device = "cpu"
        self.model_name = "Not loaded"
        self.demo_mode = True
        self.class_names = settings.CLASSES
        self.color_map = settings.COLOR_MAP_BGR

    @classmethod
    def get_instance(cls) -> "YOLOv8Detector":
        if cls._instance is None:
            cls._instance = YOLOv8Detector()
        return cls._instance

    def load_model(self, custom_model_path: Optional[Path] = None, fallback_model: Optional[str] = None, force: bool = False):
        """Loads custom helmet detection weights or falls back to standard YOLOv8s."""
        if self.model is not None and not force:
            return

        if custom_model_path is None:
            custom_model_path = settings.MODEL_PATH

        # Determine GPU or CPU
        if torch and torch.cuda.is_available():
            self.device = "cuda:0"
        else:
            self.device = "cpu"

        if YOLO is None:
            self.model_name = "Mock Detector (Ultralytics not installed)"
            self.demo_mode = True
            return

        if custom_model_path and custom_model_path.exists() and custom_model_path.stat().st_size > 1000:
            print(f"[Detector] Loading custom weights: {custom_model_path} on {self.device}")
            self.model = YOLO(str(custom_model_path))
            self.model.to(self.device)
            self.model_name = custom_model_path.name
            self.demo_mode = False
            # Check model classes
            if hasattr(self.model, "names") and isinstance(self.model.names, dict):
                self.class_names = self.model.names
        else:
            # Check fallback model path
            resolved_fallback = settings.FALLBACK_MODEL_PATH if settings.FALLBACK_MODEL_PATH.exists() else Path(fallback_model or "yolov8s.pt")
            print(f"[Detector] Custom weights not found at {custom_model_path}. Loading fallback: {resolved_fallback} on {self.device}")
            self.model = YOLO(str(resolved_fallback))
            self.model.to(self.device)
            self.model_name = "yolov8s.pt"
            self.demo_mode = True

    def predict(
        self,
        image_bgr: np.ndarray,
        conf_threshold: float = 0.25,
        iou_threshold: float = 0.70
    ) -> Dict[str, Any]:
        """
        Runs inference on a single BGR OpenCV image and returns parsed detections,
        class counts, safety status, inference latency, and the base64 annotated image.
        """
        start_time = time.perf_counter()

        detections: List[Dict[str, Any]] = []
        counts = {"helmet": 0, "head": 0, "person": 0}
        h, w = image_bgr.shape[:2]

        if self.model is None:
            # Fallback mock if model isn't initialized
            inference_ms = round((time.perf_counter() - start_time) * 1000, 2)
            annotated_bgr = image_bgr.copy()
            _, buffer = cv2.imencode(".jpg", annotated_bgr)
            b64_img = base64.b64encode(buffer).decode("utf-8")
            return {
                "detections": [],
                "counts": counts,
                "status": "SAFE",
                "inference_ms": inference_ms,
                "annotated_image": b64_img,
                "annotated_np": annotated_bgr
            }

        # Ultralytics inference
        results = self.model(
            image_bgr,
            conf=conf_threshold,
            iou=iou_threshold,
            device=self.device,
            verbose=False
        )

        annotated_bgr = image_bgr.copy()

        if results and len(results) > 0:
            res = results[0]
            boxes = res.boxes

            for box in boxes:
                cls_id = int(box.cls[0].item())
                confidence = float(box.conf[0].item())
                xyxy = box.xyxy[0].tolist()  # [x1, y1, x2, y2]
                x1, y1, x2, y2 = [int(v) for v in xyxy]

                # Constrain coordinates to image boundaries
                x1, y1 = max(0, x1), max(0, y1)
                x2, y2 = min(w, x2), min(h, y2)

                if not self.demo_mode:
                    # Using custom 3-class model
                    # 0: helmet, 1: head, 2: person
                    raw_name = self.class_names.get(cls_id, str(cls_id)).lower()
                    if "helmet" in raw_name or cls_id == 0:
                        class_name = "helmet"
                        mapped_cls = 0
                    elif "head" in raw_name or cls_id == 1:
                        class_name = "head"
                        mapped_cls = 1
                    else:
                        class_name = "person"
                        mapped_cls = 2
                else:
                    # In demo mode with standard COCO yolov8s.pt:
                    # COCO class 0 is person. For visual demonstration when custom weights aren't yet trained,
                    # if a person is detected, we classify based on head heuristics or simulate demo helmet/head.
                    coco_name = self.model.names.get(cls_id, "").lower() if hasattr(self.model, "names") else ""
                    if coco_name == "person" or cls_id == 0:
                        class_name = "person"
                        mapped_cls = 2
                        # In demo mode, derive head/helmet bounding box above person torso for interactive demo
                        person_h = y2 - y1
                        head_y1 = max(0, y1)
                        head_y2 = min(h, int(y1 + person_h * 0.28))
                        head_x1 = max(0, int(x1 + (x2 - x1) * 0.15))
                        head_x2 = min(w, int(x2 - (x2 - x1) * 0.15))

                        # Determine simulated helmet vs head:
                        # Inspect color of head region: if bright/yellow/white/blue/red, likely helmet
                        head_roi = image_bgr[head_y1:head_y2, head_x1:head_x2]
                        has_helmet = False
                        if head_roi.size > 0:
                            hsv = cv2.cvtColor(head_roi, cv2.COLOR_BGR2HSV)
                            # Yellow / Orange / Bright helmet check
                            mask_yellow = cv2.inRange(hsv, (15, 70, 70), (35, 255, 255))
                            mask_white = cv2.inRange(hsv, (0, 0, 180), (180, 40, 255))
                            mask_blue = cv2.inRange(hsv, (90, 70, 70), (130, 255, 255))
                            if (cv2.countNonZero(mask_yellow) + cv2.countNonZero(mask_white) + cv2.countNonZero(mask_blue)) / float(head_roi.shape[0] * head_roi.shape[1]) > 0.15:
                                has_helmet = True

                        sub_cls = "helmet" if has_helmet else "head"
                        sub_id = 0 if has_helmet else 1
                        sub_conf = round(confidence * 0.95, 2)
                        detections.append({
                            "class": sub_cls,
                            "class_id": sub_id,
                            "confidence": sub_conf,
                            "bbox": [float(head_x1), float(head_y1), float(head_x2), float(head_y2)]
                        })
                        counts[sub_cls] += 1
                        self._draw_box(annotated_bgr, head_x1, head_y1, head_x2, head_y2, sub_cls, sub_conf)
                    else:
                        # Skip non-person COCO objects in safety detection
                        continue

                detections.append({
                    "class": class_name,
                    "class_id": mapped_cls,
                    "confidence": round(confidence, 3),
                    "bbox": [float(x1), float(y1), float(x2), float(y2)]
                })
                counts[class_name] += 1
                self._draw_box(annotated_bgr, x1, y1, x2, y2, class_name, confidence)

        inference_ms = round((time.perf_counter() - start_time) * 1000, 2)
        status = "ALERT" if counts["head"] > 0 else "SAFE"

        # Encode annotated image to JPEG base64
        _, buffer = cv2.imencode(".jpg", annotated_bgr, [cv2.IMWRITE_JPEG_QUALITY, 90])
        b64_image = base64.b64encode(buffer).decode("utf-8")

        return {
            "detections": detections,
            "counts": counts,
            "status": status,
            "inference_ms": inference_ms,
            "annotated_image": b64_image,
            "annotated_np": annotated_bgr
        }

    def _draw_box(
        self,
        img: np.ndarray,
        x1: int,
        y1: int,
        x2: int,
        y2: int,
        label: str,
        conf: float
    ):
        """Draws visually clear, industrial-grade bounding boxes and text labels."""
        color = self.color_map.get(label, (255, 255, 255))
        thickness = 2

        # Draw main bounding box
        cv2.rectangle(img, (x1, y1), (x2, y2), color, thickness)

        # Label tag
        tag = f"{label.upper()} {conf:.2f}"
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.55
        text_thickness = 1

        (text_w, text_h), baseline = cv2.getTextSize(tag, font, font_scale, text_thickness)
        tag_y1 = max(0, y1 - text_h - 8)
        tag_y2 = y1

        # Background rectangle for label
        cv2.rectangle(
            img,
            (x1, tag_y1),
            (x1 + text_w + 10, tag_y2),
            color,
            -1
        )

        # Text label (white on dark/colored background)
        cv2.putText(
            img,
            tag,
            (x1 + 5, tag_y2 - 4),
            font,
            font_scale,
            (255, 255, 255) if label != "helmet" else (0, 0, 0),
            text_thickness,
            cv2.LINE_AA
        )
