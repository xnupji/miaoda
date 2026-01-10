-- Create interaction_submissions table
create table if not exists interaction_submissions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) not null,
  type text check (type in ('community', 'institution')) not null,
  addresses jsonb not null,
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending',
  feedback text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table interaction_submissions enable row level security;

-- Policies

-- Users can view their own submissions
drop policy if exists "Users can view their own submissions" on interaction_submissions;
create policy "Users can view their own submissions"
  on interaction_submissions for select
  using (auth.uid() = user_id);

-- Users can create their own submissions
drop policy if exists "Users can create their own submissions" on interaction_submissions;
create policy "Users can create their own submissions"
  on interaction_submissions for insert
  with check (auth.uid() = user_id);

-- Admins can view all submissions
drop policy if exists "Admins can view all submissions" on interaction_submissions;
create policy "Admins can view all submissions"
  on interaction_submissions for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Admins can update submissions
drop policy if exists "Admins can update submissions" on interaction_submissions;
create policy "Admins can update submissions"
  on interaction_submissions for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
