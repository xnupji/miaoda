-- 00011_add_team_hierarchy.sql
-- 为用户添加团队人数统计，并在邀请注册时自动更新整条推荐链

-- 1. 为 profiles 表添加团队人数字段（如果尚未存在）
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS team_size int DEFAULT 0;

-- 2. 更新 handle_new_user 函数：在原有邀请奖励基础上，增加团队人数递归更新
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count int;
  new_invitation_code text;
  inviter_code text;
  inviter_id_val uuid;
  retry_count int := 0;
  max_retries int := 3;
  ancestor_id uuid;
BEGIN
  -- 避免重复创建 profile
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO user_count FROM profiles;

  -- 从注册时的元数据中读取邀请码，定位邀请人
  inviter_code := NEW.raw_user_meta_data->>'invitation_code';
  IF inviter_code IS NOT NULL AND inviter_code != '' THEN
    SELECT id INTO inviter_id_val FROM public.profiles WHERE invitation_code = inviter_code;
    -- 防止自邀
    IF inviter_id_val = NEW.id THEN
      inviter_id_val := NULL;
    END IF;
  END IF;
  
  -- 生成唯一邀请码并创建 profile
  LOOP
    BEGIN
      new_invitation_code := substring(md5(random()::text) from 1 for 8);
      
      INSERT INTO public.profiles (
        id, 
        username, 
        email, 
        role, 
        invitation_code, 
        htp_balance, 
        usdt_balance,
        invited_by
      )
      VALUES (
        NEW.id,
        COALESCE(
          NEW.raw_user_meta_data->>'username',
          NEW.raw_user_meta_data->>'full_name',
          NEW.raw_user_meta_data->>'name',
          NEW.email,
          'user_' || substring(NEW.id::text from 1 for 8)
        ),
        NEW.email,
        CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END,
        new_invitation_code,
        0,
        0,
        inviter_id_val
      );
      EXIT; -- 成功插入则跳出循环
    EXCEPTION WHEN unique_violation THEN
      retry_count := retry_count + 1;
      IF retry_count >= max_retries THEN
        RAISE EXCEPTION 'Failed to generate unique invitation code or username collision after % retries', max_retries;
      END IF;
      -- 再试一次
    END;
  END LOOP;

  -- 处理邀请奖励
  IF inviter_id_val IS NOT NULL THEN
    BEGIN
      -- A. 记录邀请关系
      INSERT INTO public.invitations (inviter_id, invitee_id, reward_amount)
      VALUES (inviter_id_val, NEW.id, 10);
      
      -- B. 更新直推人的余额和直推人数
      UPDATE public.profiles
      SET htp_balance = htp_balance + 10,
          total_invites = total_invites + 1,
          updated_at = now()
      WHERE id = inviter_id_val;
      
      -- C. 记录奖励交易
      INSERT INTO public.transactions (user_id, type, amount, token_type, status, description)
      VALUES (inviter_id_val, 'invitation_reward', 10, 'HTP', 'completed', '邀请奖励');
      
    EXCEPTION WHEN OTHERS THEN
      -- 不阻断用户注册，只记录告警
      RAISE WARNING 'Failed to process invitation reward for inviter %: %', inviter_id_val, SQLERRM;
    END;
  END IF;

  -- 3. 更新整个团队链路的团队人数（A 推 B，B 推 C，C 推 D，注册 D 时 A/B/C 的 team_size 都 +1）
  IF inviter_id_val IS NOT NULL THEN
    ancestor_id := inviter_id_val;
    WHILE ancestor_id IS NOT NULL LOOP
      UPDATE public.profiles
      SET team_size = COALESCE(team_size, 0) + 1,
          updated_at = now()
      WHERE id = ancestor_id
      RETURNING invited_by INTO ancestor_id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. 为历史数据回填团队人数
DO $$
BEGIN
  -- 先重置为 0，避免重复叠加
  UPDATE public.profiles SET team_size = 0;

  -- 使用递归 CTE 计算每个用户整条下级团队人数
  UPDATE public.profiles p
  SET team_size = tc.team_size
  FROM (
    WITH RECURSIVE downline AS (
      SELECT id, invited_by, id AS root_id
      FROM public.profiles
      UNION ALL
      SELECT c.id, c.invited_by, d.root_id
      FROM public.profiles c
      JOIN downline d ON c.invited_by = d.id
    ),
    team_counts AS (
      SELECT root_id, COUNT(*) - 1 AS team_size
      FROM downline
      GROUP BY root_id
    )
    SELECT * FROM team_counts
  ) AS tc
  WHERE p.id = tc.root_id;
END $$;

