import { AlertCircle, CheckCircle2, Copy, Link as LinkIcon, Loader2, Send, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { useWeb3 } from '@/contexts/Web3Context';
import { activateWallet, createWithdrawalRequest, getMyWithdrawalRequests, getPlatformConfig, updateProfile } from '@/db/api';
import type { WithdrawalRequest } from '@/types/types';

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
    paymentAddress: '',
  });
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [developerAddress, setDeveloperAddress] = useState<string>('');
  const [activationFee, setActivationFee] = useState<string>('30');
  const [copied, setCopied] = useState(false);
  const [activationAmount, setActivationAmount] = useState('');
  const [isActivating, setIsActivating] = useState(false);

  useEffect(() => {
    loadWithdrawalRequests();
    loadPlatformConfig();
  }, []);

  const loadPlatformConfig = async () => {
    const address = await getPlatformConfig('developer_usdt_address');
    const fee = await getPlatformConfig('wallet_activation_fee');
    if (address) setDeveloperAddress(address);
    if (fee) setActivationFee(fee);
  };

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

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(developerAddress);
      setCopied(true);
      toast.success('地址已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('复制失败，请手动复制');
    }
  };

  const handleActivateWallet = async () => {
    const amount = parseFloat(activationAmount);
    if (isNaN(amount) || amount < parseFloat(activationFee)) {
      toast.error(`请输入至少 ${activationFee} USDT`);
      return;
    }

    setIsActivating(true);
    const success = await activateWallet(amount);
    setIsActivating(false);

    if (success) {
      toast.success('钱包激活成功！现在可以提取HTP代币了');
      await refreshProfile();
      setActivationAmount('');
    } else {
      toast.error('激活失败，请稍后重试');
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

    // HTP提币需要钱包已激活
    if (withdrawalForm.tokenType === 'HTP' && !profile?.wallet_activated) {
      toast.error('请先激活钱包才能提取HTP代币');
      return;
    }

    // 提币需要验证转账钱包地址
    if (!withdrawalForm.paymentAddress) {
      toast.error('请输入验证转账钱包地址');
      return;
    }

    setIsWithdrawing(true);
    const success = await createWithdrawalRequest(
      amount,
      withdrawalForm.tokenType,
      withdrawalForm.toAddress,
      withdrawalForm.paymentAddress
    );
    setIsWithdrawing(false);

    if (success) {
      toast.success('提币申请已提交，等待管理员审核');
      setWithdrawalForm({ amount: '', tokenType: 'HTP', toAddress: '', paymentAddress: '' });
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

      {/* 绑定钱包地址 (可选) */}
      <Card className="glow-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="w-6 h-6 text-primary" />
            绑定钱包地址 (可选)
          </CardTitle>
          <CardDescription>您可以绑定常用钱包地址，也可以在提币时手动输入</CardDescription>
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
              <Button 
                variant="outline" 
                onClick={handleBindWallet}
                disabled={!isConnected || !isCorrectNetwork || binding}
                className="w-full"
              >
                {binding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                更新绑定地址
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                当前未绑定钱包地址。您可以选择绑定当前连接的钱包，方便后续操作。
              </p>
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
              <Button className="w-full hover-glow" size="lg">
                申请提币
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>提币申请</DialogTitle>
                <DialogDescription>
                  {profile?.wallet_activated 
                    ? '填写提币信息，提交后需要管理员审核' 
                    : '您的钱包尚未激活，需要先激活才能提取HTP代币'}
                </DialogDescription>
              </DialogHeader>

              {!profile?.wallet_activated ? (
                // 钱包未激活 - 显示激活界面
                <div className="space-y-4">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>钱包待激活</strong>
                      <p className="mt-2">
                        您的钱包地址尚未激活。需要向开发者转入 <strong>{activationFee} USDT</strong> 来激活钱包，激活后即可提取HTP代币。
                      </p>
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3 p-4 rounded-lg bg-accent/30 border border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">激活费用</span>
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        {activationFee} USDT
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">开发者USDT地址（BSC网络）</Label>
                      <div className="flex gap-2">
                        <Input
                          value={developerAddress}
                          readOnly
                          className="font-mono text-xs"
                        />
                        <Button
                          onClick={handleCopyAddress}
                          variant="outline"
                          size="icon"
                        >
                          {copied ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        请使用您绑定的钱包地址向上述地址转账 {activationFee} USDT（BSC网络）
                      </p>
                    </div>
                  </div>

                  <Alert>
                    <AlertDescription>
                      <strong>激活步骤：</strong>
                      <ol className="mt-2 space-y-1 text-sm list-decimal list-inside">
                        <li>复制上方的开发者USDT地址</li>
                        <li>使用您绑定的钱包向该地址转账 {activationFee} USDT（BSC网络）</li>
                        <li>转账完成后，在下方输入实际支付金额</li>
                        <li>点击"确认激活"按钮</li>
                        <li>等待管理员确认后，钱包即可激活</li>
                        <li>支付的激活费用30 USDT去掉手续费后，可以返还HTP和USDT代币到您当前支付的地址。每一次交易都要扣除手续费，此手续费由币安链（BSC）收取</li>
                      </ol>
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label htmlFor="activationAmount">实际支付金额（USDT）</Label>
                    <Input
                      id="activationAmount"
                      type="number"
                      placeholder={`请输入支付的USDT金额（至少 ${activationFee}）`}
                      value={activationAmount}
                      onChange={(e) => setActivationAmount(e.target.value)}
                    />
                  </div>

                  <Button
                    onClick={handleActivateWallet}
                    disabled={isActivating || !activationAmount}
                    className="w-full hover-glow"
                    size="lg"
                  >
                    {isActivating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    确认激活钱包
                  </Button>
                </div>
              ) : (
                // 钱包已激活 - 显示提币表单
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

                <div className="space-y-2">
                  <Label htmlFor="paymentAddress">验证转账钱包地址</Label>
                  <Input
                    id="paymentAddress"
                    type="text"
                    placeholder="请输入您的付款钱包地址"
                    value={withdrawalForm.paymentAddress}
                    onChange={(e) => setWithdrawalForm({ ...withdrawalForm, paymentAddress: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    提示：请填写用于验证身份的转账钱包地址，管理员审核通过后方可提币
                  </p>
                </div>

                <Button
                  onClick={handleWithdrawal}
                  disabled={isWithdrawing}
                  className="w-full hover-glow"
                >
                  {isWithdrawing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  提交申请
                </Button>
                </div>
              )}
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
