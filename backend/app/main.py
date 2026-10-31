from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import Base, engine
from .services.detector import YOLOv8Detector
from .schemas import HealthResponse
from .routers import detect, stream, logs, stats


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan: initializes SQLite database tables,
    and loads singleton YOLOv8 detector on startup once.
    """
    print("[Startup] Initializing SQLite database schema...")
    Base.metadata.create_all(bind=engine)

    print("[Startup] Initializing YOLOv8 Detector Singleton...")
    detector = YOLOv8Detector.get_instance()
    detector.load_model(settings.MODEL_PATH, settings.FALLBACK_MODEL)
    print(f"[Startup] Loaded model: '{detector.model_name}' on {detector.device} (Demo Mode: {detector.demo_mode})")

    yield

    print("[Shutdown] Cleaning up resources...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Files (snapshots and processed videos)
app.mount("/static", StaticFiles(directory=str(settings.STATIC_DIR)), name="static")

# Include API Routers
app.include_router(detect.router)
app.include_router(stream.router)
app.include_router(logs.router)
app.include_router(stats.router)


@app.get("/api/health", response_model=HealthResponse, tags=["Health"])
def get_system_health():
    """
    Returns system health, active detector model, acceleration device (GPU/CPU),
    and whether demo mode is active.
    """
    detector = YOLOv8Detector.get_instance()
    return HealthResponse(
        status="ok",
        model_name=detector.model_name,
        device=detector.device,
        demo_mode=detector.demo_mode,
        version=settings.VERSION
    )


from pathlib import Path
from fastapi.responses import FileResponse

# Serve Frontend SPA if built
FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="frontend-assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        # Allow static files in root like favicon, manifest
        file_path = FRONTEND_DIST / full_path
        if full_path and file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")
else:
    @app.get("/", tags=["Root"])
    def root():
        return {
            "app": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "status": "running",
            "docs": "/docs"
        }

