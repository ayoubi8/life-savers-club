-- Drop all existing RLS policies on sponsors and storage to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON public.sponsors;
DROP POLICY IF EXISTS "Enable all access for admin and root users" ON public.sponsors;
DROP POLICY IF EXISTS "Enable all access for admin users" ON public.sponsors;

DROP POLICY IF EXISTS "Enable read access for all users" ON storage.objects;
DROP POLICY IF EXISTS "Enable all access for admin and root users" ON storage.objects;
DROP POLICY IF EXISTS "Enable insert for admin users" ON storage.objects;
DROP POLICY IF EXISTS "Enable update for admin users" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete for admin users" ON storage.objects;
DROP POLICY IF EXISTS "Enable all access for admin and root users on logos" ON storage.objects;
DROP POLICY IF EXISTS "Enable public read access on logos" ON storage.objects;

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

-- Policies for the 'logos' bucket in storage
CREATE POLICY "Allow public read access to sponsor logos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = 'sponsors');

CREATE POLICY "Allow logo uploads for admins" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'logos' AND (storage.foldername(name))[1] = 'sponsors' AND is_admin());

CREATE POLICY "Allow logo updates for admins" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = 'sponsors' AND is_admin());

CREATE POLICY "Allow logo deletes for admins" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = 'sponsors' AND is_admin());
