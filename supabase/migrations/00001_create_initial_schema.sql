-- 创建用户角色枚举
CREATE TYPE public.user_role AS ENUM ('user', 'admin', 'master_node');

-- 创建profiles表
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  email text,
  role user_role NOT NULL DEFAULT 'user',
  htp_balance numeric(20, 8) NOT NULL DEFAULT 0,
  usdt_balance numeric(20, 8) NOT NULL DEFAULT 0,
  wallet_address text,
  invited_by uuid REFERENCES public.profiles(id),
  invitation_code text UNIQUE NOT NULL,
  total_invites integer NOT NULL DEFAULT 0,
  is_master_node boolean NOT NULL DEFAULT false,
  master_node_progress integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 创建挖矿记录表
CREATE TABLE public.mining_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric(20, 8) NOT NULL,
  mining_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 创建交易记录表
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('mining', 'invitation_reward', 'master_node_reward', 'withdrawal', 'transfer_in', 'transfer_out')),
  amount numeric(20, 8) NOT NULL,
  token_type text NOT NULL CHECK (token_type IN ('HTP', 'USDT')),
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 创建邀请关系表
CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_amount numeric(20, 8) NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(inviter_id, invitee_id)
);

-- 创建主节点申请表
CREATE TABLE public.master_node_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  activated_wallets integer NOT NULL DEFAULT 0,
  target_wallets integer NOT NULL DEFAULT 100000,
  total_rewards numeric(20, 8) NOT NULL DEFAULT 0,
  applied_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id)
);

-- 创建提币审核表
CREATE TABLE public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric(20, 8) NOT NULL,
  token_type text NOT NULL CHECK (token_type IN ('HTP', 'USDT')),
  to_address text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  usdt_paid numeric(20, 8),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id),
  reject_reason text
);

-- 创建索引
CREATE INDEX idx_mining_records_user_id ON public.mining_records(user_id);
CREATE INDEX idx_mining_records_date ON public.mining_records(mining_date);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_invitations_inviter ON public.invitations(inviter_id);
CREATE INDEX idx_invitations_invitee ON public.invitations(invitee_id);
CREATE INDEX idx_withdrawal_requests_status ON public.withdrawal_requests(status);
CREATE INDEX idx_master_node_applications_status ON public.master_node_applications(status);

-- 创建触发器函数：自动同步用户到profiles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count int;
  new_invitation_code text;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles;
  
  -- 生成唯一邀请码
  new_invitation_code := substring(md5(random()::text) from 1 for 8);
  
  -- 插入profile
  INSERT INTO public.profiles (id, username, email, role, invitation_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.phone, NEW.id::text),
    NEW.email,
    CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END,
    new_invitation_code
  );
  RETURN NEW;
END;
$$;

-- 创建触发器
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL)
  EXECUTE FUNCTION handle_new_user();

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 为profiles表添加更新时间触发器
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 创建辅助函数：检查是否为管理员
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = uid AND p.role IN ('admin'::user_role)
  );
$$;

-- 创建公共视图
CREATE VIEW public_profiles AS
  SELECT id, username, role, htp_balance, total_invites, is_master_node, created_at
  FROM profiles;

-- 设置RLS策略
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mining_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_node_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Profiles策略
CREATE POLICY "管理员可以查看所有profiles" ON profiles
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "用户可以查看自己的profile" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "用户可以更新自己的profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id)
  WITH CHECK (role IS NOT DISTINCT FROM (SELECT role FROM profiles WHERE id = auth.uid()));

CREATE POLICY "管理员可以更新所有profiles" ON profiles
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

-- Mining records策略
CREATE POLICY "用户可以查看自己的挖矿记录" ON mining_records
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建自己的挖矿记录" ON mining_records
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "管理员可以查看所有挖矿记录" ON mining_records
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- Transactions策略
CREATE POLICY "用户可以查看自己的交易记录" ON transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建自己的交易记录" ON transactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "管理员可以查看所有交易记录" ON transactions
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- Invitations策略
CREATE POLICY "用户可以查看自己的邀请记录" ON invitations
  FOR SELECT TO authenticated USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

CREATE POLICY "用户可以创建邀请记录" ON invitations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "管理员可以查看所有邀请记录" ON invitations
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- Master node applications策略
CREATE POLICY "用户可以查看自己的主节点申请" ON master_node_applications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建主节点申请" ON master_node_applications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "管理员可以查看所有主节点申请" ON master_node_applications
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- Withdrawal requests策略
CREATE POLICY "用户可以查看自己的提币请求" ON withdrawal_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建提币请求" ON withdrawal_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "管理员可以查看所有提币请求" ON withdrawal_requests
  FOR ALL TO authenticated USING (is_admin(auth.uid()));