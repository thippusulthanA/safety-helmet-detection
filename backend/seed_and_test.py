import os
import cv2
import numpy as np
from datetime import datetime, timedelta, timezone
from pathlib import Path

from backend.app.config import settings
from backend.app.database import Base, engine, SessionLocal
from backend.app.models_db import ViolationLog


def create_sample_snapshot(filename: str, has_helmet: bool = False):
    """Draws a sample construction worker frame with annotated box."""
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    img[:] = (30, 41, 59)  # Slate dark background

    # Scaffolding / structure
    cv2.rectangle(img, (80, 50), (560, 450), (71, 85, 105), 3)
    cv2.line(img, (80, 50), (560, 450), (51, 65, 85), 2)
    cv2.line(img, (560, 50), (80, 450), (51, 65, 85), 2)

    # Worker body
    cv2.rectangle(img, (260, 220), (380, 440), (235, 99, 37), -1)

    # Head
    cv2.circle(img, (320, 180), 40, (170, 215, 254), -1)

    if has_helmet:
        # Green box for helmet
        cv2.rectangle(img, (270, 135), (370, 190), (34, 197, 94), 2)
        cv2.putText(img, "HELMET 0.94", (270, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (34, 197, 94), 2)
    else:
        # Red box for violation
        cv2.rectangle(img, (270, 135), (370, 195), (68, 68, 239), 2)
        cv2.putText(img, "HEAD 0.91 (VIOLATION)", (260, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (68, 68, 239), 2)

    out_path = settings.SNAPSHOT_DIR / filename
    cv2.imwrite(str(out_path), img)
    return f"/static/snapshots/{filename}"


def seed_database():
    """Seeds database with realistic sample logs over the last 7 days."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    if db.query(ViolationLog).count() > 0:
        print("[Seed] Database already has records.")
        db.close()
        return

    print("[Seed] Populating initial violation logs for demonstration...")
    now = datetime.now(timezone.utc)

    # Sample incidents
    samples = [
        {"days_ago": 6, "count": 2, "source": "video", "name": "cctv_zone_b.mp4", "snap": "seed_snap_1.jpg", "ms": 22.4},
        {"days_ago": 5, "count": 1, "source": "image", "name": "scaffold_inspect_01.jpg", "snap": "seed_snap_2.jpg", "ms": 19.8},
        {"days_ago": 4, "count": 3, "source": "stream", "name": "webcam_gate_1", "snap": "seed_snap_3.jpg", "ms": 24.1},
        {"days_ago": 3, "count": 1, "source": "video", "name": "roof_drone_pass.mp4", "snap": "seed_snap_4.jpg", "ms": 25.0},
        {"days_ago": 2, "count": 4, "source": "stream", "name": "webcam_gate_1", "snap": "seed_snap_5.jpg", "ms": 21.7},
        {"days_ago": 1, "count": 2, "source": "image", "name": "loading_dock.jpg", "snap": "seed_snap_6.jpg", "ms": 20.5},
        {"days_ago": 0, "count": 1, "source": "stream", "name": "webcam", "snap": "seed_snap_7.jpg", "ms": 23.2},
    ]

    for s in samples:
        snap_url = create_sample_snapshot(s["snap"], has_helmet=False)
        timestamp = now - timedelta(days=s["days_ago"], hours=s["days_ago"] * 2)

        log = ViolationLog(
            timestamp=timestamp,
            source_type=s["source"],
            source_name=s["name"],
            count=s["count"],
            total_persons=s["count"] + 2,
            snapshot_path=snap_url,
            inference_ms=s["ms"]
        )
        db.add(log)

    db.commit()
    print(f"[Seed] Successfully seeded {len(samples)} violation logs.")
    db.close()


if __name__ == "__main__":
    seed_database()

