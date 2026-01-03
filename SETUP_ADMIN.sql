-- SQL 脚本：设置管理员账号
-- 说明：请在 Supabase Dashboard 的 SQL Editor 中运行此脚本

-- 步骤 1: 确保您已经在前台注册了一个用户名为 'admin' (或其他您想作为管理员的用户名) 的账号。

-- 步骤 2: 将下面的 'admin' 替换为您实际注册的管理员用户名
DO $$
DECLARE
  target_username TEXT := 'admin'; -- 在这里修改为您注册的管理员用户名
  target_user_id UUID;
BEGIN
  -- 查找用户的 ID
  SELECT id INTO target_user_id
  FROM profiles
  WHERE username = target_username;

  IF target_user_id IS NOT NULL THEN
    -- 更新用户角色为 'admin'
    UPDATE profiles
    SET role = 'admin'
    WHERE id = target_user_id;
    
    RAISE NOTICE '用户 % (ID: %) 已成功设置为管理员', target_username, target_user_id;
  ELSE
    RAISE NOTICE '未找到用户名为 % 的用户，请先在前台注册该用户', target_username;
  END IF;
END $$;

-- 验证是否设置成功
SELECT * FROM profiles WHERE role = 'admin';
