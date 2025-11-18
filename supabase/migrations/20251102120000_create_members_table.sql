
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_role') THEN
        CREATE TYPE public.member_role AS ENUM (
          'president',
          'vice_president',
          'leader',
          'former_president',
          'alumni',
          'member'
        );
    END IF;
END$$;

-- Create the members table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name text NOT NULL,
  role member_role NOT NULL DEFAULT 'member',
  bio text,
  photo_url text,
  socials jsonb,
  active boolean NOT NULL DEFAULT true,
  order_index integer NOT NULL DEFAULT 0,
  user_id uuid, -- Nullable to allow for non-user members like alumni
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE SET NULL
);

-- Add comments to columns for clarity
COMMENT ON COLUMN public.members.socials IS 'JSONB object for social media links, e.g., { "linkedin": "url", "x": "url" }';
COMMENT ON COLUMN public.members.order_index IS 'Used for custom ordering of members, especially leaders.';
COMMENT ON COLUMN public.members.user_id IS 'Link to the auth.users table if the member is a registered user.';


-- Create an index for faster querying on role, active status, and order
CREATE INDEX IF NOT EXISTS idx_members_role_active_order ON public.members (role, active, order_index);

-- Enable Row Level Security (RLS) on the members table
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Public can view active members') THEN
        CREATE POLICY "Public can view active members"
        ON public.members
        FOR SELECT
        USING (active = true);
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admins have full access') THEN
        CREATE POLICY "Admins have full access"
        ON public.members
        FOR ALL
        USING (
          (SELECT rolname FROM pg_roles WHERE oid = session_user::regrole) = 'admin'
        )
        WITH CHECK (
          (SELECT rolname FROM pg_roles WHERE oid = session_user::regrole) = 'admin'
        );
    END IF;
END$$;



-- Trigger to update 'updated_at' timestamp on any change
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_members_updated ON public.members;
CREATE TRIGGER on_members_updated
BEFORE UPDATE ON public.members
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- Seed initial data for the three leaders
INSERT INTO public.members (full_name, role, bio, order_index)
SELECT 'Leader One', 'leader', 'Bio for leader one.', 1
WHERE NOT EXISTS (SELECT 1 FROM public.members WHERE full_name = 'Leader One');

INSERT INTO public.members (full_name, role, bio, order_index)
SELECT 'Leader Two', 'leader', 'Bio for leader two.', 2
WHERE NOT EXISTS (SELECT 1 FROM public.members WHERE full_name = 'Leader Two');

INSERT INTO public.members (full_name, role, bio, order_index)
SELECT 'Leader Three', 'leader', 'Bio for leader three.', 3
WHERE NOT EXISTS (SELECT 1 FROM public.members WHERE full_name = 'Leader Three');
