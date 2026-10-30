# Machine Learning Pipeline: Safety Helmet Detection (YOLOv8s)

This directory contains the data preparation, training, and evaluation scripts for fine-tuning YOLOv8s on the Hard Hat Detection dataset.

## Classes
The dataset is structured with 3 target classes:
- **0: `helmet`** (Workers wearing a compliant safety hard hat)
- **1: `head`** (Workers with exposed head / violation - no helmet)
- **2: `person`** (Detected worker / human body)

---

## 1. Dataset Preparation

### Option A: Kaggle Hard Hat Detection Dataset
1. Download the Kaggle **Hard Hat Detection** dataset (Pascal VOC format):
   - [Kaggle Hard Hat Detection Dataset](https://www.kaggle.com/datasets/andrewmvd/hard-hat-detection)
2. Extract the downloaded archive into `backend/ml/data/`:
   ```
   backend/ml/data/
   ├── annotations/  # Pascal VOC XML files
   └── images/       # Corresponding .png / .jpg images
   ```
3. Run the conversion and splitting script:
   ```bash
   python backend/ml/voc_to_yolo.py --xml_dir backend/ml/data/annotations --images_dir backend/ml/data/images --output_dir backend/ml/dataset --seed 42
   ```
   This converts VOC XML bounding boxes into normalized YOLO `.txt` format and automatically splits the data into:
   - **70%** Training (`images/train`, `labels/train`)
   - **20%** Validation (`images/val`, `labels/val`)
   - **10%** Test (`images/test`, `labels/test`)

---

## 2. Training

### Local Training (GPU recommended)
Ensure PyTorch and CUDA are properly configured, then run:

```bash
python backend/ml/train.py --data backend/ml/data.yaml --epochs 100 --batch 16 --imgsz 640 --patience 50
```

Hyperparameter Configuration:
- Base Architecture: `YOLOv8s` (pretrained on COCO)
- Epochs: `100` with early stopping patience of `50`
- Image Resolution: `640x640`
- Batch Size: `16`
- Data Augmentations:
  - Mosaic: `1.0`
  - HSV Color Jitter: `h=0.015, s=0.7, v=0.4`
  - Horizontal Flip: `fliplr=0.5`

Upon completion, `train.py` automatically copies the best weights (`runs/helmet_yolov8s/weights/best.pt`) to `backend/models/best.pt`.

### Google Colab Training
To train with free GPU acceleration on Google Colab:
1. Open a new notebook and set Runtime to GPU (T4 or higher).
2. Install Ultralytics:
   ```bash
   !pip install ultralytics
   ```
3. Upload and extract your dataset.
4. Run training:
   ```python
   from ultralytics import YOLO

   model = YOLO("yolov8s.pt")
   model.train(
       data="data.yaml",
       epochs=100,
       imgsz=640,
       batch=16,
       patience=50,
       mosaic=1.0,
       hsv_h=0.015,
       hsv_s=0.7,
       hsv_v=0.4,
       fliplr=0.5
   )
   ```
5. Download `runs/detect/train/weights/best.pt` and place it in `backend/models/best.pt`.

---

## 3. Model Evaluation

To evaluate model performance on the test split:

```bash
python backend/ml/evaluate.py --weights backend/models/best.pt --data backend/ml/data.yaml --split test
```

The script runs Ultralytics validation (`model.val()`) and reports the genuine metrics directly produced by the evaluator:
- **Precision (P)**
- **Recall (R)**
- **mAP@0.5**
- **mAP@0.5:0.95**
- Per-class metric breakdown for `helmet`, `head`, and `person`

---

## 4. Fallback Demo Mode

If `backend/models/best.pt` is not present, the backend automatically falls back to loading `yolov8s.pt` (COCO pretrained) and sets `demo_mode: true`. The web frontend displays an informative banner:
> **"Demo mode: custom helmet weights not found"**

In demo mode, worker detection and simulated safety compliance are functional for UI and pipeline demonstration until custom weights are placed in `backend/models/best.pt`.

