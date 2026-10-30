"""
evaluate.py

Evaluates trained YOLOv8s checkpoint on validation/test split.
Outputs genuine metrics calculated by Ultralytics val:
- Precision
- Recall
- mAP@0.5
- mAP@0.5:0.95
- Per-class metrics for helmet, head, person

Strictly outputs genuine evaluation metrics directly from the validation process.
"""

import argparse
from pathlib import Path
from ultralytics import YOLO

CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent


def evaluate_model(weights_path: Path, data_yaml: Path, split: str = "test"):
    """Runs Ultralytics validation and prints structured metric summary."""
    if not weights_path.exists():
        print(f"[Error] Weights file not found at: {weights_path}")
        print("Please train a model first using train.py or place best.pt into backend/models/")
        return

    print("==================================================")
    print(f"Evaluating Model: {weights_path.name}")
    print(f"Data YAML: {data_yaml}")
    print(f"Evaluation Split: {split}")
    print("==================================================")

    model = YOLO(str(weights_path))

    metrics = model.val(
        data=str(data_yaml),
        split=split,
        verbose=True,
        plots=True,
        project=str(CURRENT_DIR / "runs"),
        name="evaluation"
    )

    box = metrics.box
    precision = float(box.mp)
    recall = float(box.mr)
    map50 = float(box.map50)
    map50_95 = float(box.map)

    print("\n" + "=" * 60)
    print(f"{'OVERALL VALIDATION / TEST METRICS':^60}")
    print("=" * 60)
    print(f"Precision (P):       {precision:.4f} ({precision * 100:.2f}%)")
    print(f"Recall (R):          {recall:.4f} ({recall * 100:.2f}%)")
    print(f"mAP@0.5:             {map50:.4f} ({map50 * 100:.2f}%)")
    print(f"mAP@0.5:0.95:        {map50_95:.4f} ({map50_95 * 100:.2f}%)")
    print("-" * 60)

    # Per-class breakdown
    print(f"{'Class':<15} | {'Precision':<12} | {'Recall':<12} | {'mAP@0.5':<12}")
    print("-" * 60)

    class_names = metrics.names
    for cls_idx in range(len(box.p)):
        c_name = class_names.get(cls_idx, f"Class {cls_idx}")
        c_p = float(box.p[cls_idx])
        c_r = float(box.r[cls_idx])
        c_map50 = float(box.all_ap[cls_idx, 0]) if hasattr(box, "all_ap") and box.all_ap.shape[1] > 0 else 0.0

        print(f"{c_name:<15} | {c_p:<12.4f} | {c_r:<12.4f} | {c_map50:<12.4f}")

    print("=" * 60)
    return metrics


def main():
    parser = argparse.ArgumentParser(description="Evaluate YOLOv8s helmet detection model")
    parser.add_argument(
        "--weights",
        type=str,
        default=str(PROJECT_ROOT / "models" / "best.pt"),
        help="Path to trained weights .pt"
    )
    parser.add_argument(
        "--data",
        type=str,
        default=str(CURRENT_DIR / "data.yaml"),
        help="Path to data.yaml"
    )
    parser.add_argument(
        "--split",
        type=str,
        default="test",
        help="Dataset split to evaluate ('val' or 'test')"
    )
    args = parser.parse_args()

    evaluate_model(
        weights_path=Path(args.weights),
        data_yaml=Path(args.data),
        split=args.split
    )


if __name__ == "__main__":
    main()

