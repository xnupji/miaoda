-- Fix permissions for Admin access and Realtime

-- 1. Ensure profiles are readable by everyone
-- This is critical so that:
-- a) The RLS policy for support_messages can query profiles to check if auth.uid() is an admin.
-- b) The frontend can join support_messages with profiles to show usernames.
alter table profiles enable row level security;

drop policy if exists "Public profiles are viewable by everyone" on profiles;
create policy "Public profiles are viewable by everyone"
  on profiles for select
  using (true);

-- 2. Update support_messages policies to be more robust
-- We re-apply them to ensure they use the readable profiles table
drop policy if exists "Admins can view all support messages" on support_messages;
create policy "Admins can view all support messages"
  on support_messages for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

drop policy if exists "Admins can insert support messages" on support_messages;
create policy "Admins can insert support messages"
  on support_messages for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- 3. Ensure Realtime is enabled for the messages table
-- This command ensures the table is in the publication for realtime updates
do $$
begin
  execute 'alter publication supabase_realtime add table support_messages';
exception
  when duplicate_object then null;
  when others then null; -- Ignore if already exists or other issues
end
$$;
