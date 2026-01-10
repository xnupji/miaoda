-- ==========================================
-- 修复客服中心和数据库的完整脚本 (2025-01-10)
-- 请在 Supabase SQL Editor 中运行此脚本
-- ==========================================

-- 1. 创建支持消息表 (如果不存在)
create table if not exists support_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) not null,
  sender_id uuid references profiles(id) not null,
  content text not null,
  type text check (type in ('text', 'image')) default 'text',
  is_admin_reply boolean default false,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. 启用行级安全 (RLS)
alter table support_messages enable row level security;

-- 3. 创建访问策略 (先删除旧的以避免冲突)

-- 用户查看自己的消息
drop policy if exists "Users can view their own support messages" on support_messages;
create policy "Users can view their own support messages"
  on support_messages for select
  using (auth.uid() = user_id);

-- 用户发送消息
drop policy if exists "Users can insert their own support messages" on support_messages;
create policy "Users can insert their own support messages"
  on support_messages for insert
  with check (auth.uid() = user_id);

-- 管理员查看所有消息
drop policy if exists "Admins can view all support messages" on support_messages;
create policy "Admins can view all support messages"
  on support_messages for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- 管理员回复消息
drop policy if exists "Admins can insert support messages" on support_messages;
create policy "Admins can insert support messages"
  on support_messages for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- 4. 创建存储桶 (用于图片上传)
insert into storage.buckets (id, name, public)
values ('support-attachments', 'support-attachments', true)
on conflict (id) do nothing;

-- 5. 存储桶访问策略

-- 用户上传图片
drop policy if exists "Users can upload support attachments" on storage.objects;
create policy "Users can upload support attachments"
  on storage.objects for insert
  with check (
    bucket_id = 'support-attachments' and
    auth.uid() = owner
  );

-- 所有人查看图片
drop policy if exists "Anyone can view support attachments" on storage.objects;
create policy "Anyone can view support attachments"
  on storage.objects for select
  using (bucket_id = 'support-attachments');

-- 6. 确保实时功能开启 (Supabase Realtime)
-- 使用 DO 块来处理可能的错误
do $$
begin
  -- 尝试将表添加到 publication (如果 publication 存在)
  begin
    alter publication supabase_realtime add table support_messages;
  exception
    when duplicate_object then null; -- 表已在 publication 中，忽略
    when undefined_object then null; -- publication 不存在，忽略
    when others then null; -- 其他错误，忽略
  end;
end $$;
