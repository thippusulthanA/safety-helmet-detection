import os
import uuid
import cv2
import numpy as np
from datetime import datetime, timezone
from typing import Tuple, Optional
from sqlalchemy.orm import Session

from ..config import settings
from ..models_db import ViolationLog

class ComplianceEngine:
    """Evaluates detections against safety helmet compliance rules."""

    @staticmethod
    def evaluate_status(counts: dict) -> str:
        """
        Determines safety status:
        If any 'head' (unhelmeted head) is detected -> 'ALERT'.
        Otherwise -> 'SAFE'.
        """
        head_count = counts.get("head", 0)
        return "ALERT" if head_count > 0 else "SAFE"

    @staticmethod
    def save_snapshot(image: np.ndarray, prefix: str = "violation") -> str:
        """
        Saves an image snapshot to the static directory and returns its relative URL.
        """
        filename = f"{prefix}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.jpg"
        file_path = settings.SNAPSHOT_DIR / filename
        cv2.imwrite(str(file_path), image)
        return f"/static/snapshots/{filename}"

    @staticmethod
    def log_violation(
        db: Session,
        source_type: str,
        source_name: str,
        count: int,
        total_persons: int = 0,
        snapshot_path: Optional[str] = None,
        inference_ms: float = 0.0
    ) -> ViolationLog:
        """
        Records a compliance violation into SQLite.
        """
        log_entry = ViolationLog(
            timestamp=datetime.now(timezone.utc),
            source_type=source_type,
            source_name=source_name,
            count=count,
            total_persons=total_persons,
            snapshot_path=snapshot_path,
            inference_ms=inference_ms
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry


class StreamDebouncer:
    """
    Debouncer for continuous video / webcam streams.
    A violation must persist for `required_frames` (default 3) before
    triggering a persistent log to prevent momentary occlusion or false positives.
    """

    def __init__(self, required_frames: int = 3, cooldown_frames: int = 30):
        self.required_frames = required_frames
        self.cooldown_frames = cooldown_frames
        self.consecutive_violations = 0
        self.frames_since_last_log = cooldown_frames  # ready to log on trigger

    def update(self, is_alert: bool) -> Tuple[bool, bool]:
        """
        Updates debouncer state.
        Returns:
            (is_debounced_alert, should_log_now)
        """
        if is_alert:
            self.consecutive_violations += 1
            self.frames_since_last_log += 1

            if self.consecutive_violations >= self.required_frames:
                # Active debounced alert
                if self.frames_since_last_log >= self.cooldown_frames:
                    self.frames_since_last_log = 0
                    return True, True  # Should log now
                return True, False    # Alert continues, but inside cooldown
            return False, False       # Not yet reached consecutive threshold
        else:
            self.consecutive_violations = 0
            self.frames_since_last_log += 1
            return False, False
