// 用户角色类型
export type UserRole = 'user' | 'admin' | 'master_node';

// 代币类型
export type TokenType = 'HTP' | 'USDT';

// 交易类型
export type TransactionType = 'mining' | 'invitation_reward' | 'master_node_reward' | 'withdrawal' | 'transfer_in' | 'transfer_out';

// 交易状态
export type TransactionStatus = 'pending' | 'completed' | 'failed';

// 审核状态
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

// 用户Profile
export interface Profile {
  id: string;
  username: string;
  email: string | null;
  role: UserRole;
  htp_balance: number;
  usdt_balance: number;
  wallet_address: string | null;
  invited_by: string | null;
  invitation_code: string;
  total_invites: number;
  is_master_node: boolean;
  master_node_progress: number;
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

// 提币请求
export interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  token_type: TokenType;
  to_address: string;
  status: ReviewStatus;
  usdt_paid: number | null;
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
