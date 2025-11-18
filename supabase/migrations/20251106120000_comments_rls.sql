-- Enable RLS on the comments table
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Allow public read access to comments
CREATE POLICY "Public can read comments"
ON public.comments
FOR SELECT
USING (true);

-- Allow anyone to insert a new comment
CREATE POLICY "Anyone can create comments"
ON public.comments
FOR INSERT
WITH CHECK (true);
