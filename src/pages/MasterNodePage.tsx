import { Award, CheckCircle, Clock, Loader2, Network, Wallet, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useWeb3 } from '@/contexts/Web3Context';
import { applyMasterNode, getMasterNodeApplication, updateProfile } from '@/db/api';
import type { MasterNodeApplication } from '@/types/types';

export default function MasterNodePage() {
  const { profile, refreshProfile } = useAuth();
  const { account, isConnected, connectWallet, isCorrectNetwork } = useWeb3();
  const [application, setApplication] = useState<MasterNodeApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [binding, setBinding] = useState(false);
  const [bindDialogOpen, setBindDialogOpen] = useState(false);

  useEffect(() => {
    loadApplication();
  }, []);

  const loadApplication = async () => {
    setLoading(true);
    const data = await getMasterNodeApplication();
    setApplication(data);
    setLoading(false);
  };

  const handleApply = async () => {
    setApplying(true);
    const success = await applyMasterNode();
    setApplying(false);

    if (success) {
      toast.success('主节点申请已提交，等待管理员审核');
      await loadApplication();
      await refreshProfile();
    } else {
      toast.error('申请失败，请稍后重试');
    }
  };

  const handleBindWallet = async () => {
    if (!isConnected || !account) {
      toast.error('请先连接钱包');
      return;
    }

    if (!isCorrectNetwork) {
      toast.error('请切换到BSC网络');
      return;
    }

    setBinding(true);
    const success = await updateProfile({ wallet_address: account });
    setBinding(false);

    if (success) {
      toast.success('钱包地址绑定成功！');
      await refreshProfile();
      setBindDialogOpen(false);
    } else {
      toast.error('绑定失败，请稍后重试');
    }
  };

  const progressPercentage = application && application.target_wallets > 0
    ? (application.activated_wallets / application.target_wallets) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">主节点系统</h1>
        <p className="text-muted-foreground mt-2">成为主节点，获得更多奖励</p>
      </div>

      {/* 主节点介绍 */}
      <Card className="glow-border-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="w-6 h-6 text-primary" />
            什么是主节点？
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            主节点是HTP挖矿平台的核心推广者，帮助平台完成用户积载任务，获得丰厚奖励。
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg bg-accent/30 border border-border">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                任务目标
              </h4>
              <p className="text-sm text-muted-foreground">
                完成 100,000 个钱包地址激活
              </p>
            </div>

            <div className="p-4 rounded-lg bg-accent/30 border border-border">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                奖励机制
              </h4>
              <p className="text-sm text-muted-foreground">
                每激活 1 个地址奖励 3 USDT
              </p>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              <strong>注意：</strong>主节点申请需要管理员审核，审核通过后即可开始推广任务。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* 申请状态 */}
      {loading ? (
        <Card>
          <CardContent className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      ) : !application ? (
        <Card className="glow-border">
          <CardHeader>
            <CardTitle>申请主节点</CardTitle>
            <CardDescription>提交申请成为主节点，开启推广之旅</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-accent/50 border border-border">
              <h4 className="font-medium mb-2">申请条件</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ 已完成账户注册</li>
                <li>✓ 已绑定钱包地址</li>
                <li>✓ 承诺完成推广任务</li>
              </ul>
            </div>

            {!profile?.wallet_address ? (
              <Dialog open={bindDialogOpen} onOpenChange={setBindDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full hover-glow" size="lg">
                    <Wallet className="mr-2 h-5 w-5" />
                    绑定钱包地址
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>绑定钱包地址</DialogTitle>
                    <DialogDescription>
                      连接您的MetaMask钱包并绑定地址，绑定后才能申请主节点
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {!isConnected ? (
                      <div className="space-y-4">
                        <Alert>
                          <AlertDescription>
                            请先连接您的MetaMask钱包到BSC网络
                          </AlertDescription>
                        </Alert>
                        <Button onClick={connectWallet} className="w-full hover-glow" size="lg">
                          <Wallet className="w-5 h-5 mr-2" />
                          连接MetaMask钱包
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-accent/30 border border-border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">连接状态</span>
                            <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" />
                              已连接
                            </Badge>
                          </div>
                          <p className="font-mono text-sm break-all">{account}</p>
                        </div>

                        <div className="p-4 rounded-lg bg-accent/30 border border-border">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">网络</span>
                            {isCorrectNetwork ? (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                                BSC网络
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-red-500/10 text-red-500">
                                错误网络
                              </Badge>
                            )}
                          </div>
                        </div>

                        {!isCorrectNetwork && (
                          <Alert variant="destructive">
                            <AlertDescription>
                              请在MetaMask中切换到BSC（Binance Smart Chain）网络
                            </AlertDescription>
                          </Alert>
                        )}

                        <Button
                          onClick={handleBindWallet}
                          disabled={!isCorrectNetwork || binding}
                          className="w-full hover-glow"
                          size="lg"
                        >
                          {binding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {!isCorrectNetwork ? '请切换到BSC网络' : '确认绑定'}
                        </Button>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <Button
                onClick={handleApply}
                disabled={applying}
                className="w-full hover-glow"
                size="lg"
              >
                {applying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                提交申请
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 申请状态卡片 */}
          <Card className="glow-border">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>申请状态</span>
                {application.status === 'pending' && (
                  <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500">
                    <Clock className="w-3 h-3 mr-1" />
                    审核中
                  </Badge>
                )}
                {application.status === 'approved' && (
                  <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    已通过
                  </Badge>
                )}
                {application.status === 'rejected' && (
                  <Badge variant="secondary" className="bg-red-500/10 text-red-500">
                    <XCircle className="w-3 h-3 mr-1" />
                    已拒绝
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">申请时间</p>
                  <p className="font-medium">
                    {new Date(application.applied_at).toLocaleString('zh-CN')}
                  </p>
                </div>
                {application.reviewed_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">审核时间</p>
                    <p className="font-medium">
                      {new Date(application.reviewed_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                )}
              </div>

              {application.status === 'pending' && (
                <Alert>
                  <AlertDescription>
                    您的申请正在审核中，请耐心等待管理员处理。
                  </AlertDescription>
                </Alert>
              )}

              {application.status === 'rejected' && (
                <Alert variant="destructive">
                  <AlertDescription>
                    很抱歉，您的申请未通过审核。您可以重新提交申请。
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* 进度卡片（仅审核通过后显示） */}
          {application.status === 'approved' && (
            <>
              <Card className="glow-border-strong">
                <CardHeader>
                  <CardTitle>推广进度</CardTitle>
                  <CardDescription>完成目标即可获得全部奖励</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>已激活钱包地址</span>
                      <span className="font-medium">
                        {application.activated_wallets.toLocaleString()} / {application.target_wallets.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={progressPercentage} className="h-3" />
                    <p className="text-xs text-muted-foreground mt-2">
                      完成度：{progressPercentage.toFixed(2)}%
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 rounded-lg bg-accent/30 border border-border">
                      <p className="text-sm text-muted-foreground mb-1">已激活</p>
                      <p className="text-2xl font-bold text-primary">
                        {application.activated_wallets.toLocaleString()}
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-accent/30 border border-border">
                      <p className="text-sm text-muted-foreground mb-1">剩余目标</p>
                      <p className="text-2xl font-bold">
                        {(application.target_wallets - application.activated_wallets).toLocaleString()}
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-accent/30 border border-border">
                      <p className="text-sm text-muted-foreground mb-1">累计奖励</p>
                      <p className="text-2xl font-bold text-green-500">
                        {application.total_rewards.toFixed(2)} USDT
                      </p>
                    </div>
                  </div>

                  <Alert>
                    <AlertDescription>
                      <strong>提示：</strong>每激活1个钱包地址，您将获得3 USDT奖励，奖励将自动发放到您的账户。
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
