-- 自动验证邮箱触发器
-- 目的：绕过 Supabase 的 Confirm Email 限制，在用户注册时自动将邮箱标记为已验证
-- 这样用户注册后可以直接登录，无需手动去数据库或后台确认

-- 1. 创建一个函数，用于在插入新用户时自动设置 email_confirmed_at
CREATE OR REPLACE FUNCTION public.auto_confirm_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 将 email_confirmed_at 设置为当前时间，即自动验证
  NEW.email_confirmed_at = now();
  -- 同时设置 confirmed_at 以防万一
  NEW.confirmed_at = now();
  RETURN NEW;
END;
$$;

-- 2. 创建触发器，绑定到 auth.users 表的 BEFORE INSERT 事件
-- 注意：这需要 Supabase 数据库的权限。通常 SQL Editor 拥有此权限。
DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;

CREATE TRIGGER on_auth_user_created_auto_confirm
BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_new_user();

-- 3. （可选）修复已有用户的验证状态
-- 如果你有已经注册但未验证的用户，可以手动运行这行（去除注释）：
-- UPDATE auth.users SET email_confirmed_at = now() WHERE email_confirmed_at IS NULL;
