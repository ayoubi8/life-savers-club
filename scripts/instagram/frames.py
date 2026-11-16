"""Grab 12 frames across each processed video into <out>/_frames/<stem>/ and a labelled grid sheet.
Usage: python -I scripts/instagram/frames.py scraped/processed"""
import pathlib, re, subprocess, sys
import imageio_ffmpeg
from PIL import Image, ImageDraw
F = imageio_ffmpeg.get_ffmpeg_exe(); root = pathlib.Path(sys.argv[1])
for video in sorted(root.glob("*/*.mp4")):
    info = subprocess.run([F, "-i", str(video)], capture_output=True, text=True).stderr
    h, m, s = re.search(r"Duration: (\d+):(\d+):([\d.]+)", info).groups()
    dur = int(h) * 3600 + int(m) * 60 + float(s)
    out = root / "_frames" / video.stem; out.mkdir(parents=True, exist_ok=True)
    tiles = []
    for i in range(12):
        t = dur * (i + 0.5) / 12
        p = out / f"t{t:06.1f}.png"
        subprocess.run([F, "-y", "-loglevel", "error", "-ss", f"{t:.2f}", "-i", str(video), "-frames:v", "1", str(p)], check=True)
        tiles.append((Image.open(p).convert("RGB"), f"{t:.1f}s"))
    sheet = Image.new("RGB", (6 * 240, 2 * 440), "white"); d = ImageDraw.Draw(sheet)
    for i, (im, label) in enumerate(tiles):
        im.thumbnail((240, 420)); x, y = (i % 6) * 240, (i // 6) * 440
        sheet.paste(im, (x, y)); d.text((x + 4, y + 424), label, fill="black")
    sheet.save(root / "_sheets" / f"frames-{video.parent.name}-{video.stem}.jpg", quality=80)
    print(video.parent.name, video.stem, f"{dur:.0f}s")
