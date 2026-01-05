import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  getAllProfiles,
  updateUserRole,
  getAllWithdrawalRequests,
  reviewWithdrawalRequest,
  getAllMasterNodeApplications,
  getPlatformConfig,
  getSystemSetting,
  updateSystemSetting,
  getHTPPrice,
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '@/db/api';
import type { Profile, WithdrawalRequest, MasterNodeApplication, Announcement } from '@/types/types';
import { supabase } from '@/db/supabase';
import { Shield, Users, FileCheck, Network, Loader2, Wallet, Settings, TrendingUp, Megaphone, Plus, Pencil, Trash2 } from 'lucide-react';

export default function AdminPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [masterNodes, setMasterNodes] = useState<MasterNodeApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    type: 'withdrawal' | 'masternode' | null;
    id: string | null;
    action: 'approve' | 'reject' | null;
  }>({ open: false, type: null, id: null, action: null });
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [developerAddress, setDeveloperAddress] = useState('');
  const [newDeveloperAddress, setNewDeveloperAddress] = useState('');
  const [updatingAddress, setUpdatingAddress] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // HTP价格管理相关状态
  const [htpPriceMode, setHtpPriceMode] = useState<'auto' | 'manual'>('auto');
  const [currentHtpPrice, setCurrentHtpPrice] = useState(0.01);
  const [newHtpPrice, setNewHtpPrice] = useState('');
  const [updatingPrice, setUpdatingPrice] = useState(false);

  // 公告管理相关状态
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementDialog, setAnnouncementDialog] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    data: Partial<Announcement>;
  }>({ open: false, mode: 'create', data: {} });
  const [submittingAnnouncement, setSubmittingAnnouncement] = useState(false);

  useEffect(() => {
    loadData();
    loadDeveloperAddress();
    loadHtpPriceSettings();
  }, []);

  const loadDeveloperAddress = async () => {
    const address = await getPlatformConfig('developer_usdt_address');
    if (address) {
      setDeveloperAddress(address);
      setNewDeveloperAddress(address);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Load core data first
      const [usersData, withdrawalsData, masterNodesData] = await Promise.all([
        getAllProfiles(),
        getAllWithdrawalRequests(),
        getAllMasterNodeApplications(),
      ]);
      
      setUsers(usersData);
      setWithdrawals(withdrawalsData);
      setMasterNodes(masterNodesData);

      // Load announcements separately to prevent page crash if table is missing
      try {
        const announcementsData = await getAnnouncements(false);
        setAnnouncements(announcementsData);
      } catch (err) {
        console.error('Failed to load announcements (table might be missing):', err);
        // Do not block the page load
      }
    } catch (error) {
      console.error('Failed to load admin data:', error);
      toast.error('加载数据失败，请检查网络或权限');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'user' | 'admin' | 'master_node') => {
    const success = await updateUserRole(userId, newRole);
    if (success) {
      toast.success('角色更新成功');
      await loadData();
    } else {
      toast.error('角色更新失败');
    }
  };

  const handleReview = async () => {
    if (!reviewDialog.id || !reviewDialog.action) return;

    if (reviewDialog.action === 'reject' && !rejectReason.trim()) {
      toast.error('请填写拒绝原因');
      return;
    }

    setProcessing(true);

    if (reviewDialog.type === 'withdrawal') {
      const success = await reviewWithdrawalRequest(
        reviewDialog.id,
        reviewDialog.action === 'approve' ? 'approved' : 'rejected',
        reviewDialog.action === 'reject' ? rejectReason : undefined
      );

      if (success) {
        toast.success(reviewDialog.action === 'approve' ? '提币申请已通过' : '提币申请已拒绝');
        await loadData();
        setReviewDialog({ open: false, type: null, id: null, action: null });
        setRejectReason('');
      } else {
        toast.error('操作失败');
      }
    }

    setProcessing(false);
  };

  const handleUpdateDeveloperAddress = async () => {
    if (!newDeveloperAddress.trim()) {
      toast.error('请输入有效的钱包地址');
      return;
    }

    setUpdatingAddress(true);
    const { error } = await supabase
      .from('platform_config')
      .update({ config_value: newDeveloperAddress })
      .eq('config_key', 'developer_usdt_address');

    setUpdatingAddress(false);

    if (error) {
      toast.error('更新失败');
    } else {
      toast.success('开发者地址更新成功');
      setDeveloperAddress(newDeveloperAddress);
    }
  };

  // 加载HTP价格设置
  const loadHtpPriceSettings = async () => {
    const mode = await getSystemSetting('htp_price_mode');
    setHtpPriceMode((mode as 'auto' | 'manual') || 'auto');
    
    const price = await getHTPPrice();
    setCurrentHtpPrice(price);
    
    if (mode === 'manual') {
      const priceStr = await getSystemSetting('htp_price');
      setNewHtpPrice(priceStr || '');
    }
  };

  // 切换价格模式
  const handlePriceModeChange = async (mode: 'auto' | 'manual') => {
    const success = await updateSystemSetting('htp_price_mode', mode);
    if (success) {
      setHtpPriceMode(mode);
      toast.success(`已切换到${mode === 'auto' ? '自动' : '手动'}模式`);
      await loadHtpPriceSettings();
    } else {
      toast.error('切换失败');
    }
  };

  // 更新HTP价格
  const handleUpdateHtpPrice = async () => {
    const price = parseFloat(newHtpPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('请输入有效的价格');
      return;
    }

    setUpdatingPrice(true);
    const success = await updateSystemSetting('htp_price', price.toString());
    setUpdatingPrice(false);

    if (success) {
      toast.success('HTP价格更新成功');
      await loadHtpPriceSettings();
    } else {
      toast.error('更新失败');
    }
  };

  const handleEditUser = (user: Profile) => {
    setEditingUser({ ...user });
    setEditDialogOpen(true);
  };

  const handleSaveUserEdit = async () => {
    if (!editingUser) return;

    setProcessing(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        htp_balance: editingUser.htp_balance,
        usdt_balance: editingUser.usdt_balance,
        wallet_activated: editingUser.wallet_activated,
        role: editingUser.role,
      })
      .eq('id', editingUser.id);

    setProcessing(false);

    if (error) {
      toast.error('更新失败');
    } else {
      toast.success('用户信息更新成功');
      setEditDialogOpen(false);
      await loadData();
    }
  };

  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
  const pendingMasterNodes = masterNodes.filter(m => m.status === 'pending');

  // 公告管理处理函数
  const handleCreateAnnouncement = () => {
    setAnnouncementDialog({
      open: true,
      mode: 'create',
      data: { is_active: true, priority: 'normal' }
    });
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setAnnouncementDialog({
      open: true,
      mode: 'edit',
      data: announcement
    });
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('确定要删除这条公告吗？')) return;
    const success = await deleteAnnouncement(id);
    if (success) {
      toast.success('公告已删除');
      loadData();
    } else {
      toast.error('删除失败');
    }
  };

  const submitAnnouncement = async () => {
    if (!announcementDialog.data.title || !announcementDialog.data.content) {
      toast.error('请填写标题和内容');
      return;
    }

    setSubmittingAnnouncement(true);
    let success = false;

    if (announcementDialog.mode === 'create') {
      success = await createAnnouncement({
        title: announcementDialog.data.title,
        content: announcementDialog.data.content,
        is_active: announcementDialog.data.is_active ?? true,
        priority: announcementDialog.data.priority || 'normal',
      });
    } else {
      if (!announcementDialog.data.id) return;
      success = await updateAnnouncement(announcementDialog.data.id, {
        title: announcementDialog.data.title,
        content: announcementDialog.data.content,
        is_active: announcementDialog.data.is_active,
        priority: announcementDialog.data.priority,
      });
    }

    setSubmittingAnnouncement(false);
    if (success) {
      toast.success(announcementDialog.mode === 'create' ? '公告发布成功' : '公告更新成功');
      setAnnouncementDialog(prev => ({ ...prev, open: false }));
      loadData();
    } else {
      toast.error('操作失败');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text flex items-center gap-2">
          <Shield className="w-8 h-8" />
          管理后台 (v1.2)
        </h1>
        <p className="text-muted-foreground mt-2">管理用户、审核申请和查看统计数据</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glow-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              总用户数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>

        <Card className="glow-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileCheck className="w-4 h-4" />
              待审核提币
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{pendingWithdrawals.length}</div>
          </CardContent>
        </Card>

        <Card className="glow-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Network className="w-4 h-4" />
              待审核主节点
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{pendingMasterNodes.length}</div>
          </CardContent>
        </Card>

        <Card className="glow-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">主节点数量</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {users.filter(u => u.is_master_node).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 管理标签页 */}
      <Tabs defaultValue="announcements" className="space-y-4">
        <TabsList>
          <TabsTrigger value="announcements">
            <Megaphone className="w-4 h-4 mr-2" />
            公告中心 (New)
          </TabsTrigger>
          <TabsTrigger value="users">用户管理</TabsTrigger>
          <TabsTrigger value="withdrawals">
            提币审核
            {pendingWithdrawals.length > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingWithdrawals.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="masternodes">
            主节点审核
            {pendingMasterNodes.length > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingMasterNodes.length}</Badge>
            )}
          </TabsTrigger>

          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            开发者设置
          </TabsTrigger>
        </TabsList>

        {/* 公告管理 */}
        <TabsContent value="announcements">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>公告管理</CardTitle>
                <CardDescription>发布和管理平台公告</CardDescription>
              </div>
              <Button onClick={handleCreateAnnouncement}>
                <Plus className="w-4 h-4 mr-2" />
                发布公告
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : announcements.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  暂无公告
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>标题</TableHead>
                        <TableHead>优先级</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>发布时间</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {announcements.map((announcement) => (
                        <TableRow key={announcement.id}>
                          <TableCell className="font-medium">{announcement.title}</TableCell>
                          <TableCell>
                            {announcement.priority === 'high' && (
                              <Badge variant="destructive">重要</Badge>
                            )}
                            {announcement.priority === 'normal' && (
                              <Badge variant="secondary">普通</Badge>
                            )}
                            {announcement.priority === 'low' && (
                              <Badge variant="outline">低</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {announcement.is_active ? (
                              <Badge variant="success" className="bg-green-500/10 text-green-500">已发布</Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-gray-500/10 text-gray-500">草稿</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(announcement.created_at).toLocaleString('zh-CN')}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditAnnouncement(announcement)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-600"
                              onClick={() => handleDeleteAnnouncement(announcement.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 用户管理 */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>用户列表</CardTitle>
              <CardDescription>管理所有用户的角色和权限</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>用户名</TableHead>
                        <TableHead>HTP余额</TableHead>
                        <TableHead>USDT余额</TableHead>
                        <TableHead>邀请人数</TableHead>
                        <TableHead>钱包状态</TableHead>
                        <TableHead>注册时间</TableHead>
                        <TableHead>角色</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell>{user.htp_balance.toFixed(2)}</TableCell>
                          <TableCell>{user.usdt_balance.toFixed(2)}</TableCell>
                          <TableCell>{user.total_invites}</TableCell>
                          <TableCell>
                            {user.wallet_activated ? (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                                已激活
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-gray-500/10 text-gray-500">
                                未激活
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(user.created_at).toLocaleDateString('zh-CN')}
                          </TableCell>
                          <TableCell>
                            {user.role === 'admin' && (
                              <Badge variant="secondary" className="bg-red-500/10 text-red-500">
                                管理员
                              </Badge>
                            )}
                            {user.role === 'master_node' && (
                              <Badge variant="secondary" className="bg-primary/10 text-primary">
                                主节点
                              </Badge>
                            )}
                            {user.role === 'user' && (
                              <Badge variant="secondary">普通用户</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditUser(user)}
                            >
                              编辑
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 提币审核 */}
        <TabsContent value="withdrawals">
          <Card>
            <CardHeader>
              <CardTitle>提币审核</CardTitle>
              <CardDescription>审核用户的提币申请</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : withdrawals.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  暂无提币申请
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>用户</TableHead>
                        <TableHead>代币</TableHead>
                        <TableHead className="text-right">数量</TableHead>
                        <TableHead>接收地址</TableHead>
                        <TableHead>付款地址</TableHead>
                        <TableHead>申请时间</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {withdrawals.map((withdrawal) => {
                        const user = users.find(u => u.id === withdrawal.user_id);
                        
                        return (
                          <TableRow key={withdrawal.id}>
                            <TableCell className="font-medium">
                              {user?.username || '未知用户'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{withdrawal.token_type}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {withdrawal.amount.toFixed(2)}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {withdrawal.to_address.slice(0, 10)}...
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {withdrawal.payment_address ? withdrawal.payment_address.slice(0, 10) + '...' : '-'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(withdrawal.created_at).toLocaleString('zh-CN')}
                            </TableCell>
                            <TableCell>
                              {withdrawal.status === 'pending' && (
                                <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500">
                                  待审核
                                </Badge>
                              )}
                              {withdrawal.status === 'approved' && (
                                <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                                  已通过
                                </Badge>
                              )}
                              {withdrawal.status === 'rejected' && (
                                <Badge variant="secondary" className="bg-red-500/10 text-red-500">
                                  已拒绝
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {withdrawal.status === 'pending' && (
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => setReviewDialog({
                                      open: true,
                                      type: 'withdrawal',
                                      id: withdrawal.id,
                                      action: 'approve',
                                    })}
                                  >
                                    通过
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setReviewDialog({
                                      open: true,
                                      type: 'withdrawal',
                                      id: withdrawal.id,
                                      action: 'reject',
                                    })}
                                  >
                                    拒绝
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 主节点审核 */}
        <TabsContent value="masternodes">
          <Card>
            <CardHeader>
              <CardTitle>主节点审核</CardTitle>
              <CardDescription>审核用户的主节点申请</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : masterNodes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  暂无主节点申请
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>用户</TableHead>
                        <TableHead>申请时间</TableHead>
                        <TableHead>目标</TableHead>
                        <TableHead>进度</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {masterNodes.map((application) => {
                        const user = users.find(u => u.id === application.user_id);
                        
                        return (
                          <TableRow key={application.id}>
                            <TableCell className="font-medium">
                              {user?.username || '未知用户'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(application.applied_at).toLocaleString('zh-CN')}
                            </TableCell>
                            <TableCell>
                              {application.target_wallets.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              {application.activated_wallets.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              {application.status === 'pending' && (
                                <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500">
                                  待审核
                                </Badge>
                              )}
                              {application.status === 'approved' && (
                                <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                                  已通过
                                </Badge>
                              )}
                              {application.status === 'rejected' && (
                                <Badge variant="secondary" className="bg-red-500/10 text-red-500">
                                  已拒绝
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {application.status === 'pending' && (
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={async () => {
                                      // 直接通过，更新用户角色
                                      await handleRoleChange(application.user_id, 'master_node');
                                      toast.success('主节点申请已通过');
                                    }}
                                  >
                                    通过
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setReviewDialog({
                                      open: true,
                                      type: 'masternode',
                                      id: application.id,
                                      action: 'reject',
                                    })}
                                  >
                                    拒绝
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 公告管理 */}
        <TabsContent value="announcements" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>公告管理</CardTitle>
                <CardDescription>发布和管理系统公告</CardDescription>
              </div>
              <Button onClick={handleCreateAnnouncement} className="hover-glow">
                <Plus className="w-4 h-4 mr-2" />
                发布公告
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>标题</TableHead>
                      <TableHead>优先级</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>发布时间</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {announcements.map((announcement) => (
                      <TableRow key={announcement.id}>
                        <TableCell className="font-medium">{announcement.title}</TableCell>
                        <TableCell>
                          <Badge variant={announcement.priority === 'high' ? 'destructive' : announcement.priority === 'low' ? 'secondary' : 'default'}>
                            {announcement.priority === 'high' ? '重要' : announcement.priority === 'low' ? '低' : '普通'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {announcement.is_active ? (
                            <Badge className="bg-green-500 hover:bg-green-600">已发布</Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">草稿/下架</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(announcement.created_at).toLocaleString('zh-CN')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditAnnouncement(announcement)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteAnnouncement(announcement.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {announcements.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          暂无公告
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 开发者设置 */}
        <TabsContent value="settings">
          <div className="space-y-4">
            {/* 开发者钱包地址管理 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  开发者钱包地址管理
                </CardTitle>
                <CardDescription>管理接收USDT的开发者钱包地址（仅管理员可修改）</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>当前开发者地址</Label>
                  <div className="p-3 rounded-lg bg-accent/30 border border-border">
                    <p className="font-mono text-sm break-all">{developerAddress}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newAddress">新的开发者地址</Label>
                  <Input
                    id="newAddress"
                    placeholder="输入新的BSC钱包地址"
                    value={newDeveloperAddress}
                    onChange={(e) => setNewDeveloperAddress(e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    此地址用于接收用户支付的钱包激活费用（30 USDT）
                  </p>
                </div>

                <Button
                  onClick={handleUpdateDeveloperAddress}
                  disabled={updatingAddress || newDeveloperAddress === developerAddress}
                  className="w-full hover-glow"
                >
                  {updatingAddress && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  更新开发者地址
                </Button>
              </CardContent>
            </Card>

            {/* HTP价格管理 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  HTP价格管理
                </CardTitle>
                <CardDescription>根据市场需求调整HTP代币的显示价格</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>价格模式</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={htpPriceMode === 'auto' ? 'default' : 'outline'}
                      onClick={() => handlePriceModeChange('auto')}
                      className="flex-1"
                    >
                      自动计算
                    </Button>
                    <Button
                      variant={htpPriceMode === 'manual' ? 'default' : 'outline'}
                      onClick={() => handlePriceModeChange('manual')}
                      className="flex-1"
                    >
                      手动设置
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {htpPriceMode === 'auto' 
                      ? '自动模式：开盘价$0.01，每天递增$0.03' 
                      : '手动模式：由管理员设置固定价格'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>当前HTP价格</Label>
                  <div className="p-3 rounded-lg bg-accent/30 border border-border">
                    <p className="text-2xl font-bold text-primary">
                      ${currentHtpPrice.toFixed(4)}
                    </p>
                  </div>
                </div>

                {htpPriceMode === 'manual' && (
                  <div className="space-y-2">
                    <Label htmlFor="newPrice">设置新价格（美元）</Label>
                    <Input
                      id="newPrice"
                      type="number"
                      step="0.0001"
                      min="0"
                      placeholder="输入新的HTP价格"
                      value={newHtpPrice}
                      onChange={(e) => setNewHtpPrice(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      设置后将立即生效，影响所有用户看到的HTP价格
                    </p>
                  </div>
                )}

                {htpPriceMode === 'manual' && (
                  <Button
                    onClick={handleUpdateHtpPrice}
                    disabled={updatingPrice || !newHtpPrice || parseFloat(newHtpPrice) <= 0}
                    className="w-full hover-glow"
                  >
                    {updatingPrice && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    更新HTP价格
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* 审核对话框 */}
      <Dialog open={reviewDialog.open} onOpenChange={(open) => {
        if (!open) {
          setReviewDialog({ open: false, type: null, id: null, action: null });
          setRejectReason('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewDialog.action === 'approve' ? '确认通过' : '确认拒绝'}
            </DialogTitle>
            <DialogDescription>
              {reviewDialog.action === 'approve'
                ? '确认通过此申请吗？'
                : '请填写拒绝原因'}
            </DialogDescription>
          </DialogHeader>
          {reviewDialog.action === 'reject' && (
            <div className="space-y-2">
              <Label htmlFor="reject-reason">拒绝原因</Label>
              <Textarea
                id="reject-reason"
                placeholder="请输入拒绝原因..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
              />
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setReviewDialog({ open: false, type: null, id: null, action: null });
                setRejectReason('');
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleReview}
              disabled={processing}
              variant={reviewDialog.action === 'approve' ? 'default' : 'destructive'}
            >
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 用户编辑对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑用户信息</DialogTitle>
            <DialogDescription>
              修改用户的余额、钱包状态和角色权限
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>用户名</Label>
                <Input value={editingUser.username} disabled />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="htp_balance">HTP余额</Label>
                  <Input
                    id="htp_balance"
                    type="number"
                    step="0.01"
                    value={editingUser.htp_balance}
                    onChange={(e) => setEditingUser({
                      ...editingUser,
                      htp_balance: parseFloat(e.target.value) || 0
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="usdt_balance">USDT余额</Label>
                  <Input
                    id="usdt_balance"
                    type="number"
                    step="0.01"
                    value={editingUser.usdt_balance}
                    onChange={(e) => setEditingUser({
                      ...editingUser,
                      usdt_balance: parseFloat(e.target.value) || 0
                    })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">用户角色</Label>
                <select
                  id="role"
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({
                    ...editingUser,
                    role: e.target.value as typeof editingUser.role
                  })}
                  className="w-full border rounded px-3 py-2 bg-background"
                >
                  <option value="user">普通用户</option>
                  <option value="master_node">主节点</option>
                  <option value="admin">管理员</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="wallet_activated"
                  checked={editingUser.wallet_activated}
                  onChange={(e) => setEditingUser({
                    ...editingUser,
                    wallet_activated: e.target.checked
                  })}
                  className="w-4 h-4"
                />
                <Label htmlFor="wallet_activated" className="cursor-pointer">
                  钱包已激活
                </Label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                >
                  取消
                </Button>
                <Button
                  onClick={handleSaveUserEdit}
                  disabled={processing}
                >
                  {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  保存
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 公告编辑对话框 */}
      <Dialog open={announcementDialog.open} onOpenChange={(open) => setAnnouncementDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{announcementDialog.mode === 'create' ? '发布新公告' : '编辑公告'}</DialogTitle>
            <DialogDescription>
              公告发布后所有用户可见
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>标题</Label>
              <Input
                placeholder="请输入公告标题"
                value={announcementDialog.data.title || ''}
                onChange={(e) => setAnnouncementDialog(prev => ({ ...prev, data: { ...prev.data, title: e.target.value } }))}
              />
            </div>
            <div className="space-y-2">
              <Label>内容</Label>
              <Textarea
                placeholder="请输入公告内容"
                className="min-h-[150px]"
                value={announcementDialog.data.content || ''}
                onChange={(e) => setAnnouncementDialog(prev => ({ ...prev, data: { ...prev.data, content: e.target.value } }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>优先级</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={announcementDialog.data.priority || 'normal'}
                  onChange={(e) => setAnnouncementDialog(prev => ({ ...prev, data: { ...prev.data, priority: e.target.value as any } }))}
                >
                  <option value="low">低</option>
                  <option value="normal">普通</option>
                  <option value="high">重要</option>
                </select>
              </div>
              <div className="space-y-2 flex flex-col justify-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={announcementDialog.data.is_active ?? true}
                    onChange={(e) => setAnnouncementDialog(prev => ({ ...prev, data: { ...prev.data, is_active: e.target.checked } }))}
                  />
                  <span className="text-sm font-medium">立即发布</span>
                </label>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAnnouncementDialog(prev => ({ ...prev, open: false }))}>
              取消
            </Button>
            <Button onClick={submitAnnouncement} disabled={submittingAnnouncement}>
              {submittingAnnouncement && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {announcementDialog.mode === 'create' ? '发布' : '保存'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <div className="text-center text-xs text-muted-foreground py-4">
        Admin Panel v1.2.0 - Deploy: {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}
