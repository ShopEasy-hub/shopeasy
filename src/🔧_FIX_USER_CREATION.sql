-- ==========================================
-- 🔧 FIX USER CREATION - ENABLE AUTH USER CREATION
-- This creates a PostgreSQL function that creates BOTH:
-- 1. Auth user (for login)
-- 2. User profile (for role, branch, etc.)
-- ==========================================

-- ==========================================
-- STEP 1: CREATE SECURE USER CREATION FUNCTION
-- ==========================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS create_organization_user_secure(uuid, jsonb);

-- Create the function with correct auth user creation
CREATE OR REPLACE FUNCTION create_organization_user_secure(
  p_org_id uuid,
  p_user_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_name text;
  v_email text;
  v_password text;
  v_role text;
  v_branch_id uuid;
  v_auth_user_exists boolean;
BEGIN
  -- Extract user data from JSON
  v_name := p_user_data->>'name';
  v_email := p_user_data->>'email';
  v_password := p_user_data->>'password';
  v_role := p_user_data->>'role';
  v_branch_id := (p_user_data->>'branchId')::uuid;
  
  RAISE NOTICE '📝 Creating user: % with role: %', v_email, v_role;
  
  -- Generate new user ID
  v_user_id := gen_random_uuid();
  
  -- ==========================================
  -- CRITICAL: CREATE AUTH USER FIRST
  -- ==========================================
  
  -- Check if auth user already exists
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = v_email
  ) INTO v_auth_user_exists;
  
  IF v_auth_user_exists THEN
    RAISE EXCEPTION 'User with email % already exists', v_email;
  END IF;
  
  -- Insert into auth.users (this is what makes login work!)
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
    v_user_id,
    '00000000-0000-0000-0000-000000000000', -- Default instance ID
    v_email,
    crypt(v_password, gen_salt('bf')), -- Hash the password
    NOW(), -- Auto-confirm email
    NOW(),
    NOW(),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
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
RAISE NOTICE 'Now you can:';
RAISE NOTICE '  - Add users from the Users page in your app';
RAISE NOTICE '  - Users will be able to login immediately';
RAISE NOTICE '  - Passwords will be hashed securely';
RAISE NOTICE '';
RAISE NOTICE '════════════════════════════════════════════════════════════════';

-- ==========================================
-- STEP 2: TEST THE FUNCTION (OPTIONAL)
-- ==========================================

-- Uncomment to test creating a user:
/*
SELECT create_organization_user_secure(
  'YOUR_ORG_ID_HERE'::uuid,
  jsonb_build_object(
    'name', 'Test Cashier',
    'email', 'cashier@test.com',
    'password', 'test123',
    'role', 'cashier',
    'branchId', 'YOUR_BRANCH_ID_HERE'
  )
);
*/

-- ==========================================
-- STEP 3: CHECK EXISTING USERS
-- ==========================================

DO $$
DECLARE
  v_profile RECORD;
  v_auth_exists boolean;
  v_count_auth integer;
  v_count_profiles integer;
  v_count_orphans integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '👥 CHECKING EXISTING USERS';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  SELECT COUNT(*) INTO v_count_auth FROM auth.users;
  SELECT COUNT(*) INTO v_count_profiles FROM user_profiles;
  SELECT COUNT(*) INTO v_count_orphans 
  FROM user_profiles up
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.users au WHERE au.id = up.id
  );
  
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  - Auth users (can login): %', v_count_auth;
  RAISE NOTICE '  - User profiles: %', v_count_profiles;
  RAISE NOTICE '  - Orphan profiles (NO auth): %', v_count_orphans;
  RAISE NOTICE '';
  
  IF v_count_orphans > 0 THEN
    RAISE NOTICE '⚠️  FOUND % USERS WITHOUT AUTH ACCESS!', v_count_orphans;
    RAISE NOTICE '';
    RAISE NOTICE 'These users have profiles but CANNOT login:';
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
    RAISE NOTICE '   Option 1: Delete them and recreate via the app';
    RAISE NOTICE '   Option 2: Create auth users manually in Supabase Dashboard';
    RAISE NOTICE '   Option 3: Run the fix below (uncomment and modify)';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '✅ All users have auth access!';
    RAISE NOTICE '';
  END IF;
  
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ READY TO CREATE NEW USERS!';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Refresh your app browser (Ctrl+Shift+R)';
  RAISE NOTICE '  2. Go to Users page';
  RAISE NOTICE '  3. Click "Add User"';
  RAISE NOTICE '  4. Fill in details and submit';
  RAISE NOTICE '  5. User can login immediately!';
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
END $$;

-- ==========================================
-- STEP 4: OPTIONAL - DELETE ORPHAN PROFILES
-- ==========================================

-- Uncomment to DELETE user profiles that don't have auth access:
-- WARNING: This will permanently delete these users!
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
  
  RAISE NOTICE '🗑️  Deleted % orphan user profiles', v_deleted;
END $$;
*/

-- ==========================================
-- STEP 5: OPTIONAL - CREATE AUTH FOR EXISTING PROFILES
-- ==========================================

-- Uncomment to create auth users for existing profiles:
-- NOTE: You need to set passwords for each user!
/*
DO $$
DECLARE
  v_profile RECORD;
  v_default_password text := 'ChangeMe123!'; -- CHANGE THIS!
BEGIN
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
        aud
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
        'authenticated'
      );
      
      RAISE NOTICE '✅ Created auth for: % (%) - Password: %', 
        v_profile.name,
        v_profile.email,
        v_default_password;
        
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '❌ Failed to create auth for %: %', v_profile.email, SQLERRM;
    END;
  END LOOP;
END $$;
*/
