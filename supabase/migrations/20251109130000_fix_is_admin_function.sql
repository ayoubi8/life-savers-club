-- Update the is_admin function to include 'root' role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
-- Set a search path to prevent hijacking.
SET search_path = public
AS $$
BEGIN
  -- Check if the current user has the 'admin' or 'root' role in the user_roles table.
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid() AND (role = 'admin'::app_role OR role = 'root'::app_role)
  );
END;
$$;
