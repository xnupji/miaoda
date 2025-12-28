import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { getTransactions } from '@/db/api';
import type { Transaction, TransactionType } from '@/types/types';

const transactionTypeLabels: Record<TransactionType, string> = {
  mining: '挖矿奖励',
  invitation_reward: '邀请奖励',
  master_node_reward: '主节点奖励',
  withdrawal: '提币',
  transfer_in: '转入',
  transfer_out: '转出',
};

const transactionTypeColors: Record<TransactionType, string> = {
  mining: 'text-primary',
  invitation_reward: 'text-chart-2',
  master_node_reward: 'text-chart-3',
  withdrawal: 'text-destructive',
  transfer_in: 'text-green-500',
  transfer_out: 'text-orange-500',
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'HTP' | 'USDT'>('all');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    const data = await getTransactions(200);
    setTransactions(data);
    setLoading(false);
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
      <div className="grid gap-4 md:grid-cols-4">
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

        <Card className="glow-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              USDT 收入
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">+{totalUsdtIn.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="glow-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-500" />
              USDT 支出
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">-{totalUsdtOut.toFixed(2)}</div>
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
