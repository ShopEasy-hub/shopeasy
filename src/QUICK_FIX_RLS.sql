-- =====================================================
-- QUICK FIX: Infinite Recursion in user_profiles
-- =====================================================
-- COPY THIS ENTIRE FILE AND RUN IN SUPABASE SQL EDITOR

-- Step 1: Create helper function to avoid recursion
CREATE OR REPLACE FUNCTION get_user_organization_id(user_id UUID)
RETURNS UUID AS $$
  SELECT organization_id FROM user_profiles WHERE id = user_id LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Step 2: Fix user_profiles policies (the main culprit)
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON user_profiles;
DROP POLICY IF EXISTS "Owners can manage user profiles" ON user_profiles;

CREATE POLICY "Users can view profiles in their organization"
  ON user_profiles FOR SELECT
  USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Owners can manage user profiles"
  ON user_profiles FOR ALL
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'owner')
  );

-- ✅ Done! Try logging in now.
