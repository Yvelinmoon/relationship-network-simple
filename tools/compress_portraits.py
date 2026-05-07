#!/usr/bin/env python3
"""Compress narrative graph portrait images into thumbnail/card tiers.

Usage from a graph project root:
  python3 /workspace/skills/narrative-relationship-graph/tools/compress_portraits.py assets/portraits

Output:
  assets/portraits/thumb/<name>.webp  (default 256px, for node sprites)
  assets/portraits/card/<name>.webp   (default 512px, for info cards)

The crop is top-center square to preserve character heads.
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path
from PIL import Image

SUPPORTED = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def crop_top_square(img: Image.Image, target_size: int) -> Image.Image:
    if img.mode not in {"RGB", "RGBA"}:
        img = img.convert("RGBA")
    w, h = img.size
    crop_size = min(w, h)
    left = max(0, (w - crop_size) // 2)
    top = 0
    cropped = img.crop((left, top, left + crop_size, top + crop_size))
    return cropped.resize((target_size, target_size), Image.Resampling.LANCZOS)


def compress_one(path: Path, thumb_dir: Path, card_dir: Path, thumb_size: int, card_size: int, thumb_quality: int, card_quality: int) -> tuple[int, int, int]:
    img = Image.open(path)
    original_size = path.stat().st_size
    output_name = f"{path.stem}.webp"

    thumb = crop_top_square(img, thumb_size)
    thumb_path = thumb_dir / output_name
    thumb.save(thumb_path, "WEBP", quality=thumb_quality, method=6)

    card = crop_top_square(img, card_size)
    card_path = card_dir / output_name
    card.save(card_path, "WEBP", quality=card_quality, method=6)

    return original_size, thumb_path.stat().st_size, card_path.stat().st_size


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("portrait_dir", nargs="?", default="assets/portraits")
    parser.add_argument("--thumb-size", type=int, default=256)
    parser.add_argument("--card-size", type=int, default=512)
    parser.add_argument("--thumb-quality", type=int, default=75)
    parser.add_argument("--card-quality", type=int, default=80)
    args = parser.parse_args()

    portrait_dir = Path(args.portrait_dir)
    thumb_dir = portrait_dir / "thumb"
    card_dir = portrait_dir / "card"
    thumb_dir.mkdir(parents=True, exist_ok=True)
    card_dir.mkdir(parents=True, exist_ok=True)

    images = [
        p for p in sorted(portrait_dir.iterdir())
        if p.is_file() and p.suffix.lower() in SUPPORTED and p.parent == portrait_dir
    ]

    if not images:
        print(f"No source images found in {portrait_dir}")
        return

    total_original = total_thumb = total_card = 0
    for path in images:
        original, thumb, card = compress_one(
            path, thumb_dir, card_dir,
            args.thumb_size, args.card_size,
            args.thumb_quality, args.card_quality,
        )
        total_original += original
        total_thumb += thumb
        total_card += card
        print(f"{path.name}: {original//1024}KB -> thumb {thumb//1024}KB, card {card//1024}KB")

    print("---")
    print(f"Original total: {total_original//1024}KB")
    print(f"Thumb total:    {total_thumb//1024}KB")
    print(f"Card total:     {total_card//1024}KB")
    print("Use node.image = './assets/portraits/thumb/<name>.webp' and node.imageCard = './assets/portraits/card/<name>.webp'.")


if __name__ == "__main__":
    main()
