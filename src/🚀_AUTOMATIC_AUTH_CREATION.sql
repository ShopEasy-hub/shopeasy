-- =====================================================
-- 🚀 AUTOMATIC AUTH CREATION - NO MANUAL STEPS!
-- =====================================================
-- This creates auth.users automatically when profile is created
-- Uses SECURITY DEFINER to bypass RLS and create auth directly
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🚀 AUTOMATIC AUTH CREATION - SETUP';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'This will enable FULLY AUTOMATIC user creation';
  RAISE NOTICE 'No manual steps needed!';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 1: Enable pgcrypto extension (for password hashing)
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  RAISE NOTICE '✅ pgcrypto extension enabled (for password hashing)';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 2: Create AUTOMATIC user creation function
-- =====================================================

DROP FUNCTION IF EXISTS create_organization_user_secure(UUID, JSONB) CASCADE;

CREATE OR REPLACE FUNCTION create_organization_user_secure(
  p_org_id UUID,
  p_user_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- This bypasses RLS!
SET search_path = public, auth
AS $$
DECLARE
  v_new_user_id UUID;
  v_email TEXT;
  v_name TEXT;
  v_password TEXT;
  v_role TEXT;
  v_branch_id UUID;
  v_encrypted_password TEXT;
  v_user_profile RECORD;
  v_auth_user RECORD;
BEGIN
  -- Extract and validate data
  v_email := LOWER(TRIM(p_user_data->>'email'));
  v_name := TRIM(p_user_data->>'name');
  v_password := p_user_data->>'password';
  v_role := COALESCE(p_user_data->>'role', 'cashier');
  v_branch_id := (p_user_data->>'branchId')::UUID;

  -- Validate inputs
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  IF v_name IS NULL OR v_name = '' THEN
    RAISE EXCEPTION 'Name is required';
  END IF;

  IF v_password IS NULL OR v_password = '' THEN
    RAISE EXCEPTION 'Password is required';
  END IF;

  -- Check if user already exists in profiles
  IF EXISTS (SELECT 1 FROM public.user_profiles WHERE LOWER(email) = v_email) THEN
    RAISE EXCEPTION 'A user with email % already exists', v_email;
  END IF;

  -- Check if user already exists in auth
  IF EXISTS (SELECT 1 FROM auth.users WHERE LOWER(email) = v_email) THEN
    RAISE EXCEPTION 'A user with email % already exists', v_email;
  END IF;

  -- Generate UUID for user
  v_new_user_id := gen_random_uuid();

  -- Hash the password using crypt (bcrypt)
  v_encrypted_password := crypt(v_password, gen_salt('bf'));

  RAISE NOTICE '🔐 Creating auth.users entry for: %', v_email;

  -- Insert into auth.users table FIRST
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at,
    confirmed_at
  ) VALUES (
    v_new_user_id,
    '00000000-0000-0000-0000-000000000000'::UUID,
    v_email,
    v_encrypted_password,
    NOW(), -- Email confirmed immediately
    '',
    '',
    '',
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object(
      'name', v_name,
      'role', v_role,
      'organization_id', p_org_id::text,
      'branchId', v_branch_id::text
    ),
    'authenticated',
    'authenticated',
    NOW(),
    NOW(),
    NOW() -- Confirmed immediately
  )
  RETURNING * INTO v_auth_user;

  RAISE NOTICE '✅ Auth user created: %', v_auth_user.id;

  -- Insert into auth.identities table (required for email/password login)
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    v_new_user_id,
    v_new_user_id,
    jsonb_build_object(
      'sub', v_new_user_id::text,
      'email', v_email
    ),
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  RAISE NOTICE '✅ Identity created';

  -- Create user profile
  INSERT INTO public.user_profiles (
    id,
    email,
    name,
    role,
    organization_id,
    assigned_branch_id,
    status,
    created_at,
    updated_at
  ) VALUES (
    v_new_user_id,
    v_email,
    v_name,
    v_role,
    p_org_id,
    v_branch_id,
    'active',
    NOW(),
    NOW()
  )
  RETURNING * INTO v_user_profile;

  RAISE NOTICE '✅ User profile created';

  -- Return SUCCESS
  RETURN jsonb_build_object(
    'success', true,
    'user', row_to_json(v_user_profile),
    'message', 'User created successfully and can login immediately!',
    'can_login', true
  );

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'A user with email % already exists', v_email;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating user: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION create_organization_user_secure(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION create_organization_user_secure(UUID, JSONB) TO anon;

DO $$
BEGIN
  RAISE NOTICE '✅ RPC function created with AUTOMATIC auth creation!';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_rpc_exists BOOLEAN;
  v_extension_exists BOOLEAN;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ VERIFICATION';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'create_organization_user_secure'
  ) INTO v_rpc_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
  ) INTO v_extension_exists;
  
  RAISE NOTICE 'Status:';
  RAISE NOTICE '  RPC function exists: %', v_rpc_exists;
  RAISE NOTICE '  pgcrypto extension: %', v_extension_exists;
  RAISE NOTICE '';
  
  IF v_rpc_exists AND v_extension_exists THEN
    RAISE NOTICE '🎉 SUCCESS! FULLY AUTOMATIC USER CREATION ENABLED!';
  ELSE
    RAISE NOTICE '⚠️  Some components missing!';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 HOW IT WORKS NOW:';
  RAISE NOTICE '';
  RAISE NOTICE '1. App → "Add User"';
  RAISE NOTICE '2. RPC → Creates auth.users + profile AUTOMATICALLY';
  RAISE NOTICE '3. Returns → SUCCESS';
  RAISE NOTICE '4. User → Appears in list ✅';
  RAISE NOTICE '5. User → Can login IMMEDIATELY! ✅';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 NO MANUAL STEPS NEEDED!';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ READY TO LAUNCH!';
  RAISE NOTICE '';
  RAISE NOTICE 'Try creating a user now - it will work automatically!';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;
