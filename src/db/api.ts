import type {
  AirdropEvent,
  Announcement,
  InteractionSubmission,
  Invitation,
  MasterNodeApplication,
  MiningRecord,
  PlatformConfig,
  Profile,
  SystemSetting,
  TaskOrder,
  TaskOrderClaim,
  TaskOrderClaimStatus,
  TaskOrderStatus,
  Transaction,
  WithdrawalRequest,
} from '@/types/types';
import { supabase } from './supabase';

// ==================== 平台配置相关 ====================

// 获取平台配置
export async function getPlatformConfig(key: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('platform_config')
    .select('config_value')
    .eq('config_key', key)
    .maybeSingle();

  if (error) {
    console.error('获取平台配置失败:', error);
    return null;
  }

  return data?.config_value || null;
}

// 获取所有平台配置
export async function getAllPlatformConfigs(): Promise<PlatformConfig[]> {
  const { data, error } = await supabase
    .from('platform_config')
    .select('*')
    .order('config_key');

  if (error) {
    console.error('获取平台配置失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

// 审核主节点申请（管理员）
export async function reviewMasterNodeApplication(
  applicationId: string,
  status: 'approved' | 'rejected',
  rejectReason?: string
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const updates: any = {
    status,
    reviewed_at: new Date().toISOString(),
    reviewed_by: user.id,
  };
  if (status === 'rejected') {
    updates.reject_reason = rejectReason || null;
  }

  const { error } = await supabase
    .from('master_node_applications')
    .update(updates)
    .eq('id', applicationId);

  if (error) {
    console.error('审核主节点申请失败:', error);
    return false;
  }

  if (status === 'approved') {
    const { data: appData, error: appErr } = await supabase
      .from('master_node_applications')
      .select('user_id')
      .eq('id', applicationId)
      .maybeSingle();
    if (!appErr && appData?.user_id) {
      const { error: roleErr } = await supabase
        .from('profiles')
        .update({ role: 'master_node', is_master_node: true })
        .eq('id', appData.user_id);
      if (roleErr) {
        console.error('更新用户为主节点失败:', roleErr);
      }
    }
  }

  return true;
}
// 激活钱包（用户支付30 USDT后调用）
export async function activateWallet(paidAmount: number): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('profiles')
    .update({
      wallet_activated: true,
      activation_paid_amount: paidAmount,
      activation_paid_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    console.error('激活钱包失败:', error);
    return false;
  }

  return true;
}

// ==================== 用户相关 ====================

// 获取当前用户Profile
export async function getCurrentProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('获取用户Profile失败:', error);
    return null;
  }

  return data;
}

// 更新用户Profile
export async function updateProfile(updates: Partial<Profile>): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (error) {
    console.error('更新Profile失败:', error);
    return false;
  }

  return true;
}

// 绑定钱包地址到账户
export async function bindWalletAddress(address: string): Promise<boolean> {
  try {
    if (!address || typeof address !== 'string') return false;
    return await updateProfile({ wallet_address: address });
  } catch (e) {
    console.error('绑定钱包失败:', e);
    return false;
  }
}
// 通过邀请码获取用户
export async function getProfileByInvitationCode(code: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('invitation_code', code)
    .maybeSingle();

  if (error) {
    console.error('查询邀请码失败:', error);
    return null;
  }

  return data;
}

// ==================== 挖矿相关 ====================

// 检查今天是否已挖矿
export async function checkTodayMining(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('mining_records')
    .select('id')
    .eq('user_id', user.id)
    .eq('mining_date', today)
    .maybeSingle();

  if (error) {
    console.error('检查挖矿记录失败:', error);
    return false;
  }

  return !!data;
}

export interface MiningResult {
  success: boolean;
  message?: string;
  data?: any;
}

// 执行挖矿
export async function performMining(amount: number): Promise<MiningResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: '未登录' };

  // Parameter validation to prevent RPC errors
  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
    return { success: false, message: '无效的挖矿数量' };
  }

  const today = new Date().toISOString().split('T')[0];

  // 1. 创建挖矿记录
  const { error: miningError } = await supabase
    .from('mining_records')
    .insert({
      user_id: user.id,
      amount,
      mining_date: today,
    });

  if (miningError) {
    console.error('创建挖矿记录失败:', miningError);
    return { success: false, message: '创建挖矿记录失败: ' + miningError.message };
  }

  // 2. 更新余额
  // 尝试使用 RPC
  const { error: balanceError } = await supabase.rpc('increment_balance', {
    user_id: user.id,
    amount,
  });

  if (balanceError) {
    console.warn('RPC调用失败，尝试直接更新:', balanceError);
    // 如果RPC不存在或失败，使用直接更新（作为后备方案）
    const profile = await getCurrentProfile();
    if (!profile) {
      return { success: false, message: '获取用户信息失败，请稍后重试' };
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ htp_balance: profile.htp_balance + amount })
      .eq('id', user.id);

    if (updateError) {
      console.error('更新余额失败:', updateError);
      return { success: false, message: '更新余额失败: ' + updateError.message };
    }
  }

  // 3. 创建交易记录 (非阻塞，失败不影响挖矿结果)
  supabase.from('transactions').insert({
    user_id: user.id,
    type: 'mining',
    amount,
    token_type: 'HTP',
    status: 'completed',
    description: '每日挖矿奖励',
  }).then(({ error }) => {
    if (error) console.error('创建交易记录失败:', error);
  });

  return { success: true };
}

// 获取挖矿记录
export async function getMiningRecords(limit = 50): Promise<MiningRecord[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('mining_records')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('获取挖矿记录失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

// ==================== 交易相关 ====================

// 获取交易记录
export async function getTransactions(limit = 50): Promise<Transaction[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('获取交易记录失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

// ==================== 邀请相关 ====================

// 创建邀请记录
export async function createInvitation(inviteeId: string, rewardAmount = 10): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('invitations')
    .insert({
      inviter_id: user.id,
      invitee_id: inviteeId,
      reward_amount: rewardAmount,
    });

  if (error) {
    console.error('创建邀请记录失败:', error);
    return false;
  }

  // 更新邀请人余额和邀请数
  const profile = await getCurrentProfile();
  if (!profile) return false;

  await supabase
    .from('profiles')
    .update({
      htp_balance: profile.htp_balance + rewardAmount,
      total_invites: profile.total_invites + 1,
    })
    .eq('id', user.id);

  // 创建交易记录
  await supabase.from('transactions').insert({
    user_id: user.id,
    type: 'invitation_reward',
    amount: rewardAmount,
    token_type: 'HTP',
    status: 'completed',
    description: '邀请奖励',
  });

  return true;
}

// 获取我的邀请列表
export async function getMyInvitations(): Promise<Invitation[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('inviter_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取邀请列表失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

// ==================== 主节点相关 ====================

// 申请主节点
export async function applyMasterNode(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('master_node_applications')
    .insert({
      user_id: user.id,
      status: 'pending',
      activated_wallets: 0,
      target_wallets: 100000,
      total_rewards: 0,
    });

  if (error) {
    console.error('申请主节点失败:', error);
    return false;
  }

  return true;
}

// 获取主节点申请状态
export async function getMasterNodeApplication(): Promise<MasterNodeApplication | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('master_node_applications')
    .select('*')
    .eq('user_id', user.id)
    .order('applied_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('获取主节点申请失败:', error);
    return null;
  }

  return data;
}

// 获取所有主节点申请（管理员）
export async function getAllMasterNodeApplications(): Promise<MasterNodeApplication[]> {
  const { data, error } = await supabase
    .from('master_node_applications')
    .select('*')
    .order('applied_at', { ascending: false });

  if (error) {
    console.error('获取所有主节点申请失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

// ==================== 提币相关 ====================

// 创建提币请求
export async function createWithdrawalRequest(
  amount: number,
  tokenType: 'HTP' | 'USDT',
  toAddress: string,
  paymentAddress?: string
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('withdrawal_requests')
    .insert({
      user_id: user.id,
      amount,
      token_type: tokenType,
      to_address: toAddress,
      status: 'pending',
      payment_address: paymentAddress || null,
    });

  if (error) {
    console.error('创建提币请求失败:', error);
    return false;
  }

  return true;
}

// 获取我的提币请求
export async function getMyWithdrawalRequests(): Promise<WithdrawalRequest[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('withdrawal_requests')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取提币请求失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

// 获取所有提币请求（管理员）
export async function getAllWithdrawalRequests(): Promise<WithdrawalRequest[]> {
  const { data, error } = await supabase
    .from('withdrawal_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取所有提币请求失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

// 审核提币请求（管理员）
export async function reviewWithdrawalRequest(
  requestId: string,
  status: 'approved' | 'rejected',
  rejectReason?: string
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('withdrawal_requests')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      reject_reason: rejectReason || null,
    })
    .eq('id', requestId);

  if (error) {
    console.error('审核提币请求失败:', error);
    return false;
  }

  return true;
}

// ==================== 管理员相关 ====================

// 获取所有用户（管理员）
export async function getAllProfiles(): Promise<Profile[]> {
  const pageSize = 1000;
  let from = 0;
  let all: Profile[] = [];
  // 分页拉取所有用户，避免默认上限导致数据不全
  // 循环直到返回的数据条数小于分页大小
  // range 使用的是闭区间 [from, to]
  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('获取所有用户失败:', error);
      break;
    }

    if (!data || data.length === 0) {
      break;
    }

    all = all.concat(data as Profile[]);

    if (data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return all;
}

// 更新用户角色（管理员）
export async function updateUserRole(userId: string, role: 'user' | 'admin' | 'master_node'): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId);

  if (error) {
    console.error('更新用户角色失败:', error);
    return false;
  }

  return true;
}

// ==================== 系统设置相关 ====================

// 获取系统设置
export async function getSystemSetting(key: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', key)
    .maybeSingle();

  if (error) {
    console.error('获取系统设置失败:', error);
    return null;
  }

  return data?.setting_value || null;
}

// 获取所有系统设置
export async function getAllSystemSettings(): Promise<SystemSetting[]> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .order('setting_key');

  if (error) {
    console.error('获取系统设置失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

// 更新系统设置
export async function updateSystemSetting(key: string, value: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('system_settings')
    .update({ 
      setting_value: value,
      updated_by: user.id 
    })
    .eq('setting_key', key);

  if (error) {
    console.error('更新系统设置失败:', error);
    return false;
  }

  return true;
}

// 获取HTP当前价格
export async function getHTPPrice(): Promise<number> {
  // 先获取价格模式
  const mode = await getSystemSetting('htp_price_mode');
  
  if (mode === 'manual') {
    // 手动模式：从数据库读取
    const priceStr = await getSystemSetting('htp_price');
    return priceStr ? parseFloat(priceStr) : 0.01;
  } else {
    // 自动模式：按照原来的计算逻辑
    const startDate = new Date('2025-01-01');
    const today = new Date();
    const daysPassed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return 0.01 + (daysPassed * 0.03);
  }
}

// ==================== 公告系统 ====================

// 获取公告列表 (Admin查看所有, 用户查看active)
export async function getAnnouncements(onlyActive = true): Promise<Announcement[]> {
  let query = supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });

  if (onlyActive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('获取公告列表失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

// 创建公告
export async function createAnnouncement(announcement: Omit<Announcement, 'id' | 'created_at' | 'created_by'>): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('announcements')
    .insert({
      ...announcement,
      created_by: user.id
    });

  if (error) {
    console.error('创建公告失败:', error);
    return false;
  }

  return true;
}

// 更新公告
export async function updateAnnouncement(id: string, updates: Partial<Announcement>): Promise<boolean> {
  const { error } = await supabase
    .from('announcements')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('更新公告失败:', error);
    return false;
  }

  return true;
}

// 删除公告
export async function deleteAnnouncement(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('删除公告失败:', error);
    return false;
  }

  return true;
}

// ==================== 交互中心相关 ====================

// 创建交互提交
export async function createInteractionSubmission(
  type: 'community' | 'institution',
  addresses: string[]
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('interaction_submissions')
    .insert({
      user_id: user.id,
      type,
      addresses: addresses,
      status: 'pending'
    });

  if (error) {
    console.error('创建交互提交失败:', error);
    return false;
  }

  return true;
}

// 触发空投（管理员）
export async function triggerAirdrop(submissionId: string): Promise<{ ok: boolean; summary?: any; error?: string }> {
  try {
    const res = await fetch('/.netlify/functions/airdrop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: err?.error || `HTTP ${res.status}` };
    }
    const data = await res.json();
    return { ok: true, summary: data };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'network error' };
  }
}

// 查询空投事件
export async function getAirdropEvents(submissionId: string): Promise<AirdropEvent[]> {
  const { data, error } = await supabase
    .from('airdrop_events')
    .select('*')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('获取空投事件失败:', error);
    return [];
  }
  return Array.isArray(data) ? data : [];
}

// 获取用户的交互提交记录
export async function getUserInteractionSubmissions(): Promise<InteractionSubmission[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('interaction_submissions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取用户交互提交失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

// 获取所有交互提交记录 (管理员)
export async function getAllInteractionSubmissions(): Promise<InteractionSubmission[]> {
  const { data, error } = await supabase
    .from('interaction_submissions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取所有交互提交失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

// 更新交互提交状态 (管理员)
export async function updateInteractionSubmissionStatus(
  id: string,
  status: 'approved' | 'rejected',
  feedback?: string
): Promise<boolean> {
  const updates: any = { status };
  if (feedback !== undefined) {
    updates.feedback = feedback;
  }

  const { error } = await supabase
    .from('interaction_submissions')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('更新交互提交状态失败:', error);
    return false;
  }

  return true;
}

// ==================== 抢单任务相关 ====================

export async function createTaskOrder(
  title: string,
  description: string,
  reward: number,
  maxClaims: number | null,
  imageUrl: string | null,
  deadlineAt: string | null,
  options?: {
    isGameTask?: boolean;
    gameDifficulty?: 'low' | 'medium' | 'high';
    activationMinUsdt?: number | null;
    activationMaxUsdt?: number | null;
    rewardMinUsdt?: number | null;
    rewardMaxUsdt?: number | null;
  }
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const isGameTask = options?.isGameTask ?? false;
  const gameDifficulty = options?.gameDifficulty ?? null;
  const activationMinUsdt = options?.activationMinUsdt ?? null;
  const activationMaxUsdt = options?.activationMaxUsdt ?? null;
  const rewardMinUsdt = options?.rewardMinUsdt ?? null;
  const rewardMaxUsdt = options?.rewardMaxUsdt ?? null;

  const { error } = await supabase
    .from('task_orders')
    .insert({
      title,
      description,
      reward,
      max_claims: maxClaims,
      image_url: imageUrl,
      deadline_at: deadlineAt,
      is_game_task: isGameTask,
      game_difficulty: gameDifficulty,
      activation_min_usdt: activationMinUsdt,
      activation_max_usdt: activationMaxUsdt,
      reward_min_usdt: rewardMinUsdt,
      reward_max_usdt: rewardMaxUsdt,
      created_by: user.id,
    });

  if (error) {
    console.error('创建抢单任务失败:', error);
    return false;
  }

  return true;
}

export async function getAllTaskOrders(): Promise<TaskOrder[]> {
  const { data, error } = await supabase
    .from('task_orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取抢单任务列表失败:', error);
    return [];
  }

  return Array.isArray(data) ? data as TaskOrder[] : [];
}

export async function updateTaskOrderStatus(
  id: string,
  status: TaskOrderStatus
): Promise<boolean> {
  const { error } = await supabase
    .from('task_orders')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('更新抢单任务状态失败:', error);
    return false;
  }

  return true;
}

export async function getOpenTaskOrders(): Promise<TaskOrder[]> {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from('task_orders')
    .select('*')
    .eq('status', 'open')
    .or('deadline_at.is.null,deadline_at.gt.' + nowIso)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取开放抢单任务失败:', error);
    return [];
  }

  return Array.isArray(data) ? data as TaskOrder[] : [];
}

export async function claimTaskOrder(taskId: string): Promise<{ ok: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '未登录' };

  const { data: task, error: taskError } = await supabase
    .from('task_orders')
    .select('*')
    .eq('id', taskId)
    .single();

  if (taskError || !task) {
    console.error('获取任务详情失败:', taskError);
    return { ok: false, error: '任务不存在或已被删除' };
  }

  if (task.status !== 'open') {
    return { ok: false, error: '任务已关闭' };
  }

  if (task.deadline_at && new Date(task.deadline_at) <= new Date()) {
    return { ok: false, error: '任务已过截止时间' };
  }

  if (typeof task.max_claims === 'number' && task.max_claims > 0) {
    const { data: claimsCountData, error: claimsCountError } = await supabase
      .from('task_order_claims')
      .select('id', { count: 'exact', head: true })
      .eq('task_id', taskId);

    if (claimsCountError) {
      console.error('统计任务抢单数量失败:', claimsCountError);
      return { ok: false, error: '抢单失败，请稍后重试' };
    }

    const claimsCount = (claimsCountData as any)?.length ?? 0;
    if (claimsCount >= task.max_claims) {
      return { ok: false, error: '任务抢单人数已满' };
    }
  }

  const { error } = await supabase
    .from('task_order_claims')
    .insert({
      task_id: taskId,
      user_id: user.id,
      status: 'claimed',
    });

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: '您已经抢过该任务' };
    }
    console.error('抢单失败:', error);
    return { ok: false, error: '抢单失败，请稍后重试' };
  }

  return { ok: true };
}

export async function submitTaskOrderProof(
  claimId: string,
  payload: {
    proofUrl: string | null;
    proofNotes: string | null;
    receiveUsername: string;
    receiveAddress: string;
  }
): Promise<boolean> {
  const { error } = await supabase
    .from('task_order_claims')
    .update({
      proof_url: payload.proofUrl,
      proof_notes: payload.proofNotes,
      receive_username: payload.receiveUsername,
      receive_address: payload.receiveAddress,
      status: 'submitted',
      updated_at: new Date().toISOString(),
    })
    .eq('id', claimId);

  if (error) {
    console.error('提交任务交付凭证失败:', error);
    return false;
  }

  return true;
}

export async function getMyTaskOrderClaims(): Promise<TaskOrderClaim[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('task_order_claims')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取我的抢单记录失败:', error);
    return [];
  }

  return Array.isArray(data) ? data as TaskOrderClaim[] : [];
}

export async function getTaskOrderClaims(taskId: string): Promise<TaskOrderClaim[]> {
  const { data, error } = await supabase
    .from('task_order_claims')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取任务抢单记录失败:', error);
    return [];
  }

  return Array.isArray(data) ? data as TaskOrderClaim[] : [];
}

export async function reviewTaskOrderClaim(
  claimId: string,
  status: TaskOrderClaimStatus
): Promise<boolean> {
  const { error } = await supabase
    .from('task_order_claims')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', claimId);

  if (error) {
    console.error('更新任务抢单审核状态失败:', error);
    return false;
  }

  return true;
}
