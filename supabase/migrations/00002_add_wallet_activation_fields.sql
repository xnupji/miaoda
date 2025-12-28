-- 添加钱包激活相关字段
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS wallet_activated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS activation_paid_amount NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS activation_paid_at TIMESTAMPTZ;

-- 添加开发者USDT接收地址配置表
CREATE TABLE IF NOT EXISTS platform_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入开发者USDT地址配置
INSERT INTO platform_config (config_key, config_value, description)
VALUES 
  ('developer_usdt_address', '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', '开发者接收USDT的BSC地址'),
  ('wallet_activation_fee', '30', '钱包激活所需USDT金额')
ON CONFLICT (config_key) DO NOTHING;

-- 设置RLS策略
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

-- 所有人都可以读取配置
CREATE POLICY "Anyone can read platform config" ON platform_config
  FOR SELECT TO authenticated USING (true);

-- 只有管理员可以修改配置
CREATE POLICY "Admins can update platform config" ON platform_config
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

COMMENT ON COLUMN profiles.wallet_activated IS '钱包是否已激活（支付30 USDT后激活）';
COMMENT ON COLUMN profiles.activation_paid_amount IS '激活时支付的USDT金额';
COMMENT ON COLUMN profiles.activation_paid_at IS '激活支付时间';
COMMENT ON TABLE platform_config IS '平台配置表，存储开发者地址等配置信息';