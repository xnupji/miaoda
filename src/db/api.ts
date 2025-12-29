import { supabase } from './supabase';
import type {
  Profile,
  MiningRecord,
  Transaction,
  Invitation,
  MasterNodeApplication,
  WithdrawalRequest,
  PlatformConfig,
  SystemSetting,
} from '@/types/types';

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

// 执行挖矿
export async function performMining(amount: number): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const today = new Date().toISOString().split('T')[0];

  // 创建挖矿记录
  const { error: miningError } = await supabase
    .from('mining_records')
    .insert({
      user_id: user.id,
      amount,
      mining_date: today,
    });

  if (miningError) {
    console.error('创建挖矿记录失败:', miningError);
    return false;
  }

  // 更新余额
  const { error: balanceError } = await supabase.rpc('increment_balance', {
    user_id: user.id,
    amount,
  });

  if (balanceError) {
    // 如果RPC不存在，使用直接更新
    const profile = await getCurrentProfile();
    if (!profile) return false;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ htp_balance: profile.htp_balance + amount })
      .eq('id', user.id);

    if (updateError) {
      console.error('更新余额失败:', updateError);
      return false;
    }
  }

  // 创建交易记录
  await supabase.from('transactions').insert({
    user_id: user.id,
    type: 'mining',
    amount,
    token_type: 'HTP',
    status: 'completed',
    description: '每日挖矿奖励',
  });

  return true;
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
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取所有用户失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
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
