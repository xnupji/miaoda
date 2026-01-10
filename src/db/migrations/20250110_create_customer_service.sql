-- Create support_messages table
create table if not exists support_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) not null,
  sender_id uuid references profiles(id) not null, -- The actual sender (user or admin)
  content text not null,
  type text check (type in ('text', 'image')) default 'text',
  is_admin_reply boolean default false, -- True if sent by admin/support
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table support_messages enable row level security;

-- Policies (Drop first to avoid conflicts)

-- Users can view messages where they are the user_id (their own conversation)
drop policy if exists "Users can view their own support messages" on support_messages;
create policy "Users can view their own support messages"
  on support_messages for select
  using (auth.uid() = user_id);

-- Users can insert messages to their own conversation
drop policy if exists "Users can insert their own support messages" on support_messages;
create policy "Users can insert their own support messages"
  on support_messages for insert
  with check (auth.uid() = user_id);

-- Admins can view all support messages
drop policy if exists "Admins can view all support messages" on support_messages;
create policy "Admins can view all support messages"
  on support_messages for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Admins can insert messages (replies)
drop policy if exists "Admins can insert support messages" on support_messages;
create policy "Admins can insert support messages"
  on support_messages for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Create storage bucket for support attachments if not exists
insert into storage.buckets (id, name, public)
values ('support-attachments', 'support-attachments', true)
on conflict (id) do nothing;

-- Storage policies
drop policy if exists "Users can upload support attachments" on storage.objects;
create policy "Users can upload support attachments"
  on storage.objects for insert
  with check (
    bucket_id = 'support-attachments' and
    auth.uid() = owner
  );

drop policy if exists "Anyone can view support attachments" on storage.objects;
create policy "Anyone can view support attachments"
  on storage.objects for select
  using (bucket_id = 'support-attachments');
