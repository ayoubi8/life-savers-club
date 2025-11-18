-- Grant permissions for admins to manage sponsors and storage

-- 1. Create policy to allow users to see their own role
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- 2. Create policy for admins to manage all user roles
CREATE POLICY "Admins can manage user roles" ON public.user_roles
  FOR ALL USING ((EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
  )));

-- 3. Create policies for admins to manage sponsors
CREATE POLICY "Admins can manage sponsors" ON public.sponsors
  FOR ALL USING ((EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
  ))) WITH CHECK ((EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
  )));

-- 4. Create policies for storage
-- Public can see logos
CREATE POLICY "Public can view logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');

-- Admins can manage logos
CREATE POLICY "Admins can manage logos" ON storage.objects
  FOR ALL USING (bucket_id = 'logos' AND (EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
  ))) WITH CHECK (bucket_id = 'logos' AND (EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
  )));
