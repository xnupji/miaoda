-- Master Database Schema Verification & Repair Script
-- Run this script in Supabase SQL Editor to ensure all tables and policies exist.

-- ==========================================
-- 1. Profiles Table (Users)
-- ==========================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique,
  email text,
  role text default 'user' check (role in ('user', 'admin', 'master_node')),
  htp_balance float8 default 0,
  usdt_balance float8 default 0,
  wallet_address text,
  wallet_activated boolean default false,
  activation_paid_amount float8,
  activation_paid_at timestamp with time zone,
  invited_by uuid references public.profiles(id),
  invitation_code text unique,
  total_invites int default 0,
  is_master_node boolean default false,
  master_node_progress float8 default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.profiles enable row level security;

-- Policies for Profiles
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
-- Admin Policy
drop policy if exists "Admins can manage all profiles" on public.profiles;
create policy "Admins can manage all profiles" on public.profiles for all using (
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

-- ==========================================
-- 2. Platform Config
-- ==========================================
create table if not exists public.platform_config (
  id uuid default gen_random_uuid() primary key,
  config_key text unique not null,
  config_value text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.platform_config enable row level security;

-- Policies for Platform Config
create policy "Config viewable by everyone" on public.platform_config for select using (true);
-- Admin Policy
drop policy if exists "Admins can manage platform config" on public.platform_config;
create policy "Admins can manage platform config" on public.platform_config for all using (
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

-- ==========================================
-- 3. System Settings
-- ==========================================
create table if not exists public.system_settings (
  id uuid default gen_random_uuid() primary key,
  setting_key text unique not null,
  setting_value text not null,
  description text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_by uuid references public.profiles(id)
);
alter table public.system_settings enable row level security;

-- Policies for System Settings
create policy "Settings viewable by everyone" on public.system_settings for select using (true);
-- Admin Policy
drop policy if exists "Admins can manage system settings" on public.system_settings;
create policy "Admins can manage system settings" on public.system_settings for all using (
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

-- ==========================================
-- 4. Mining Records
-- ==========================================
create table if not exists public.mining_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  amount float8 not null,
  mining_date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.mining_records enable row level security;

-- Policies for Mining Records
create policy "Users can view own mining records" on public.mining_records for select using (auth.uid() = user_id);
create policy "Users can insert own mining records" on public.mining_records for insert with check (auth.uid() = user_id);
-- Admin Policy
drop policy if exists "Admins can view all mining records" on public.mining_records;
create policy "Admins can view all mining records" on public.mining_records for select using (
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

-- ==========================================
-- 5. Transactions
-- ==========================================
create table if not exists public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  type text not null,
  amount float8 not null,
  token_type text not null,
  status text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.transactions enable row level security;

-- Policies for Transactions
create policy "Users can view own transactions" on public.transactions for select using (auth.uid() = user_id);
create policy "Users can insert own transactions" on public.transactions for insert with check (auth.uid() = user_id);
-- Admin Policy
drop policy if exists "Admins can view all transactions" on public.transactions;
create policy "Admins can view all transactions" on public.transactions for select using (
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

-- ==========================================
-- 6. Withdrawal Requests
-- ==========================================
create table if not exists public.withdrawal_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  amount float8 not null,
  token_type text not null,
  to_address text not null,
  status text default 'pending',
  payment_address text,
  reject_reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  reviewed_at timestamp with time zone,
  reviewed_by uuid references public.profiles(id)
);
alter table public.withdrawal_requests enable row level security;

-- Policies for Withdrawal Requests
create policy "Users can view own requests" on public.withdrawal_requests for select using (auth.uid() = user_id);
create policy "Users can insert own requests" on public.withdrawal_requests for insert with check (auth.uid() = user_id);
-- Admin Policy
drop policy if exists "Admins can manage withdrawal requests" on public.withdrawal_requests;
create policy "Admins can manage withdrawal requests" on public.withdrawal_requests for all using (
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

-- ==========================================
-- 7. Master Node Applications
-- ==========================================
create table if not exists public.master_node_applications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  status text default 'pending',
  activated_wallets int default 0,
  target_wallets int default 100000,
  total_rewards float8 default 0,
  applied_at timestamp with time zone default timezone('utc'::text, now()) not null,
  reviewed_at timestamp with time zone,
  reviewed_by uuid references public.profiles(id)
);
alter table public.master_node_applications enable row level security;

-- Policies for Master Node Applications
create policy "Users can view own applications" on public.master_node_applications for select using (auth.uid() = user_id);
create policy "Users can insert own applications" on public.master_node_applications for insert with check (auth.uid() = user_id);
-- Admin Policy
drop policy if exists "Admins can manage master node applications" on public.master_node_applications;
create policy "Admins can manage master node applications" on public.master_node_applications for all using (
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

-- ==========================================
-- 8. Announcements
-- ==========================================
create table if not exists public.announcements (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  is_active boolean default true,
  priority text check (priority in ('low', 'normal', 'high')) default 'normal',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references public.profiles(id)
);
alter table public.announcements enable row level security;

-- Policies for Announcements
drop policy if exists "Anyone can view active announcements" on public.announcements;
create policy "Anyone can view active announcements" on public.announcements for select using (is_active = true);
-- Admin Policy
drop policy if exists "Admins can manage announcements" on public.announcements;
create policy "Admins can manage announcements" on public.announcements for all using (
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

-- ==========================================
-- 9. Invitations
-- ==========================================
create table if not exists public.invitations (
  id uuid default gen_random_uuid() primary key,
  inviter_id uuid references public.profiles(id) not null,
  invitee_id uuid references public.profiles(id) not null,
  reward_amount float8 default 10,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.invitations enable row level security;

-- Policies for Invitations
create policy "Users can view their invitations" on public.invitations for select using (auth.uid() = inviter_id);
-- Admin Policy
drop policy if exists "Admins can view all invitations" on public.invitations;
create policy "Admins can view all invitations" on public.invitations for select using (
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

-- Insert Default Config if missing
insert into public.system_settings (setting_key, setting_value, description)
values ('htp_price_mode', 'auto', 'HTP Price Calculation Mode (auto/manual)')
on conflict (setting_key) do nothing;

insert into public.system_settings (setting_key, setting_value, description)
values ('htp_price', '0.01', 'HTP Manual Price')
on conflict (setting_key) do nothing;

insert into public.platform_config (config_key, config_value, description)
values ('developer_usdt_address', '0x...', 'Developer USDT Wallet Address')
on conflict (config_key) do nothing;
