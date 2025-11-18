
-- Add display_name column to comments table
ALTER TABLE public.comments
ADD COLUMN display_name TEXT;

-- Rename event_id to article_id in comments table
ALTER TABLE public.comments
RENAME COLUMN event_id TO article_id;
