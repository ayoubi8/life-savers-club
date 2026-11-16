"""Save chosen video frames as WebP stills (for events that are mostly video).
Frames come from the raw DASH video (full resolution); the ceremony uses the rotated processed file.
Usage: python -I scripts/instagram/stills.py scraped"""
import pathlib, subprocess, sys
import imageio_ffmpeg
from PIL import Image
F = imageio_ffmpeg.get_ffmpeg_exe(); root = pathlib.Path(sys.argv[1])
# (event slug, post shortcode, seconds, optional ffmpeg crop filter)
STILLS = [
    ("ceremonie-promo-medecine-2019-2026", "DdzOOmlqK7i", t, None) for t in (7.8, 13.1, 23.5, 28.7, 39.2, 49.6, 54.8)
] + [
    ("mokawil", "DI68DU6tugR", t, None) for t in (15.1, 19.4, 36.6, 40.9, 45.2, 49.5)
] + [
    ("octobre-rose-2026", "DfPlLQ5yqDJ", t, None) for t in (1.7, 5.1, 8.5, 11.9, 25.6, 35.8)
] + [
    ("octobre-rose-2026", "DfPlLQ5yqDJ", 32.4, "crop=iw:ih*0.31:0:ih*0.345"),
    ("biolife", "DYcwJ2UtjBe", 63.7, None),
    ("khotwa-tour", "DYEtQGZI3PT", 18.6, None),
]
for slug, code, t, crop in STILLS:
    if slug.startswith("ceremonie"):
        src = root / "processed" / slug / f"{code}_01.mp4"
    else:
        src = next((root / "instagram" / slug).glob(f"{code}_01.fdash-*v.mp4"))
    png = root / "processed" / slug / f"{code}_still_{t:04.1f}.png"
    cmd = [F, "-y", "-loglevel", "error", "-ss", str(t), "-i", str(src), "-frames:v", "1"]
    if crop: cmd += ["-vf", crop]
    subprocess.run(cmd + [str(png)], check=True)
    with Image.open(png) as im:
        im.convert("RGB").save(png.with_suffix(".webp"), "WEBP", quality=85, method=6)
        print(png.with_suffix(".webp").name, im.size)
    png.unlink()
