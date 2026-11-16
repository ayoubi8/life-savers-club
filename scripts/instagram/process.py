"""Turn the raw gallery-dl downloads into web-ready media.

- Photos  -> WebP, max 2400 px on the long side (same rule as the admin uploader).
- Reels   -> Instagram serves them as separate DASH video (*v.mp4) + audio (*a.m4a):
             merged and re-encoded to H.264/AAC MP4 (max 1080 px tall, faststart),
             kept under the 50 MB bucket limit, plus a WebP poster frame.
- Writes <out>/<slug>/manifest.json (file, kind, width, height, size, source post)
  and <out>/_sheets/<slug>.jpg contact sheets for picking covers.

Usage: python -I scripts/instagram/process.py scraped/instagram scraped/processed
"""
import json, pathlib, re, subprocess, sys

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageOps

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
MAX_SIDE, QUALITY, MAX_VIDEO = 2400, 82, 48 * 1024 * 1024
src_root, out_root = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
sheets = out_root / "_sheets"
sheets.mkdir(parents=True, exist_ok=True)


def to_webp(img: Image.Image, dest: pathlib.Path) -> tuple[int, int]:
    img = ImageOps.exif_transpose(img).convert("RGB")
    img.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    img.save(dest, "WEBP", quality=QUALITY, method=6)
    return img.size


# Reels filmed to be watched with the phone turned sideways: rotated to a real landscape video.
ROTATE_CCW = {"DdzOOmlqK7i"}


def duration(path: pathlib.Path) -> float:
    info = subprocess.run([FFMPEG, "-i", str(path)], capture_output=True, text=True).stderr
    h, m, s = re.search(r"Duration: (\d+):(\d+):([\d.]+)", info).groups()
    return int(h) * 3600 + int(m) * 60 + float(s)


def encode_video(video: pathlib.Path, audio: pathlib.Path | None, dest: pathlib.Path) -> None:
    """Keeps the source resolution (Instagram's best: 1080x1920 or 720x1280) and encodes
    near-transparent H.264 (CRF 18, plays everywhere incl. iPhone). The bitrate is capped
    so that the file always fits the 48 MB budget for its duration."""
    budget_kbps = int(MAX_VIDEO * 8 / duration(video) / 1000) - 160  # minus audio + container
    maxrate = min(budget_kbps, 10000)
    cmd = [FFMPEG, "-y", "-loglevel", "error", "-i", str(video)]
    if audio:
        cmd += ["-i", str(audio), "-map", "0:v:0", "-map", "1:a:0", "-c:a", "aac", "-b:a", "128k"]
    else:
        cmd += ["-an"]
    if video.name.split("_")[0] in ROTATE_CCW:
        cmd += ["-vf", "transpose=2"]
    cmd += ["-c:v", "libx264", "-preset", "slow", "-crf", "18", "-profile:v", "high",
            "-maxrate", f"{maxrate}k", "-bufsize", f"{maxrate * 2}k",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(dest)]
    subprocess.run(cmd, check=True)
    if dest.stat().st_size > MAX_VIDEO:
        raise RuntimeError(f"{dest} is over 48 MB")


for event_dir in sorted(p for p in src_root.iterdir() if p.is_dir()):
    slug = event_dir.name
    out = out_root / slug
    out.mkdir(parents=True, exist_ok=True)
    manifest, thumbs = [], []
    for meta_file in sorted(event_dir.glob("*.json")):
        meta = json.loads(meta_file.read_text(encoding="utf-8"))
        stem = meta_file.name.split(".")[0]  # <shortcode>_<num>
        source = {"post": meta.get("post_shortcode"), "date": meta.get("post_date") or meta.get("date")}
        if meta_file.name.endswith(".mp4.json"):
            video = next(event_dir.glob(f"{stem}.fdash-*v.mp4"), None) or next(event_dir.glob(f"{stem}.mp4"), None)
            audio = next(event_dir.glob(f"{stem}.fdash-*a.m4a"), None)
            if not video:
                print("!! no video for", meta_file); continue
            dest = out / f"{stem}.mp4"
            if not dest.exists():
                encode_video(video, audio, dest)
            poster = out / f"{stem}-poster.webp"
            frame = out / f"{stem}-frame.png"
            subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-ss", "1", "-i", str(dest), "-frames:v", "1", str(frame)], check=True)
            with Image.open(frame) as probe:
                w, h = probe.size  # the video's real size (posters may be resized)
            with Image.open(frame) as im:
                to_webp(im, poster)
                thumbs.append((im.copy(), f"{stem} VIDEO"))
            frame.unlink()
            manifest.append({"file": dest.name, "poster": poster.name, "kind": "video", "width": w, "height": h,
                             "size": dest.stat().st_size, **source})
        else:
            img_path = next((p for p in event_dir.glob(f"{stem}.*") if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp", ".heic")), None)
            if not img_path:
                print("!! no image for", meta_file); continue
            dest = out / f"{stem}.webp"
            with Image.open(img_path) as im:
                w, h = to_webp(im, dest)
                thumbs.append((im.copy(), stem))
            manifest.append({"file": dest.name, "kind": "image", "width": w, "height": h,
                             "size": dest.stat().st_size, **source})
    (out / "manifest.json").write_text(json.dumps(manifest, indent=1, default=str), encoding="utf-8")

    # Contact sheet: 6 columns of 300 px tiles with the file stem written under each.
    cols, tile = 6, 300
    rows = (len(thumbs) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * tile, rows * (tile + 24)), "white")
    draw = ImageDraw.Draw(sheet)
    for i, (im, label) in enumerate(thumbs):
        im = ImageOps.exif_transpose(im).convert("RGB")
        im.thumbnail((tile, tile))
        x, y = (i % cols) * tile, (i // cols) * (tile + 24)
        sheet.paste(im, (x + (tile - im.width) // 2, y + (tile - im.height) // 2))
        draw.text((x + 4, y + tile + 4), label, fill="black")
    sheet.save(sheets / f"{slug}.jpg", quality=80)
    print(f"{slug}: {len(manifest)} items", flush=True)
