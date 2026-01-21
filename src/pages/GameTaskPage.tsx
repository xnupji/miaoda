import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { getMyTaskOrderClaims, getOpenTaskOrders, getPlatformConfig } from '@/db/api';
import type { TaskOrder, TaskOrderClaim } from '@/types/types';

export default function GameTaskPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { claimId } = useParams<{ claimId: string }>();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<TaskOrder | null>(null);
  const [claim, setClaim] = useState<TaskOrderClaim | null>(null);
  const [gameStep, setGameStep] = useState(1);
  const [developerAddress, setDeveloperAddress] = useState('');

  useEffect(() => {
    if (!claimId) {
      navigate('/interaction?tab=tasks', { replace: true });
      return;
    }
    if (!profile) {
      navigate('/login', { replace: true });
      return;
    }
    loadData(claimId);
  }, [claimId, profile]);

  useEffect(() => {
    loadDeveloperAddress();
  }, []);

  const stats = useMemo(() => {
    if (!task) return null;
    const isGameTask =
      task.is_game_task === true ||
      (!!task.description && task.description.startsWith('【游戏化任务｜'));
    let gameDifficulty: '低' | '中' | '高' | null = null;
    if (isGameTask) {
      if (task.game_difficulty === 'high') gameDifficulty = '高';
      else if (task.game_difficulty === 'medium') gameDifficulty = '中';
      else if (task.game_difficulty === 'low') gameDifficulty = '低';
      else if (task.description) {
        if (task.description.includes('难度：高')) gameDifficulty = '高';
        else if (task.description.includes('难度：中')) gameDifficulty = '中';
        else if (task.description.includes('难度：低')) gameDifficulty = '低';
      }
    }
    const activationMin = task.activation_min_usdt ?? null;
    const activationMax = task.activation_max_usdt ?? null;
    const rewardMin = task.reward_min_usdt ?? null;
    const rewardMax = task.reward_max_usdt ?? null;
    const deadlineLabel = task.deadline_at
      ? new Date(task.deadline_at).toLocaleString('zh-CN')
      : '不限';
    return {
      isGameTask,
      gameDifficulty,
      activationMin,
      activationMax,
      rewardMin,
      rewardMax,
      deadlineLabel,
    };
  }, [task]);

  async function loadData(id: string) {
    setLoading(true);
    try {
      const claims = await getMyTaskOrderClaims();
      const foundClaim = claims.find((c) => c.id === id) || null;
      if (!foundClaim) {
        toast.error('未找到对应的任务记录');
        navigate('/interaction?tab=tasks', { replace: true });
        return;
      }
      setClaim(foundClaim);
      const tasks = await getOpenTaskOrders();
      const foundTask = tasks.find((t) => t.id === foundClaim.task_id) || null;
      if (!foundTask) {
        toast.error('任务已关闭或不存在，请在“我的任务”中查看交付状态');
        navigate('/interaction?tab=tasks', { replace: true });
        return;
      }
      setTask(foundTask);
    } finally {
      setLoading(false);
    }
  }

  async function loadDeveloperAddress() {
    const address = await getPlatformConfig('developer_usdt_address');
    if (address) {
      setDeveloperAddress(address);
    }
  }

  const handleBackToTasks = () => {
    navigate('/interaction?tab=tasks');
  };

  const handleFinishStep = () => {
    if (gameStep < 3) {
      setGameStep(gameStep + 1);
      return;
    }
    if (claim) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', 'tasks');
      params.set('claimId', claim.id);
      navigate(`/interaction?${params.toString()}`);
    } else {
      navigate('/interaction?tab=tasks');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin" />
        <div className="text-sm text-muted-foreground">正在加载游戏任务信息...</div>
      </div>
    );
  }

  if (!task || !claim || !stats || !stats.isGameTask) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="text-sm text-muted-foreground">未找到有效的游戏任务信息</div>
        <Button onClick={handleBackToTasks}>返回我的任务</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">游戏任务闯关</div>
            <h1 className="text-2xl font-bold tracking-tight">{task.title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>抢单时间：{new Date(claim.created_at).toLocaleString()}</span>
              <span>｜ 截止日期：{stats.deadlineLabel}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-purple-500/10 text-purple-500">
                游戏任务
              </Badge>
              {stats.gameDifficulty && (
                <Badge variant="outline" className="border-purple-500/40 text-purple-500 text-xs">
                  难度：{stats.gameDifficulty}
                </Badge>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleBackToTasks}>
              返回我的任务
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className={gameStep === 1 ? 'border-purple-500 bg-purple-50/70' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">第一关</CardTitle>
              <CardDescription>激活任务与准备</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              <p>
                仔细阅读任务说明，联系管理员获取收款方式，并完成约{' '}
                {stats.activationMin && stats.activationMax
                  ? `${stats.activationMin}U-${stats.activationMax}U`
                  : '30U-100U'}
                {' '}的激活打款，保存好转账截图或凭证。
              </p>
              {developerAddress && (
                <div className="mt-2 p-2 rounded-md bg-accent/30 border border-border">
                  <div className="text-xs text-muted-foreground">管理员USDT收款地址（BSC网络）</div>
                  <div className="mt-1 text-xs sm:text-sm font-mono break-all">{developerAddress}</div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => {
                      navigator.clipboard.writeText(developerAddress);
                      toast.success('收款地址已复制，请前往钱包进行转账');
                    }}
                  >
                    复制地址
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={gameStep === 2 ? 'border-purple-500 bg-purple-50/70' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">第二关</CardTitle>
              <CardDescription>完成游戏或交互操作</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              <p>
                按照任务具体要求，在指定平台完成对应的游戏、交互或链上操作，
                并记录好相关截图或链接，确保能够证明任务完成情况。
              </p>
            </CardContent>
          </Card>

          <Card className={gameStep === 3 ? 'border-purple-500 bg-purple-50/70' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">第三关</CardTitle>
              <CardDescription>提交凭证领取奖励</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              <p>
                返回“交互中心 → 我的任务”，为本任务上传打款截图和任务完成证明，
                填写收款钱包地址，提交后等待管理员审核发放奖励和返还本金。
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">任务说明</CardTitle>
            <CardDescription>请根据说明完成操作后再提交交付信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-muted/40 p-3 text-sm leading-relaxed whitespace-pre-wrap break-words">
              {task.description || '暂无任务说明，请联系管理员确认任务要求。'}
            </div>
            <div className="grid gap-3 sm:grid-cols-3 text-xs sm:text-sm text-muted-foreground">
              <div className="space-y-1 rounded-md bg-background/80 p-3">
                <div className="text-xs">奖励金额</div>
                <div className="text-lg font-semibold text-foreground">
                  ${task.reward.toFixed(2)}
                </div>
              </div>
              <div className="space-y-1 rounded-md bg-background/80 p-3">
                <div className="text-xs">激活资金参考</div>
                <div className="text-sm">
                  {stats.activationMin && stats.activationMax
                    ? `${stats.activationMin}U-${stats.activationMax}U`
                    : stats.activationMin && !stats.activationMax
                      ? `不少于 ${stats.activationMin}U`
                      : !stats.activationMin && stats.activationMax
                        ? `不超过 ${stats.activationMax}U`
                        : '约 30U-100U'}
                </div>
              </div>
              <div className="space-y-1 rounded-md bg-background/80 p-3">
                <div className="text-xs">奖励区间</div>
                <div className="text-sm">
                  {stats.rewardMin && stats.rewardMax
                    ? `${stats.rewardMin}U-${stats.rewardMax}U`
                    : stats.rewardMin && !stats.rewardMax
                      ? `不少于 ${stats.rewardMin}U`
                      : !stats.rewardMin && stats.rewardMax
                        ? `不超过 ${stats.rewardMax}U`
                        : '1U-100U'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="text-xs text-muted-foreground">
            提示：通关进度仅在本设备本次访问中记录，最终奖励以管理员审核结果为准。
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleBackToTasks}
            >
              稍后再玩
            </Button>
            <Button onClick={handleFinishStep}>
              {gameStep === 1 ? '完成第一关' : gameStep === 2 ? '完成第二关' : '完成第三关并前往提交交付信息'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
