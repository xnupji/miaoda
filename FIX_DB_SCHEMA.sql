-- 1. 确保 user_role 类型存在
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('user', 'admin', 'master_node');
    END IF;
END$$;

-- 2. 确保 profiles 表存在
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  email text,
  role public.user_role NOT NULL DEFAULT 'user',
  htp_balance numeric(20, 8) NOT NULL DEFAULT 0,
  usdt_balance numeric(20, 8) NOT NULL DEFAULT 0,
  wallet_address text,
  invited_by uuid REFERENCES public.profiles(id),
  invitation_code text UNIQUE NOT NULL,
  total_invites integer NOT NULL DEFAULT 0,
  is_master_node boolean NOT NULL DEFAULT false,
  master_node_progress integer NOT NULL DEFAULT 0,
  wallet_activated boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. 确保所有字段都存在 (针对旧表结构进行修复)
DO $$
BEGIN
    -- 添加 role 字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='role') THEN
        ALTER TABLE public.profiles ADD COLUMN role public.user_role NOT NULL DEFAULT 'user';
    END IF;

    -- 添加 invitation_code 字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='invitation_code') THEN
        ALTER TABLE public.profiles ADD COLUMN invitation_code text UNIQUE;
        -- 注意：如果表里已有数据，添加 UNIQUE 可能会失败，这里暂时假设是新表或空表，或者后面有修复逻辑
    END IF;

    -- 添加其他字段...
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='htp_balance') THEN
        ALTER TABLE public.profiles ADD COLUMN htp_balance numeric(20, 8) NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='usdt_balance') THEN
        ALTER TABLE public.profiles ADD COLUMN usdt_balance numeric(20, 8) NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='total_invites') THEN
        ALTER TABLE public.profiles ADD COLUMN total_invites integer NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='wallet_activated') THEN
        ALTER TABLE public.profiles ADD COLUMN wallet_activated boolean DEFAULT false;
    END IF;
END$$;

-- 4. 开启 RLS 并允许访问
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.profiles;
CREATE POLICY "Enable all access for authenticated users" ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. 自动验证邮箱触发器
CREATE OR REPLACE FUNCTION public.auto_confirm_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.email_confirmed_at = now();
  NEW.confirmed_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_auto_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_new_user();

-- 6. 邀请码生成函数
CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text[] := '{0,1,2,3,4,5,6,7,8,9,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z}';
  result text := '';
  i integer := 0;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || chars[1+floor(random()*(array_length(chars, 1)))::int];
  END LOOP;
  RETURN result;
END;
$$;

-- 7. 用户创建触发器 (核心逻辑)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_invitation_code text;
  new_role public.user_role;
  username_val text;
  inviter_id uuid;
  invitation_code_val text;
BEGIN
  -- 获取用户名
  username_val := new.raw_user_meta_data->>'username';
  IF username_val IS NULL THEN
    username_val := split_part(new.email, '@', 1);
  END IF;

  -- 确定角色 (大小写不敏感)
  IF lower(username_val) = 'amin' OR lower(username_val) = 'admin' THEN
    new_role := 'admin';
  ELSE
    new_role := 'user';
  END IF;

  -- 生成唯一的邀请码
  LOOP
    new_invitation_code := generate_invitation_code();
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE invitation_code = new_invitation_code) THEN
      EXIT;
    END IF;
  END LOOP;
  
  -- 处理邀请关系 (如果用户注册时填了邀请码)
  -- 注意：这里通常由前端处理，或者在这里处理
  -- 但 raw_user_meta_data 中可能有 invitation_code
  invitation_code_val := new.raw_user_meta_data->>'invitation_code';
  IF invitation_code_val IS NOT NULL AND invitation_code_val != '' THEN
    SELECT id INTO inviter_id FROM public.profiles WHERE invitation_code = invitation_code_val;
  END IF;

  -- 插入 Profile
  INSERT INTO public.profiles (
    id,
    username,
    email,
    role,
    invitation_code,
    htp_balance,
    usdt_balance,
    total_invites,
    is_master_node,
    master_node_progress,
    wallet_activated,
    invited_by,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    username_val,
    new.email,
    new_role,
    new_invitation_code,
    0,
    0,
    0,
    false,
    0,
    false,
    inviter_id, -- 如果找到了邀请人，这里会自动关联
    now(),
    now()
  );

  RETURN new;
END;
$$;

-- 重新创建 Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 8. 修复现有数据的邀请码 (如果为空)
DO $$
DECLARE
  r RECORD;
  new_code text;
BEGIN
  -- 只有当 invitation_code 存在时才执行
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='invitation_code') THEN
      FOR r IN SELECT id FROM public.profiles WHERE invitation_code IS NULL LOOP
        LOOP
          new_code := generate_invitation_code();
          IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE invitation_code = new_code) THEN
            EXIT;
          END IF;
        END LOOP;
        
        UPDATE public.profiles
        SET invitation_code = new_code
        WHERE id = r.id;
      END LOOP;
  END IF;
END $$;
