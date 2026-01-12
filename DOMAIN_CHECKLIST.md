# 数据库与域名连接配置指南

您提到要检查“从数据库到域名”的整个环节。由于我看不到您的 Supabase 后台，请您按照以下步骤手动检查，确保数据库知道您的新域名。

## 1. 更新 Supabase 认证回调地址 (关键)

当用户登录或注册时，Supabase 需要知道跳转回哪个网址。

1.  登录 [Supabase Dashboard](https://supabase.com/dashboard)。
2.  进入您的项目。
3.  点击左侧菜单的 **Authentication** (图标像指纹/锁)。
4.  点击 **URL Configuration**。
5.  **Site URL**: 修改为 `https://htpfoom.top`
6.  **Redirect URLs**:
    *   确保包含 `https://htpfoom.top/**`
    *   保留 `http://localhost:5173/**` (用于本地开发)
7.  点击 **Save** 保存。

## 2. 检查 GitHub Pages 域名状态

1.  回到 GitHub 仓库 -> Settings -> Pages。
2.  **Custom domain** 应该显示 `htpfoom.top`。
3.  **DNS check**: 应该显示 "DNS check successful" (绿色勾)。
    *   如果是黄色 "DNS check in progress"，请多刷新几次页面。
    *   如果是红色错误，请检查 Cloudflare 的 SSL/TLS 是否为 "Full"。
4.  **Enforce HTTPS**: 必须勾选。

## 3. 浏览器缓存清理

有时候 404 是浏览器记住了旧的状态。
*   在浏览器中打开 `https://htpfoom.top`。
*   按下 `F12` 打开开发者工具。
*   右键点击浏览器左上角的“刷新”按钮。
*   选择 **“清空缓存并硬性重新加载” (Empty Cache and Hard Reload)**。
