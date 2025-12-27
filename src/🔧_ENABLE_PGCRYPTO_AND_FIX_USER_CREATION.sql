providers', ARRAY['email']),
    jsonb_build_object('name', v_name),
    false,
    'authenticated',
    'authenticated',
    encode(gen_random_bytes(32), 'hex'),
    encode(gen_random_bytes(32), 'hex')
  );
  
  RAISE NOTICE '✅ Auth user created with ID: %', v_user_id;
  
  -- ==========================================
  -- CREATE USER PROFILE
  -- ==========================================
  
  INSERT INTO user_profiles (
    id,
    organization_id,
    email,
    name,
    role,
    branch_id,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    p_org_id,
    v_email,
    v_name,
    v_role,
    v_branch_id,
    NOW(),
    NOW()
  );
  
  RAISE NOTICE '✅ User profile created';
  
  -- Return success with user data
  RETURN jsonb_build_object(
    'success', true,
    'user', jsonb_build_object(
      'id', v_user_id,
      'email', v_email,
      'name', v_name,
      'role', v_role,
      'organization_id', p_org_id,
      'branch_id', v_branch_id
    )
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create user: %', SQLERRM;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_organization_user_secure(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION create_organization_user_secure(uuid, jsonb) TO service_role;

RAISE NOTICE '';
RAISE NOTICE '════════════════════════════════════════════════════════════════';
RAISE NOTICE '✅ USER CREATION FUNCTION CREATED!';
RAISE NOTICE '════════════════════════════════════════════════════════════════';
RAISE NOTICE '';
RAISE NOTICE 'This function creates BOTH:';
RAISE NOTICE '  1. ✅ Auth user (auth.users) - for login';
RAISE NOTICE '  2. ✅ User profile (user_profiles) - for role/branch';
RAISE NOTICE '';
RAISE NOTICE 'Password hashing:';
RAISE NOTICE '  ✅ Uses pgcrypto extension';
RAISE NOTICE '  ✅ Bcrypt algorithm (gen_salt(''bf''))';
RAISE NOTICE '  ✅ Secure password storage';
RAISE NOTICE '';

-- ==========================================
-- STEP 3: VERIFY SETUP
-- ==========================================

DO $$
DECLARE
  v_pgcrypto_enabled boolean;
  v_function_exists boolean;
  v_count_auth integer;
  v_count_profiles integer;
  v_count_orphans integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔍 VERIFYING SETUP';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Check pgcrypto extension
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
  ) INTO v_pgcrypto_enabled;
  
  -- Check function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'create_organization_user_secure'
  ) INTO v_function_exists;
  
  -- Count users
  SELECT COUNT(*) INTO v_count_auth FROM auth.users;
  SELECT COUNT(*) INTO v_count_profiles FROM user_profiles;
  SELECT COUNT(*) INTO v_count_orphans 
  FROM user_profiles up
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.users au WHERE au.id = up.id
  );
  
  RAISE NOTICE 'Extensions:';
  RAISE NOTICE '  - pgcrypto: %', CASE WHEN v_pgcrypto_enabled THEN '✅ ENABLED' ELSE '❌ MISSING' END;
  RAISE NOTICE '';
  
  RAISE NOTICE 'Functions:';
  RAISE NOTICE '  - create_organization_user_secure: %', CASE WHEN v_function_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '';
  
  RAISE NOTICE 'Current Users:';
  RAISE NOTICE '  - Auth users (can login): %', v_count_auth;
  RAISE NOTICE '  - User profiles: %', v_count_profiles;
  RAISE NOTICE '  - Orphan profiles (NO auth): %', v_count_orphans;
  RAISE NOTICE '';
  
  IF v_count_orphans > 0 THEN
    RAISE NOTICE '⚠️  WARNING: % users cannot login (no auth account)', v_count_orphans;
    RAISE NOTICE '   These users exist in user_profiles but NOT in auth.users';
    RAISE NOTICE '   You can delete them and recreate via the app';
    RAISE NOTICE '';
  END IF;
  
  IF v_pgcrypto_enabled AND v_function_exists THEN
    RAISE NOTICE '✅ ALL CHECKS PASSED!';
    RAISE NOTICE '';
    RAISE NOTICE 'You can now:';
    RAISE NOTICE '  1. Refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)';
    RAISE NOTICE '  2. Go to the Users page in your app';
    RAISE NOTICE '  3. Click "Add User" button';
    RAISE NOTICE '  4. Fill in user details';
    RAISE NOTICE '  5. Submit - user will be created with login access!';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '❌ SETUP INCOMPLETE!';
    RAISE NOTICE '   Please check the errors above';
    RAISE NOTICE '';
  END IF;
  
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
END $$;

-- ==========================================
-- STEP 4: TEST THE FUNCTION (OPTIONAL)
-- ==========================================

-- Uncomment to test creating a user:
-- Replace YOUR_ORG_ID and YOUR_BRANCH_ID with actual UUIDs from your database
/*
SELECT create_organization_user_secure(
  'YOUR_ORG_ID'::uuid,
  jsonb_build_object(
    'name', 'Test Cashier',
    'email', 'test.cashier@example.com',
    'password', 'SecurePass123!',
    'role', 'cashier',
    'branchId', 'YOUR_BRANCH_ID'
  )
);
*/

-- ==========================================
-- STEP 5: LIST ORPHAN PROFILES (if any)
-- ==========================================

DO $$
DECLARE
  v_profile RECORD;
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM user_profiles up
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.users au WHERE au.id = up.id
  );
  
  IF v_count > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '⚠️  ORPHAN USER PROFILES (Cannot Login)';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'The following users exist in user_profiles but NOT in auth.users:';
    RAISE NOTICE '(They cannot login until you fix them)';
    RAISE NOTICE '';
    
    FOR v_profile IN 
      SELECT up.id, up.name, up.email, up.role, up.branch_id
      FROM user_profiles up
      WHERE NOT EXISTS (
        SELECT 1 FROM auth.users au WHERE au.id = up.id
      )
      ORDER BY up.created_at
    LOOP
      RAISE NOTICE '  ❌ % (%) - Role: %', 
        v_profile.name,
        v_profile.email,
        v_profile.role;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '💡 TO FIX ORPHAN USERS:';
    RAISE NOTICE '   Option 1 (RECOMMENDED): Delete them from the UI and recreate';
    RAISE NOTICE '   Option 2: Create auth users manually via Supabase Dashboard';
    RAISE NOTICE '   Option 3: Run the fix script below (uncomment STEP 6)';
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
  END IF;
END $$;

-- ==========================================
-- STEP 6: OPTIONAL - CREATE AUTH FOR EXISTING ORPHAN PROFILES
-- ==========================================

-- ⚠️  UNCOMMENT CAREFULLY! This will create auth users with default password
-- Make sure to change the default password and inform users!
/*
DO $$
DECLARE
  v_profile RECORD;
  v_default_password text := 'ChangeMe123!'; -- ⚠️  CHANGE THIS PASSWORD!
  v_created integer := 0;
  v_failed integer := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔧 CREATING AUTH USERS FOR ORPHAN PROFILES';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Default password: %', v_default_password;
  RAISE NOTICE '⚠️  Make sure users change this password after first login!';
  RAISE NOTICE '';
  
  FOR v_profile IN 
    SELECT up.id, up.name, up.email, up.role
    FROM user_profiles up
    WHERE NOT EXISTS (
      SELECT 1 FROM auth.users au WHERE au.id = up.id
    )
  LOOP
    BEGIN
      INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        role,
        aud,
        confirmation_token,
        recovery_token
      )
      VALUES (
        v_profile.id,
        '00000000-0000-0000-0000-000000000000',
        v_profile.email,
        crypt(v_default_password, gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
        jsonb_build_object('name', v_profile.name),
        false,
        'authenticated',
        'authenticated',
        encode(gen_random_bytes(32), 'hex'),
        encode(gen_random_bytes(32), 'hex')
      );
      
      v_created := v_created + 1;
      RAISE NOTICE '  ✅ % (%) - Password: %', 
        v_profile.name,
        v_profile.email,
        v_default_password;
        
    EXCEPTION
      WHEN OTHERS THEN
        v_failed := v_failed + 1;
        RAISE NOTICE '  ❌ Failed: % - %', v_profile.email, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  ✅ Created: % auth users', v_created;
  RAISE NOTICE '  ❌ Failed: %', v_failed;
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Tell users to change password "%"', v_default_password;
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
END $$;
*/

-- ==========================================
-- STEP 7: OPTIONAL - DELETE ORPHAN PROFILES
-- ==========================================

-- ⚠️  UNCOMMENT CAREFULLY! This will DELETE user profiles without auth
-- This is destructive and cannot be undone!
/*
DO $$
DECLARE
  v_deleted integer;
BEGIN
  WITH deleted AS (
    DELETE FROM user_profiles
    WHERE NOT EXISTS (
      SELECT 1 FROM auth.users au WHERE au.id = user_profiles.id
    )
    RETURNING *
  )
  SELECT COUNT(*) INTO v_deleted FROM deleted;
  
  RAISE NOTICE '';
  RAISE NOTICE '🗑️  Deleted % orphan user profiles', v_deleted;
  RAISE NOTICE '   These users can now be recreated via the app';
  RAISE NOTICE '';
END $$;
*/
