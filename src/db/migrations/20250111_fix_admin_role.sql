-- Fix Admin Role and RLS Policies
-- Created at: 2026-01-11

-- 1. Ensure the 'admin' user has the correct role
-- Updates any user with username 'admin' to have role 'admin'
UPDATE profiles 
SET role = 'admin' 
WHERE username = 'admin';

-- 2. Also update by email if possible (assuming common admin emails)
UPDATE profiles 
SET role = 'admin' 
WHERE email IN ('admin@miaoda.com', 'admin@htp.com');

-- 3. Re-apply RLS policies with a broader check to prevent recursion or lockouts
-- Use a SECURITY DEFINER function to check for admin status safely if needed, 
-- but for now, we'll stick to direct checks but ensure they are correct.

-- Drop existing policies to be safe
DROP POLICY IF EXISTS "Admins can view all support messages" ON support_messages;
DROP POLICY IF EXISTS "Admins can insert support messages" ON support_messages;
DROP POLICY IF EXISTS "Users can view their own support messages" ON support_messages;

-- Re-create Policies

-- A. SELECT: Users see their own; Admins see ALL.
CREATE POLICY "Unified view policy for support_messages"
  ON support_messages FOR SELECT
  USING (
    user_id = auth.uid() -- User sees their own conversation
    OR 
    EXISTS ( -- Admin sees everything
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- B. INSERT: Users insert as themselves; Admins insert as themselves (but can set any user_id as target)
CREATE POLICY "Unified insert policy for support_messages"
  ON support_messages FOR INSERT
  WITH CHECK (
    (user_id = auth.uid()) -- User starting/replying to their own thread
    OR
    EXISTS ( -- Admin replying to anyone
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 4. Create an index to speed up admin queries
CREATE INDEX IF NOT EXISTS idx_support_messages_user_id ON support_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
