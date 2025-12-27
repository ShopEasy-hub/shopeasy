-- =====================================================
-- 🔧 CREATE: User Creation RPC Function
-- =====================================================
-- Creates the missing RPC function for user creation
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✨ CREATING USER CREATION RPC FUNCTION';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- DROP OLD FUNCTION IF EXISTS
-- =====================================================

DROP FUNCTION IF EXISTS create_organization_user_secure(UUID, JSONB);

-- =====================================================
-- CREATE THE RPC FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION create_organization_user_secure(
  p_org_id UUID,
  p_user_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_user_id UUID;
  v_email TEXT;
  v_name TEXT;
  v_password TEXT;
  v_role TEXT;
  v_branch_id UUID;
  v_user_profile RECORD;
  v_result JSONB;
BEGIN
  -- Extract data from JSONB
  v_email := p_user_data->>'email';
  v_name := p_user_data->>'name';
  v_password := p_user_data->>'password';
  v_role := p_user_data->>'role';
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

  IF v_role IS NULL OR v_role = '' THEN
    v_role := 'cashier'; -- Default role
  END IF;

  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM user_profiles WHERE email = v_email) THEN
    RAISE EXCEPTION 'A user with email % already exists', v_email;
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RAISE EXCEPTION 'A user with email % already exists in authentication', v_email;
  END IF;

  -- Generate new UUID for user
  v_new_user_id := gen_random_uuid();

  -- Step 1: Create user profile first (this we can do with SECURITY DEFINER)
  INSERT INTO user_profiles (
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

  -- Step 2: Try to create auth user (this might fail on free/basic plans)
  BEGIN
    -- This requires admin privileges which we don't have from RPC
    -- So we'll return instructions for manual creation
    
    RAISE NOTICE 'User profile created with ID: %', v_new_user_id;
    
    -- Return success with manual steps required
    v_result := jsonb_build_object(
      'success', true,
      'user', row_to_json(v_user_profile),
      'manual_steps_required', true,
      'instructions', jsonb_build_object(
        'user_id', v_new_user_id,
        'email', v_email,
        'password', v_password,
        'message', 'User profile created. Auth user must be created manually in Supabase Dashboard.',
        'step3', 'Enter Email: ' || v_email,
        'step4', 'Enter Password: ' || v_password
      )
    );
    
    RETURN v_result;

  EXCEPTION WHEN OTHERS THEN
    -- If auth creation fails, still return success for profile
    v_result := jsonb_build_object(
      'success', true,
      'user', row_to_json(v_user_profile),
      'manual_steps_required', true,
      'instructions', jsonb_build_object(
        'user_id', v_new_user_id,
        'email', v_email,
        'password', v_password,
        'message', 'User profile created. Auth user must be created manually.',
        'step3', 'Enter Email: ' || v_email,
        'step4', 'Enter Password: ' || v_password,
        'error', SQLERRM
      )
    );
    
    RETURN v_result;
  END;

END;
$$;

-- =====================================================
-- GRANT EXECUTE PERMISSION
-- =====================================================

GRANT EXECUTE ON FUNCTION create_organization_user_secure(UUID, JSONB) TO authenticated;

-- =====================================================
-- CREATE SIMPLER FALLBACK FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION create_user_profile_only(
  p_user_id UUID,
  p_org_id UUID,
  p_email TEXT,
  p_name TEXT,
  p_role TEXT DEFAULT 'cashier',
  p_branch_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_profile RECORD;
  v_result JSONB;
BEGIN
  -- Validate
  IF p_email IS NULL OR p_email = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  -- Check if already exists
  IF EXISTS (SELECT 1 FROM user_profiles WHERE email = p_email) THEN
    RAISE EXCEPTION 'User with email % already exists', p_email;
  END IF;

  -- Create profile
  INSERT INTO user_profiles (
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
    p_user_id,
    p_email,
    p_name,
    p_role,
    p_org_id,
    p_branch_id,
    'active',
    NOW(),
    NOW()
  )
  RETURNING * INTO v_user_profile;

  v_result := jsonb_build_object(
    'success', true,
    'user', row_to_json(v_user_profile)
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION create_user_profile_only(UUID, UUID, TEXT, TEXT, TEXT, UUID) TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_rpc_exists BOOLEAN;
  v_fallback_exists BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ VERIFICATION';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'create_organization_user_secure'
  ) INTO v_rpc_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'create_user_profile_only'
  ) INTO v_fallback_exists;
  
  IF v_rpc_exists THEN
    RAISE NOTICE '✅ Main function created: create_organization_user_secure';
  ELSE
    RAISE NOTICE '❌ Main function failed to create!';
  END IF;
  
  IF v_fallback_exists THEN
    RAISE NOTICE '✅ Fallback function created: create_user_profile_only';
  ELSE
    RAISE NOTICE '❌ Fallback function failed to create!';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'What these functions do:';
  RAISE NOTICE '';
  RAISE NOTICE '1. create_organization_user_secure:';
  RAISE NOTICE '   • Main function for creating users';
  RAISE NOTICE '   • Creates user_profile';
  RAISE NOTICE '   • Returns instructions for manual auth setup';
  RAISE NOTICE '';
  RAISE NOTICE '2. create_user_profile_only:';
  RAISE NOTICE '   • Simpler fallback function';
  RAISE NOTICE '   • Only creates user_profile';
  RAISE NOTICE '   • Used when you have the auth.users ID already';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Try creating a user in your app';
  RAISE NOTICE '  2. You should see a message about manual auth setup';
  RAISE NOTICE '  3. Follow the instructions to complete in Supabase Dashboard';
  RAISE NOTICE '';
  RAISE NOTICE 'Alternative: Deploy Edge Function for fully automatic creation';
  RAISE NOTICE '  File: /supabase/functions/create-organization-user/';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;
