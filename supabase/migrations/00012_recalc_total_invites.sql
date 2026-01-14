-- Recalculate total_invites for all users based on actual invitations table count
DO $$
BEGIN
  -- Update total_invites count
  UPDATE profiles p
  SET total_invites = (
    SELECT count(*) FROM invitations WHERE inviter_id = p.id
  );
END $$;
