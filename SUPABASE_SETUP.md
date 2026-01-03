# Supabase 配置指南：启用 Email Provider

为了解决“注册成功但无法登录”或“White Screen”问题，必须确保 Supabase 后台的 Email Provider 已正确配置。

## 第一步：进入 Authentication 设置

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)。
2. 进入您的项目。
3. 在左侧菜单栏点击 **Authentication** 图标（像一个指纹或锁的图标）。
4. 在二级菜单中点击 **Providers**。

## 第二步：配置 Email Provider

1. 在 Providers 列表中找到 **Email**。
2. 点击 **Email** 展开设置。
3. 确保 **Enable Email provider** 开关是 **开启 (ON/Green)** 状态。
4. **关键设置**：
   - **Confirm email**: 建议 **关闭 (OFF)**。如果开启，用户注册后必须点击邮件链接才能登录，这会导致“注册成功但无法登录”的问题。
   - **Secure email change**: 建议 **开启 (ON)**。

5. 点击右下角的 **Save** 保存设置。

## 第三步：检查 URL Configuration (可选但推荐)

1. 在 Authentication 菜单下点击 **URL Configuration**。
2. 确保 **Site URL** 设置为您项目的上线域名（例如 GitHub Pages 的地址）。
3. 如果您在本地开发，确保添加了 `http://localhost:5173` 到 **Redirect URLs**。

---

# 常见问题解决

## 为什么注册后是白屏？
这是因为前端代码尝试自动登录，但如果 Supabase 要求“Confirm email”，登录会失败。**关闭 Confirm email** 选项即可解决。

## 为什么后台显示的是邮箱？
系统为了兼容 Supabase 的认证机制，会自动将您的用户名转换为 `用户名@miaoda.com` 的虚拟邮箱格式。这是正常现象，您可以忽略后台的邮箱显示，用户在前台只需要输入用户名即可。
