-- ═════════════ Media library: resolution filter for videos ═════════════
-- Resolution class from the shorter side, so a vertical 1080×1920 phone video is 1080p like a
-- horizontal 1920×1080 one. Thresholds leave room for odd sizes (1072p, DCI 4K…).
-- Keep in sync with resolutionOf() in src/lib/media/schema.ts.

alter table public.media_assets add column resolution text generated always as (
  case
    when width is null or height is null then null
    when least(width, height) >= 2000 then 'uhd'
    when least(width, height) >= 1400 then 'qhd'
    when least(width, height) >= 1000 then 'fhd'
    when least(width, height) >= 700 then 'hd'
    else 'sd'
  end
) stored;

create index media_assets_video_resolution on public.media_assets (folder_id, resolution)
  where deleted_at is null and kind = 'video';
