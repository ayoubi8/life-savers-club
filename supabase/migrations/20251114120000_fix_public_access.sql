-- Drop existing select policies on sponsors, events, and join_us_form_fields
DROP POLICY IF EXISTS "Allow public read access to sponsors" ON public.sponsors;
DROP POLICY IF EXISTS "Allow public read access to events" ON public.events;
DROP POLICY IF EXISTS "Allow public read access to join us form fields" ON public.join_us_form_fields;

-- Create new policies granting select access to PUBLIC
CREATE POLICY "Allow public read access to sponsors"
ON public.sponsors
FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow public read access to events"
ON public.events
FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow public read access to join us form fields"
ON public.join_us_form_fields
FOR SELECT
TO public
USING (true);
