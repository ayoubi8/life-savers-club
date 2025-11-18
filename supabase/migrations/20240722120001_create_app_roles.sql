-- Create a table for app roles
create table app_roles (
  user_id uuid references auth.users not null,
  role text check (role in ('root', 'admin', 'co-admin')),
  primary key (user_id)
);

-- Set up Row Level Security (RLS)
alter table app_roles
  enable row level security;

create policy "Can view own role." on app_roles
  for select using (auth.uid() = user_id);

create policy "Root can manage all roles." on app_roles
  for all using (
    auth.uid() in (
      select user_id from app_roles where role = 'root'
    )
  );
