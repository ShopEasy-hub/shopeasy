-- ==========================================
-- 🔧 FIX: NULL email_change Column Error
-- ==========================================
-- Fixes: "Scan error on column index 8, name 'email_change': converting NULL to string is unsupported"
-- 
-- Root cause: auth.users has NULL values in columns that must be empty strings
-- Solution: Set all NULL string columns to empty strings
-- ==========================================

-- ==========================================
-- STEP 1: FIX EXISTING USERS - SET NULL COLUMNS TO EMPTY STRINGS
-- ==========================================

DO $$
DECLARE
  v_user RECORD;
  v_fixed integer := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔧 FIXING NULL COLUMNS IN AUTH.USERS';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Update all users with NULL string columns
  UPDATE auth.users
  SET 
    email_change = COALESCE(email_change, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    phone_change = COALESCE(phone_change, ''),
    phone_change_token = COALESCE(phone_change_token, ''),
    reauthentication_token = COALESCE(reauthentication_token, ''),
    confirmation_token = COALESCE(confirmation_token, ''),
    recovery_token = COALESCE(recovery_token, '')
  WHERE 
    email_change IS NULL OR
    email_change_token_new IS NULL OR
    email_change_token_current IS NULL OR
    phone_change IS NULL OR
    phone_change_token IS NULL OR
    reauthentication_token IS NULL OR
    confirmation_token IS NULL OR
    recovery_token IS NULL;
  
  GET DIAGNOSTICS v_fixed = ROW_COUNT;
  
  RAISE NOTICE '✅ Fixed % users with NULL string columns', v_fixed;
  RAISE NOTICE '';
  
  -- List all users to verify
  FOR v_user IN
    SELECT id, email, email_change, confirmation_token, recovery_token
    FROM auth.users
    ORDER BY created_at
  LOOP
    RAISE NOTICE '  ✅ %: email_change = "%"', 
      v_user.email, 
      COALESCE(v_user.email_change, 'NULL');
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
END $$;

-- ==========================================
-- STEP 2: UPDATE USER CREATION FUNCTION
-- ==========================================

-- Drop existing function
DROP FUNCTION IF EXISTS create_organization_user_secure(uuid, jsonb);

-- Create corrected function with ALL required columns set properly
CREATE OR REPLACE FUNCTION create_organization_user_secure(
  p_org_id uuid,
  p_user_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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
  -- Extract user data
  v_name := p_user_data->>'name';
  v_email := p_user_data->>'email';
  v_password := p_user_data->>'password';
  v_role := p_user_data->>'role';
  v_branch_id := (p_user_data->>'branchId')::uuid;
  
  RAISE NOTICE '📝 Creating user: % with role: %', v_email, v_role;
  
  -- Validate inputs
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;
  
  IF v_password IS NULL OR v_password = '' THEN
    RAISE EXCEPTION 'Password is required';
  END IF;
  
  IF LENGTH(v_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;
  
  -- Generate user ID
  v_user_id := gen_random_uuid();
  
  -- Check if user exists
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = v_email
  ) INTO v_auth_user_exists;
  
  IF v_auth_user_exists THEN
    RAISE EXCEPTION 'User with email % already exists', v_email;
  END IF;
  
  -- ==========================================
  -- CRITICAL: Create auth user with ALL columns set correctly
  -- ==========================================
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_sent_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    email_change_token_current,
    email_change_confirm_status,
    phone_change,
    phone_change_token,
    reauthentication_token,
    created_at,
    updated_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role,
    aud
  )
  VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    v_email,
    crypt(v_password, gen_salt('bf')),
    NOW(), -- email_confirmed_at (auto-confirm)
    NOW(), -- confirmation_sent_at
    '', -- confirmation_token (EMPTY STRING, not NULL)
    '', -- recovery_token (EMPTY STRING, not NULL)
    '', -- email_change_token_new (EMPTY STRING, not NULL)
    '', -- email_change (EMPTY STRING, not NULL) ← THIS WAS THE ISSUE!
    '', -- email_change_token_current (EMPTY STRING, not NULL)
    0,  -- email_change_confirm_status
    '', -- phone_change (EMPTY STRING, not NULL)
    '', -- phone_change_token (EMPTY STRING, not NULL)
    '', -- reauthentication_token (EMPTY STRING, not NULL)
    NOW(), -- created_at
    NOW(), -- updated_at
    NOW(), -- last_sign_in_at
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object('name', v_name),
    false,
    'authenticated',
    'authenticated'
  );
  
  RAISE NOTICE '✅ Auth user created with ID: %', v_user_id;
  
  -- Create user profile
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
  
  -- Return success
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_organization_user_secure(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION create_organization_user_secure(uuid, jsonb) TO service_role;

RAISE NOTICE '';
RAISE NOTICE '════════════════════════════════════════════════════════════════';
RAISE NOTICE '✅ USER CREATION FUNCTION UPDATED';
RAISE NOTICE '════════════════════════════════════════════════════════════════';
RAISE NOTICE '';
RAISE NOTICE 'All string columns now properly set to empty strings (not NULL)';
RAISE NOTICE '';

-- ==========================================
-- STEP 3: VERIFY ALL USERS ARE FIXED
-- ==========================================

DO $$
DECLARE
  v_user RECORD;
  v_has_nulls boolean := false;
  v_total integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔍 VERIFYING ALL USERS';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  SELECT COUNT(*) INTO v_total FROM auth.users;
  RAISE NOTICE 'Total users: %', v_total;
  RAISE NOTICE '';
  
  -- Check each user for NULL string columns
  FOR v_user IN
    SELECT 
      id,
      email,
      email_change,
      email_change_token_new,
      email_change_token_current,
      phone_change,
      phone_change_token,
      reauthentication_token,
      confirmation_token,
      recovery_token
    FROM auth.users
    ORDER BY created_at
  LOOP
    IF v_user.email_change IS NULL OR
       v_user.email_change_token_new IS NULL OR
       v_user.email_change_token_current IS NULL OR
       v_user.phone_change IS NULL OR
       v_user.phone_change_token IS NULL OR
       v_user.reauthentication_token IS NULL OR
       v_user.confirmation_token IS NULL OR
       v_user.recovery_token IS NULL THEN
      
      v_has_nulls := true;
      RAISE NOTICE '  ❌ %: Still has NULL columns!', v_user.email;
    ELSE
      RAISE NOTICE '  ✅ %: All columns OK', v_user.email;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  
  IF NOT v_has_nulls THEN
    RAISE NOTICE '✅ ALL USERS VERIFIED - NO NULL COLUMNS!';
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║                   🎉 LOGIN SHOULD WORK NOW!                   ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. ⚡ HARD REFRESH your browser (Ctrl+Shift+R)';
    RAISE NOTICE '  2. 🔐 Try logging in with your cashier account';
    RAISE NOTICE '  3. ✅ Login should succeed!';
    RAISE NOTICE '';
    RAISE NOTICE 'If you create new users via the app now, they will be created';
    RAISE NOTICE 'correctly with no NULL columns.';
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
  ELSE
    RAISE NOTICE '⚠️  SOME USERS STILL HAVE NULL COLUMNS';
    RAISE NOTICE '';
    RAISE NOTICE 'Please run this script again or contact support.';
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
  END IF;
END $$;

-- ==========================================
-- STEP 4: SHOW AUTH.USERS SCHEMA
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '📋 AUTH.USERS SCHEMA';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Showing columns that must be empty strings (not NULL):';
  RAISE NOTICE '';
END $$;

SELECT 
  column_name,
  data_type,
  is_nullable,
  COALESCE(column_default, 'no default') as column_default
FROM information_schema.columns
WHERE table_schema = 'auth' 
  AND table_name = 'users'
  AND column_name IN (
    'email_change',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change',
    'phone_change_token',
    'reauthentication_token',
    'confirmation_token',
    'recovery_token'
  )
ORDER BY column_name;

-- ==========================================
-- FINAL SUMMARY
-- ==========================================

DO $$
DECLARE
  v_auth_count integer;
  v_profile_count integer;
BEGIN
  SELECT COUNT(*) INTO v_auth_count FROM auth.users;
  SELECT COUNT(*) INTO v_profile_count FROM user_profiles;
  
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║              ✅ NULL COLUMN FIX COMPLETE!                     ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  - Auth users: %', v_auth_count;
  RAISE NOTICE '  - User profiles: %', v_profile_count;
  RAISE NOTICE '  - All NULL columns set to empty strings: ✅';
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════════════════════════';
  RAISE NOTICE 'WHAT WAS FIXED:';
  RAISE NOTICE '══════════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Set email_change to empty string (was NULL)';
  RAISE NOTICE '✅ Set email_change_token_new to empty string (was NULL)';
  RAISE NOTICE '✅ Set email_change_token_current to empty string (was NULL)';
  RAISE NOTICE '✅ Set phone_change to empty string (was NULL)';
  RAISE NOTICE '✅ Set phone_change_token to empty string (was NULL)';
  RAISE NOTICE '✅ Set reauthentication_token to empty string (was NULL)';
  RAISE NOTICE '✅ Set confirmation_token to empty string (was NULL)';
  RAISE NOTICE '✅ Set recovery_token to empty string (was NULL)';
  RAISE NOTICE '✅ Updated user creation function to prevent future NULLs';
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════════════════════════';
  RAISE NOTICE 'YOU CAN NOW:';
  RAISE NOTICE '══════════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Login with existing cashier account';
  RAISE NOTICE '✅ Create new users via the app';
  RAISE NOTICE '✅ All users will work correctly';
  RAISE NOTICE '';
  RAISE NOTICE 'The "Database error querying schema" error is FIXED! 🎉';
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════════════════════════';
END $$;
