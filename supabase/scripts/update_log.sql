-- 创建操作日志表（如果不存在）
CREATE TABLE IF NOT EXISTS public.operation_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    operation_type TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 插入本次更新日志 (2026-01-10)
INSERT INTO public.operation_logs (operation_type, description) VALUES
('update', 'Updated URL to htpfoom.top and removed local deployment docs'),
('update', 'Added HTP Whitepaper link and planning section'),
('feature', 'Implemented Database Search page (/search)'),
('fix', 'Removed "秒哒" references and fixed PowerShell deployment scripts');
