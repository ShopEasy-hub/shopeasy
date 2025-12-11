-- ==========================================
-- 🔍 DIAGNOSTIC SCRIPT: USER CREATION ISSUES
-- ==========================================
-- This will check:
-- 1. Is pgcrypto extension enabled?
-- 2. Can we access auth.users table?
-- 3. What's the actual error in the function?
-- 4. Supabase plan limitations
-- ==========================================

-- ==========================================
-- CHECK 1: PGCRYPTO EXTENSION
-- ==========================================

DO $$
DECLARE
  v_pgcrypto_exists boolean;
  v_can_use_gen_salt boolean := false;
  v_test_salt text;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔍 CHECK 1: PGCRYPTO EXTENSION';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Check if extension exists
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
  ) INTO v_pgcrypto_exists;
  
  RAISE NOTICE '1. Extension installed: %', 
    CASE WHEN v_pgcrypto_exists THEN '✅ YES' ELSE '❌ NO' END;
  
  -- Try to use gen_salt
  BEGIN
    v_test_salt := gen_salt('bf');
    v_can_use_gen_salt := true;
    RAISE NOTICE '2. Can call gen_salt(): ✅ YES';
    RAISE NOTICE '   Sample salt: %', substring(v_test_salt, 1, 20) || '...';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '2. Can call gen_salt(): ❌ NO';
      RAISE NOTICE '   Error: %', SQLERRM;
  END;
  
  RAISE NOTICE '';
END $$;

-- ==========================================
-- CHECK 2: AUTH SCHEMA ACCESS
-- ==========================================

DO $$
DECLARE
  v_can_read_auth boolean := false;
  v_can_write_auth boolean := false;
  v_auth_users_count integer;
  v_current_role text;
BEGIN
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔍 CHECK 2: AUTH.USERS TABLE ACCESS';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Get current role
  SELECT current_user INTO v_current_role;
  RAISE NOTICE '1. Current database role: %', v_current_role;
  RAISE NOTICE '';
  
  -- Try to read from auth.users
  BEGIN
    SELECT COUNT(*) INTO v_auth_users_count FROM auth.users;
    v_can_read_auth := true;
    RAISE NOTICE '2. Can READ auth.users: ✅ YES';
    RAISE NOTICE '   Total users in auth.users: %', v_auth_users_count;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '2. Can READ auth.users: ❌ NO';
      RAISE NOTICE '   Error: %', SQLERRM;
  END;
  
  RAISE NOTICE '';
  
  -- Try to write to auth.users (test only, will rollback)
  BEGIN
    -- This will fail if we don't have permission
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      aud,
      role
    ) VALUES (
      '00000000-0000-0000-0000-000000000001'::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid,
      'diagnostic-test@example.com',
      'test',
      NOW(),
      NOW(),
      NOW(),
      'authenticated',
      'authenticated'
    );
    
    -- If we got here, we can write (now rollback)
    RAISE EXCEPTION 'ROLLBACK_TEST';
    
  EXCEPTION
    WHEN SQLSTATE 'P0001' AND SQLERRM = 'ROLLBACK_TEST' THEN
      v_can_write_auth := true;
      RAISE NOTICE '3. Can WRITE auth.users: ✅ YES (test rolled back)';
    WHEN OTHERS THEN
      v_can_write_auth := false;
      RAISE NOTICE '3. Can WRITE auth.users: ❌ NO';
      RAISE NOTICE '   Error: %', SQLERRM;
      RAISE NOTICE '';
      RAISE NOTICE '   ⚠️  This is likely a SUPABASE PLAN LIMITATION!';
      RAISE NOTICE '   ⚠️  Free/Basic plans cannot directly INSERT into auth.users';
      RAISE NOTICE '   ⚠️  You need to use Edge Functions or Admin API';
  END;
  
  RAISE NOTICE '';
END $$;

-- ==========================================
-- CHECK 3: CURRENT FUNCTION STATUS
-- ==========================================

DO $$
DECLARE
  v_function_exists boolean;
  v_function_source text;
BEGIN
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔍 CHECK 3: USER CREATION FUNCTION';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Check if function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'create_organization_user_secure'
  ) INTO v_function_exists;
  
  RAISE NOTICE '1. Function exists: %', 
    CASE WHEN v_function_exists THEN '✅ YES' ELSE '❌ NO' END;
  
  IF v_function_exists THEN
    -- Get function definition
    SELECT pg_get_functiondef(oid) INTO v_function_source
    FROM pg_proc 
    WHERE proname = 'create_organization_user_secure'
    LIMIT 1;
    
    -- Check if it tries to write to auth.users
    IF v_function_source LIKE '%INSERT INTO auth.users%' THEN
      RAISE NOTICE '2. Function tries to write to auth.users: ✅ YES';
      RAISE NOTICE '   ⚠️  This will FAIL on Free/Basic Supabase plans!';
    ELSE
      RAISE NOTICE '2. Function tries to write to auth.users: ❌ NO';
      RAISE NOTICE '   (Function only creates user_profiles, not auth users)';
    END IF;
  END IF;
  
  RAISE NOTICE '';
END $$;

-- ==========================================
-- CHECK 4: TEST THE ACTUAL FUNCTION
-- ==========================================

DO $$
DECLARE
  v_test_result jsonb;
  v_test_org_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔍 CHECK 4: TEST FUNCTION CALL';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  BEGIN
    -- Try to call the function
    SELECT create_organization_user_secure(
      v_test_org_id,
      jsonb_build_object(
        'name', 'Test User',
        'email', 'test-diagnostic@example.com',
        'password', 'TestPass123',
        'role', 'cashier'
      )
    ) INTO v_test_result;
    
    RAISE NOTICE '✅ Function call succeeded!';
    RAISE NOTICE 'Result: %', v_test_result;
    
    -- Clean up test user if created
    DELETE FROM auth.users WHERE email = 'test-diagnostic@example.com';
    DELETE FROM user_profiles WHERE email = 'test-diagnostic@example.com';
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Function call failed!';
      RAISE NOTICE 'Error: %', SQLERRM;
      RAISE NOTICE 'Detail: %', COALESCE(NULLIF(SQLSTATE, ''), 'No details');
      RAISE NOTICE '';
      
      -- Identify the specific error
      IF SQLERRM LIKE '%gen_salt%' THEN
        RAISE NOTICE '🔴 ERROR TYPE: pgcrypto extension issue';
        RAISE NOTICE '   The gen_salt() function is not available';
        RAISE NOTICE '';
      ELSIF SQLERRM LIKE '%auth.users%' OR SQLERRM LIKE '%permission%' THEN
        RAISE NOTICE '🔴 ERROR TYPE: Permission/Plan limitation';
        RAISE NOTICE '   Cannot write to auth.users table';
        RAISE NOTICE '';
      ELSE
        RAISE NOTICE '🔴 ERROR TYPE: Unknown';
        RAISE NOTICE '';
      END IF;
  END;
  
  RAISE NOTICE '';
END $$;

-- ==========================================
-- CHECK 5: SUPABASE PLAN & RECOMMENDATIONS
-- ==========================================

DO $$
DECLARE
  v_can_use_rpc boolean := false;
  v_needs_edge_function boolean := false;
BEGIN
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '💡 RECOMMENDATIONS';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Check what method will work
  BEGIN
    -- If we can't write to auth.users, we need Edge Function
    PERFORM 1 FROM auth.users LIMIT 1;
    v_can_use_rpc := true;
  EXCEPTION
    WHEN OTHERS THEN
      v_needs_edge_function := true;
  END;
  
  IF v_needs_edge_function THEN
    RAISE NOTICE '🎯 SOLUTION: You MUST use Edge Functions';
    RAISE NOTICE '';
    RAISE NOTICE 'Why? Your Supabase plan does NOT allow:';
    RAISE NOTICE '  ❌ Direct INSERT into auth.users table';
    RAISE NOTICE '  ❌ RPC functions that create auth users';
    RAISE NOTICE '';
    RAISE NOTICE 'What to do:';
    RAISE NOTICE '  1. Deploy the Edge Function: /supabase/functions/create-organization-user/';
    RAISE NOTICE '  2. OR upgrade to a plan that allows auth.users access';
    RAISE NOTICE '  3. OR use Supabase Dashboard to manually create users';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '🎯 SOLUTION: RPC function should work';
    RAISE NOTICE '';
    RAISE NOTICE 'Your plan allows auth.users access.';
    RAISE NOTICE 'The issue might be:';
    RAISE NOTICE '  1. Search path issue (gen_salt not in path)';
    RAISE NOTICE '  2. Extension installed in wrong schema';
    RAISE NOTICE '  3. Function definition issue';
    RAISE NOTICE '';
  END IF;
  
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- ==========================================
-- FINAL: SHOW ALL USERS
-- ==========================================

DO $$
DECLARE
  v_auth_count integer;
  v_profile_count integer;
  v_orphan_count integer;
BEGIN
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '📊 CURRENT USER STATISTICS';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  BEGIN
    SELECT COUNT(*) INTO v_auth_count FROM auth.users;
    SELECT COUNT(*) INTO v_profile_count FROM user_profiles;
    SELECT COUNT(*) INTO v_orphan_count
    FROM user_profiles up
    WHERE NOT EXISTS (
      SELECT 1 FROM auth.users au WHERE au.id = up.id
    );
    
    RAISE NOTICE 'Auth users (can login): %', v_auth_count;
    RAISE NOTICE 'User profiles: %', v_profile_count;
    RAISE NOTICE 'Orphan profiles (cannot login): %', v_orphan_count;
    RAISE NOTICE '';
    
    IF v_orphan_count > 0 THEN
      RAISE NOTICE '⚠️  WARNING: % users exist but cannot login', v_orphan_count;
      RAISE NOTICE '   These are the emails you already tried to create:';
      RAISE NOTICE '   - gizzman21@gmail.com';
      RAISE NOTICE '   - borderronline@gmail.com';
      RAISE NOTICE '   - stefananatoly@gmail.com';
      RAISE NOTICE '';
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Cannot read user statistics';
      RAISE NOTICE 'Error: %', SQLERRM;
  END;
  
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
END $$;
