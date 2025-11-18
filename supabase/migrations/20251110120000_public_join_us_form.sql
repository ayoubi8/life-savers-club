CREATE POLICY "Allow public read access to join_us_form_fields"
ON public.join_us_form_fields
FOR SELECT
TO anon, authenticated
USING (true);
