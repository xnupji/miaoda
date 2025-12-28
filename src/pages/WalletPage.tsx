import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWeb3 } from '@/contexts/Web3Context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Wallet, Link as LinkIcon, AlertCircle, Loader2, Send } from 'lucide-react';
import { updateProfile } from '@/db/api';
import { createWithdrawalRequest, getMyWithdrawalRequests } from '@/db/api';
import type { WithdrawalRequest } from '@/types/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function WalletPage() {
  const { profile, refreshProfile } = useAuth();
  const { account, isConnected, connectWallet, isCorrectNetwork } = useWeb3();
  const [binding, setBinding] = useState(false);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: '',
    tokenType: 'HTP' as 'HTP' | 'USDT',
    toAddress: '',
    usdtPaid: '',
  });
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  useEffect(() => {
    loadWithdrawalRequests();
  }, []);

  const loadWithdrawalRequests = async () => {
    setLoading(true);
    const data = await getMyWithdrawalRequests();
    setWithdrawalRequests(data);
    setLoading(false);
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
    } else {
      toast.error('绑定失败，请稍后重试');
    }
  };

  const handleWithdrawal = async () => {
    if (!withdrawalForm.amount || !withdrawalForm.toAddress) {
      toast.error('请填写完整信息');
      return;
    }

    const amount = parseFloat(withdrawalForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('请输入有效金额');
      return;
    }

    // 检查余额
    const balance = withdrawalForm.tokenType === 'HTP' ? profile?.htp_balance : profile?.usdt_balance;
    if (!balance || amount > balance) {
      toast.error('余额不足');
      return;
    }

    // HTP提币需要支付USDT手续费
    if (withdrawalForm.tokenType === 'HTP') {
      if (!withdrawalForm.usdtPaid) {
        toast.error('请输入已支付的USDT金额');
        return;
      }

      const usdtPaid = parseFloat(withdrawalForm.usdtPaid);
      if (isNaN(usdtPaid) || usdtPaid <= 0) {
        toast.error('请输入有效的USDT金额');
        return;
      }
    }

    setIsWithdrawing(true);
    const success = await createWithdrawalRequest(
      amount,
      withdrawalForm.tokenType,
      withdrawalForm.toAddress,
      withdrawalForm.tokenType === 'HTP' ? parseFloat(withdrawalForm.usdtPaid) : undefined
    );
    setIsWithdrawing(false);

    if (success) {
      toast.success('提币申请已提交，等待管理员审核');
      setWithdrawalForm({ amount: '', tokenType: 'HTP', toAddress: '', usdtPaid: '' });
      await loadWithdrawalRequests();
    } else {
      toast.error('提交失败，请稍后重试');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">钱包管理</h1>
        <p className="text-muted-foreground mt-2">管理您的钱包地址和提币操作</p>
      </div>

      {/* 钱包连接状态 */}
      <Card className="glow-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-6 h-6 text-primary" />
            钱包连接
          </CardTitle>
          <CardDescription>连接您的MetaMask钱包到BSC网络</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConnected ? (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  请先安装MetaMask钱包扩展，然后点击下方按钮连接钱包。
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
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    请在MetaMask中切换到BSC（Binance Smart Chain）网络。
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 绑定钱包地址 */}
      <Card className="glow-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="w-6 h-6 text-primary" />
            绑定钱包地址
          </CardTitle>
          <CardDescription>将您的钱包地址绑定到账户，用于接收代币</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile?.wallet_address ? (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  <strong>已绑定地址：</strong>
                  <p className="font-mono text-sm mt-2 break-all">{profile.wallet_address}</p>
                </AlertDescription>
              </Alert>
              <p className="text-sm text-muted-foreground">
                钱包地址已绑定，如需更换请联系管理员。
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  请先连接钱包，然后绑定钱包地址。绑定后才能进行挖矿和提币操作。
                </AlertDescription>
              </Alert>
              <Button
                onClick={handleBindWallet}
                disabled={!isConnected || !isCorrectNetwork || binding}
                className="w-full hover-glow"
                size="lg"
              >
                {binding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {!isConnected ? '请先连接钱包' : !isCorrectNetwork ? '请切换到BSC网络' : '绑定当前钱包地址'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 提币申请 */}
      <Card className="glow-border-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-6 h-6 text-primary" />
            提币申请
          </CardTitle>
          <CardDescription>申请将代币转出到您的钱包地址</CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full hover-glow" size="lg" disabled={!profile?.wallet_address}>
                {!profile?.wallet_address ? '请先绑定钱包地址' : '申请提币'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>提币申请</DialogTitle>
                <DialogDescription>
                  填写提币信息，提交后需要管理员审核
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>代币类型</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={withdrawalForm.tokenType === 'HTP' ? 'default' : 'outline'}
                      onClick={() => setWithdrawalForm({ ...withdrawalForm, tokenType: 'HTP' })}
                      className="flex-1"
                    >
                      HTP (余额: {profile?.htp_balance?.toFixed(2) || '0.00'})
                    </Button>
                    <Button
                      variant={withdrawalForm.tokenType === 'USDT' ? 'default' : 'outline'}
                      onClick={() => setWithdrawalForm({ ...withdrawalForm, tokenType: 'USDT' })}
                      className="flex-1"
                    >
                      USDT (余额: {profile?.usdt_balance?.toFixed(2) || '0.00'})
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">提币数量</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="请输入提币数量"
                    value={withdrawalForm.amount}
                    onChange={(e) => setWithdrawalForm({ ...withdrawalForm, amount: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="toAddress">接收地址</Label>
                  <Input
                    id="toAddress"
                    type="text"
                    placeholder="请输入接收地址"
                    value={withdrawalForm.toAddress}
                    onChange={(e) => setWithdrawalForm({ ...withdrawalForm, toAddress: e.target.value })}
                  />
                </div>

                {withdrawalForm.tokenType === 'HTP' && (
                  <div className="space-y-2">
                    <Label htmlFor="usdtPaid">已支付USDT金额</Label>
                    <Input
                      id="usdtPaid"
                      type="number"
                      placeholder="提币需要支付相应的USDT"
                      value={withdrawalForm.usdtPaid}
                      onChange={(e) => setWithdrawalForm({ ...withdrawalForm, usdtPaid: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      提示：HTP代币转出需要向开发者转入相应数量的虚拟USDT
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleWithdrawal}
                  disabled={isWithdrawing}
                  className="w-full hover-glow"
                >
                  {isWithdrawing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  提交申请
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* 提币记录 */}
      <Card>
        <CardHeader>
          <CardTitle>提币记录</CardTitle>
          <CardDescription>查看您的提币申请历史</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : withdrawalRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              暂无提币记录
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>申请时间</TableHead>
                    <TableHead>代币</TableHead>
                    <TableHead className="text-right">数量</TableHead>
                    <TableHead>接收地址</TableHead>
                    <TableHead className="text-right">状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawalRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="text-sm">
                        {new Date(request.created_at).toLocaleString('zh-CN')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{request.token_type}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {request.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {request.to_address.slice(0, 10)}...{request.to_address.slice(-8)}
                      </TableCell>
                      <TableCell className="text-right">
                        {request.status === 'pending' && (
                          <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500">
                            审核中
                          </Badge>
                        )}
                        {request.status === 'approved' && (
                          <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                            已通过
                          </Badge>
                        )}
                        {request.status === 'rejected' && (
                          <Badge variant="secondary" className="bg-red-500/10 text-red-500">
                            已拒绝
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
