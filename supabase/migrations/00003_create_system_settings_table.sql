
-- 创建系统设置表
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- 插入HTP价格设置（默认使用当前的计算价格）
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES 
  ('htp_price', '0.01', 'HTP代币当前价格（美元）'),
  ('htp_price_mode', 'auto', 'HTP价格模式：auto（自动计算）或 manual（手动设置）')
ON CONFLICT (setting_key) DO NOTHING;

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_updated_at();

-- 添加RLS策略
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 所有人可以读取设置
CREATE POLICY "Anyone can read system settings"
  ON system_settings FOR SELECT
  USING (true);

-- 只有管理员可以更新设置
CREATE POLICY "Only admins can update system settings"
  ON system_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
