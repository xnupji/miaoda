import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useWeb3 } from '@/contexts/Web3Context';
import { supabase } from '@/db/supabase';
import { bindWalletAddress, claimTaskOrder, createInteractionSubmission, getMyTaskOrderClaims, getOpenTaskOrders, getUserInteractionSubmissions, submitTaskOrderProof } from '@/db/api';
import type { InteractionSubmission, TaskOrder, TaskOrderClaim } from '@/types/types';

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
  const [taskOrders, setTaskOrders] = useState<TaskOrder[]>([]);
  const [taskOrdersLoading, setTaskOrdersLoading] = useState(false);
  const [myClaims, setMyClaims] = useState<TaskOrderClaim[]>([]);
  const [myClaimsLoading, setMyClaimsLoading] = useState(false);
  const [claimingTaskId, setClaimingTaskId] = useState<string | null>(null);
  const [taskDetailDialogOpen, setTaskDetailDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskOrder | null>(null);
  const [proofDialogOpen, setProofDialogOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<TaskOrderClaim | null>(null);
  const [proofForm, setProofForm] = useState({
    proofUrl: '',
    proofNotes: '',
    receiveUsername: '',
    receiveAddress: '',
  });
  const [submittingProof, setSubmittingProof] = useState(false);
  const [uploadingProofImage, setUploadingProofImage] = useState(false);
  const proofFileInputRef = useRef<HTMLInputElement | null>(null);

  const taskMap = useMemo(() => {
    const map = new Map<string, TaskOrder>();
    for (const task of taskOrders) {
      map.set(task.id, task);
    }
    return map;
  }, [taskOrders]);

  const selectedTaskStats = useMemo(() => {
    if (!selectedTask) return null;
    const maxClaims = selectedTask.max_claims ?? 0;
    const approved = selectedTask.approved_claims ?? 0;
    const progress = maxClaims > 0 ? Math.min(100, (approved / maxClaims) * 100) : 0;
    const deadlineLabel = selectedTask.deadline_at
      ? new Date(selectedTask.deadline_at).toLocaleString('zh-CN')
      : '不限';
    const isGameTask =
      selectedTask.is_game_task === true ||
      (!!selectedTask.description && selectedTask.description.startsWith('【游戏化任务｜'));
    let gameDifficulty: '低' | '中' | '高' | null = null;
    if (isGameTask) {
      if (selectedTask.game_difficulty === 'high') gameDifficulty = '高';
      else if (selectedTask.game_difficulty === 'medium') gameDifficulty = '中';
      else if (selectedTask.game_difficulty === 'low') gameDifficulty = '低';
      else if (selectedTask.description) {
        if (selectedTask.description.includes('难度：高')) gameDifficulty = '高';
        else if (selectedTask.description.includes('难度：中')) gameDifficulty = '中';
        else if (selectedTask.description.includes('难度：低')) gameDifficulty = '低';
      }
    }
    const activationMin = selectedTask.activation_min_usdt ?? null;
    const activationMax = selectedTask.activation_max_usdt ?? null;
    const rewardMin = selectedTask.reward_min_usdt ?? null;
    const rewardMax = selectedTask.reward_max_usdt ?? null;
    return {
      maxClaims,
      approved,
      progress,
      deadlineLabel,
      isGameTask,
      gameDifficulty,
      activationMin,
      activationMax,
      rewardMin,
      rewardMax,
    };
  }, [selectedTask]);

  // Fetch submissions on mount
  useEffect(() => {
    loadSubmissions();
  }, []);

  useEffect(() => {
    if (activeTab === 'tasks') {
      loadTaskOrders();
      loadMyClaims();
    }
  }, [activeTab]);

  async function loadSubmissions() {
    setLoading(true);
    const data = await getUserInteractionSubmissions();
    setSubmissions(data);
    setLoading(false);
  }

  async function loadTaskOrders() {
    setTaskOrdersLoading(true);
    const data = await getOpenTaskOrders();
    setTaskOrders(data);
    setTaskOrdersLoading(false);
  }

  async function loadMyClaims() {
    setMyClaimsLoading(true);
    const data = await getMyTaskOrderClaims();
    setMyClaims(data);
    setMyClaimsLoading(false);
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

  const handleClaimTask = async (taskId: string) => {
    if (!profile) {
      toast.error('请先登录');
      return;
    }
    setClaimingTaskId(taskId);
    const res = await claimTaskOrder(taskId);
    setClaimingTaskId(null);
    if (res.ok) {
      toast.success('抢单成功，请按要求完成任务并提交交付信息');
      loadTaskOrders();
      loadMyClaims();
    } else {
      toast.error(res.error || '抢单失败，请稍后重试');
    }
  };

  const openTaskDetail = (task: TaskOrder) => {
    setSelectedTask(task);
    setTaskDetailDialogOpen(true);
  };

  const openProofDialog = (claim: TaskOrderClaim) => {
    setSelectedClaim(claim);
    setProofForm({
      proofUrl: claim.proof_url || '',
      proofNotes: claim.proof_notes || '',
      receiveUsername: claim.receive_username || profile?.username || '',
      receiveAddress: claim.receive_address || '',
    });
    setProofDialogOpen(true);
  };

  const handleChooseProofImage = () => {
    if (uploadingProofImage) return;
    proofFileInputRef.current?.click();
  };

  const handleProofFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClaim) return;
    if (!profile) {
      toast.error('请先登录');
      return;
    }
    setUploadingProofImage(true);
    const toastId = toast.loading('正在上传图片...');
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `task-proofs/${profile.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('support-attachments')
        .upload(fileName, file);
      if (uploadError) {
        throw uploadError;
      }
      const { data: publicData } = supabase.storage
        .from('support-attachments')
        .getPublicUrl(fileName);
      const publicUrl = (publicData as any)?.publicUrl || (publicData as any)?.public_url;
      if (!publicUrl) {
        throw new Error('获取图片地址失败');
      }
      setProofForm((prev) => ({
        ...prev,
        proofUrl: publicUrl,
      }));
      toast.success('图片上传成功', { id: toastId });
    } catch (error: any) {
      toast.error('图片上传失败: ' + (error.message || '未知错误'), { id: toastId });
    } finally {
      setUploadingProofImage(false);
      if (proofFileInputRef.current) {
        proofFileInputRef.current.value = '';
      }
    }
  };

  const handleSubmitProof = async () => {
    if (!selectedClaim) return;
    if (!proofForm.receiveUsername.trim()) {
      toast.error('请输入用户名');
      return;
    }
    if (!proofForm.receiveAddress.trim()) {
      toast.error('请输入接收地址');
      return;
    }
    setSubmittingProof(true);
    const ok = await submitTaskOrderProof(selectedClaim.id, {
      proofUrl: proofForm.proofUrl.trim() || null,
      proofNotes: proofForm.proofNotes.trim() || null,
      receiveUsername: proofForm.receiveUsername.trim(),
      receiveAddress: proofForm.receiveAddress.trim(),
    });
    setSubmittingProof(false);
    if (ok) {
      toast.success('交付信息提交成功，等待管理员审核');
      setProofDialogOpen(false);
      setSelectedClaim(null);
      loadMyClaims();
    } else {
      toast.error('提交失败，请稍后重试');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-500">已通过</Badge>;
      case 'rejected': return <Badge variant="destructive">已拒绝</Badge>;
      default: return <Badge variant="secondary">审核中</Badge>;
    }
  };

  const getTaskTitle = (taskId: string) => {
    const task = taskMap.get(taskId);
    return task ? task.title : taskId;
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
          <TabsTrigger value="tasks">任务抢单</TabsTrigger>
        </TabsList>

        {activeTab !== 'tasks' && (
          <>
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
          </>
        )}

        {activeTab === 'tasks' && (
          <>
            <div className="rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs sm:text-sm text-yellow-900">
              安全提示：本站不会以任何形式向您索取钱包私钥或助记词，请勿在任何网站输入这些信息。
            </div>

            <Card>
              <CardHeader>
                <CardTitle>可抢任务</CardTitle>
                <CardDescription>
                  选择下方任务进行抢单，奖励以美元结算，请在截止日期前完成并提交交付信息
                </CardDescription>
              </CardHeader>
              <CardContent>
                {taskOrdersLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : taskOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无开放任务，稍后再来看看
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {taskOrders.map((task) => {
                      const claimed = myClaims.some((c) => c.task_id === task.id);
                      const maxClaims = task.max_claims ?? 0;
                      const approved = task.approved_claims ?? 0;
                      const progress = maxClaims > 0 ? Math.min(100, (approved / maxClaims) * 100) : 0;
                      const deadlineLabel = task.deadline_at
                        ? new Date(task.deadline_at).toLocaleDateString('zh-CN')
                        : '不限';

                      return (
                        <div
                          key={task.id}
                          className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-4"
                        >
                          <div className="flex gap-3">
                            {task.image_url && (
                              <div className="w-24 h-24 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                                <img
                                  src={task.image_url}
                                  alt={task.title}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            )}
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="text-base font-semibold leading-relaxed">
                                  {task.title}
                                </div>
                                {(task.is_game_task ||
                                  (task.description &&
                                    task.description.startsWith('【游戏化任务｜'))) && (
                                  <Badge variant="secondary" className="bg-purple-500/10 text-purple-500 text-[10px] px-1.5 py-0.5">
                                    游戏任务
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                                任务说明
                              </div>
                              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                                {task.description || '-'}
                              </div>
                            </div>
                          </div>
                          <div className="space-y-3 rounded-md bg-background/80 p-3 text-sm leading-relaxed">
                            <div className="flex items-center justify-between gap-4">
                              <div className="text-xs text-muted-foreground">奖励金额</div>
                              <div className="text-base font-semibold whitespace-nowrap">
                                ${task.reward.toFixed(2)}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>完成进度</span>
                                {maxClaims > 0 && (
                                  <span>{progress.toFixed(0)}%</span>
                                )}
                              </div>
                              <div>
                                {maxClaims > 0 ? (
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                      <span>已完成 {approved} / {maxClaims}</span>
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-primary/10 overflow-hidden">
                                      <div
                                        className="h-full bg-primary"
                                        style={{ width: `${progress}%` }}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    已完成 {approved} 人（不限人数）
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <div className="text-xs text-muted-foreground">截止日期</div>
                              <div className="text-sm whitespace-nowrap">
                                {deadlineLabel}
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <div className="text-xs text-muted-foreground">任务状态</div>
                              <div>
                                {task.status === 'open' ? (
                                  <Badge variant="success" className="bg-green-500/10 text-green-500">
                                    可抢
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-gray-500/10 text-gray-500">
                                    已关闭
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-border/60">
                            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                              <div>先查看任务详情，确认需要完成的操作内容。</div>
                              <div>如已抢单，请在完成任务后及时在“我的任务”中提交交付信息。</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openTaskDetail(task)}
                              >
                                查看任务详情
                              </Button>
                              <Button
                                size="sm"
                                className="px-6"
                                disabled={task.status !== 'open' || claimed || claimingTaskId === task.id}
                                onClick={() => handleClaimTask(task.id)}
                              >
                                {claimingTaskId === task.id && (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {claimed ? '已抢单' : '抢单'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>我的任务</CardTitle>
                <CardDescription>查看已抢任务，提交交付凭证和收货信息</CardDescription>
              </CardHeader>
              <CardContent>
                {myClaimsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : myClaims.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无抢单记录
                  </div>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table className="min-w-[960px]">
                      <TableHeader>
                        <TableRow className="align-top">
                          <TableHead>任务</TableHead>
                          <TableHead>抢单时间</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>交付凭证</TableHead>
                          <TableHead>收货信息</TableHead>
                          <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {myClaims.map((claim) => (
                          <TableRow key={claim.id} className="align-top">
                            <TableCell className="text-base font-semibold max-w-xs whitespace-normal break-words leading-relaxed">
                              {getTaskTitle(claim.task_id)}
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap leading-relaxed">
                              {new Date(claim.created_at).toLocaleString()}
                            </TableCell>
                            <TableCell className="align-top">
                              {claim.status === 'claimed' && (
                                <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500">
                                  已抢单，待提交
                                </Badge>
                              )}
                              {claim.status === 'submitted' && (
                                <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">
                                  已提交，待审核
                                </Badge>
                              )}
                              {claim.status === 'approved' && (
                                <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                                  已通过
                                </Badge>
                              )}
                              {claim.status === 'rejected' && (
                                <Badge variant="secondary" className="bg-red-500/10 text-red-500">
                                  已拒绝
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm max-w-md break-words leading-relaxed">
                              {claim.proof_url ? (
                                <a
                                  href={claim.proof_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-primary underline"
                                >
                                  查看链接
                                </a>
                              ) : (
                                '-'
                              )}
                              {claim.proof_notes && (
                                <div className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
                                  {claim.proof_notes}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-sm max-w-md break-all space-y-1 leading-relaxed">
                              {claim.receive_username || claim.receive_address ? (
                                <>
                                  <div>用户名：{claim.receive_username || '-'}</div>
                                  <div>收货地址：{claim.receive_address || '-'}</div>
                                </>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              {claim.status === 'claimed' && (
                                <Button size="sm" onClick={() => openProofDialog(claim)}>
                                  提交交付信息
                                </Button>
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
          </>
        )}
      </Tabs>
      <Dialog
        open={taskDetailDialogOpen}
        onOpenChange={(open) => {
          setTaskDetailDialogOpen(open);
          if (!open) {
            setSelectedTask(null);
          }
        }}
      >
        <DialogContent className="max-w-xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTask ? selectedTask.title : '任务详情'}</DialogTitle>
            <DialogDescription>
              请根据下方说明完成任务，并在截止时间前提交交付信息。
            </DialogDescription>
          </DialogHeader>
          {selectedTask && selectedTaskStats && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">
                    任务说明
                  </div>
                  {selectedTaskStats.isGameTask && (
                    <div className="inline-flex items-center gap-2">
                      <Badge variant="secondary" className="bg-purple-500/10 text-purple-500">
                        游戏化任务
                      </Badge>
                      {selectedTaskStats.gameDifficulty && (
                        <Badge variant="outline" className="text-xs border-purple-500/40 text-purple-500">
                          难度：{selectedTaskStats.gameDifficulty}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                <div className="rounded-md bg-muted/40 p-3 text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {selectedTask.description || '暂无任务说明，请联系管理员确认任务要求。'}
                </div>
              </div>
              {selectedTaskStats.isGameTask && (
                <div className="space-y-2 rounded-md border border-purple-200/60 bg-purple-50/60 p-3 text-xs sm:text-sm text-purple-900">
                  <div className="font-semibold">游戏任务特别说明</div>
                  <ul className="list-disc list-inside space-y-1 leading-relaxed">
                    <li>本任务为游戏化体验任务，分为低 / 中 / 高三个难度阶段。</li>
                    <li>开始前请先抢单，并按照页面提示联系管理员激活任务。</li>
                    <li>
                      激活任务需向管理员支付{' '}
                      {selectedTaskStats.activationMin && selectedTaskStats.activationMax
                        ? `${selectedTaskStats.activationMin}U-${selectedTaskStats.activationMax}U`
                        : selectedTaskStats.activationMin && !selectedTaskStats.activationMax
                          ? `不少于 ${selectedTaskStats.activationMin}U`
                          : !selectedTaskStats.activationMin && selectedTaskStats.activationMax
                            ? `不超过 ${selectedTaskStats.activationMax}U`
                            : '约 30U-100U'}
                      {' '}作为激活资金，请以管理员给出的收款方式为准。
                    </li>
                    <li>完成任务后，在“我的任务”中上传打款截图或转账凭证，并填写收款码 / 钱包地址。</li>
                    <li>
                      管理员审核通过后，将返还激活本金，并根据完成进度发放{' '}
                      {selectedTaskStats.rewardMin && selectedTaskStats.rewardMax
                        ? `${selectedTaskStats.rewardMin}U-${selectedTaskStats.rewardMax}U`
                        : selectedTaskStats.rewardMin && !selectedTaskStats.rewardMax
                          ? `不少于 ${selectedTaskStats.rewardMin}U`
                          : !selectedTaskStats.rewardMin && selectedTaskStats.rewardMax
                            ? `不超过 ${selectedTaskStats.rewardMax}U`
                            : '1U-100U'}
                      {' '}的任务奖励。
                    </li>
                    <li>请谨慎保管私钥和助记词，不要在任何聊天或网站中泄露。</li>
                  </ul>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1 rounded-md bg-background/80 p-3">
                  <div className="text-xs text-muted-foreground">奖励金额</div>
                  <div className="text-lg font-semibold">
                    ${selectedTask.reward.toFixed(2)}
                  </div>
                </div>
                <div className="space-y-1 rounded-md bg-background/80 p-3">
                  <div className="text-xs text-muted-foreground">截止日期</div>
                  <div className="text-sm">
                    {selectedTaskStats.deadlineLabel}
                  </div>
                </div>
                <div className="space-y-1 rounded-md bg-background/80 p-3">
                  <div className="text-xs text-muted-foreground">当前状态</div>
                  <div className="text-sm">
                    {selectedTask.status === 'open' ? (
                      <span className="text-green-500">可抢</span>
                    ) : (
                      <span className="text-gray-500">已关闭</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>完成进度</span>
                  {selectedTaskStats.maxClaims > 0 && (
                    <span>{selectedTaskStats.progress.toFixed(0)}%</span>
                  )}
                </div>
                <div>
                  {selectedTaskStats.maxClaims > 0 ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>已完成 {selectedTaskStats.approved} / {selectedTaskStats.maxClaims}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-primary/10 overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${selectedTaskStats.progress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      已完成 {selectedTaskStats.approved} 人（不限人数）
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  操作指南
                </div>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground leading-relaxed">
                  <li>仔细阅读上方任务说明，确认需要完成的具体操作。</li>
                  <li>根据说明在指定平台完成任务，例如发布内容、关注账号或填写表单。</li>
                  <li>完成后前往“我的任务”，选择对应任务，点击“提交交付信息”。</li>
                  <li>上传任务完成的截图链接或相关证明，并填写接收奖励的钱包地址。</li>
                  <li>提交后耐心等待管理员审核，审核通过后奖励将发放至绑定钱包。</li>
                </ol>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setTaskDetailDialogOpen(false);
                    setSelectedTask(null);
                  }}
                >
                  关闭
                </Button>
                <Button
                  disabled={
                    !selectedTask ||
                    selectedTask.status !== 'open' ||
                    myClaims.some((c) => c.task_id === selectedTask.id) ||
                    claimingTaskId === selectedTask.id
                  }
                  onClick={() => {
                    if (selectedTask) {
                      handleClaimTask(selectedTask.id);
                    }
                  }}
                >
                  {claimingTaskId === selectedTask?.id && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {selectedTask && myClaims.some((c) => c.task_id === selectedTask.id) ? '已抢单' : '立即抢单'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={proofDialogOpen}
        onOpenChange={(open) => {
          setProofDialogOpen(open);
          if (!open) {
            setSelectedClaim(null);
          }
        }}
      >
        <DialogContent className="max-w-xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>提交交付信息</DialogTitle>
            <DialogDescription>
              完成任务后，在此上传交付凭证，并填写用户名和钱包地址
            </DialogDescription>
          </DialogHeader>
          {selectedClaim && (
            <div className="space-y-4">
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>任务名称：{getTaskTitle(selectedClaim.task_id)}</div>
                <div>抢单时间：{new Date(selectedClaim.created_at).toLocaleString()}</div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="proof-url">交付凭证链接</Label>
                <div className="flex gap-2">
                  <Input
                    id="proof-url"
                    className="flex-1"
                    placeholder="例如 图片或文档链接，可选"
                    value={proofForm.proofUrl}
                    onChange={(e) =>
                      setProofForm((prev) => ({ ...prev, proofUrl: e.target.value }))
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleChooseProofImage}
                    disabled={uploadingProofImage}
                  >
                    {uploadingProofImage && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    上传图片
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="proof-notes">交付说明</Label>
                <Textarea
                  id="proof-notes"
                  placeholder="补充说明本次交付的内容，可选"
                  className="min-h-[100px]"
                  value={proofForm.proofNotes}
                  onChange={(e) =>
                    setProofForm((prev) => ({ ...prev, proofNotes: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receive-username">用户名</Label>
                <Input
                  id="receive-username"
                  placeholder="请输入接收人用户名"
                  value={proofForm.receiveUsername}
                  onChange={(e) =>
                    setProofForm((prev) => ({ ...prev, receiveUsername: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receive-address">钱包地址</Label>
                <Textarea
                  id="receive-address"
                  placeholder="请输入钱包地址"
                  className="min-h-[80px]"
                  value={proofForm.receiveAddress}
                  onChange={(e) =>
                    setProofForm((prev) => ({ ...prev, receiveAddress: e.target.value }))
                  }
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setProofDialogOpen(false);
                    setSelectedClaim(null);
                  }}
                >
                  取消
                </Button>
                <Button onClick={handleSubmitProof} disabled={submittingProof}>
                  {submittingProof && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  提交
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <input
        ref={proofFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleProofFileChange}
      />
    </div>
  );
}
