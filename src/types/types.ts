// 用户角色类型
export type UserRole = 'user' | 'admin' | 'master_node';

// 代币类型
export type TokenType = 'HTP' | 'USDT';

// 交易类型
export type TransactionType = 'mining' | 'invitation_reward' | 'master_node_reward' | 'withdrawal' | 'transfer_in' | 'transfer_out' | 'task_order_reward';

// 交易状态
export type TransactionStatus = 'pending' | 'completed' | 'failed';

// 审核状态
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

// 抢单任务状态
export type TaskOrderStatus = 'open' | 'closed';

// 抢单任务接单状态
export type TaskOrderClaimStatus = 'claimed' | 'submitted' | 'approved' | 'rejected';

// 用户Profile
export interface Profile {
  id: string;
  username: string;
  email: string | null;
  role: UserRole;
  htp_balance: number;
  usdt_balance: number;
  wallet_address: string | null;
  wallet_activated: boolean;
  activation_paid_amount: number | null;
  activation_paid_at: string | null;
  invited_by: string | null;
  invitation_code: string;
  total_invites: number;
  team_size: number;
  is_master_node: boolean;
  master_node_progress: number;
  created_at: string;
  updated_at: string;
}

// 平台配置
export interface PlatformConfig {
  id: string;
  config_key: string;
  config_value: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// 挖矿记录
export interface MiningRecord {
  id: string;
  user_id: string;
  amount: number;
  mining_date: string;
  created_at: string;
}

// 交易记录
export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  token_type: TokenType;
  status: TransactionStatus;
  description: string | null;
  created_at: string;
}

// 邀请记录
export interface Invitation {
  id: string;
  inviter_id: string;
  invitee_id: string;
  reward_amount: number;
  created_at: string;
}

// 主节点申请
export interface MasterNodeApplication {
  id: string;
  user_id: string;
  status: ReviewStatus;
  activated_wallets: number;
  target_wallets: number;
  total_rewards: number;
  applied_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

// 交互中心提交记录
export interface InteractionSubmission {
  id: string;
  user_id: string;
  type: 'community' | 'institution';
  addresses: string[];
  status: ReviewStatus;
  feedback: string | null;
  created_at: string;
  updated_at: string;
}

export interface AirdropEvent {
  id: string;
  submission_id: string;
  address: string;
  amount: number;
  tx_hash: string | null;
  status: 'pending' | 'sent' | 'failed';
  error: string | null;
  created_at: string;
}
// 提币请求
export interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  token_type: TokenType;
  to_address: string;
  status: ReviewStatus;
  payment_address: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reject_reason: string | null;
}

// 公共Profile视图
export interface PublicProfile {
  id: string;
  username: string;
  role: UserRole;
  htp_balance: number;
  total_invites: number;
  is_master_node: boolean;
  created_at: string;
}

// 系统设置
export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
}

// 公告系统
export interface Announcement {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  priority: 'low' | 'normal' | 'high';
  created_at: string;
  created_by?: string;
}

// 抢单任务
export interface TaskOrder {
  id: string;
  title: string;
  description: string | null;
  reward: number;
  max_claims: number | null;
  image_url?: string | null;
  deadline_at?: string | null;
  total_claims?: number | null;
  approved_claims?: number | null;
  status: TaskOrderStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// 抢单任务接单与交付
export interface TaskOrderClaim {
  id: string;
  task_id: string;
  user_id: string;
  status: TaskOrderClaimStatus;
  proof_url: string | null;
  proof_notes: string | null;
  receive_username: string | null;
  receive_address: string | null;
  created_at: string;
  updated_at: string;
}
