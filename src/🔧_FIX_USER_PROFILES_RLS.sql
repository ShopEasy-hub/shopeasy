-- =====================================================
-- 🔧 FIX: User Profiles RLS Policies
-- =====================================================
-- Ensures users can SELECT and INSERT into user_profiles
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔒 FIXING USER_PROFILES RLS POLICIES';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 1: DROP OLD POLICIES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '🗑️  STEP 1: Removing old policies...';
  RAISE NOTICE '';
END $$;

DROP POLICY IF EXISTS "Allow users to read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to read profiles in their org" ON user_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON user_profiles;

DROP POLICY IF EXISTS "Allow service role to insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON user_profiles;

DROP POLICY IF EXISTS "Allow users to update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow owners to update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON user_profiles;

DROP POLICY IF EXISTS "Allow owners to delete profiles" ON user_profiles;
DROP POLICY IF EXISTS "Enable delete for users based on id" ON user_profiles;

DO $$
BEGIN
  RAISE NOTICE '✅ Old policies removed';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 2: CREATE NEW PERMISSIVE POLICIES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✨ STEP 2: Creating new policies...';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- SELECT: Allow authenticated users to read all profiles in their org
CREATE POLICY "user_profiles_select_policy"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Users can read profiles in their organization
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

-- INSERT: Allow authenticated users to insert profiles (for user creation)
CREATE POLICY "user_profiles_insert_policy"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Must be owner or admin in the organization
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND organization_id = user_profiles.organization_id
      AND role IN ('owner', 'admin')
    )
  );

-- UPDATE: Allow users to update profiles in their org (if owner/admin)
CREATE POLICY "user_profiles_update_policy"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- Can update their own profile OR if owner/admin
    id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.organization_id = user_profiles.organization_id
      AND up.role IN ('owner', 'admin')
    )
  );

-- DELETE: Allow owners/admins to delete profiles in their org
CREATE POLICY "user_profiles_delete_policy"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.organization_id = user_profiles.organization_id
      AND up.role IN ('owner', 'admin')
    )
  );

DO $$
BEGIN
  RAISE NOTICE '✅ New policies created:';
  RAISE NOTICE '   • SELECT - Users can read profiles in their org';
  RAISE NOTICE '   • INSERT - Owners/admins can create users';
  RAISE NOTICE '   • UPDATE - Users can update own profile, owners/admins can update all';
  RAISE NOTICE '   • DELETE - Owners/admins can delete users';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 3: VERIFY RLS IS ENABLED
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔍 STEP 3: Verifying RLS...';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  IF (SELECT relrowsecurity FROM pg_class WHERE relname = 'user_profiles') THEN
    RAISE NOTICE '✅ RLS is enabled on user_profiles';
  ELSE
    RAISE NOTICE '❌ RLS is NOT enabled! Enabling now...';
    ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ RLS enabled';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 4: VERIFY POLICIES
-- =====================================================

DO $$
DECLARE
  v_policy RECORD;
  v_select_count INTEGER;
  v_insert_count INTEGER;
  v_update_count INTEGER;
  v_delete_count INTEGER;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ STEP 4: Verification';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Count policies
  SELECT COUNT(*) INTO v_select_count
  FROM pg_policies WHERE tablename = 'user_profiles' AND cmd = 'SELECT';
  
  SELECT COUNT(*) INTO v_insert_count
  FROM pg_policies WHERE tablename = 'user_profiles' AND cmd = 'INSERT';
  
  SELECT COUNT(*) INTO v_update_count
  FROM pg_policies WHERE tablename = 'user_profiles' AND cmd = 'UPDATE';
  
  SELECT COUNT(*) INTO v_delete_count
  FROM pg_policies WHERE tablename = 'user_profiles' AND cmd = 'DELETE';
  
  RAISE NOTICE 'Policy counts:';
  RAISE NOTICE '  SELECT policies: %', v_select_count;
  RAISE NOTICE '  INSERT policies: %', v_insert_count;
  RAISE NOTICE '  UPDATE policies: %', v_update_count;
  RAISE NOTICE '  DELETE policies: %', v_delete_count;
  RAISE NOTICE '';
  
  IF v_select_count > 0 AND v_insert_count > 0 THEN
    RAISE NOTICE '🎉 SUCCESS! All required policies are in place!';
  ELSE
    RAISE NOTICE '⚠️  Missing policies detected!';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'All policies:';
  FOR v_policy IN (
    SELECT policyname, cmd, permissive
    FROM pg_policies
    WHERE tablename = 'user_profiles'
    ORDER BY cmd, policyname
  )
  LOOP
    RAISE NOTICE '  ✅ % - % (%)', v_policy.cmd, v_policy.policyname, 
      CASE WHEN v_policy.permissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS policies are now properly configured!';
  RAISE NOTICE '';
  RAISE NOTICE 'What this means:';
  RAISE NOTICE '  ✅ Users can read all profiles in their organization';
  RAISE NOTICE '  ✅ Owners/admins can create new users';
  RAISE NOTICE '  ✅ Owners/admins can update/delete users';
  RAISE NOTICE '  ✅ Regular users can update their own profile';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Refresh your app and check if users appear!';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;
