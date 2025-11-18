-- This migration corrects public access to content tables.
-- The previous use of 'TO public' was incorrect for Supabase RLS.
-- This changes it to 'TO anon, authenticated' to grant read access to everyone.

-- Enable RLS on all relevant tables
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_us_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Drop old policies that might be incorrect
DROP POLICY IF EXISTS "Allow public read access to sponsors" ON public.sponsors;
DROP POLICY IF EXISTS "Allow public read access to events" ON public.events;
DROP POLICY IF EXISTS "Allow public read access to join us form fields" ON public.join_us_form_fields;
DROP POLICY IF EXISTS "Allow public read access to articles" ON public.articles;
DROP POLICY IF EXISTS "Allow public read access to comments" ON public.comments;

-- Create correct public read access policies
CREATE POLICY "Allow public read access to sponsors"
ON public.sponsors
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public read access to events"
ON public.events
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public read access to join us form fields"
ON public.join_us_form_fields
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public read access to articles"
ON public.articles
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public read access to comments"
ON public.comments
FOR SELECT
TO anon, authenticated
USING (true);
