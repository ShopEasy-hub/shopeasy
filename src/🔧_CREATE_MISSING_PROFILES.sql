-- =====================================================
-- 🔧 FIX: Create Missing User Profiles
-- =====================================================
-- Creates user_profiles for auth.users that don't have them
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔧 CREATING MISSING USER PROFILES';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 1: FIND ORPHANED AUTH USERS
-- =====================================================

DO $$
DECLARE
  v_orphan RECORD;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔍 STEP 1: Finding orphaned auth.users...';
  RAISE NOTICE '';
  
  FOR v_orphan IN (
    SELECT 
      au.id,
      au.email,
      au.created_at
    FROM auth.users au
    LEFT JOIN user_profiles up ON au.id = up.id
    WHERE up.id IS NULL
    ORDER BY au.created_at
  )
  LOOP
    v_count := v_count + 1;
    RAISE NOTICE '  % - % (created: %)', v_count, v_orphan.email, v_orphan.created_at::date;
  END LOOP;
  
  IF v_count = 0 THEN
    RAISE NOTICE '  ✅ No orphaned auth.users found!';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '  Found % orphaned auth.users', v_count;
  END IF;
  
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 2: GET ORGANIZATION ID
-- =====================================================

DO $$
DECLARE
  v_org_id UUID;
  v_org_name TEXT;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🏢 STEP 2: Finding organization...';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Get the first organization (most likely the only one)
  SELECT id, name INTO v_org_id, v_org_name 
  FROM organizations 
  ORDER BY created_at 
  LIMIT 1;
  
  IF v_org_id IS NULL THEN
    RAISE NOTICE '❌ NO ORGANIZATION FOUND!';
    RAISE NOTICE '   Cannot create profiles without an organization.';
    RAISE NOTICE '   Create an organization first.';
  ELSE
    RAISE NOTICE '✅ Using organization: %', v_org_name;
    RAISE NOTICE '   ID: %', v_org_id;
  END IF;
  
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 3: CREATE MISSING PROFILES
-- =====================================================

DO $$
DECLARE
  v_org_id UUID;
  v_auth_user RECORD;
  v_created_count INTEGER := 0;
  v_user_metadata JSONB;
  v_role TEXT;
  v_name TEXT;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✨ STEP 3: Creating missing profiles...';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Get the organization
  SELECT id INTO v_org_id FROM organizations ORDER BY created_at LIMIT 1;
  
  IF v_org_id IS NULL THEN
    RAISE NOTICE '❌ Cannot proceed without organization.';
    RETURN;
  END IF;
  
  -- Loop through orphaned auth.users
  FOR v_auth_user IN (
    SELECT 
      au.id,
      au.email,
      au.raw_user_meta_data,
      au.created_at
    FROM auth.users au
    LEFT JOIN user_profiles up ON au.id = up.id
    WHERE up.id IS NULL
    ORDER BY au.created_at
  )
  LOOP
    -- Try to get metadata from auth.users
    v_user_metadata := COALESCE(v_auth_user.raw_user_meta_data, '{}'::jsonb);
    
    -- Extract role from metadata, default to 'cashier'
    v_role := COALESCE(v_user_metadata->>'role', 'cashier');
    
    -- Extract name from metadata or use email username
    v_name := COALESCE(
      v_user_metadata->>'name',
      v_user_metadata->>'full_name',
      SPLIT_PART(v_auth_user.email, '@', 1)
    );
    
    -- Create the user profile
    INSERT INTO user_profiles (
      id,
      email,
      name,
      role,
      organization_id,
      status,
      created_at,
      updated_at
    ) VALUES (
      v_auth_user.id,
      v_auth_user.email,
      v_name,
      v_role,
      v_org_id,
      'active',
      v_auth_user.created_at,
      NOW()
    );
    
    v_created_count := v_created_count + 1;
    
    RAISE NOTICE '  ✅ Created profile for: % (role: %)', v_auth_user.email, v_role;
  END LOOP;
  
  RAISE NOTICE '';
  
  IF v_created_count = 0 THEN
    RAISE NOTICE '  ℹ️  No profiles needed to be created.';
  ELSE
    RAISE NOTICE '  ✅ Created % user profiles!', v_created_count;
  END IF;
  
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 4: VERIFY RESULTS
-- =====================================================

DO $$
DECLARE
  v_auth_count INTEGER;
  v_profile_count INTEGER;
  v_orphaned INTEGER;
  v_user RECORD;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ STEP 4: Verification';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  SELECT COUNT(*) INTO v_auth_count FROM auth.users;
  SELECT COUNT(*) INTO v_profile_count FROM user_profiles;
  
  SELECT COUNT(*) INTO v_orphaned
  FROM auth.users au
  LEFT JOIN user_profiles up ON au.id = up.id
  WHERE up.id IS NULL;
  
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  auth.users: %', v_auth_count;
  RAISE NOTICE '  user_profiles: %', v_profile_count;
  RAISE NOTICE '  Orphaned: %', v_orphaned;
  RAISE NOTICE '';
  
  IF v_auth_count = v_profile_count AND v_orphaned = 0 THEN
    RAISE NOTICE '🎉 SUCCESS! All users have profiles!';
    RAISE NOTICE '';
    
    RAISE NOTICE 'All users:';
    FOR v_user IN (
      SELECT 
        up.email,
        up.name,
        up.role,
        up.created_at::date as created
      FROM user_profiles up
      ORDER BY up.created_at
    )
    LOOP
      RAISE NOTICE '  ✅ % - % (%)', v_user.name, v_user.email, v_user.role;
    END LOOP;
  ELSE
    RAISE NOTICE '⚠️  Still have orphaned records: %', v_orphaned;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Refresh your Users page in the app';
  RAISE NOTICE '  2. All users should now appear';
  RAISE NOTICE '  3. If not, open browser console (F12) and check for errors';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;
