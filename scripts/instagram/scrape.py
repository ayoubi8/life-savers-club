"""Download the Instagram posts listed in links.json with gallery-dl.
Usage: python -I scripts/instagram/scrape.py <cookies.txt> <out_dir>"""
import json, subprocess, sys, pathlib, time
cookies, out = sys.argv[1], pathlib.Path(sys.argv[2])
links = json.loads((pathlib.Path(__file__).parent / "links.json").read_text(encoding="utf-8"))
for slug, posts in links.items():
    for post in posts:
        url = f"https://www.instagram.com/{post}/"
        print(f"== {slug}: {url}", flush=True)
        r = subprocess.run([sys.executable, "-m", "gallery_dl", "--cookies", cookies,
            "--write-metadata", "--sleep", "3-6", "--sleep-request", "2-4",
            "-D", str(out / slug), "-f", "{post_shortcode}_{num:>02}.{extension}", url])
        if r.returncode: print(f"!! failed {url} (code {r.returncode})", flush=True)
        time.sleep(5)
