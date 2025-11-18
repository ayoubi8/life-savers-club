
-- Enable RLS for the user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow authenticated users to read user roles" ON public.user_roles;

-- Create a new policy that allows authenticated users to read roles
CREATE POLICY "Allow authenticated users to read user roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

-- It's also good practice to have an insert policy.
-- This one allows an admin to add new roles.
DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;
CREATE POLICY "Admins can insert user roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
  );
