"""
train.py

Fine-tunes YOLOv8s on the Hard Hat Detection dataset.
Hyperparameters:
- Model: YOLOv8s pretrained weights (local backend/models/yolov8s.pt)
- Epochs: 6 (configurable)
- Imgsz: 384 (configurable)
- Batch: 16
- Freeze: 10 (freezes backbone for high CPU efficiency)
- Fraction: 0.15 (representative sampling of 525 images with ~1800 instances)
- Auto-exports best.pt to backend/models/best.pt
"""

import os
os.environ["YOLO_OFFLINE"] = "1"
os.environ["MPLCONFIGDIR"] = os.path.join(os.path.expanduser("~"), ".matplotlib_cache")
import shutil
import argparse
from pathlib import Path
import torch
from ultralytics import YOLO

CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent


def train_model(
    data_yaml: Path,
    epochs: int = 6,
    batch_size: int = 16,
    imgsz: int = 384,
    patience: int = 50,
    device: str = "auto",
    weights: str = "",
    fraction: float = 0.15,
    freeze: int = 10
):
    """Initializes YOLOv8s and runs training with fine-tuning hyperparameters."""
    if device == "auto":
        device = "0" if torch.cuda.is_available() else "cpu"

    local_weights = PROJECT_ROOT / "models" / "yolov8s.pt"
    if weights and Path(weights).exists():
        base_weights = weights
    elif local_weights.exists():
        base_weights = str(local_weights)
    else:
        base_weights = "yolov8s.pt"

    print("==================================================")
    print("Starting YOLOv8s Hard Hat Fine-Tuning")
    print(f"Base weights: {base_weights}")
    print(f"Data config: {data_yaml}")
    print(f"Device: {device}")
    print(f"Epochs: {epochs} | Batch: {batch_size} | Image Size: {imgsz}")
    print(f"Dataset fraction: {fraction} | Frozen backbone layers: {freeze}")
    print("==================================================")

    model = YOLO(base_weights)

    save_project = CURRENT_DIR / "runs"

    results = model.train(
        data=str(data_yaml),
        epochs=epochs,
        imgsz=imgsz,
        batch=batch_size,
        patience=patience,
        mosaic=1.0,
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        fliplr=0.5,
        device=device,
        freeze=freeze,
        fraction=fraction,
        val=False,  # Skip per-epoch validation to speed up training
        project=str(save_project),
        name="helmet_yolov8s",
        exist_ok=True,
        save=True,
        plots=True,
        verbose=True
    )

    # Search for output weights
    possible_paths = [
        save_project / "helmet_yolov8s" / "weights" / "best.pt",
        PROJECT_ROOT.parent / "runs" / "detect" / str(save_project).replace(":", "") / "helmet_yolov8s" / "weights" / "best.pt",
        PROJECT_ROOT / "runs" / "detect" / "helmet_yolov8s" / "weights" / "best.pt"
    ]
    # Also recursive search
    best_weights_path = None
    for p in possible_paths:
        if p.exists():
            best_weights_path = p
            break

    if not best_weights_path:
        # Search all best.pt in runs/
        candidates = sorted(list(PROJECT_ROOT.parent.glob("**/runs/**/helmet_yolov8s/**/best.pt")), key=os.path.getmtime, reverse=True)
        if candidates:
            best_weights_path = candidates[0]

    target_weights_path = PROJECT_ROOT / "models" / "best.pt"

    if best_weights_path and best_weights_path.exists():
        target_weights_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(str(best_weights_path), str(target_weights_path))
        print(f"\n[Success] Best model saved to: {target_weights_path} ({target_weights_path.stat().st_size} bytes)")
    else:
        print("\n[Notice] Check runs/ for checkpoint artifacts.")

    # Run final validation pass
    print("\nRunning final validation on validation set...")
    val_results = model.val(data=str(data_yaml), imgsz=imgsz, device=device)
    print("Final Validation Metrics:", val_results)

    return results


def main():
    parser = argparse.ArgumentParser(description="Train YOLOv8s on Hard Hat dataset")
    parser.add_argument("--data", type=str, default=str(CURRENT_DIR / "data.yaml"), help="Path to data.yaml")
    parser.add_argument("--epochs", type=int, default=6, help="Training epochs")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    parser.add_argument("--imgsz", type=int, default=384, help="Image resolution")
    parser.add_argument("--patience", type=int, default=50, help="Early stopping patience")
    parser.add_argument("--device", type=str, default="auto", help="Device (0 or cpu)")
    parser.add_argument("--weights", type=str, default="", help="Initial weights path")
    parser.add_argument("--fraction", type=float, default=0.15, help="Dataset fraction to use")
    parser.add_argument("--freeze", type=int, default=10, help="Layers to freeze")
    args = parser.parse_args()

    train_model(
        data_yaml=Path(args.data),
        epochs=args.epochs,
        batch_size=args.batch,
        imgsz=args.imgsz,
        patience=args.patience,
        device=args.device,
        weights=args.weights,
        fraction=args.fraction,
        freeze=args.freeze
    )


if __name__ == "__main__":
    main()
