import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings as SettingsIcon, User, Shield, Sparkles } from 'lucide-react';

export default function SettingsPage() {
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">设置</h1>
        <p className="text-muted-foreground mt-2">查看您的账户信息和设置</p>
      </div>

      {/* 账户信息 */}
      <Card className="glow-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-6 h-6 text-primary" />
            账户信息
          </CardTitle>
          <CardDescription>您的基本账户信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">用户名</p>
              <p className="font-medium">{profile?.username}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">账户角色</p>
              <div>
                {profile?.role === 'admin' && (
                  <Badge variant="secondary" className="bg-red-500/10 text-red-500">
                    <Shield className="w-3 h-3 mr-1" />
                    管理员
                  </Badge>
                )}
                {profile?.role === 'master_node' && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    <Sparkles className="w-3 h-3 mr-1" />
                    主节点
                  </Badge>
                )}
                {profile?.role === 'user' && (
                  <Badge variant="secondary">普通用户</Badge>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">邀请码</p>
              <p className="font-mono font-medium">{profile?.invitation_code}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">注册时间</p>
              <p className="font-medium">
                {profile?.created_at && new Date(profile.created_at).toLocaleString('zh-CN')}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">钱包地址</p>
              <p className="font-mono text-sm break-all">
                {profile?.wallet_address || '未绑定'}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">主节点状态</p>
              <p className="font-medium">
                {profile?.is_master_node ? '已激活' : '未激活'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 资产信息 */}
      <Card className="glow-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            资产信息
          </CardTitle>
          <CardDescription>您的代币余额和统计</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg bg-accent/30 border border-border">
              <p className="text-sm text-muted-foreground mb-1">HTP余额</p>
              <p className="text-2xl font-bold text-primary">
                {profile?.htp_balance?.toFixed(2) || '0.00'}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-accent/30 border border-border">
              <p className="text-sm text-muted-foreground mb-1">USDT余额</p>
              <p className="text-2xl font-bold text-green-500">
                {profile?.usdt_balance?.toFixed(2) || '0.00'}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-accent/30 border border-border">
              <p className="text-sm text-muted-foreground mb-1">邀请人数</p>
              <p className="text-2xl font-bold">
                {profile?.total_invites || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 平台信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-primary" />
            平台信息
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• 平台名称：HTP挖矿平台</p>
          <p>• 区块链网络：BSC (Binance Smart Chain)</p>
          <p>• 代币类型：HTP (虚拟代币)</p>
          <p>• 每日挖矿奖励：5-15 HTP</p>
          <p>• 邀请奖励：10 HTP/人</p>
          <p>• 主节点激活奖励：3 USDT/地址</p>
        </CardContent>
      </Card>
    </div>
  );
}
