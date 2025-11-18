-- Grant public read access to sponsors, events, and the join-us form

-- Make sure RLS is enabled on the tables
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_us_form_fields ENABLE ROW LEVEL SECURITY;

-- Drop existing select policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public read access to sponsors" ON public.sponsors;
DROP POLICY IF EXISTS "Allow public read access to events" ON public.events;
DROP POLICY IF EXISTS "Allow public read access to join us form fields" ON public.join_us_form_fields;

-- Create new policies for public read access
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
