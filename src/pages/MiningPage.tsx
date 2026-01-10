import { Loader2, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getMiningRecords } from '@/db/api';
import type { MiningRecord } from '@/types/types';

export default function MiningPage() {
  const [records, setRecords] = useState<MiningRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    const data = await getMiningRecords(100);
    setRecords(data);
    setLoading(false);
  };

  const totalMined = records.reduce((sum, record) => sum + record.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">挖矿记录</h1>
        <p className="text-muted-foreground mt-2">查看您的所有挖矿历史记录</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glow-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">总挖矿次数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{records.length}</div>
          </CardContent>
        </Card>

        <Card className="glow-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">累计挖矿收益</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalMined.toFixed(2)} HTP</div>
          </CardContent>
        </Card>

        <Card className="glow-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">平均每次收益</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {records.length > 0 ? (totalMined / records.length).toFixed(2) : '0.00'} HTP
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 记录表格 */}
      <Card>
        <CardHeader>
          <CardTitle>挖矿历史</CardTitle>
          <CardDescription>所有挖矿记录按时间倒序排列</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">暂无挖矿记录</p>
              <p className="text-sm text-muted-foreground mt-2">前往仪表盘开始您的第一次挖矿</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日期</TableHead>
                    <TableHead>挖矿时间</TableHead>
                    <TableHead className="text-right">收益 (HTP)</TableHead>
                    <TableHead className="text-right">状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {new Date(record.mining_date).toLocaleDateString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(record.created_at).toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        +{record.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                          已完成
                        </Badge>
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
