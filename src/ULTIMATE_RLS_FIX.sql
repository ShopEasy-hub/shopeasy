-- =====================================================
-- ULTIMATE FIX: Zero Recursion for user_profiles
-- =====================================================
-- This fix separates INSERT from other operations to avoid recursion

-- Step 1: Create helper functions with SECURITY DEFINER
-- These bypass RLS when called
CREATE OR REPLACE FUNCTION get_user_organization_id(user_id UUID)
RETURNS UUID AS $$
  SELECT organization_id FROM user_profiles WHERE id = user_id LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM user_profiles WHERE id = user_id LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Step 2: Drop ALL existing user_profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON user_profiles;
DROP POLICY IF EXISTS "Owners can manage user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Owners can view organization profiles" ON user_profiles;
DROP POLICY IF EXISTS "Owners can manage organization profiles" ON user_profiles;
DROP POLICY IF EXISTS "Owners can update organization profiles" ON user_profiles;
DROP POLICY IF EXISTS "Owners can delete organization profiles" ON user_profiles;

-- Step 3: Create policies with ZERO recursion

-- ========== SELECT (READ) POLICIES ==========
-- Users can always view their own profile
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

-- Owners can view all profiles in their organization
-- (This uses SECURITY DEFINER functions which bypass RLS)
CREATE POLICY "Owners can view organization profiles"
  ON user_profiles FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'owner' 
    AND organization_id = get_user_organization_id(auth.uid())
  );

-- ========== INSERT POLICIES ==========
-- Users can ONLY create their own profile during signup
-- NO OTHER CHECKS - this prevents recursion during account creation
CREATE POLICY "Users can create their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ========== UPDATE POLICIES ==========
-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid());

-- Owners can update profiles in their organization
CREATE POLICY "Owners can update organization profiles"
  ON user_profiles FOR UPDATE
  USING (
    get_user_role(auth.uid()) = 'owner' 
    AND organization_id = get_user_organization_id(auth.uid())
  );

-- ========== DELETE POLICIES ==========
-- Owners can delete profiles in their organization
CREATE POLICY "Owners can delete organization profiles"
  ON user_profiles FOR DELETE
  USING (
    get_user_role(auth.uid()) = 'owner' 
    AND organization_id = get_user_organization_id(auth.uid())
  );

-- ✅ All policies are now properly separated and non-recursive!

-- Step 4: Verify the policies
SELECT 
  policyname,
  cmd as operation,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY cmd, policyname;
