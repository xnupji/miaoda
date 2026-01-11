-- 1. Enable Realtime for support_messages
-- This is CRITICAL for the admin to see messages instantly
alter publication supabase_realtime add table support_messages;

-- 2. Fix PROFILES RLS to prevent "Admin Blindness"
-- If Admin cannot read profiles, they cannot resolve "profiles.role = 'admin'" checks properly
-- or join user data in the UI.

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Allow everyone to read usernames/avatars (Basic info)
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- 3. Fix SUPPORT_MESSAGES RLS (Simplify to avoid recursion)
DROP POLICY IF EXISTS "Unified view policy for support_messages" ON support_messages;
DROP POLICY IF EXISTS "Unified insert policy for support_messages" ON support_messages;
DROP POLICY IF EXISTS "Admins can view all support messages" ON support_messages;
DROP POLICY IF EXISTS "Admins can insert support messages" ON support_messages;
DROP POLICY IF EXISTS "Users can view their own support messages" ON support_messages;
DROP POLICY IF EXISTS "Users can insert their own support messages" ON support_messages;

-- Policy: Users see their own; Admins (checked by role OR username) see ALL.
-- We hardcode the username check for safety in case role isn't set.
CREATE POLICY "Universal Access for Admin and Owner"
  ON support_messages
  AS PERMISSIVE
  FOR ALL
  USING (
    user_id = auth.uid() 
    OR 
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND (role = 'admin' OR username = 'admin')
    )
  );

-- 4. Ensure admin user exists and has role
UPDATE profiles SET role = 'admin' WHERE username = 'admin';
