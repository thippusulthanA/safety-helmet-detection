# Safety Helmet Detection at Construction Sites using YOLOv8

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18%2B-61DAFB.svg)](https://react.dev/)
[![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-00ffff.svg)](https://docs.ultralytics.com/)
[![License](https://img.shields.io/badge/License-AGPL--3.0-orange.svg)](https://www.gnu.org/licenses/agpl-3.0.en.html)

An end-to-end computer vision web application designed to monitor personal protective equipment (PPE) compliance on construction sites. The system detects workers and classifies whether each person is wearing a protective hard hat (`helmet`), exposes their bare head without protection (`head` - violation), or tracks worker presence (`person`). It triggers real-time visual and audible warnings, applies 3-frame temporal debouncing to prevent false alarms, persists incident snapshots to SQLite, and displays key safety metrics on an analytics dashboard.

---

## 1. Features

- **Dashboard & KPIs**: Real-time compliance rate (%), total detections, violation counts, inference latency, 7-day violation trend charts, and recent violation snapshots.
- **Image Detection**: Drag-and-drop photo upload with confidence and IoU threshold sliders, side-by-side visualization, color-coded bounding boxes (Green: Helmet, Red: Violation, Blue: Worker), count badges, and one-click annotated image download.
- **Video Inspection**: Asynchronous processing of `.mp4`, `.avi`, and `.mov` recordings with animated progress polling, video playback, and debounced violation tagging.
- **Live Stream & Webcam**: Bidirectional WebSocket streaming (~10 FPS) with HTML5 Canvas bounding box overlay, live FPS counter, flashing alert banner, audio synthesizer warning alarm, and simulated stream fallback for environments without a physical camera.
- **Violation Audit Log**: Searchable, paginated audit table with date range filters, snapshot thumbnail viewer modal, one-click CSV export, and clear-log confirmation dialogs.
- **Industrial Safety UI**: Responsive design with light/dark theme toggle, high-contrast industrial safety palettes, loading skeletons, and health status banner.

---

## 2. System Architecture & Tech Stack

- **Backend**: Python 3.10+, FastAPI, Uvicorn, SQLite via SQLAlchemy, WebSockets, OpenCV, Pillow, NumPy
- **Machine Learning**: Ultralytics YOLOv8s fine-tuned on Hard Hat dataset with 3 classes:
  - `0`: `helmet` (Compliant hard hat)
  - `1`: `head` (Safety violation - unhelmeted worker)
  - `2`: `person` (Detected worker body)
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Recharts, Axios, Lucide React
- **Containerization**: Multi-stage Dockerfile and Docker Compose orchestration

---

## 3. Quickstart & Installation

### Option A: Local Development

#### 1. Backend Setup
```bash
# Clone and enter project directory
cd safety-helmet-detection

# Install Python dependencies
pip install -r backend/requirements.txt

# Start FastAPI server (from backend/ directory or root with PYTHONPATH)
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```
Backend API will be accessible at: `http://localhost:8000`  
Interactive Swagger docs: `http://localhost:8000/docs`

#### 2. Frontend Setup
```bash
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```
Frontend Web UI will be accessible at: `http://localhost:5173`

---

### Option B: Docker Compose
```bash
# Build and launch both backend and frontend containers
docker-compose up --build
```
- Web Application: `http://localhost:5173`
- REST API & Docs: `http://localhost:8000/docs`

---

## 4. Machine Learning Training Pipeline

The repository includes complete scripts for format conversion, data splitting, training, and evaluation in `backend/ml/`:

### 1. Dataset Acquisition
Download the [Kaggle Hard Hat Detection Dataset](https://www.kaggle.com/datasets/andrewmvd/hard-hat-detection) (Pascal VOC XML format with ~5,000 images).

### 2. Format Conversion & 70/20/10 Split
```bash
python backend/ml/voc_to_yolo.py \
  --xml_dir backend/ml/data/annotations \
  --images_dir backend/ml/data/images \
  --output_dir backend/ml/dataset \
  --seed 42
```

### 3. Fine-Tuning YOLOv8s
```bash
python backend/ml/train.py \
  --data backend/ml/data.yaml \
  --epochs 100 \
  --batch 16 \
  --imgsz 640 \
  --patience 50
```
*Note: The script automatically copies the best checkpoint (`runs/helmet_yolov8s/weights/best.pt`) to `backend/models/best.pt` upon training completion.*

### 4. Authentic Model Evaluation
```bash
python backend/ml/evaluate.py --weights backend/models/best.pt --split test
```
Outputs genuine validation metrics: Precision, Recall, mAP@0.5, mAP@0.5:0.95, and per-class breakdowns.

### 5. Fallback Demo Mode
If `backend/models/best.pt` is not present, the server automatically loads `yolov8s.pt` (COCO pretrained) and displays a clear notification banner:
> **"Demo mode: custom helmet weights not found"**

---

## 5. REST & WebSocket API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Model status, active device (GPU/CPU), demo-mode flag |
| `POST` | `/api/detect/image` | Multipart image detection with `conf` and `iou` parameters |
| `POST` | `/api/detect/video` | Video upload (MP4/AVI/MOV, max 100MB) for background processing |
| `GET` | `/api/detect/video/{job_id}` | Polls video processing progress and results |
| `WS` | `/api/stream` | Real-time WebSocket frame inference (~10 FPS) |
| `GET` | `/api/logs` | Paginated violation records with date and source filters |
| `DELETE` | `/api/logs` | Clears all violation log records from SQLite database |
| `GET` | `/api/logs/export` | Downloads safety violation audit trail as CSV |
| `GET` | `/api/stats` | KPI summary, 7-day violation breakdown, and compliance rates |

---

## 6. Screenshots

Screenshots of all application views are archived under `docs/screenshots/`:
- `docs/screenshots/dashboard.png` - Compliance KPIs & 7-Day Trend Analytics
- `docs/screenshots/image_detection.png` - Image Upload with Color-Coded Bounding Boxes
- `docs/screenshots/video_detection.png` - Background Video Inspection & Video Player
- `docs/screenshots/live_camera.png` - Live Stream with Canvas Overlay & Audio Alarm
- `docs/screenshots/violation_logs.png` - Searchable Audit Trail & Snapshot Viewer
- `docs/screenshots/about.png` - YOLOv8 Architecture & Dataset Documentation

---

## 7. Troubleshooting

- **No webcam available on host machine**: The Live Camera page includes a built-in "Simulated Video" toggle that feeds a synthetic construction scene into the WebSocket pipeline for full testing without hardware camera access.
- **Demo Mode Banner displayed**: Place your fine-tuned weights file at `backend/models/best.pt`.
- **OpenCV video write issues**: Ensure the server has permission to write to `backend/static/processed_videos/`.
- **CORS issues**: Add your frontend URL to `CORS_ORIGINS` in `.env` or `backend/app/config.py`.

---

## 8. License & Attribution Note

This application utilizes the [Ultralytics YOLOv8](https://github.com/ultralytics/ultralytics) computer vision library. Ultralytics is open source under the **GNU Affero General Public License v3.0 (AGPL-3.0)**. Any redistribution or commercial use of YOLOv8 model code and derivatives must adhere to the AGPL-3.0 terms or acquire an enterprise license from Ultralytics LLC.

