-- Add new member roles to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'President';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'Vice President';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'Secretary';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'Member';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'Alumni';

-- Create a new table for member-specific data
CREATE TABLE public.members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  description text,
  avatar_url text,
  social_links jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view member data
CREATE POLICY "Anyone can view members" ON public.members
  FOR SELECT USING (true);

-- Allow admins to manage member data
CREATE POLICY "Admins can manage members" ON public.members
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Trigger to update updated_at timestamp
CREATE TRIGGER members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
