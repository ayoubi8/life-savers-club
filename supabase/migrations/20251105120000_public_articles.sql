-- Create a policy to allow public read access to articles
CREATE POLICY "Public can read articles"
ON public.articles
FOR SELECT
USING (true);
