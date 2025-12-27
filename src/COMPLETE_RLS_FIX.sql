-- =====================================================
-- COMPLETE FIX: Remove ALL recursion from user_profiles
-- =====================================================
-- This completely eliminates recursion issues

-- Step 1: Create helper functions with SECURITY DEFINER
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

-- Step 3: Create SIMPLE non-recursive policies

-- Allow users to view their own profile (no recursion - direct ID check)
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

-- Allow users to create their own profile during signup (no recursion - direct ID check)
CREATE POLICY "Users can create their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Allow users to update their own profile (no recursion - direct ID check)
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid());

-- Allow owners to view all profiles in their organization (uses SECURITY DEFINER function)
CREATE POLICY "Owners can view organization profiles"
  ON user_profiles FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'owner' 
    AND organization_id = get_user_organization_id(auth.uid())
  );

-- Allow owners to manage (INSERT/UPDATE/DELETE) profiles in their organization
CREATE POLICY "Owners can manage organization profiles"
  ON user_profiles FOR ALL
  USING (
    get_user_role(auth.uid()) = 'owner' 
    AND organization_id = get_user_organization_id(auth.uid())
  );

-- ✅ All policies are now non-recursive!

-- Step 4: Verify it works
SELECT 
  schemaname, 
  tablename, 
  policyname 
FROM pg_policies 
WHERE tablename = 'user_profiles';
