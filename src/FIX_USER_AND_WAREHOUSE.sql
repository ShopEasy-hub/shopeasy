-- ==========================================
-- FIX USER AND WAREHOUSE ISSUES
-- Run this in Supabase SQL Editor
-- ==========================================

-- ==========================================
-- 1. ADD MISSING COLUMN TO user_profiles
-- ==========================================

DO $$
BEGIN
  -- Add branch_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Added branch_id column to user_profiles';
  ELSE
    RAISE NOTICE '✅ branch_id column already exists';
  END IF;
END $$;

-- ==========================================
-- 2. FIX CREATE USER FUNCTION
-- ==========================================

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
  v_new_user_id uuid;
  v_email text;
  v_name text;
  v_role text;
  v_branch_id uuid;
  v_result jsonb;
BEGIN
  -- Allow authenticated users to create users
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_email := p_user_data->>'email';
  v_name := p_user_data->>'name';
  v_role := COALESCE(p_user_data->>'role', 'cashier');
  v_branch_id := (p_user_data->>'branchId')::uuid;

  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;
  
  IF v_name IS NULL OR v_name = '' THEN
    RAISE EXCEPTION 'Name is required';
  END IF;

  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM user_profiles WHERE email = v_email) THEN
    RAISE EXCEPTION 'User with email % already exists', v_email;
  END IF;

  v_new_user_id := gen_random_uuid();

  -- Insert user profile
  INSERT INTO user_profiles (
    id, organization_id, email, name, role, branch_id, status
  ) VALUES (
    v_new_user_id, p_org_id, v_email, v_name, v_role, v_branch_id, 'pending'
  );

  -- Get the created user
  SELECT jsonb_build_object(
    'id', id,
    'organization_id', organization_id,
    'email', email,
    'name', name,
    'role', role,
    'branch_id', branch_id,
    'status', status,
    'created_at', created_at
  )
  INTO v_result
  FROM user_profiles
  WHERE id = v_new_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user', v_result,
    'manual_steps_required', true,
    'instruction', 'Profile created. To enable login, go to Supabase Dashboard > Authentication > Add User with email: ' || v_email
  );
END;
$$;

GRANT EXECUTE ON FUNCTION create_organization_user_secure(uuid, jsonb) TO authenticated;

-- ==========================================
-- 3. VERIFY EVERYTHING
-- ==========================================

DO $$
DECLARE
  v_branch_id_exists boolean;
  v_function_exists boolean;
BEGIN
  -- Check branch_id column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'branch_id'
  ) INTO v_branch_id_exists;

  -- Check function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'create_organization_user_secure'
  ) INTO v_function_exists;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ FIX COMPLETED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Status:';
  RAISE NOTICE '  branch_id column: %', CASE WHEN v_branch_id_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '  create_user function: %', CASE WHEN v_function_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Refresh your browser (Ctrl+F5)';
  RAISE NOTICE '  2. Try creating a user';
  RAISE NOTICE '  3. Try clicking Warehouses';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
