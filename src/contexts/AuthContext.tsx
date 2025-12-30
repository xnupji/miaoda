import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/db/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types/types';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    // 忽略找不到记录的错误，因为新用户可能还没有 profile
    if (error.code !== 'PGRST116') {
        console.error('获取用户信息失败:', error);
    }
    return null;
  }
  return data;
}
interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (username: string, password: string, invitationCode?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    const profileData = await getProfile(user.id);
    setProfile(profileData);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getProfile(session.user.id).then(setProfile);
      }
      setLoading(false);
    });
    // In this function, do NOT use any await calls. Use `.then()` instead to avoid deadlocks.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getProfile(session.user.id).then(setProfile);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (username: string, password: string) => {
    try {
      const email = `${username}@miaoda.com`;
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (username: string, password: string, invitationCode?: string) => {
    try {
      const email = `${username}@miaoda.com`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            invitation_code: invitationCode || null,
          },
        },
      });

      if (error) throw error;

      // 如果有邀请码，处理邀请关系
      if (invitationCode && data.user) {
        // 查找邀请人
        const { data: inviter } = await supabase
          .from('profiles')
          .select('id')
          .eq('invitation_code', invitationCode)
          .maybeSingle();

        if (inviter) {
          // 等待新用户profile创建后再创建邀请关系
          setTimeout(async () => {
            await supabase.from('invitations').insert({
              inviter_id: inviter.id,
              invitee_id: data.user!.id,
              reward_amount: 10,
            });

            // 更新邀请人余额和邀请数
            const { data: inviterProfile } = await supabase
              .from('profiles')
              .select('htp_balance, total_invites')
              .eq('id', inviter.id)
              .maybeSingle();

            if (inviterProfile) {
              await supabase
                .from('profiles')
                .update({
                  htp_balance: inviterProfile.htp_balance + 10,
                  total_invites: inviterProfile.total_invites + 1,
                })
                .eq('id', inviter.id);

              // 创建交易记录
              await supabase.from('transactions').insert({
                user_id: inviter.id,
                type: 'invitation_reward',
                amount: 10,
                token_type: 'HTP',
                status: 'completed',
                description: '邀请奖励',
              });
            }

            // 更新被邀请人的invited_by字段
            await supabase
              .from('profiles')
              .update({ invited_by: inviter.id })
              .eq('id', data.user!.id);
          }, 2000);
        }
      }
      
      return { data, error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}