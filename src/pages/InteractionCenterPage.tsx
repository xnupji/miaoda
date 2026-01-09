import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { createInteractionSubmission, getUserInteractionSubmissions, bindWalletAddress } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import { useWeb3 } from '@/contexts/Web3Context';
import type { InteractionSubmission } from '@/types/types';
import { Loader2 } from 'lucide-react';

export default function InteractionCenterPage() {
  const { profile, refreshProfile } = useAuth();
  const { isConnected, account } = useWeb3();
  const [activeTab, setActiveTab] = useState('community');
  const [communityAddresses, setCommunityAddresses] = useState('');
  const [institutionAddresses, setInstitutionAddresses] = useState('');
  const [submissions, setSubmissions] = useState<InteractionSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [binding, setBinding] = useState(false);

  // Fetch submissions on mount
  useEffect(() => {
    loadSubmissions();
  }, []);

  async function loadSubmissions() {
    setLoading(true);
    const data = await getUserInteractionSubmissions();
    setSubmissions(data);
    setLoading(false);
  }

  const handleSubmit = async () => {
    if (!profile) {
      toast.error('请先登录');
      return;
    }
    if (!isConnected && !(profile.wallet_address)) {
      toast.error('请先连接钱包或绑定钱包后再提交地址');
      return;
    }
    const currentAddresses = activeTab === 'community' ? communityAddresses : institutionAddresses;
    if (!currentAddresses.trim()) {
      toast.error('请输入地址');
      return;
    }

    const addressList = currentAddresses.split('\n').map(a => a.trim()).filter(a => a);
    if (addressList.length === 0) {
      toast.error('请输入有效的地址');
      return;
    }

    const limit = activeTab === 'community' ? 1000 : 10000;
    if (addressList.length > limit) {
      toast.error(`地址数量不能超过 ${limit} 个`);
      return;
    }

    setSubmitting(true);
    const success = await createInteractionSubmission(
      activeTab as 'community' | 'institution',
      addressList
    );

    if (success) {
      toast.success('提交成功，等待审核');
      if (activeTab === 'community') {
        setCommunityAddresses('');
      } else {
        setInstitutionAddresses('');
      }
      loadSubmissions();
    } else {
      toast.error('提交失败');
    }
    setSubmitting(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-500">已通过</Badge>;
      case 'rejected': return <Badge variant="destructive">已拒绝</Badge>;
      default: return <Badge variant="secondary">审核中</Badge>;
    }
  };

  const handleBindWallet = async () => {
    if (!account) {
      toast.error('请先连接钱包');
      return;
    }
    setBinding(true);
    const ok = await bindWalletAddress(account);
    setBinding(false);
    if (ok) {
      toast.success('钱包地址已绑定到账户');
      await refreshProfile();
    } else {
      toast.error('绑定失败，请稍后重试');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">交互中心</h1>
      </div>

      <Card className="glow-border">
        <CardHeader>
          <CardTitle>钱包状态</CardTitle>
          <CardDescription>查看并管理您当前的钱包绑定情况</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">
              已绑定地址：
            </div>
            <div className="text-sm font-mono break-all">
              {profile?.wallet_address || '未绑定'}
            </div>
            {isConnected && (
              <>
                <div className="text-sm text-muted-foreground mt-2">
                  当前钱包：
                </div>
                <div className="text-sm font-mono break-all">
                  {account}
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isConnected && (!profile?.wallet_address || (profile.wallet_address && account && profile.wallet_address.toLowerCase() !== account.toLowerCase())) ? (
              <Button onClick={handleBindWallet} disabled={binding}>
                {binding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                绑定当前钱包地址
              </Button>
            ) : (
              <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                {profile?.wallet_address ? '已绑定账户' : '未绑定'}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="community" onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="community">社区地址交互</TabsTrigger>
          <TabsTrigger value="institution">机构交付中心</TabsTrigger>
        </TabsList>

        <Card>
          <CardHeader>
            <CardTitle>{activeTab === 'community' ? '社区地址交互' : '机构交付中心'}</CardTitle>
            <CardDescription>
              {activeTab === 'community' 
                ? '批量提交社区成员钱包地址进行审核，单次最多1000个。' 
                : '机构批量交付地址审核，单次最多10000个。'}
              审核通过后将发放空投代币。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="请输入钱包地址，每行一个地址"
              className="min-h-[200px]"
              value={activeTab === 'community' ? communityAddresses : institutionAddresses}
              onChange={(e) => {
                if (activeTab === 'community') setCommunityAddresses(e.target.value);
                else setInstitutionAddresses(e.target.value);
              }}
            />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                当前行数: {(activeTab === 'community' ? communityAddresses : institutionAddresses).split('\n').filter(l => l.trim()).length} / {activeTab === 'community' ? 1000 : 10000}
              </span>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                提交审核
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>提交记录</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>类型</TableHead>
                    <TableHead>提交时间</TableHead>
                    <TableHead>地址数量</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>反馈</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        {sub.type === 'community' ? '社区交互' : '机构交付'}
                      </TableCell>
                      <TableCell>{new Date(sub.created_at).toLocaleString()}</TableCell>
                      <TableCell>{sub.addresses.length}</TableCell>
                      <TableCell>{getStatusBadge(sub.status)}</TableCell>
                      <TableCell>{sub.feedback || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {submissions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        暂无提交记录
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
