# 全面故障排查指南 (Comprehensive Troubleshooting Guide)

如果您在网站上无法看到"公告中心"或无法进入后台，请按照以下步骤逐一检查。

## 1. 访问地址检查 (URL Check)

**问题**：您可能访问了错误的地址（如 `/sadmin`）。
**正确地址**：`https://htpfoom.top/admin`

*注意：我们刚刚更新了代码，现在访问 `/sadmin` 会自动跳转到正确的 `/admin` 页面。请等待部署完成（约3-5分钟）。*

## 2. 账号权限检查 (Permission Check)

只有 `role` 为 `admin` 的用户才能看到后台和公告中心。

**自查步骤**：
1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)。
2. 进入 SQL Editor。
3. 运行 `CHECK_ROLE.sql` 脚本。
4. 确认您的账号出现在查询结果中。
5. 如果没有，请运行以下 SQL 修复：
   ```sql
   UPDATE profiles SET role = 'admin' WHERE username = '您的用户名';
   ```

## 3. 部署配置检查 (Deployment Check)

**严重警告**：我们在 `deploy.yml` 文件中发现了可能的配置错误。

```yaml
VITE_SUPABASE_ANON_KEY: sb_publishable_OBcHJSvgjz9K_s09n4UHKA_enjz0h1x
```

这个 Key 的格式看起来不正确（通常是以 `eyJ` 开头的长字符串）。如果 Key 错误，网站可以打开，但**无法加载任何数据**（无法登录、无法看公告）。

**修复方法**：
1. 去 Supabase Dashboard -> Project Settings -> API。
2. 找到 `anon` / `public` key。
3. 复制那个以 `eyJ` 开头的长字符串。
4. 修改代码库中的 `.github/workflows/deploy.yml`，替换错误的 Key。
   或者：在 GitHub 仓库的 Settings -> Secrets and variables -> Actions 中配置 `VITE_SUPABASE_ANON_KEY`。

## 4. 浏览器缓存 (Browser Cache)

**问题**：浏览器记住了旧版本的网站。
**解决**：
1. 打开网站 `https://htpfoom.top/admin`。
2. 按 `Ctrl + F5` (Windows) 或 `Cmd + Shift + R` (Mac) 强制刷新。
3. 查看页面底部是否有 `Admin Panel v1.1.2` 字样。

## 5. 完整自查流程 (Step-by-Step)

1. **登录网站**：确保您已登录。
2. **检查入口**：看左侧菜单底部是否有"管理后台"（盾牌图标）。
3. **强制访问**：在浏览器输入 `https://htpfoom.top/admin`。
4. **如果被踢回主页**：说明您的账号不是 admin。请执行第2步的 SQL。
5. **如果页面空白或报错**：说明 Key 错误。请执行第3步的修复。
6. **如果看不到"公告中心"标签**：说明缓存未更新。请执行第4步。
