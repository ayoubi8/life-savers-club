
BEGIN;

-- 1. Create the get_my_claim function to securely get a value from the JWT.
CREATE OR REPLACE FUNCTION get_my_claim(claim TEXT)
RETURNS JSONB AS $$
  SELECT coalesce(current_setting('request.jwt.claims', true)::jsonb ->> claim, null)::jsonb;
$$ LANGUAGE SQL STABLE;

-- 2. Create the is_admin_or_root function for easy checking of roles.
CREATE OR REPLACE FUNCTION is_admin_or_root()
RETURNS BOOLEAN AS $$
  SELECT (
    get_my_claim('role')::text = '"admin"' OR 
    get_my_claim('role')::text = '"root"'
  );
$$ LANGUAGE SQL STABLE;

-- 3. Clean up old policies on the sponsors table.
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.sponsors;
DROP POLICY IF EXISTS "Enable all access for admin and root users" ON public.sponsors;
DROP POLICY IF EXISTS "Enable all access for admin users" ON public.sponsors;


-- 4. Apply correct RLS policies to the sponsors table.
-- Allow admin/root to do everything.
CREATE POLICY "Enable all access for admin and root users" ON public.sponsors
FOR ALL
TO authenticated
USING (is_admin_or_root())
WITH CHECK (is_admin_or_root());

-- Allow anonymous and authenticated users to read.
CREATE POLICY "Enable read access for all users" ON public.sponsors
FOR SELECT
TO anon, authenticated
USING (true);


-- 5. Clean up old policies on the storage objects.
DROP POLICY IF EXISTS "Enable read access for all users" ON storage.objects;
DROP POLICY IF EXISTS "Enable all access for admin and root users" ON storage.objects;
DROP POLICY IF EXISTS "Enable insert for admin users" ON storage.objects;
DROP POLICY IF EXISTS "Enable update for admin users" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete for admin users" ON storage.objects;
DROP POLICY IF EXISTS "Enable all access for admin and root users on logos" ON storage.objects;
DROP POLICY IF EXISTS "Enable public read access on logos" ON storage.objects;



-- 6. Apply correct policies to the logos bucket in storage.
-- Allow admin/root to do everything on the logos bucket.
CREATE POLICY "Enable all access for admin and root users on logos" ON storage.objects
FOR ALL
USING (bucket_id = 'logos' AND is_admin_or_root())
WITH CHECK (bucket_id = 'logos' AND is_admin_or_root());

-- Allow public read access on the logos bucket.
CREATE POLICY "Enable public read access on logos" ON storage.objects
FOR SELECT
USING (bucket_id = 'logos');


COMMIT;
