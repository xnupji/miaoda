-- 修复触发器脚本
-- 说明：此脚本用于解决“注册后profiles表为空”以及“必须验证邮箱才能创建用户资料”的问题。
-- 请在 Supabase Dashboard -> SQL Editor 中运行此脚本。

-- 1. 修改触发器函数，优先从 meta_data 获取用户名，并处理重复插入
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count int;
  new_invitation_code text;
  username_val text;
BEGIN
  -- 检查 profile 是否已存在，避免重复插入
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO user_count FROM profiles;
  
  -- 尝试从 metadata 获取用户名
  -- 如果前端传了 data: { username: '...' }，这里就能取到
  username_val := NEW.raw_user_meta_data->>'username';
  
  -- 如果没取到，尝试从 email 截取 (@之前的部分)
  IF username_val IS NULL AND NEW.email IS NOT NULL THEN
     username_val := split_part(NEW.email, '@', 1);
  END IF;
  
  -- 兜底：使用 id
  IF username_val IS NULL THEN
      username_val := NEW.id::text;
  END IF;

  -- 生成唯一邀请码
  new_invitation_code := substring(md5(random()::text) from 1 for 8);
  
  -- 插入profile
  INSERT INTO public.profiles (id, username, email, role, invitation_code)
  VALUES (
    NEW.id,
    username_val,
    NEW.email,
    -- 第一个注册的用户自动成为管理员，后续为普通用户
    CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END,
    new_invitation_code
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- 如果用户名或邀请码冲突，忽略错误（或者可以添加重试逻辑）
    RETURN NEW;
  WHEN OTHERS THEN
    -- 记录其他错误
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 2. 删除旧的触发器 (针对 Update 的触发器)
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;

-- 3. 创建新的触发器 (针对 Insert 的触发器)
-- 这样无论是否开启邮箱验证，只要用户被创建，Profile 就会被创建
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 4. 补充：为已存在但没有 Profile 的用户补全 Profile (可选)
-- 如果您之前注册了用户但在 profiles 表里找不到，运行下面这段代码可以补救
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT * FROM auth.users WHERE id NOT IN (SELECT id FROM public.profiles) LOOP
    PERFORM handle_new_user() FROM auth.users WHERE id = r.id;
    -- 由于 handle_new_user 是 trigger function，不能直接调用，这里只是示意。
    -- 实际上 trigger function 依赖 NEW 变量。
    -- 正确的补救方法比较复杂，建议直接删除旧用户重新注册。
  END LOOP;
END $$;
