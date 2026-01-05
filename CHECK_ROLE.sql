-- 1. 检查当前所有管理员用户
-- 运行此查询，查看谁拥有 admin 权限
SELECT id, username, email, role, created_at
FROM profiles
WHERE role = 'admin';

-- 2. 如果您的账号不在上面的列表中，请替换下面的 'your_username' 为您的实际用户名，然后运行：
-- UPDATE profiles SET role = 'admin' WHERE username = 'your_username';

-- 3. 检查是否有用户角色设置错误
SELECT id, username, role FROM profiles ORDER BY created_at DESC LIMIT 10;
