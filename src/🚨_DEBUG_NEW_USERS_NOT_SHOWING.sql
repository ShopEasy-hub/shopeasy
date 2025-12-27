-- =====================================================
-- 🚨 DEBUG: New Users Not Showing
-- =====================================================
-- Let's find out exactly what's happening
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔍 DEBUGGING NEW USERS NOT SHOWING';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 1: CHECK WHAT'S IN auth.users
-- =====================================================

DO $$
DECLARE
  v_user RECORD;
  v_count INTEGER;
BEGIN
  RAISE NOTICE '📊 STEP 1: Checking auth.users...';
  RAISE NOTICE '';
  
  SELECT COUNT(*) INTO v_count FROM auth.users;
  RAISE NOTICE 'Total auth.users: %', v_count;
  RAISE NOTICE '';
  
  IF v_count = 0 THEN
    RAISE NOTICE '❌ NO AUTH USERS FOUND!';
    RAISE NOTICE '   This is the problem - users are not being created in auth.users';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE 'Auth users:';
    FOR v_user IN (
      SELECT 
        email,
        created_at::date as created,
        email_confirmed_at IS NOT NULL as confirmed,
        encrypted_password IS NOT NULL as has_password
      FROM auth.users
      ORDER BY created_at DESC
    )
    LOOP
      RAISE NOTICE '  • % - Created: % - Confirmed: % - Has Password: %', 
        v_user.email, v_user.created, v_user.confirmed, v_user.has_password;
    END LOOP;
    RAISE NOTICE '';
  END IF;
END $$;

-- =====================================================
-- STEP 2: CHECK WHAT'S IN user_profiles
-- =====================================================

DO $$
DECLARE
  v_profile RECORD;
  v_count INTEGER;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '📊 STEP 2: Checking user_profiles...';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  SELECT COUNT(*) INTO v_count FROM user_profiles;
  RAISE NOTICE 'Total user_profiles: %', v_count;
  RAISE NOTICE '';
  
  IF v_count = 0 THEN
    RAISE NOTICE '❌ NO USER PROFILES FOUND!';
    RAISE NOTICE '   This is the problem - user_profiles are not being created';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE 'User profiles:';
    FOR v_profile IN (
      SELECT 
        email,
        name,
        role,
        organization_id,
        created_at::date as created
      FROM user_profiles
      ORDER BY created_at DESC
    )
    LOOP
      RAISE NOTICE '  • % (%) - Role: % - Org: % - Created: %', 
        v_profile.name, v_profile.email, v_profile.role, 
        LEFT(v_profile.organization_id::text, 8), v_profile.created;
    END LOOP;
    RAISE NOTICE '';
  END IF;
END $$;

-- =====================================================
-- STEP 3: CHECK SYNC STATUS
-- =====================================================

DO $$
DECLARE
  v_sync RECORD;
  v_orphaned_auth INTEGER;
  v_orphaned_profile INTEGER;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔄 STEP 3: Checking sync status...';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Count orphaned auth users
  SELECT COUNT(*) INTO v_orphaned_auth
  FROM auth.users au
  LEFT JOIN user_profiles up ON au.id = up.id
  WHERE up.id IS NULL;
  
  -- Count orphaned profiles
  SELECT COUNT(*) INTO v_orphaned_profile
  FROM user_profiles up
  LEFT JOIN auth.users au ON up.id = au.id
  WHERE au.id IS NULL;
  
  RAISE NOTICE 'Orphaned auth.users (no profile): %', v_orphaned_auth;
  RAISE NOTICE 'Orphaned user_profiles (no auth): %', v_orphaned_profile;
  RAISE NOTICE '';
  
  IF v_orphaned_auth > 0 THEN
    RAISE NOTICE '⚠️  Found % orphaned auth.users:', v_orphaned_auth;
    FOR v_sync IN (
      SELECT au.email, au.created_at::date as created
      FROM auth.users au
      LEFT JOIN user_profiles up ON au.id = up.id
      WHERE up.id IS NULL
      ORDER BY au.created_at DESC
    )
    LOOP
      RAISE NOTICE '  • % (created: %)', v_sync.email, v_sync.created;
    END LOOP;
    RAISE NOTICE '';
    RAISE NOTICE '   These users exist in auth but have no profile!';
    RAISE NOTICE '   This is why they do not show in the UI.';
    RAISE NOTICE '';
  END IF;
  
  IF v_orphaned_profile > 0 THEN
    RAISE NOTICE '⚠️  Found % orphaned user_profiles:', v_orphaned_profile;
    FOR v_sync IN (
      SELECT up.email, up.name, up.created_at::date as created
      FROM user_profiles up
      LEFT JOIN auth.users au ON up.id = au.id
      WHERE au.id IS NULL
      ORDER BY up.created_at DESC
    )
    LOOP
      RAISE NOTICE '  • % - % (created: %)', v_sync.name, v_sync.email, v_sync.created;
    END LOOP;
    RAISE NOTICE '';
    RAISE NOTICE '   These profiles exist but have no auth user!';
    RAISE NOTICE '   They show in UI but cannot login.';
    RAISE NOTICE '';
  END IF;
  
  IF v_orphaned_auth = 0 AND v_orphaned_profile = 0 THEN
    RAISE NOTICE '✅ All users are in sync!';
    RAISE NOTICE '';
  END IF;
END $$;

-- =====================================================
-- STEP 4: CHECK RLS POLICIES
-- =====================================================

DO $$
DECLARE
  v_policy RECORD;
  v_select_count INTEGER;
  v_insert_count INTEGER;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔒 STEP 4: Checking RLS policies...';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Check if RLS is enabled
  IF (SELECT relrowsecurity FROM pg_class WHERE relname = 'user_profiles') THEN
    RAISE NOTICE '✅ RLS is enabled on user_profiles';
  ELSE
    RAISE NOTICE '❌ RLS is NOT enabled on user_profiles';
  END IF;
  RAISE NOTICE '';
  
  -- Count SELECT policies
  SELECT COUNT(*) INTO v_select_count
  FROM pg_policies
  WHERE tablename = 'user_profiles'
  AND cmd = 'SELECT';
  
  -- Count INSERT policies
  SELECT COUNT(*) INTO v_insert_count
  FROM pg_policies
  WHERE tablename = 'user_profiles'
  AND cmd = 'INSERT';
  
  RAISE NOTICE 'SELECT policies: %', v_select_count;
  RAISE NOTICE 'INSERT policies: %', v_insert_count;
  RAISE NOTICE '';
  
  IF v_select_count = 0 THEN
    RAISE NOTICE '❌ NO SELECT POLICY!';
    RAISE NOTICE '   This could prevent users from appearing in the list.';
    RAISE NOTICE '';
  END IF;
  
  IF v_insert_count = 0 THEN
    RAISE NOTICE '⚠️  NO INSERT POLICY!';
    RAISE NOTICE '   This could prevent new users from being created.';
    RAISE NOTICE '';
  END IF;
  
  RAISE NOTICE 'All policies on user_profiles:';
  FOR v_policy IN (
    SELECT 
      policyname,
      cmd,
      CASE WHEN qual IS NOT NULL THEN LEFT(qual, 50) ELSE 'true' END as policy_check
    FROM pg_policies
    WHERE tablename = 'user_profiles'
    ORDER BY cmd, policyname
  )
  LOOP
    RAISE NOTICE '  • % - % - %', v_policy.cmd, v_policy.policyname, v_policy.policy_check;
  END LOOP;
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 5: TEST THE EXACT QUERY THE APP USES
-- =====================================================

DO $$
DECLARE
  v_org_id UUID;
  v_user_count INTEGER;
  v_user RECORD;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🧪 STEP 5: Testing app query...';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Get the first organization
  SELECT id INTO v_org_id FROM organizations ORDER BY created_at LIMIT 1;
  
  IF v_org_id IS NULL THEN
    RAISE NOTICE '❌ NO ORGANIZATION FOUND!';
    RAISE NOTICE '   Cannot test query without an organization.';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE 'Testing with organization_id: %', v_org_id;
    RAISE NOTICE '';
    
    -- This is the exact query the app runs
    SELECT COUNT(*) INTO v_user_count
    FROM user_profiles
    WHERE organization_id = v_org_id;
    
    RAISE NOTICE 'Query result: % users found', v_user_count;
    RAISE NOTICE '';
    
    IF v_user_count = 0 THEN
      RAISE NOTICE '❌ QUERY RETURNS 0 USERS!';
      RAISE NOTICE '   This is the problem!';
      RAISE NOTICE '';
      
      -- Check if users exist with different org_id
      SELECT COUNT(*) INTO v_user_count FROM user_profiles;
      IF v_user_count > 0 THEN
        RAISE NOTICE '⚠️  But user_profiles table has % records total.', v_user_count;
        RAISE NOTICE '   They might have a different organization_id.';
        RAISE NOTICE '';
        
        RAISE NOTICE 'User profiles by organization:';
        FOR v_user IN (
          SELECT 
            organization_id,
            COUNT(*) as count,
            STRING_AGG(email, ', ') as emails
          FROM user_profiles
          GROUP BY organization_id
        )
        LOOP
          RAISE NOTICE '  • Org %: % users - %', 
            LEFT(v_user.organization_id::text, 8), v_user.count, v_user.emails;
        END LOOP;
        RAISE NOTICE '';
      END IF;
    ELSE
      RAISE NOTICE '✅ Query works! Found % users:', v_user_count;
      FOR v_user IN (
        SELECT email, name, role
        FROM user_profiles
        WHERE organization_id = v_org_id
        ORDER BY created_at
      )
      LOOP
        RAISE NOTICE '  • % - % (%)', v_user.name, v_user.email, v_user.role;
      END LOOP;
      RAISE NOTICE '';
    END IF;
  END IF;
END $$;

-- =====================================================
-- STEP 6: CHECK IF TRIGGER EXISTS
-- =====================================================

DO $$
DECLARE
  v_trigger_exists BOOLEAN;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '⚡ STEP 6: Checking triggers...';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Check if handle_new_user trigger exists
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) INTO v_trigger_exists;
  
  IF v_trigger_exists THEN
    RAISE NOTICE '✅ Trigger exists: on_auth_user_created';
  ELSE
    RAISE NOTICE '❌ Trigger NOT found: on_auth_user_created';
    RAISE NOTICE '   This trigger should auto-create user_profiles when auth.users is created.';
  END IF;
  RAISE NOTICE '';
END $$;

-- =====================================================
-- FINAL DIAGNOSIS
-- =====================================================

DO $$
DECLARE
  v_auth_count INTEGER;
  v_profile_count INTEGER;
  v_orphaned_auth INTEGER;
  v_orphaned_profile INTEGER;
  v_select_policy INTEGER;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🎯 FINAL DIAGNOSIS';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  SELECT COUNT(*) INTO v_auth_count FROM auth.users;
  SELECT COUNT(*) INTO v_profile_count FROM user_profiles;
  
  SELECT COUNT(*) INTO v_orphaned_auth
  FROM auth.users au
  LEFT JOIN user_profiles up ON au.id = up.id
  WHERE up.id IS NULL;
  
  SELECT COUNT(*) INTO v_orphaned_profile
  FROM user_profiles up
  LEFT JOIN auth.users au ON up.id = au.id
  WHERE au.id IS NULL;
  
  SELECT COUNT(*) INTO v_select_policy
  FROM pg_policies
  WHERE tablename = 'user_profiles' AND cmd = 'SELECT';
  
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  auth.users: %', v_auth_count;
  RAISE NOTICE '  user_profiles: %', v_profile_count;
  RAISE NOTICE '  Orphaned auth: %', v_orphaned_auth;
  RAISE NOTICE '  Orphaned profiles: %', v_orphaned_profile;
  RAISE NOTICE '  SELECT policies: %', v_select_policy;
  RAISE NOTICE '';
  
  IF v_orphaned_auth > 0 THEN
    RAISE NOTICE '🔴 PROBLEM FOUND: % users exist in auth but have NO profile', v_orphaned_auth;
    RAISE NOTICE '';
    RAISE NOTICE '   This is why new users do not appear!';
    RAISE NOTICE '';
    RAISE NOTICE '   ROOT CAUSE: User creation is failing at profile creation step.';
    RAISE NOTICE '';
    RAISE NOTICE '   SOLUTION: Run the fix script to create missing profiles.';
    RAISE NOTICE '   File: 🔧_CREATE_MISSING_PROFILES.sql';
    RAISE NOTICE '';
  ELSIF v_select_policy = 0 THEN
    RAISE NOTICE '🔴 PROBLEM FOUND: No SELECT policy on user_profiles';
    RAISE NOTICE '';
    RAISE NOTICE '   Users might exist but RLS is blocking the query.';
    RAISE NOTICE '';
    RAISE NOTICE '   SOLUTION: Add a permissive SELECT policy.';
    RAISE NOTICE '';
  ELSIF v_auth_count = v_profile_count AND v_orphaned_auth = 0 THEN
    RAISE NOTICE '✅ DATABASE LOOKS GOOD!';
    RAISE NOTICE '';
    RAISE NOTICE '   Auth and profiles are in sync.';
    RAISE NOTICE '';
    RAISE NOTICE '   If users still do not show in the UI:';
    RAISE NOTICE '   1. Check browser console (F12) for errors';
    RAISE NOTICE '   2. Verify the organization_id matches';
    RAISE NOTICE '   3. Hard refresh the page (Ctrl+Shift+R)';
    RAISE NOTICE '   4. Check network tab for API errors';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '⚠️  MULTIPLE ISSUES DETECTED';
    RAISE NOTICE '';
    RAISE NOTICE '   Run the full cleanup and fix script.';
    RAISE NOTICE '';
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;
