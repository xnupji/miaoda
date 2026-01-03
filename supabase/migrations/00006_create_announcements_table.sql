-- Create announcements table
create table if not exists public.announcements (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  is_active boolean default true,
  priority text check (priority in ('low', 'normal', 'high')) default 'normal',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references public.profiles(id)
);

-- Enable RLS
alter table public.announcements enable row level security;

-- Drop existing policies to avoid errors on re-run
drop policy if exists "Anyone can view active announcements" on public.announcements;
drop policy if exists "Admins can view all announcements" on public.announcements;
drop policy if exists "Admins can insert announcements" on public.announcements;
drop policy if exists "Admins can update announcements" on public.announcements;
drop policy if exists "Admins can delete announcements" on public.announcements;

-- Policy: Anyone can view active announcements (for users)
create policy "Anyone can view active announcements"
  on public.announcements for select
  using (is_active = true);

-- Policy: Admins can view all announcements (including inactive ones)
create policy "Admins can view all announcements"
  on public.announcements for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Policy: Admins can insert announcements
create policy "Admins can insert announcements"
  on public.announcements for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Policy: Admins can update announcements
create policy "Admins can update announcements"
  on public.announcements for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Policy: Admins can delete announcements
create policy "Admins can delete announcements"
  on public.announcements for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );