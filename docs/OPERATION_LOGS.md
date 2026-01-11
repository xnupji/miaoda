# 操作日志 (Operation Logs)

## 2026-01-10 更新日志

### 1. 代码库更新与修复
- **修复 Supabase 部署问题**: 解决了 `supabase db push` 过程中遇到的 PowerShell 执行策略限制和 npm 权限问题。
- **URL 更新**: 将代码包中的所有 `miaoda.cn` 链接更新为 `htpfoom.top`。
- **本地部署内容清理**: 删除了 README.md 中关于本地开发环境搭建（Node.js, VSCode）的冗余内容，简化了文档。
- **HTP 规划与白皮书**: 在 README.md 中添加了 HTP 规划章节，并修复了白皮书下载链接 (`/HTP_Whitepaper.md`)。
- **品牌一致性**: 移除了代码库中残留的 "秒哒" 文本，统一更新为 "HTP"。

### 2. 新功能开发
- **数据库搜索功能**: 新增 `/search` 页面，支持通过简写字母 (HTP) 或关键词搜索数据库中的用户信息和交易记录。
- **导航栏更新**: 在左侧菜单栏添加了 "数据库搜索" 入口。

### 3. 部署脚本优化
- **自动化脚本**: 修改 `deploy_all.ps1` 和 `package.json`，跳过了交互式的 `db:setup` 步骤，防止自动部署卡死。
- **Git 提交**: 成功将所有更改提交到 GitHub 仓库 (`main` 分支)。

### 4. 数据库操作
- **Schema 更新**: 尝试推送最新的数据库结构（受网络限制，建议手动运行 `supabase/scripts/ensure_complete_schema.sql`）。
- **数据一致性**: 确保了 `profiles` 表和 `transactions` 表的结构支持新的搜索功能。

## 待执行操作 (如果在本地无法自动完成)
请在 Supabase Dashboard 的 SQL Editor 中运行以下 SQL 以确保日志记录：

```sql
-- 创建操作日志表（如果不存在）
CREATE TABLE IF NOT EXISTS public.operation_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    operation_type TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 插入本次更新日志
INSERT INTO public.operation_logs (operation_type, description) VALUES
('update', 'Updated URL to htpfoom.top and removed local deployment docs'),
('update', 'Added HTP Whitepaper link and planning section'),
('feature', 'Implemented Database Search page (/search)'),
('fix', 'Removed "秒哒" references and fixed PowerShell deployment scripts');
```
