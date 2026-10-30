from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Float
from .database import Base

def utc_now():
    return datetime.now(timezone.utc)

class ViolationLog(Base):
    """SQLAlchemy model for storing safety helmet compliance violations."""
    __tablename__ = "violation_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=utc_now, index=True, nullable=False)
    source_type = Column(String(50), nullable=False, index=True)  # "image", "video", "stream"
    source_name = Column(String(255), nullable=False)            # e.g., filename or "webcam"
    count = Column(Integer, nullable=False, default=1)           # number of violations
    total_persons = Column(Integer, nullable=True, default=0)    # total detected persons
    snapshot_path = Column(String(500), nullable=True)          # path or URL to snapshot jpg
    inference_ms = Column(Float, nullable=True, default=0.0)

    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "source_type": self.source_type,
            "source_name": self.source_name,
            "count": self.count,
            "total_persons": self.total_persons,
            "snapshot_path": self.snapshot_path,
            "inference_ms": self.inference_ms
        }
