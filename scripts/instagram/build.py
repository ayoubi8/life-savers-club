"""Build the upload tree and the SQL seed for the Instagram events.

Inputs : scripts/instagram/events.py, scraped/processed/<folder>/*
Outputs: scraped/upload/events/<eventId>/<mediaId>.<ext>   (to copy to the event-media bucket)
         scraped/upload/docs.json                          (content docs, for the sanitizer check)
         supabase/seed/events_instagram.sql                (events + event_media rows, safe to re-run)

IDs are uuid5 of the slug / slug+file, so re-running gives the same IDs and paths.
Usage: python -I scripts/instagram/build.py
"""
import copy, json, pathlib, re, shutil, sys, uuid

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from events import EVENTS  # noqa: E402

NS = uuid.UUID("6f1c2a10-5b1e-4c4e-9a43-1c1ab5a7e001")
PROCESSED = ROOT / "scraped" / "processed"
UPLOAD = ROOT / "scraped" / "upload"
env = (ROOT / ".env.local").read_text(encoding="utf-8")
SUPABASE_URL = re.search(r"^NEXT_PUBLIC_SUPABASE_URL=(\S+)", env, re.M).group(1).rstrip("/")
BASE = f"{SUPABASE_URL}/storage/v1/object/public/event-media/"


def q(value):
    """SQL literal using dollar quoting (never appears in our text)."""
    if value is None:
        return "null"
    s = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)
    assert "$q$" not in s
    return f"$q${s}$q$"


if UPLOAD.exists():
    shutil.rmtree(UPLOAD)
event_sql, media_sql, docs, revised, social_sql = [], [], {}, [], []

for ev in EVENTS:
    slug, folder = ev["slug"], PROCESSED / ev["folder"]
    eid = str(uuid.uuid5(NS, slug))
    short_fr, short_en = ev["title_fr"].split(" — ")[0], ev["title_en"].split(" — ")[0]
    media = {}  # key -> row

    def use(key, alt_fr=None):
        if key in media:
            return media[key]
        for ext, kind, mime in ((".webp", "image", "image/webp"), (".mp4", "video", "video/mp4")):
            src = folder / f"{key}{ext}"
            if src.exists():
                break
        else:
            raise SystemExit(f"{slug}: missing media {key}")
        mid = str(uuid.uuid5(NS, f"{slug}/{key}"))
        # Videos and their posters were re-encoded at full resolution (v2). A new file name
        # bypasses browser/CDN caches; events_instagram_videos_v2.sql moves existing rows over.
        rev = "-v2" if kind == "video" or key.endswith("-poster") else ""
        path = f"events/{eid}/{mid}{rev}{ext}"
        if rev:
            old = BASE + f"events/{eid}/{mid}{ext}"
            revised.append((eid, mid, old, BASE + path, path, src))
        dest = UPLOAD / path
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, dest)
        width = height = None
        if kind == "image":
            from PIL import Image
            with Image.open(src) as im:
                width, height = im.size
        else:
            meta = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
            row = next((m for m in meta if m["file"] == src.name), None)
            if row:
                width, height = row["width"], row["height"]
            if ev["folder"].startswith("ceremonie"):
                width, height = 1920, 1080  # rotated to landscape after manifest was written
        n = len(media) + 1
        media[key] = {"id": mid, "url": BASE + path, "kind": kind, "path": path, "width": width, "height": height,
                      "size": src.stat().st_size, "alt": alt_fr or f"{short_fr} : photo {n}", "order": n}
        return media[key]

    cover = use(ev["cover"], ev["cover_alt"])

    def resolve(nodes, lang):
        counter = {"n": 0}

        def alt():
            counter["n"] += 1
            return f"{short_fr if lang == 'fr' else short_en} — photo {counter['n']}"

        def walk(node):
            node = copy.deepcopy(node)
            a = node.get("attrs", {})
            if node["type"] == "image":
                m = use(a["src"])
                a.update(src=m["url"], alt=alt(), caption="", mediaId=m["id"], align="center", rounded=True, shadow=False, border=False)
            elif node["type"] == "gallery":
                a["images"] = [{"src": use(k)["url"], "alt": alt(), "caption": "", "mediaId": use(k)["id"]} for k in a["images"]]
            elif node["type"] == "video":
                a["src"] = use(a["src"])["url"]
                a["poster"] = use(a["poster"])["url"]
                a["loop"] = False
            if "content" in node:
                node["content"] = [walk(c) for c in node["content"]]
            return node

        return {"type": "doc", "content": [walk(n) for n in nodes]}

    content_fr, content_en = resolve(ev["fr"], "fr"), resolve(ev["en"], "en")
    docs[slug] = {"fr": content_fr, "en": content_en}

    cols = dict(
        id=eid, slug=slug, title_fr=ev["title_fr"], title_en=ev["title_en"],
        description_fr=ev["description_fr"], description_en=ev["description_en"], location=ev["location"],
        starts_at=ev["starts_at"], ends_at=ev["ends_at"], cover_url=cover["url"], cover_alt=ev["cover_alt"],
        cover_focus=ev["cover_focus"], theme=ev["theme"], featured=ev["featured"], featured_order=ev["featured_order"],
        stats=ev["stats"], tags=ev["tags"], content_fr=content_fr, content_en=content_en,
        social_links=ev.get("social_links", {}),
    )
    for network, url in ev.get("social_links", {}).items():
        social_sql.append(
            f"update public.events set social_links = social_links || jsonb_build_object({q(network)}, {q(url)}) "
            f"where id = {q(eid)}::uuid and social_links ->> {q(network)} is null;")
    values = []
    for k, v in cols.items():
        if isinstance(v, bool):
            values.append("true" if v else "false")
        elif isinstance(v, int):
            values.append(str(v))
        elif k == "tags":
            values.append("array[" + ", ".join(q(x) for x in v) + "]::text[]")
        elif isinstance(v, (dict, list)):
            values.append(q(v) + "::jsonb")
        else:
            values.append(q(v))
    event_sql.append(f"insert into public.events ({', '.join(cols)}, status)\nvalues ({', '.join(values)}, 'draft')\non conflict (slug) do nothing;")
    for m in media.values():
        media_sql.append(
            "insert into public.event_media (id, event_id, url, kind, storage_path, width, height, size_bytes, alt, sort_order)\n"
            f"select {q(m['id'])}::uuid, {q(eid)}::uuid, {q(m['url'])}, {q(m['kind'])}, {q(m['path'])}, "
            f"{m['width'] or 'null'}, {m['height'] or 'null'}, {m['size']}, {q(m['alt'])}, {m['order']}\n"
            f"where exists (select 1 from public.events where id = {q(eid)}::uuid)\non conflict (id) do nothing;")
    total = sum(m["size"] for m in media.values())
    print(f"{slug:45} {len(media):3} files  {total / 1e6:6.1f} MB")

(UPLOAD / "docs.json").write_text(json.dumps(docs, ensure_ascii=False), encoding="utf-8")
header = """-- Events imported from the club's Instagram posts (generated by scripts/instagram/build.py, do not edit by hand).
-- All events are DRAFTS: review them in /admin/events, then publish.
-- Media files must be uploaded first: npx supabase storage cp -r scraped/upload/events ss:///event-media --remote
-- Safe to run twice (fixed ids, on conflict do nothing).
-- Run: npx supabase db query --remote -f supabase/seed/events_instagram.sql
begin;
"""
(ROOT / "supabase" / "seed" / "events_instagram.sql").write_text(
    header + "\n\n".join(event_sql) + "\n\n" + "\n".join(media_sql) + "\ncommit;\n", encoding="utf-8")

# Switch already-imported events to the v2 videos/posters (keeps any edits made in the admin).
upd = ["-- Generated by scripts/instagram/build.py: point imported events at the full-resolution v2 videos and posters.",
       "-- Upload scraped/upload/**/*-v2.* first. Safe to run twice.", "begin;"]
for eid, mid, old, new, path, src in revised:
    dims = ""
    if src.suffix == ".mp4":
        dims = next((f", width = {m['width']}, height = {m['height']}" for m in json.loads((src.parent / "manifest.json").read_text(encoding="utf-8")) if m["file"] == src.name), "")
    upd.append(f"update public.event_media set url = {q(new)}, storage_path = {q(path)}, size_bytes = {src.stat().st_size}{dims} where id = {q(mid)}::uuid;")
    upd.append(f"update public.events set content_fr = replace(content_fr::text, {q(old)}, {q(new)})::jsonb, "
               f"content_en = replace(content_en::text, {q(old)}, {q(new)})::jsonb, cover_url = replace(cover_url, {q(old)}, {q(new)}) where id = {q(eid)}::uuid;")
(ROOT / "supabase" / "seed" / "events_instagram_videos_v2.sql").write_text("\n".join(upd) + "\ncommit;\n", encoding="utf-8")
(ROOT / "supabase" / "seed" / "events_instagram_social_links.sql").write_text(
    "-- Generated by scripts/instagram/build.py: link each imported event to its Instagram post.\n"
    "-- Needs migration 20261116000000_event_social_links. Never overwrites a link set in the admin.\n"
    "begin;\n" + "\n".join(social_sql) + "\ncommit;\n", encoding="utf-8")
print("total", sum(f.stat().st_size for f in UPLOAD.rglob("*") if f.is_file()) / 1e6, "MB")
