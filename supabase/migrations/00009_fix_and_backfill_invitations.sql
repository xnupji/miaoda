-- 1. Re-apply the robust handle_new_user trigger logic
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
BEGIN
  -- Check if profile already exists to avoid duplicate key error
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO user_count FROM profiles;

  -- Try to find inviter based on invitation code in metadata
  inviter_code := NEW.raw_user_meta_data->>'invitation_code';
  IF inviter_code IS NOT NULL AND inviter_code != '' THEN
    SELECT id INTO inviter_id_val FROM public.profiles WHERE invitation_code = inviter_code;
    -- Prevent self-referral
    IF inviter_id_val = NEW.id THEN
      inviter_id_val := NULL;
    END IF;
  END IF;
  
  -- Generate unique invitation code and Insert Profile
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
        COALESCE(NEW.raw_user_meta_data->>'username', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email, 'user_' || substring(NEW.id::text from 1 for 8)),
        NEW.email,
        CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END,
        new_invitation_code,
        0,
        0,
        inviter_id_val -- Set invited_by directly
      );
      EXIT; -- Success, exit loop
    EXCEPTION WHEN unique_violation THEN
      retry_count := retry_count + 1;
      IF retry_count >= max_retries THEN
        RAISE EXCEPTION 'Failed to generate unique invitation code or username collision after % retries', max_retries;
      END IF;
      -- Continue loop to try new code
    END;
  END LOOP;

  -- Handle rewards if inviter exists
  IF inviter_id_val IS NOT NULL THEN
    BEGIN
      -- A. Create invitation record
      INSERT INTO public.invitations (inviter_id, invitee_id, reward_amount)
      VALUES (inviter_id_val, NEW.id, 10);
      
      -- B. Update inviter balance and invite count
      UPDATE public.profiles
      SET htp_balance = htp_balance + 10,
          total_invites = total_invites + 1,
          updated_at = now()
      WHERE id = inviter_id_val;
      
      -- C. Create transaction record
      -- Ensure token_type column exists before inserting; otherwise fallback or handle error
      -- Assuming table structure is consistent with migration 00001
      INSERT INTO public.transactions (user_id, type, amount, token_type, status, description)
      VALUES (inviter_id_val, 'invitation_reward', 10, 'HTP', 'completed', '邀请奖励');
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but DO NOT FAIL the registration
      RAISE WARNING 'Failed to process invitation reward for inviter %: %', inviter_id_val, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Backfill missing invitations and rewards
DO $$
DECLARE
  r RECORD;
  invitation_exists boolean;
BEGIN
  -- Check if token_type column exists in transactions table
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'transactions' 
    AND column_name = 'token_type'
  ) THEN
    -- If column doesn't exist, add it
    ALTER TABLE public.transactions ADD COLUMN token_type text DEFAULT 'HTP';
  END IF;

  -- Loop through all profiles that have an inviter
  FOR r IN SELECT * FROM profiles WHERE invited_by IS NOT NULL LOOP
    
    -- Check if invitation record exists
    SELECT EXISTS (
      SELECT 1 FROM invitations
      WHERE inviter_id = r.invited_by AND invitee_id = r.id
    ) INTO invitation_exists;
    
    -- If not exists, insert and reward
    IF NOT invitation_exists THEN
      -- Insert invitation
      INSERT INTO invitations (inviter_id, invitee_id, reward_amount)
      VALUES (r.invited_by, r.id, 10);
      
      -- Update inviter balance
      UPDATE profiles
      SET htp_balance = htp_balance + 10,
          total_invites = total_invites + 1,
          updated_at = now()
      WHERE id = r.invited_by;
      
      -- Create transaction record
      INSERT INTO transactions (user_id, type, amount, token_type, status, description)
      VALUES (r.invited_by, 'invitation_reward', 10, 'HTP', 'completed', '补发邀请奖励');
    END IF;
  END LOOP;
  
  -- 3. Force update total_invites count to be sure it matches
  UPDATE profiles p
  SET total_invites = (
    SELECT count(*) FROM invitations WHERE inviter_id = p.id
  );
  
END $$;
