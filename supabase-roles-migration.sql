-- ============================================================================
-- MATRIMONIAL APP - ROLES MIGRATION (Primary Admin)
-- ============================================================================

-- 1. Drop existing role constraint and recreate with 'primary_admin'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin', 'primary_admin'));

-- 2. Drop the old Admin RLS policy
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

-- 3. Recreate the Admin RLS policy to allow both admin and primary_admin to update profiles
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'primary_admin')
    )
  );

-- ============================================================================
-- Migration Complete
-- ============================================================================
