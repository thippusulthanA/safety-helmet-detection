import os
import sys
import time
import subprocess
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
SCREENSHOTS_DIR = ROOT_DIR / "docs" / "screenshots"
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not os.path.exists(EDGE_PATH):
    EDGE_PATH = "msedge.exe"


def capture_page(page_name: str, url: str, output_name: str, delay: int = 3):
    """Captures screenshot using headless Edge browser."""
    output_file = SCREENSHOTS_DIR / output_name
    print(f"[Capture] Capturing {page_name} -> {output_file}...")

    cmd = [
        EDGE_PATH,
        "--headless",
        "--disable-gpu",
        "--hide-scrollbars",
        f"--screenshot={output_file}",
        "--window-size=1366,820",
        url
    ]

    try:
        # Give JS and animations 2-3 seconds to render before screenshot
        time.sleep(delay)
        subprocess.run(cmd, timeout=20, check=True)
        print(f"[Capture] Successfully saved: {output_file}")
    except Exception as e:
        print(f"[Capture] Error capturing {page_name}: {e}")


def main():
    print("==================================================")
    print("Starting Automated Server & Screenshot Verification")
    print("==================================================")

    # 1. Start Backend Server
    print("[1/4] Starting FastAPI backend on port 8000...")
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=str(ROOT_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    # 2. Start Frontend Server
    print("[2/4] Starting Vite frontend on port 5173...")
    env = os.environ.copy()
    frontend_proc = subprocess.Popen(
        ["cmd.exe", "/c", "npm.cmd run dev -- --port 5173 --host 127.0.0.1"],
        cwd=str(ROOT_DIR / "frontend"),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    time.sleep(4)

    try:
        pages = [
            ("Dashboard", "http://localhost:5173/?page=dashboard", "dashboard.png", 3),
            ("Image Detection", "http://localhost:5173/?page=image", "image_detection.png", 2),
            ("Video Detection", "http://localhost:5173/?page=video", "video_detection.png", 2),
            ("Live Camera", "http://localhost:5173/?page=stream", "live_camera.png", 2),
            ("Violation Logs", "http://localhost:5173/?page=logs", "violation_logs.png", 2),
            ("About", "http://localhost:5173/?page=about", "about.png", 2),
        ]

        print("[3/4] Capturing UI Screenshots with Headless Edge...")
        for name, url, fname, delay in pages:
            capture_page(name, url, fname, delay)

        print("[4/4] Verification and screenshot captures complete!")

    finally:
        print("[Cleanup] Stopping servers...")
        try:
            backend_proc.terminate()
            frontend_proc.terminate()
        except Exception:
            pass


if __name__ == "__main__":
    main()

