-- ==========================================
-- FINAL USER CREATION FIX
-- This removes the foreign key constraint causing the issue
-- ==========================================

-- ==========================================
-- 1. DROP THE FOREIGN KEY CONSTRAINT
-- ==========================================

-- Drop the constraint that's blocking user creation
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- The id column should just be a UUID, not tied to auth.users
-- This allows creating user profiles before auth accounts

-- ==========================================
-- 2. RE-CREATE THE FUNCTION (cleaner version)
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
  -- Check authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Extract parameters
  v_email := p_user_data->>'email';
  v_name := p_user_data->>'name';
  v_role := COALESCE(p_user_data->>'role', 'cashier');
  v_branch_id := (p_user_data->>'branchId')::uuid;

  -- Validate required fields
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;
  
  IF v_name IS NULL OR v_name = '' THEN
    RAISE EXCEPTION 'Name is required';
  END IF;

  -- Check for duplicates (email + org combination)
  IF EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE email = v_email 
    AND organization_id = p_org_id
  ) THEN
    RAISE EXCEPTION 'User with email % already exists in this organization', v_email;
  END IF;

  -- Generate new UUID for the profile
  v_new_user_id := gen_random_uuid();

  -- Insert user profile (no FK constraint to auth.users anymore)
  INSERT INTO user_profiles (
    id, 
    organization_id, 
    email, 
    name, 
    role, 
    branch_id, 
    status
  ) VALUES (
    v_new_user_id, 
    p_org_id, 
    v_email, 
    v_name, 
    v_role, 
    v_branch_id, 
    'active'  -- Set to active immediately
  );

  -- Return the created user profile
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
    'message', 'User profile created. To enable login, add auth account in Supabase Dashboard: Authentication > Users > Add User with email: ' || v_email
  );
END;
$$;

GRANT EXECUTE ON FUNCTION create_organization_user_secure(uuid, jsonb) TO authenticated;

-- ==========================================
-- 3. ENSURE branch_id COLUMN EXISTS
-- ==========================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Added branch_id column';
  ELSE
    RAISE NOTICE '✅ branch_id column already exists';
  END IF;
END $$;

-- ==========================================
-- 4. VERIFICATION
-- ==========================================

DO $$
DECLARE
  v_fk_exists boolean;
  v_function_exists boolean;
  v_branch_id_exists boolean;
BEGIN
  -- Check if FK constraint still exists (should be gone)
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_profiles_id_fkey'
  ) INTO v_fk_exists;

  -- Check function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'create_organization_user_secure'
  ) INTO v_function_exists;

  -- Check branch_id column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'branch_id'
  ) INTO v_branch_id_exists;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ USER CREATION FIX COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Status:';
  RAISE NOTICE '  1. FK constraint removed: %', CASE WHEN NOT v_fk_exists THEN '✅ YES' ELSE '❌ STILL EXISTS' END;
  RAISE NOTICE '  2. Create function exists: %', CASE WHEN v_function_exists THEN '✅ YES' ELSE '❌ NO' END;
  RAISE NOTICE '  3. branch_id column exists: %', CASE WHEN v_branch_id_exists THEN '✅ YES' ELSE '❌ NO' END;
  RAISE NOTICE '';
  
  IF NOT v_fk_exists AND v_function_exists AND v_branch_id_exists THEN
    RAISE NOTICE '🎉 All checks passed! User creation should work now.';
  ELSE
    RAISE NOTICE '⚠️ Some checks failed. Review the status above.';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Refresh browser (Ctrl+Shift+R)';
  RAISE NOTICE '  2. Try creating a user';
  RAISE NOTICE '  3. Should succeed without FK constraint error';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
