import os
import shutil
import cv2
import json

SOURCE_DIR = 'ezgif-split'
BACKUP_DIR = 'ezgif-split-original'

def main():
    # 1. Back up original 800x450 files if not already backed up
    if not os.path.exists(BACKUP_DIR):
        print(f"Creating backup of original images to '{BACKUP_DIR}'...")
        shutil.copytree(SOURCE_DIR, BACKUP_DIR)
        print("Backup complete.")
    else:
        print(f"Backup already exists at '{BACKUP_DIR}'.")

    # 2. Get all remaining png frames sorted
    files = sorted([f for f in os.listdir(SOURCE_DIR) if f.lower().endswith('.png')])
    total = len(files)
    print(f"Processing {total} frames for Full HD 1080p upscaling...")

    target_w, target_h = 1920, 1080

    for idx, filename in enumerate(files):
        in_path = os.path.join(BACKUP_DIR, filename)
        out_path = os.path.join(SOURCE_DIR, filename)

        img = cv2.imread(in_path)
        if img is None:
            print(f"Warning: Could not read {in_path}")
            continue

        # Gentle bilateral filter to clean compression artifacts while preserving edges
        smoothed = cv2.bilateralFilter(img, d=3, sigmaColor=15, sigmaSpace=15)

        # High-precision Lanczos-4 upscaling to 1920x1080
        upscaled = cv2.resize(smoothed, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)

        # Smart unsharp masking for crisp details (eyes, glasses, glowing particles, hair)
        blur = cv2.GaussianBlur(upscaled, (0, 0), sigmaX=1.5)
        sharpened = cv2.addWeighted(upscaled, 1.25, blur, -0.25, 0)

        # Save with balanced PNG compression
        cv2.imwrite(out_path, sharpened, [cv2.IMWRITE_PNG_COMPRESSION, 4])

        if (idx + 1) % 10 == 0 or idx == total - 1:
            print(f"[{idx + 1}/{total}] Converted {filename} to 1920x1080 HD")

    # 3. Write frames.json manifest
    manifest_data = {
        "count": total,
        "frames": [f"ezgif-split/{f}" for f in files]
    }
    with open('frames.json', 'w') as f:
        json.dump(manifest_data, f, indent=2)
    print("Generated frames.json manifest successfully.")

if __name__ == '__main__':
    main()
