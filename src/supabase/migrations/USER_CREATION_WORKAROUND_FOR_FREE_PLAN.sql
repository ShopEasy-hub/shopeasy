-- ==========================================
-- 🔧 USER CREATION WORKAROUND FOR FREE/BASIC PLANS
-- ==========================================
-- This workaround handles Supabase plan limitations where:
-- - Direct INSERT into auth.users is blocked
-- - Only Service Role Key can create auth users
-- 
-- Solution: Create user profile first, then provide manual steps
-- ==========================================

-- ==========================================
-- STEP 1: Drop old function
-- ==========================================

DROP FUNCTION IF EXISTS create_organization_user_secure(uuid, jsonb);

-- ==========================================
-- STEP 2: Create simplified user profile function
-- ==========================================

CREATE OR REPLACE FUNCTION create_organization_user_secure(
  p_org_id uuid,
  p_user_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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
  
  RAISE NOTICE '📝 Creating user profile for: %', v_email;
  
  -- Validate inputs
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;
  
  IF v_password IS NULL OR v_password = '' THEN
    RAISE EXCEPTION 'Password is required';
  END IF;
  
  IF v_name IS NULL OR v_name = '' THEN
    RAISE EXCEPTION 'Name is required';
  END IF;
  
  IF v_role IS NULL OR v_role = '' THEN
    RAISE EXCEPTION 'Role is required';
  END IF;
  
  -- Check if user already exists in auth.users
  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM auth.users WHERE email = v_email
    ) INTO v_auth_user_exists;
    
    IF v_auth_user_exists THEN
      RAISE EXCEPTION 'User with email % already exists', v_email;
    END IF;
  EXCEPTION
    WHEN insufficient_privilege THEN
      -- Can't check auth.users, continue anyway
      RAISE NOTICE 'Cannot check auth.users (permission issue), continuing...';
  END;
  
  -- Check if user profile already exists
  IF EXISTS (SELECT 1 FROM user_profiles WHERE email = v_email) THEN
    RAISE EXCEPTION 'User with email % already exists', v_email;
  END IF;
  
  -- Generate new user ID
  v_user_id := gen_random_uuid();
  
  -- ==========================================
  -- ATTEMPT TO CREATE AUTH USER
  -- ==========================================
  
  BEGIN
    -- Try to create auth user (will fail on Free/Basic plans)
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
      '00000000-0000-0000-0000-000000000000',
      v_email,
      crypt(v_password, gen_salt('bf')),
      NOW(),
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
    
    RAISE NOTICE '✅ Auth user created successfully!';
    
    -- Create user profile
    INSERT INTO user_profiles (
      id,
      organization_id,
      email,
      name,
      role,
      branch_id,
      status,
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
      'active',
      NOW(),
      NOW()
    );
    
    RAISE NOTICE '✅ User profile created successfully!';
    
    -- Return success
    RETURN jsonb_build_object(
      'success', true,
      'user', jsonb_build_object(
        'id', v_user_id,
        'email', v_email,
        'name', v_name,
        'role', v_role,
        'organization_id', p_org_id,
        'branch_id', v_branch_id,
        'status', 'active'
      )
    );
    
  EXCEPTION
    WHEN insufficient_privilege OR SQLSTATE '42501' THEN
      -- Cannot write to auth.users (plan limitation)
      RAISE NOTICE '⚠️  Cannot create auth user (plan limitation)';
      RAISE NOTICE '   Creating user profile only...';
      
      -- Create user profile with 'pending' status
      INSERT INTO user_profiles (
        id,
        organization_id,
        email,
        name,
        role,
        branch_id,
        status,
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
        'pending_auth',
        NOW(),
        NOW()
      );
      
      -- Return partial success with manual steps
      RETURN jsonb_build_object(
        'success', false,
        'manual_steps_required', true,
        'message', 'User profile created. Auth user must be created manually.',
        'user', jsonb_build_object(
          'id', v_user_id,
          'email', v_email,
          'name', v_name,
          'role', v_role,
          'organization_id', p_org_id,
          'branch_id', v_branch_id,
          'status', 'pending_auth'
        ),
        'instructions', jsonb_build_object(
          'step1', 'Go to Supabase Dashboard → Authentication → Users',
          'step2', 'Click "Add User" button',
          'step3', format('Email: %s', v_email),
          'step4', format('Password: %s', v_password),
          'step5', 'Auto Confirm User: YES',
          'step6', format('User ID: %s', v_user_id),
          'step7', 'Click "Create User"',
          'step8', 'User will then be able to login'
        )
      );
      
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to create user: %', SQLERRM;
  END;
  
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_organization_user_secure(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION create_organization_user_secure(uuid, jsonb) TO service_role;

-- ==========================================
-- VERIFICATION
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ USER CREATION WORKAROUND INSTALLED';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'How it works:';
  RAISE NOTICE '  1. Tries to create auth user + profile';
  RAISE NOTICE '  2. If auth user fails (plan limit), creates profile only';
  RAISE NOTICE '  3. Returns manual instructions for completing setup';
  RAISE NOTICE '';
  RAISE NOTICE 'Status codes:';
  RAISE NOTICE '  - success: true  = User fully created (can login)';
  RAISE NOTICE '  - manual_steps_required: true = Profile created, auth pending';
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;
