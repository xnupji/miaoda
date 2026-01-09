import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWeb3 } from '@/contexts/Web3Context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Sparkles, Wallet, Users, TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import { checkTodayMining, performMining, getMiningRecords, getHTPPrice, getAnnouncements, bindWalletAddress } from '@/db/api';
import type { MiningRecord, Announcement } from '@/types/types';
import { cn } from '@/lib/utils';
import InvestorsSection from '@/components/InvestorsSection';
import { Megaphone, X } from 'lucide-react';

export default function DashboardPage() {
  const { profile, refreshProfile } = useAuth();
  const { account, isConnected, connectWallet } = useWeb3();
  const [isMining, setIsMining] = useState(false);
  const [hasMined, setHasMined] = useState(false);
  const [recentRecords, setRecentRecords] = useState<MiningRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [htpPrice, setHtpPrice] = useState('0.0100');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAnnouncement, setShowAnnouncement] = useState(true);

  useEffect(() => {
    loadData();
    loadHTPPrice();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [mined, records, announcementsData] = await Promise.all([
      checkTodayMining(),
      getMiningRecords(5),
      getAnnouncements(true) // Only active announcements
    ]);
    setHasMined(mined);
    setRecentRecords(records);
    setAnnouncements(announcementsData);
    setLoading(false);
  };

  const loadHTPPrice = async () => {
    const price = await getHTPPrice();
    setHtpPrice(price.toFixed(4));
  };

  const handleMining = async () => {
    if (hasMined) {
      toast.warning('今天已经挖过矿了，明天再来吧！');
      return;
    }

    setIsMining(true);
    
    // 模拟挖矿过程
    await new Promise(resolve => setTimeout(resolve, 2000));

    const miningAmount = Math.random() * 10 + 5; // 5-15 HTP
    const result = await performMining(miningAmount);

    setIsMining(false);

    if (result.success) {
      toast.success(`挖矿成功！获得 ${miningAmount.toFixed(2)} HTP`);
      setHasMined(true);
      await refreshProfile();
      await loadData();
    } else {
      toast.error(result.message || '挖矿失败，请稍后重试');
    }
  };

  return (
    <div className="space-y-4">
      {/* 欢迎标题 */}
      <div>
        <h1 className="text-2xl font-bold gradient-text">欢迎回来，{profile?.username}！</h1>
        <p className="text-muted-foreground mt-1">开始您的每日挖矿之旅</p>
      </div>

      {/* 公告栏 */}
      {showAnnouncement && announcements.length > 0 && (
        <Card className="bg-primary/5 border-primary/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <CardHeader className="pb-2 flex flex-row items-start justify-between">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary animate-pulse" />
              <CardTitle className="text-lg">系统公告</CardTitle>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowAnnouncement(false)}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="border-b border-border/50 last:border-0 pb-3 last:pb-0">
                <div className="flex items-center gap-2 mb-1">
                  {announcement.priority === 'high' && (
                    <Badge variant="destructive" className="text-xs px-1 py-0 h-5">重要</Badge>
                  )}
                  <h3 className="font-medium">{announcement.title}</h3>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(announcement.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {announcement.content}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 统计卡片 */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glow-border hover-glow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">HTP余额</CardTitle>
            <Sparkles className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile?.htp_balance?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground mt-1">可用于转出或交易</p>
          </CardContent>
        </Card>

        <Card className="glow-border hover-glow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">HTP价格</CardTitle>
            <TrendingUp className="w-4 h-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">${htpPrice}</div>
            <p className="text-xs text-muted-foreground mt-1">HTP的价格为${htpPrice} USDT</p>
          </CardContent>
        </Card>

        <Card className="glow-border hover-glow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">邀请人数</CardTitle>
            <Users className="w-4 h-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile?.total_invites || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">每邀请1人获得10 HTP</p>
          </CardContent>
        </Card>

        <Card className="glow-border hover-glow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">钱包状态</CardTitle>
            <Wallet className="w-4 h-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isConnected ? '已连接' : '未连接'}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {isConnected ? `${account?.slice(0, 10)}...` : '点击连接钱包'}
            </p>
            {isConnected && (
              <div className="mt-2 flex items-center gap-2">
                {!profile?.wallet_address || (account && profile.wallet_address?.toLowerCase() !== account.toLowerCase()) ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      if (!account) return;
                      const ok = await bindWalletAddress(account);
                      if (ok) {
                        toast.success('钱包地址已绑定到账户');
                        await refreshProfile();
                      } else {
                        toast.error('绑定失败，请稍后重试');
                      }
                    }}
                  >
                    绑定到账户
                  </Button>
                ) : (
                  <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                    已绑定账户
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 挖矿卡片 */}
      <Card className="glow-border-strong">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            每日挖矿
          </CardTitle>
          <CardDescription>每天点击一次即可获得HTP代币奖励</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/50 border border-border">
            <AlertCircle className="w-5 h-5 text-primary" />
            <p className="text-sm">挖矿无需绑定钱包，直接点击开始。建议连接钱包以便后续提现与交付。</p>
            {!isConnected && (
              <Button onClick={connectWallet} size="sm" className="ml-auto">
                连接钱包
              </Button>
            )}
          </div>

          {isConnected && !profile?.wallet_address && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/50 border border-border">
              <AlertCircle className="w-5 h-5 text-primary" />
              <p className="text-sm">建议绑定钱包地址以确保资产安全</p>
            </div>
          )}

          <div className="flex flex-col items-center justify-center py-6 space-y-3">
            <div className="relative">
              <div className={cn(
                "w-28 h-28 rounded-full flex items-center justify-center",
                hasMined ? "bg-muted" : "bg-gradient-to-br from-primary to-chart-3 pulse-glow"
              )}>
                <Sparkles className="w-14 h-14 text-white" />
              </div>
            </div>

            <Button
              size="lg"
              onClick={handleMining}
              disabled={isMining || hasMined}
              className="px-6 py-5 text-base hover-glow"
            >
              {isMining && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {hasMined ? '今日已挖矿' : isMining ? '挖矿中...' : '开始挖矿'}
            </Button>

            {hasMined && (
              <Badge variant="secondary" className="text-sm">
                ✓ 今日挖矿已完成，明天再来吧！
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 最近挖矿记录 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">最近挖矿记录</CardTitle>
          <CardDescription>查看您最近的挖矿收益</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : recentRecords.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              暂无挖矿记录，开始您的第一次挖矿吧！
            </div>
          ) : (
            <div className="space-y-2">
              {recentRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">挖矿奖励</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(record.mining_date).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">+{record.amount.toFixed(2)} HTP</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 主节点进度（如果已申请） */}
      {profile?.is_master_node && (
        <Card className="glow-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="secondary">主节点</Badge>
              激活进度
            </CardTitle>
            <CardDescription>完成100,000个钱包地址激活</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>已激活</span>
                <span className="font-medium">
                  {profile.master_node_progress.toLocaleString()} / 100,000
                </span>
              </div>
              <Progress value={(profile.master_node_progress / 100000) * 100} className="h-2" />
            </div>
            <p className="text-sm text-muted-foreground">
              每激活1个地址奖励3 USDT
            </p>
          </CardContent>
        </Card>
      )}

      {/* 投资方信息 */}
      <InvestorsSection />
    </div>
  );
}
