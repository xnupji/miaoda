# Supabase 紧急修复指南

您遇到的“找不到注册信息”和“仍然提示邮箱验证”问题，是因为数据库的**触发器 (Trigger)** 设置有问题。

原来的触发器只在“邮箱验证通过后”才创建用户资料，导致关闭邮箱验证后，用户资料无法创建。

请按以下步骤操作，只需 1 分钟即可修复。

## 第一步：运行修复脚本 (必须)

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)。
2. 进入您的项目。
3. 点击左侧菜单的 **SQL Editor** (图标像 `>_`)。
4. 点击 **New Query**。
5. 将 `FIX_TRIGGER.sql` 文件中的**所有内容**复制粘贴到编辑器中。
   - *文件位置：`e:\推特图片\新建文件夹\app-8jbv0fvmkphd_app_version-8jez7ztjxerk\app-8jbv0fvmkphd\FIX_TRIGGER.sql`*
6. 点击右下角的 **Run** 按钮。
   - *如果显示 "Success" 或 "No rows returned"，说明执行成功。*

## 第二步：确认 Email 设置 (再次检查)

1. 点击左侧 **Authentication** -> **Providers** -> **Email**。
2. 确保 **Confirm email** 是 **关闭 (OFF/灰色)** 状态。
3. 确保 **Secure email change** 是 **开启 (ON/绿色)** 状态。
4. 点击 Save。

## 第三步：清理旧账号并重试

1. 点击左侧 **Authentication** -> **Users**。
2. 删除之前所有测试注册的账号 (包括 `ADMiN` 等)。
3. 回到您的网站注册页面。
4. 使用 `admin` 或 `ADMiN` 重新注册。

**预期结果：**
- 注册点击后，应该直接跳转进入系统（或自动登录）。
- 在 Supabase 的 **Table Editor** -> `profiles` 表中，您应该能看到新注册的用户。
- 该用户的 `role` 字段应该自动变成了 `admin` (因为他是第一个用户)。
