-- =====================================================
-- 🔍 DEBUG: User Creation Completely Failing
-- =====================================================
-- Find out why users aren't being created at all
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🚨 DEBUGGING COMPLETE USER CREATION FAILURE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 1: CHECK IF FUNCTIONS EXIST
-- =====================================================

DO $$
DECLARE
  v_rpc_exists BOOLEAN;
  v_edge_exists BOOLEAN;
BEGIN
  RAISE NOTICE '⚡ STEP 1: Checking if user creation functions exist...';
  RAISE NOTICE '';
  
  -- Check for RPC function
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'create_organization_user_secure'
  ) INTO v_rpc_exists;
  
  IF v_rpc_exists THEN
    RAISE NOTICE '✅ RPC function exists: create_organization_user_secure';
  ELSE
    RAISE NOTICE '❌ RPC function NOT found: create_organization_user_secure';
    RAISE NOTICE '   This is a critical function for creating users!';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 2: CHECK CURRENT DATABASE STATE
-- =====================================================

DO $$
DECLARE
  v_auth_count INTEGER;
  v_profile_count INTEGER;
  v_org_count INTEGER;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '📊 STEP 2: Current database state...';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  SELECT COUNT(*) INTO v_auth_count FROM auth.users;
  SELECT COUNT(*) INTO v_profile_count FROM user_profiles;
  SELECT COUNT(*) INTO v_org_count FROM organizations;
  
  RAISE NOTICE 'Current counts:';
  RAISE NOTICE '  Organizations: %', v_org_count;
  RAISE NOTICE '  auth.users: %', v_auth_count;
  RAISE NOTICE '  user_profiles: %', v_profile_count;
  RAISE NOTICE '';
  
  IF v_org_count = 0 THEN
    RAISE NOTICE '❌ NO ORGANIZATIONS EXIST!';
    RAISE NOTICE '   You must create an organization first.';
    RAISE NOTICE '';
  END IF;
  
  IF v_auth_count = 0 THEN
    RAISE NOTICE '❌ NO AUTH USERS AT ALL!';
    RAISE NOTICE '   User creation is completely failing.';
    RAISE NOTICE '';
  END IF;
END $$;

-- =====================================================
-- STEP 3: CHECK RLS POLICIES
-- =====================================================

DO $$
DECLARE
  v_policy RECORD;
  v_insert_count INTEGER;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔒 STEP 3: Checking RLS policies on user_profiles...';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Check if RLS is enabled
  IF (SELECT relrowsecurity FROM pg_class WHERE relname = 'user_profiles') THEN
    RAISE NOTICE '✅ RLS is enabled';
  ELSE
    RAISE NOTICE '❌ RLS is disabled';
  END IF;
  RAISE NOTICE '';
  
  -- Count INSERT policies
  SELECT COUNT(*) INTO v_insert_count
  FROM pg_policies
  WHERE tablename = 'user_profiles' AND cmd = 'INSERT';
  
  RAISE NOTICE 'INSERT policies: %', v_insert_count;
  
  IF v_insert_count = 0 THEN
    RAISE NOTICE '❌ NO INSERT POLICY!';
    RAISE NOTICE '   This will block user creation!';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE 'INSERT policies:';
    FOR v_policy IN (
      SELECT policyname, 
        CASE WHEN qual IS NOT NULL THEN LEFT(qual, 80) ELSE 'true' END as policy
      FROM pg_policies
      WHERE tablename = 'user_profiles' AND cmd = 'INSERT'
    )
    LOOP
      RAISE NOTICE '  • %: %', v_policy.policyname, v_policy.policy;
    END LOOP;
    RAISE NOTICE '';
  END IF;
END $$;

-- =====================================================
-- STEP 4: TEST USER CREATION MANUALLY
-- =====================================================

DO $$
DECLARE
  v_org_id UUID;
  v_test_email TEXT := 'test-' || floor(random() * 10000) || '@example.com';
  v_test_id UUID := gen_random_uuid();
  v_can_insert BOOLEAN := false;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🧪 STEP 4: Testing manual user creation...';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Get organization
  SELECT id INTO v_org_id FROM organizations ORDER BY created_at LIMIT 1;
  
  IF v_org_id IS NULL THEN
    RAISE NOTICE '❌ Cannot test - no organization exists';
    RAISE NOTICE '';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Testing with:';
  RAISE NOTICE '  Org ID: %', v_org_id;
  RAISE NOTICE '  Test email: %', v_test_email;
  RAISE NOTICE '';
  
  -- Try to insert a test profile (without auth.users first)
  BEGIN
    INSERT INTO user_profiles (
      id,
      email,
      name,
      role,
      organization_id,
      status
    ) VALUES (
      v_test_id,
      v_test_email,
      'Test User',
      'cashier',
      v_org_id,
      'active'
    );
    
    v_can_insert := true;
    RAISE NOTICE '✅ INSERT into user_profiles: SUCCESS';
    RAISE NOTICE '   RLS policies allow insertion';
    
    -- Clean up test
    DELETE FROM user_profiles WHERE id = v_test_id;
    RAISE NOTICE '✅ Test record cleaned up';
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ INSERT into user_profiles: FAILED';
    RAISE NOTICE '   Error: %', SQLERRM;
    RAISE NOTICE '   RLS is blocking insertion!';
  END;
  
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 5: CHECK AUTHENTICATION SETUP
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔐 STEP 5: Checking authentication setup...';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  RAISE NOTICE 'Common reasons user creation fails completely:';
  RAISE NOTICE '';
  RAISE NOTICE '1. ❌ RPC function not created/deployed';
  RAISE NOTICE '   → Create the RPC function';
  RAISE NOTICE '';
  RAISE NOTICE '2. ❌ Edge Function not deployed';
  RAISE NOTICE '   → Deploy: supabase functions deploy create-organization-user';
  RAISE NOTICE '';
  RAISE NOTICE '3. ❌ Service role key not configured';
  RAISE NOTICE '   → Add SUPABASE_SERVICE_ROLE_KEY to environment';
  RAISE NOTICE '';
  RAISE NOTICE '4. ❌ RLS blocking INSERT';
  RAISE NOTICE '   → Fix RLS policies';
  RAISE NOTICE '';
  RAISE NOTICE '5. ❌ Frontend error not caught';
  RAISE NOTICE '   → Check browser console (F12)';
  RAISE NOTICE '';
  RAISE NOTICE '6. ❌ Network error';
  RAISE NOTICE '   → Check browser Network tab';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- FINAL DIAGNOSIS
-- =====================================================

DO $$
DECLARE
  v_rpc_exists BOOLEAN;
  v_insert_policy INTEGER;
  v_org_count INTEGER;
  v_auth_count INTEGER;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🎯 FINAL DIAGNOSIS';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'create_organization_user_secure'
  ) INTO v_rpc_exists;
  
  SELECT COUNT(*) INTO v_insert_policy
  FROM pg_policies WHERE tablename = 'user_profiles' AND cmd = 'INSERT';
  
  SELECT COUNT(*) INTO v_org_count FROM organizations;
  SELECT COUNT(*) INTO v_auth_count FROM auth.users;
  
  RAISE NOTICE 'Critical checks:';
  RAISE NOTICE '  RPC function exists: %', v_rpc_exists;
  RAISE NOTICE '  INSERT policies: %', v_insert_policy;
  RAISE NOTICE '  Organizations: %', v_org_count;
  RAISE NOTICE '  Auth users: %', v_auth_count;
  RAISE NOTICE '';
  
  IF NOT v_rpc_exists THEN
    RAISE NOTICE '🔴 CRITICAL: RPC function missing!';
    RAISE NOTICE '';
    RAISE NOTICE '   This is why user creation fails completely.';
    RAISE NOTICE '   The app tries to call this function but it does not exist.';
    RAISE NOTICE '';
    RAISE NOTICE '   SOLUTION: Run the fix script to create it.';
    RAISE NOTICE '   File: 🔧_CREATE_USER_CREATION_FUNCTION.sql';
    RAISE NOTICE '';
  ELSIF v_insert_policy = 0 THEN
    RAISE NOTICE '🔴 PROBLEM: No INSERT policy on user_profiles!';
    RAISE NOTICE '';
    RAISE NOTICE '   Even if the RPC function works, it cannot insert.';
    RAISE NOTICE '';
    RAISE NOTICE '   SOLUTION: Run the RLS fix script.';
    RAISE NOTICE '   File: 🔧_FIX_USER_PROFILES_RLS.sql';
    RAISE NOTICE '';
  ELSIF v_org_count = 0 THEN
    RAISE NOTICE '🔴 PROBLEM: No organization exists!';
    RAISE NOTICE '';
    RAISE NOTICE '   Users must belong to an organization.';
    RAISE NOTICE '';
    RAISE NOTICE '   SOLUTION: Create an organization first.';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '✅ Database setup looks good!';
    RAISE NOTICE '';
    RAISE NOTICE '   The problem is likely in:';
    RAISE NOTICE '   1. Frontend JavaScript error (check browser console)';
    RAISE NOTICE '   2. Network/API error (check browser Network tab)';
    RAISE NOTICE '   3. Supabase client configuration';
    RAISE NOTICE '   4. Edge Function not deployed';
    RAISE NOTICE '';
    RAISE NOTICE '   Next steps:';
    RAISE NOTICE '   1. Open browser console (F12)';
    RAISE NOTICE '   2. Try to create a user';
    RAISE NOTICE '   3. Look for red error messages';
    RAISE NOTICE '   4. Share the error here';
    RAISE NOTICE '';
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;
