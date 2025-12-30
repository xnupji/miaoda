import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Copy, Users, Gift, Loader2 } from 'lucide-react';
import { getMyInvitations } from '@/db/api';
import type { Invitation } from '@/types/types';

export default function InvitationPage() {
  const { profile } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  const invitationLink = `${window.location.origin}${import.meta.env.BASE_URL}login?code=${profile?.invitation_code}`;

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    setLoading(true);
    const data = await getMyInvitations();
    setInvitations(data);
    setLoading(false);
  };

  const copyInvitationCode = () => {
    navigator.clipboard.writeText(profile?.invitation_code || '');
    toast.success('邀请码已复制到剪贴板');
  };

  const copyInvitationLink = () => {
    navigator.clipboard.writeText(invitationLink);
    toast.success('邀请链接已复制到剪贴板');
  };

  const totalRewards = invitations.reduce((sum, inv) => sum + inv.reward_amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">邀请好友</h1>
        <p className="text-muted-foreground mt-2">邀请好友注册，双方都能获得奖励</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glow-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              邀请人数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile?.total_invites || 0}</div>
          </CardContent>
        </Card>

        <Card className="glow-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Gift className="w-4 h-4" />
              累计奖励
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalRewards.toFixed(2)} HTP</div>
          </CardContent>
        </Card>

        <Card className="glow-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">单次奖励</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">10 HTP</div>
          </CardContent>
        </Card>
      </div>

      {/* 邀请码卡片 */}
      <Card className="glow-border-strong">
        <CardHeader>
          <CardTitle>我的邀请码</CardTitle>
          <CardDescription>分享您的邀请码或链接给好友</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>邀请码</Label>
            <div className="flex gap-2">
              <Input
                value={profile?.invitation_code || ''}
                readOnly
                className="font-mono text-lg"
              />
              <Button onClick={copyInvitationCode} variant="outline" className="shrink-0">
                <Copy className="w-4 h-4 mr-2" />
                复制
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>邀请链接</Label>
            <div className="flex gap-2">
              <Input
                value={invitationLink}
                readOnly
                className="font-mono"
              />
              <Button onClick={copyInvitationLink} variant="outline" className="shrink-0">
                <Copy className="w-4 h-4 mr-2" />
                复制
              </Button>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-accent/50 border border-border">
            <h4 className="font-medium mb-2">邀请规则</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 好友使用您的邀请码注册，您将获得 10 HTP 奖励</li>
              <li>• 奖励将自动发放到您的账户</li>
              <li>• 邀请人数无上限，多邀多得</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 邀请记录 */}
      <Card>
        <CardHeader>
          <CardTitle>邀请记录</CardTitle>
          <CardDescription>查看您邀请的所有用户</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">暂无邀请记录</p>
              <p className="text-sm text-muted-foreground mt-2">分享您的邀请码开始赚取奖励</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>邀请时间</TableHead>
                    <TableHead>用户ID</TableHead>
                    <TableHead className="text-right">奖励 (HTP)</TableHead>
                    <TableHead className="text-right">状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell>
                        {new Date(invitation.created_at).toLocaleString('zh-CN')}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {invitation.invitee_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        +{invitation.reward_amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                          已发放
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
