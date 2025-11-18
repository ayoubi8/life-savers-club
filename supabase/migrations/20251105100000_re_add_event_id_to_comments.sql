-- Re-add event_id to the comments table and keep article_id
-- This allows comments to belong to either an event or an article.

-- First, let's add the event_id column back, allowing it to be null.
ALTER TABLE public.comments
ADD COLUMN event_id UUID REFERENCES public.events(id) ON DELETE SET NULL;

-- We already have article_id from the previous migration.
-- Now, we add a constraint to ensure that a comment has either an article_id OR an event_id, but not both.
ALTER TABLE public.comments
ADD CONSTRAINT chk_comment_parent
CHECK ((article_id IS NOT NULL AND event_id IS NULL) OR (article_id IS NULL AND event_id IS NOT NULL) OR (article_id IS NULL AND event_id IS NULL));
