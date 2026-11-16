-- New role for department members (HR, marketing, ...): access limited to their sections.
-- Kept in its own migration: Postgres cannot use a new enum value in the transaction that adds it.
alter type public.app_role add value if not exists 'member';
