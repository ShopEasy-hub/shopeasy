-- =====================================================
-- FINAL COMPLETE FIX: Remove ALL recursion everywhere
-- =====================================================
-- This fixes BOTH user_profiles AND organizations policies

-- ========================================
-- PART 1: Helper Functions
-- ========================================
CREATE OR REPLACE FUNCTION get_user_organization_id(user_id UUID)
RETURNS UUID AS $$
  SELECT organization_id FROM user_profiles WHERE id = user_id LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM user_profiles WHERE id = user_id LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(is_super_admin, false) FROM user_profiles WHERE id = user_id LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ========================================
-- PART 2: Fix user_profiles policies
-- ========================================
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON user_profiles;
DROP POLICY IF EXISTS "Owners can manage user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Owners can view organization profiles" ON user_profiles;
DROP POLICY IF EXISTS "Owners can manage organization profiles" ON user_profiles;
DROP POLICY IF EXISTS "Owners can update organization profiles" ON user_profiles;
DROP POLICY IF EXISTS "Owners can delete organization profiles" ON user_profiles;

-- SELECT: Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

-- SELECT: Owners can view organization profiles
CREATE POLICY "Owners can view organization profiles"
  ON user_profiles FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'owner' 
    AND organization_id = get_user_organization_id(auth.uid())
  );

-- INSERT: Users can ONLY create their own profile (NO OTHER CHECKS!)
CREATE POLICY "Users can create their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- UPDATE: Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid());

-- UPDATE: Owners can update organization profiles
CREATE POLICY "Owners can update organization profiles"
  ON user_profiles FOR UPDATE
  USING (
    get_user_role(auth.uid()) = 'owner' 
    AND organization_id = get_user_organization_id(auth.uid())
  );

-- DELETE: Owners can delete organization profiles
CREATE POLICY "Owners can delete organization profiles"
  ON user_profiles FOR DELETE
  USING (
    get_user_role(auth.uid()) = 'owner' 
    AND organization_id = get_user_organization_id(auth.uid())
  );

-- ========================================
-- PART 3: Fix organizations policies
-- ========================================
DROP POLICY IF EXISTS "Super admins have full access to organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
DROP POLICY IF EXISTS "Owners can manage their organization" ON organizations;
DROP POLICY IF EXISTS "Owners can update their organization" ON organizations;
DROP POLICY IF EXISTS "Anyone can create an organization" ON organizations;

-- INSERT: Anyone authenticated can create an organization during signup
-- NO CHECKS - this is critical for signup flow!
CREATE POLICY "Anyone can create an organization"
  ON organizations FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- SELECT: Users can view their own organization
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (owner_id = auth.uid());

-- SELECT: Super admins can view all organizations
CREATE POLICY "Super admins can view all organizations"
  ON organizations FOR SELECT
  USING (is_super_admin(auth.uid()) = true);

-- UPDATE: Owners can update their organization
CREATE POLICY "Owners can update their organization"
  ON organizations FOR UPDATE
  USING (owner_id = auth.uid());

-- UPDATE: Super admins can update any organization
CREATE POLICY "Super admins can update any organization"
  ON organizations FOR UPDATE
  USING (is_super_admin(auth.uid()) = true);

-- DELETE: Super admins can delete any organization
CREATE POLICY "Super admins can delete any organization"
  ON organizations FOR DELETE
  USING (is_super_admin(auth.uid()) = true);

-- ========================================
-- PART 4: Verify policies
-- ========================================
SELECT 
  tablename,
  policyname,
  cmd as operation
FROM pg_policies 
WHERE tablename IN ('user_profiles', 'organizations')
ORDER BY tablename, cmd, policyname;

-- ✅ Complete! All recursion removed from signup flow!
