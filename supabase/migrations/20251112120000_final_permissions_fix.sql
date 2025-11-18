-- Drop all existing RLS policies on sponsors and storage to avoid conflicts
DROP POLICY IF EXISTS "Allow public read access to sponsors" ON public.sponsors;
DROP POLICY IF EXISTS "Allow full access for admins on sponsors" ON public.sponsors;
DROP POLICY IF EXISTS "Allow public read access to sponsor logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow logo uploads for admins" ON storage.objects;
DROP POLICY IF EXISTS "Allow logo updates for admins" ON storage.objects;
DROP POLICY IF EXISTS "Allow logo deletes for admins" ON storage.objects;
DROP POLICY IF EXISTS "Allow all access for admins on storage" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to logos" ON storage.objects;

-- Enable RLS on the sponsors table
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

-- Function to check if a user is an admin or root
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'root')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Policies for the 'sponsors' table
CREATE POLICY "Allow public read access to sponsors"
ON public.sponsors
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow full access for admins on sponsors"
ON public.sponsors
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Policies for storage
CREATE POLICY "Allow all access for admins on storage"
ON storage.objects
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Allow public read access to logos"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'logos');
