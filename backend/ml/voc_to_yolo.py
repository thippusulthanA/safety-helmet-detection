"""
voc_to_yolo.py

Converts Pascal VOC XML annotations into YOLO TXT format and splits the
dataset into Train (70%), Validation (20%), and Test (10%) sets with a fixed seed (42).

Class Mapping:
  0: helmet
  1: head
  2: person
"""

import os
import shutil
import random
import argparse
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, Tuple, Optional

CLASS_MAP: Dict[str, int] = {
    # Helmet classes
    "helmet": 0,
    "hard hat": 0,
    "hardhat": 0,
    "safety helmet": 0,
    # Head (no helmet / violation) classes
    "head": 1,
    "no helmet": 1,
    "no_helmet": 1,
    "without helmet": 1,
    # Person / worker classes
    "person": 2,
    "worker": 2
}


def convert_voc_box_to_yolo(
    size: Tuple[int, int],
    box: Tuple[float, float, float, float]
) -> Tuple[float, float, float, float]:
    """
    Converts Pascal VOC box (xmin, ymin, xmax, ymax) to YOLO (x_center, y_center, w, h) normalized.
    """
    w_img, h_img = size
    xmin, ymin, xmax, ymax = box

    # Clip coordinates to bounds
    xmin = max(0.0, min(float(xmin), float(w_img)))
    ymin = max(0.0, min(float(ymin), float(h_img)))
    xmax = max(0.0, min(float(xmax), float(w_img)))
    ymax = max(0.0, min(float(ymax), float(h_img)))

    box_w = xmax - xmin
    box_h = ymax - ymin
    x_center = xmin + (box_w / 2.0)
    y_center = ymin + (box_h / 2.0)

    # Normalize by image dimensions
    return (
        round(x_center / w_img, 6),
        round(y_center / h_img, 6),
        round(box_w / w_img, 6),
        round(box_h / h_img, 6)
    )


def process_dataset(
    xml_dir: Path,
    images_dir: Path,
    output_dir: Path,
    seed: int = 42
):
    """
    Parses all XML files, pairs them with images, shuffles with seed 42,
    and splits 70% train, 20% val, 10% test.
    """
    random.seed(seed)

    xml_files = sorted(list(xml_dir.glob("*.xml")))
    if not xml_files:
        print(f"[Error] No XML files found in {xml_dir}")
        return

    print(f"Found {len(xml_files)} annotation files. Parsing Pascal VOC...")

    valid_samples = []

    for xml_path in xml_files:
        stem = xml_path.stem
        # Check corresponding image (.jpg, .jpeg, .png)
        img_path = None
        for ext in [".jpg", ".jpeg", ".png", ".JPG", ".PNG"]:
            candidate = images_dir / f"{stem}{ext}"
            if candidate.exists():
                img_path = candidate
                break

        if img_path is None:
            continue

        try:
            tree = ET.parse(str(xml_path))
            root = tree.getroot()

            size_elem = root.find("size")
            if size_elem is None:
                continue

            width = int(size_elem.find("width").text)
            height = int(size_elem.find("height").text)

            if width <= 0 or height <= 0:
                continue

            labels = []
            for obj in root.findall("object"):
                name = obj.find("name").text.strip().lower()
                if name not in CLASS_MAP:
                    continue

                class_id = CLASS_MAP[name]
                bndbox = obj.find("bndbox")
                xmin = float(bndbox.find("xmin").text)
                ymin = float(bndbox.find("ymin").text)
                xmax = float(bndbox.find("xmax").text)
                ymax = float(bndbox.find("ymax").text)

                if xmax <= xmin or ymax <= ymin:
                    continue

                x_c, y_c, w_box, h_box = convert_voc_box_to_yolo((width, height), (xmin, ymin, xmax, ymax))
                labels.append(f"{class_id} {x_c} {y_c} {w_box} {h_box}")

            if labels:
                valid_samples.append((img_path, labels))

        except Exception as e:
            print(f"Warning: Failed to parse {xml_path}: {e}")

    print(f"Total valid annotated samples: {len(valid_samples)}")
    random.shuffle(valid_samples)

    total = len(valid_samples)
    n_train = int(total * 0.70)
    n_val = int(total * 0.20)

    splits = {
        "train": valid_samples[:n_train],
        "val": valid_samples[n_train:n_train + n_val],
        "test": valid_samples[n_train + n_val:]
    }

    print(f"Splits -> Train: {len(splits['train'])}, Val: {len(splits['val'])}, Test: {len(splits['test'])}")

    for split_name, samples in splits.items():
        img_out = output_dir / "images" / split_name
        lbl_out = output_dir / "labels" / split_name
        img_out.mkdir(parents=True, exist_ok=True)
        lbl_out.mkdir(parents=True, exist_ok=True)

        for img_file, labels_txt in samples:
            # Copy image
            shutil.copy2(str(img_file), str(img_out / img_file.name))
            # Write YOLO TXT
            txt_file = lbl_out / f"{img_file.stem}.txt"
            with open(txt_file, "w", encoding="utf-8") as f:
                f.write("\n".join(labels_txt) + "\n")

    print(f"Conversion and split complete. Output written to {output_dir}")


def main():
    parser = argparse.ArgumentParser(description="Convert VOC XML to YOLO format and split 70/20/10")
    parser.add_argument("--xml_dir", type=str, default="./annotations", help="Directory containing VOC XML files")
    parser.add_argument("--images_dir", type=str, default="./images", help="Directory containing source images")
    parser.add_argument("--output_dir", type=str, default="./dataset", help="Output directory for YOLO dataset")
    parser.add_argument("--seed", type=int, default=42, help="Random split seed")
    args = parser.parse_args()

    process_dataset(
        xml_dir=Path(args.xml_dir),
        images_dir=Path(args.images_dir),
        output_dir=Path(args.output_dir),
        seed=args.seed
    )


if __name__ == "__main__":
    main()

