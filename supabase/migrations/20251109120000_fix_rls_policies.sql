-- Step 1: Drop the old, faulty policies that cause recursion.
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage sponsors" ON public.sponsors;
DROP POLICY IF EXISTS "Admins can manage logos" ON storage.objects;

-- Step 2: Create a SECURITY DEFINER function to check for admin role.
-- This function will bypass the RLS policies on user_roles, thus avoiding recursion.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
-- Set a search path to prevent hijacking.
SET search_path = public
AS $$
BEGIN
  -- Check if the current user has the 'admin' role in the user_roles table.
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  );
END;
$$;

-- Step 3: Re-create the policies using the is_admin() function.

-- On user_roles:
-- The "Users can view their own roles" SELECT policy still exists.
-- This policy allows admins to manage all roles.
CREATE POLICY "Admins can manage user roles" ON public.user_roles
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- On sponsors:
-- This allows anyone to view sponsors, which is necessary for the public sponsors page.
CREATE POLICY "Public can view sponsors" ON public.sponsors
  FOR SELECT
  USING (true);

-- This allows admins to add, update, and delete sponsors.
CREATE POLICY "Admins can manage sponsors" ON public.sponsors
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- On storage.objects (for logos):
-- The "Public can view logos" policy still exists.
-- This allows admins to upload, update, and delete logos.
CREATE POLICY "Admins can manage logos" ON storage.objects
  FOR ALL
  USING ( bucket_id = 'logos' AND public.is_admin() )
  WITH CHECK ( bucket_id = 'logos' AND public.is_admin() );
