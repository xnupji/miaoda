import { ArrowRightLeft, Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { getHTPPrice, getTransactions } from '@/db/api';
import { supabase } from '@/db/supabase';
import type { Transaction, TransactionType } from '@/types/types';

const transactionTypeLabels: Record<TransactionType, string> = {
  mining: '挖矿奖励',
  invitation_reward: '邀请奖励',
  master_node_reward: '主节点奖励',
  withdrawal: '提币',
  transfer_in: '转入',
  transfer_out: '转出',
  task_order_reward: '任务奖励',
};

const transactionTypeColors: Record<TransactionType, string> = {
  mining: 'text-primary',
  invitation_reward: 'text-chart-2',
  master_node_reward: 'text-chart-3',
  withdrawal: 'text-destructive',
  transfer_in: 'text-green-500',
  transfer_out: 'text-orange-500',
  task_order_reward: 'text-primary',
};

export default function TransactionsPage() {
  const { profile, refreshProfile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'HTP' | 'USDT'>('all');
  
  // 闪兑交易相关状态
  const [swapDialogOpen, setSwapDialogOpen] = useState(false);
  const [htpAmount, setHtpAmount] = useState('');
  const [usdtAmount, setUsdtAmount] = useState('');
  const [htpPrice, setHtpPrice] = useState(0.01);
  const [swapping, setSwapping] = useState(false);

  useEffect(() => {
    loadTransactions();
    loadHTPPrice();
  }, []);

  const loadHTPPrice = async () => {
    const price = await getHTPPrice();
    setHtpPrice(price);
  };

  const loadTransactions = async () => {
    setLoading(true);
    const data = await getTransactions(200);
    setTransactions(data);
    setLoading(false);
  };

  // HTP输入变化时自动计算USDT
  const handleHtpAmountChange = (value: string) => {
    setHtpAmount(value);
    const htp = parseFloat(value);
    if (!isNaN(htp) && htp > 0) {
      const usdt = htp * htpPrice;
      setUsdtAmount(usdt.toFixed(4));
    } else {
      setUsdtAmount('');
    }
  };

  // USDT输入变化时自动计算HTP
  const handleUsdtAmountChange = (value: string) => {
    setUsdtAmount(value);
    const usdt = parseFloat(value);
    if (!isNaN(usdt) && usdt > 0 && htpPrice > 0) {
      const htp = usdt / htpPrice;
      setHtpAmount(htp.toFixed(4));
    } else {
      setHtpAmount('');
    }
  };

  // 执行闪兑交易
  const handleSwap = async () => {
    const htp = parseFloat(htpAmount);
    const usdt = parseFloat(usdtAmount);

    if (isNaN(htp) || htp <= 0) {
      toast.error('请输入有效的HTP数量');
      return;
    }

    if (!profile || profile.htp_balance < htp) {
      toast.error('HTP余额不足');
      return;
    }

    setSwapping(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('请先登录');
        setSwapping(false);
        return;
      }

      // 扣除HTP，增加USDT
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          htp_balance: profile.htp_balance - htp,
          usdt_balance: (profile.usdt_balance || 0) + usdt,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // 记录交易：HTP转出
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'transfer_out',
        amount: htp,
        token_type: 'HTP',
        status: 'completed',
        description: `闪兑：HTP → USDT (汇率: $${htpPrice.toFixed(4)})`,
      });

      // 记录交易：USDT转入
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'transfer_in',
        amount: usdt,
        token_type: 'USDT',
        status: 'completed',
        description: `闪兑：HTP → USDT (汇率: $${htpPrice.toFixed(4)})`,
      });

      toast.success(`成功兑换 ${htp.toFixed(4)} HTP → ${usdt.toFixed(4)} USDT`);
      
      // 刷新数据
      await refreshProfile();
      await loadTransactions();
      
      // 重置表单
      setHtpAmount('');
      setUsdtAmount('');
      setSwapDialogOpen(false);
    } catch (error) {
      console.error('闪兑失败:', error);
      toast.error('闪兑失败，请稍后重试');
    } finally {
      setSwapping(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'all') return true;
    return tx.token_type === filter;
  });

  const htpTransactions = transactions.filter(tx => tx.token_type === 'HTP');
  const usdtTransactions = transactions.filter(tx => tx.token_type === 'USDT');

  const totalHtpIn = htpTransactions
    .filter(tx => ['mining', 'invitation_reward', 'master_node_reward', 'transfer_in'].includes(tx.type))
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalHtpOut = htpTransactions
    .filter(tx => ['withdrawal', 'transfer_out'].includes(tx.type))
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalUsdtIn = usdtTransactions
    .filter(tx => ['master_node_reward', 'transfer_in'].includes(tx.type))
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalUsdtOut = usdtTransactions
    .filter(tx => ['withdrawal', 'transfer_out'].includes(tx.type))
    .reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">交易记录</h1>
        <p className="text-muted-foreground mt-2">查看您的所有交易历史</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glow-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              HTP 收入
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">+{totalHtpIn.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="glow-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-500" />
              HTP 支出
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">-{totalHtpOut.toFixed(2)}</div>
          </CardContent>
        </Card>

        {/* 闪兑交易卡片 */}
        <Card className="glow-border-strong">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-primary" />
              闪兑交易
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog open={swapDialogOpen} onOpenChange={setSwapDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full hover-glow">
                  HTP → USDT
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <ArrowRightLeft className="w-5 h-5 text-primary" />
                    闪兑交易
                  </DialogTitle>
                  <DialogDescription>
                    将您的HTP代币即时兑换成USDT
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* 当前汇率 */}
                  <div className="p-3 rounded-lg bg-accent/30 border border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">当前汇率</span>
                      <span className="font-bold text-primary">1 HTP = ${htpPrice.toFixed(4)} USDT</span>
                    </div>
                  </div>

                  {/* 可用余额 */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">可用HTP余额</span>
                    <span className="font-medium">{profile?.htp_balance?.toFixed(4) || '0.0000'} HTP</span>
                  </div>

                  {/* HTP输入 */}
                  <div className="space-y-2">
                    <Label htmlFor="htp-amount">兑换数量（HTP）</Label>
                    <div className="relative">
                      <Input
                        id="htp-amount"
                        type="number"
                        step="0.0001"
                        min="0"
                        placeholder="输入HTP数量"
                        value={htpAmount}
                        onChange={(e) => handleHtpAmountChange(e.target.value)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1 h-7 text-xs"
                        onClick={() => handleHtpAmountChange(profile?.htp_balance?.toString() || '0')}
                      >
                        全部
                      </Button>
                    </div>
                  </div>

                  {/* 兑换图标 */}
                  <div className="flex justify-center">
                    <div className="p-2 rounded-full bg-primary/10">
                      <ArrowRightLeft className="w-5 h-5 text-primary" />
                    </div>
                  </div>

                  {/* USDT输出 */}
                  <div className="space-y-2">
                    <Label htmlFor="usdt-amount">获得数量（USDT）</Label>
                    <Input
                      id="usdt-amount"
                      type="number"
                      step="0.0001"
                      min="0"
                      placeholder="自动计算"
                      value={usdtAmount}
                      onChange={(e) => handleUsdtAmountChange(e.target.value)}
                    />
                  </div>

                  {/* 交易说明 */}
                  <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground space-y-1">
                    <p>• 闪兑交易即时完成，无需等待</p>
                    <p>• 汇率根据当前HTP市场价格计算</p>
                    <p>• 兑换后的USDT可用于提现或其他用途</p>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSwapDialogOpen(false)}
                      disabled={swapping}
                    >
                      取消
                    </Button>
                    <Button
                      className="flex-1 hover-glow"
                      onClick={handleSwap}
                      disabled={swapping || !htpAmount || parseFloat(htpAmount) <= 0}
                    >
                      {swapping && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {swapping ? '兑换中...' : '确认兑换'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* 交易列表 */}
      <Card>
        <CardHeader>
          <CardTitle>交易历史</CardTitle>
          <CardDescription>所有交易记录按时间倒序排列</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="HTP">HTP</TabsTrigger>
              <TabsTrigger value="USDT">USDT</TabsTrigger>
            </TabsList>

            <TabsContent value={filter} className="mt-0">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">暂无交易记录</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>时间</TableHead>
                        <TableHead>类型</TableHead>
                        <TableHead>代币</TableHead>
                        <TableHead className="text-right">金额</TableHead>
                        <TableHead>说明</TableHead>
                        <TableHead className="text-right">状态</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((tx) => {
                        const isIncome = ['mining', 'invitation_reward', 'master_node_reward', 'transfer_in'].includes(tx.type);
                        
                        return (
                          <TableRow key={tx.id}>
                            <TableCell className="text-sm">
                              {new Date(tx.created_at).toLocaleString('zh-CN', {
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </TableCell>
                            <TableCell>
                              <span className={transactionTypeColors[tx.type]}>
                                {transactionTypeLabels[tx.type]}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{tx.token_type}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              <span className={isIncome ? 'text-green-500' : 'text-red-500'}>
                                {isIncome ? '+' : '-'}{tx.amount.toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                              {tx.description || '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {tx.status === 'completed' && (
                                <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                                  已完成
                                </Badge>
                              )}
                              {tx.status === 'pending' && (
                                <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500">
                                  处理中
                                </Badge>
                              )}
                              {tx.status === 'failed' && (
                                <Badge variant="secondary" className="bg-red-500/10 text-red-500">
                                  失败
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
