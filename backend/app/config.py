import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base backend directory
BACKEND_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    """Application configuration loaded from environment or .env file."""
    PROJECT_NAME: str = "Safety Helmet Detection"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]

    # Models & Weights
    MODEL_DIR: Path = BACKEND_DIR / "models"
    MODEL_PATH: Path = BACKEND_DIR / "models" / "best.pt"
    FALLBACK_MODEL_PATH: Path = BACKEND_DIR / "models" / "yolov8s.pt"
    FALLBACK_MODEL: str = "yolov8s.pt"

    # Database
    DATABASE_URL: str = f"sqlite:///{BACKEND_DIR / 'helmet_detection.db'}"

    # Storage paths
    STATIC_DIR: Path = BACKEND_DIR / "static"
    SNAPSHOT_DIR: Path = BACKEND_DIR / "static" / "snapshots"
    VIDEO_OUTPUT_DIR: Path = BACKEND_DIR / "static" / "processed_videos"

    # Detection & Compliance parameters
    CONF_THRESHOLD_DEFAULT: float = 0.25
    IOU_THRESHOLD_DEFAULT: float = 0.70
    MAX_UPLOAD_SIZE_MB: int = 100
    DEBOUNCE_FRAMES: int = 3  # consecutive frames for stream/video violation trigger

    # Class mappings for 3-class Hard Hat dataset
    # 0: helmet, 1: head, 2: person
    CLASSES: dict = {
        0: "helmet",
        1: "head",
        2: "person"
    }

    # Bounding box colors (BGR for OpenCV, RGB hex for frontend)
    COLOR_MAP_BGR: dict = {
        "helmet": (34, 197, 94),   # Green
        "head": (68, 68, 239),     # Red (violation)
        "person": (246, 130, 59)   # Blue/Amber
    }

    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Ensure directories exist
settings.MODEL_DIR.mkdir(parents=True, exist_ok=True)
settings.STATIC_DIR.mkdir(parents=True, exist_ok=True)
settings.SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
settings.VIDEO_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
