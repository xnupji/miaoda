-- Fix 1: Add increment_balance RPC function for safe balance updates
CREATE OR REPLACE FUNCTION increment_balance(user_id uuid, amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET htp_balance = htp_balance + amount,
      updated_at = now()
  WHERE id = user_id;
END;
$$;

-- Fix 2: Improve handle_new_user function and add INSERT trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count int;
  new_invitation_code text;
  retry_count int := 0;
  max_retries int := 3;
BEGIN
  -- Check if profile already exists to avoid duplicate key error
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO user_count FROM profiles;
  
  -- Generate unique invitation code with retry logic
  LOOP
    BEGIN
      new_invitation_code := substring(md5(random()::text) from 1 for 8);
      
      INSERT INTO public.profiles (id, username, email, role, invitation_code, htp_balance, usdt_balance)
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email, 'user_' || substring(NEW.id::text from 1 for 8)),
        NEW.email,
        CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END,
        new_invitation_code,
        0,
        0
      );
      EXIT; -- Success, exit loop
    EXCEPTION WHEN unique_violation THEN
      retry_count := retry_count + 1;
      IF retry_count >= max_retries THEN
        RAISE EXCEPTION 'Failed to generate unique invitation code after % retries', max_retries;
      END IF;
      -- Continue loop to try new code
    END;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Add INSERT trigger (runs when user is created)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Keep the UPDATE trigger for cases where confirmation happens later
-- But modify it to use the same robust function
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL)
  EXECUTE FUNCTION handle_new_user();

-- Fix 3: Backfill missing profiles for existing users
DO $$
DECLARE
  missing_user RECORD;
BEGIN
  FOR missing_user IN 
    SELECT * FROM auth.users u 
    WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
  LOOP
    -- Manually call the handler for each missing user
    -- We mock the NEW record by passing the user record
    -- Note: We can't directly call trigger function with arguments, so we just insert directly
    DECLARE
      new_code text;
      user_role public.user_role;
    BEGIN
      new_code := substring(md5(random()::text) from 1 for 8);
      
      IF EXISTS (SELECT 1 FROM public.profiles) THEN
        user_role := 'user';
      ELSE
        user_role := 'admin';
      END IF;

      INSERT INTO public.profiles (id, username, email, role, invitation_code)
      VALUES (
        missing_user.id,
        COALESCE(missing_user.raw_user_meta_data->>'full_name', missing_user.email, 'user_' || substring(missing_user.id::text from 1 for 8)),
        missing_user.email,
        user_role,
        new_code
      );
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue
      RAISE NOTICE 'Failed to create profile for user %: %', missing_user.id, SQLERRM;
    END;
  END LOOP;
END;
$$;
