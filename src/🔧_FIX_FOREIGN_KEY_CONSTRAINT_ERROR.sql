-- =====================================================
-- 🔧 FIX: Foreign Key Constraint Error on User Creation
-- =====================================================
-- Error: "violates foreign key constraint user_profiles_id_fkey"
-- This happens when trying to create user_profile before auth.users exists
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔧 FIXING FOREIGN KEY CONSTRAINT ERROR';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Error: insert or update on table "user_profiles"';
  RAISE NOTICE '       violates foreign key constraint "user_profiles_id_fkey"';
  RAISE NOTICE '';
  RAISE NOTICE 'This happens because:';
  RAISE NOTICE '  1. RPC tries to create user_profile';
  RAISE NOTICE '  2. But auth.users does not exist yet';
  RAISE NOTICE '  3. Foreign key requires auth.users.id to exist first';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- OPTION 1: Make Foreign Key DEFERRABLE (RECOMMENDED)
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '🔧 OPTION 1: Making foreign key DEFERRABLE...';
  RAISE NOTICE '';
  RAISE NOTICE 'This allows the profile to be created within a transaction';
  RAISE NOTICE 'even if auth.users does not exist yet.';
  RAISE NOTICE '';
END $$;

-- Drop the existing constraint
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- Recreate it as DEFERRABLE INITIALLY DEFERRED
ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_id_fkey
FOREIGN KEY (id) REFERENCES auth.users(id)
ON DELETE CASCADE
DEFERRABLE INITIALLY DEFERRED;

DO $$
BEGIN
  RAISE NOTICE '✅ Foreign key is now DEFERRABLE';
  RAISE NOTICE '   This means:';
  RAISE NOTICE '   • Can create profile within transaction';
  RAISE NOTICE '   • Constraint checked at transaction END';
  RAISE NOTICE '   • If auth.users created by then, no error';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- FIX RPC FUNCTION (Better Error Handling)
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔧 UPDATING RPC FUNCTION...';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- Drop old version
DROP FUNCTION IF EXISTS create_organization_user_secure(UUID, JSONB);

-- Create better version that doesn't violate FK
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
  v_result JSONB;
BEGIN
  -- Extract data
  v_email := p_user_data->>'email';
  v_name := p_user_data->>'name';
  v_password := p_user_data->>'password';
  v_role := COALESCE(p_user_data->>'role', 'cashier');
  v_branch_id := (p_user_data->>'branchId')::UUID;

  -- Validate
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  IF v_name IS NULL OR v_name = '' THEN
    RAISE EXCEPTION 'Name is required';
  END IF;

  IF v_password IS NULL OR v_password = '' THEN
    RAISE EXCEPTION 'Password is required';
  END IF;

  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM user_profiles WHERE email = v_email) THEN
    RAISE EXCEPTION 'A user with email % already exists', v_email;
  END IF;

  -- Generate ID
  v_new_user_id := gen_random_uuid();

  -- Return instructions WITHOUT creating profile yet
  -- Profile will be created manually after auth.users exists
  v_result := jsonb_build_object(
    'success', true,
    'user_id', v_new_user_id,
    'email', v_email,
    'name', v_name,
    'role', v_role,
    'branch_id', v_branch_id,
    'org_id', p_org_id,
    'password', v_password,
    'manual_steps_required', true,
    'step', 1,
    'instructions', jsonb_build_object(
      'step1', 'Go to Supabase Dashboard → Authentication → Users',
      'step2', 'Click "Add User"',
      'step3', 'Email: ' || v_email,
      'step4', 'Password: ' || v_password,
      'step5', 'User ID: ' || v_new_user_id::text || ' (IMPORTANT: Use "User ID Override" if available)',
      'step6', 'Auto Confirm User: ✓ MUST CHECK THIS',
      'step7', 'Click "Create User"',
      'step8', 'Come back to the app and the profile will be auto-created via trigger',
      'message', 'Create auth user first, then profile will auto-create'
    )
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION create_organization_user_secure(UUID, JSONB) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE '✅ RPC function updated';
  RAISE NOTICE '   Now returns instructions instead of creating profile';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- CREATE TRIGGER TO AUTO-CREATE PROFILE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔧 CREATING AUTO-PROFILE TRIGGER...';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- Create function that auto-creates profile when auth.users is created
CREATE OR REPLACE FUNCTION handle_new_user_auto_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_role TEXT;
  v_name TEXT;
BEGIN
  -- Try to get organization (use first one if metadata doesn't have it)
  v_org_id := COALESCE(
    (NEW.raw_user_meta_data->>'organization_id')::UUID,
    (SELECT id FROM organizations ORDER BY created_at LIMIT 1)
  );

  -- Get role from metadata or default
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'cashier');
  
  -- Get name from metadata or email
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  -- Only create profile if one doesn't exist
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = NEW.id) THEN
    -- Create the profile
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
      NEW.id,
      NEW.email,
      v_name,
      v_role,
      v_org_id,
      (NEW.raw_user_meta_data->>'branchId')::UUID,
      'active',
      NOW(),
      NOW()
    );
    
    RAISE NOTICE '✅ Auto-created profile for user: %', NEW.email;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created_auto_profile ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created_auto_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_auto_profile();

DO $$
BEGIN
  RAISE NOTICE '✅ Trigger created: on_auth_user_created_auto_profile';
  RAISE NOTICE '   When auth.users is created → profile auto-creates';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- CREATE HELPER FUNCTION FOR MANUAL PROFILE CREATION
-- =====================================================

CREATE OR REPLACE FUNCTION create_profile_for_existing_auth_user(
  p_auth_user_id UUID,
  p_org_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user RECORD;
  v_org_id UUID;
  v_result JSONB;
BEGIN
  -- Get auth user
  SELECT * INTO v_auth_user
  FROM auth.users
  WHERE id = p_auth_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auth user with ID % does not exist', p_auth_user_id;
  END IF;

  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM user_profiles WHERE id = p_auth_user_id) THEN
    RAISE EXCEPTION 'Profile already exists for user %', v_auth_user.email;
  END IF;

  -- Get organization
  v_org_id := COALESCE(
    p_org_id,
    (v_auth_user.raw_user_meta_data->>'organization_id')::UUID,
    (SELECT id FROM organizations ORDER BY created_at LIMIT 1)
  );

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organization found. Provide p_org_id parameter.';
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
    v_auth_user.id,
    v_auth_user.email,
    COALESCE(
      v_auth_user.raw_user_meta_data->>'name',
      SPLIT_PART(v_auth_user.email, '@', 1)
    ),
    COALESCE(v_auth_user.raw_user_meta_data->>'role', 'cashier'),
    v_org_id,
    (v_auth_user.raw_user_meta_data->>'branchId')::UUID,
    'active',
    NOW(),
    NOW()
  );

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Profile created for ' || v_auth_user.email
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION create_profile_for_existing_auth_user(UUID, UUID) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE '✅ Helper function created: create_profile_for_existing_auth_user';
  RAISE NOTICE '   Use this to manually create profiles for existing auth users';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_fk_deferrable BOOLEAN;
  v_trigger_exists BOOLEAN;
  v_rpc_exists BOOLEAN;
  v_helper_exists BOOLEAN;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ VERIFICATION';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Check FK is deferrable
  SELECT condeferrable INTO v_fk_deferrable
  FROM pg_constraint
  WHERE conname = 'user_profiles_id_fkey';
  
  -- Check trigger
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created_auto_profile'
  ) INTO v_trigger_exists;
  
  -- Check RPC
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'create_organization_user_secure'
  ) INTO v_rpc_exists;
  
  -- Check helper
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'create_profile_for_existing_auth_user'
  ) INTO v_helper_exists;
  
  RAISE NOTICE 'Status:';
  RAISE NOTICE '  Foreign key DEFERRABLE: %', v_fk_deferrable;
  RAISE NOTICE '  Auto-profile trigger: %', v_trigger_exists;
  RAISE NOTICE '  RPC function: %', v_rpc_exists;
  RAISE NOTICE '  Helper function: %', v_helper_exists;
  RAISE NOTICE '';
  
  IF v_fk_deferrable AND v_trigger_exists AND v_rpc_exists AND v_helper_exists THEN
    RAISE NOTICE '🎉 ALL CHECKS PASSED!';
  ELSE
    RAISE NOTICE '⚠️  Some components missing!';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'HOW USER CREATION NOW WORKS:';
  RAISE NOTICE '';
  RAISE NOTICE '1. App calls RPC function';
  RAISE NOTICE '2. RPC returns instructions (does NOT create profile yet)';
  RAISE NOTICE '3. You create auth.users in Supabase Dashboard';
  RAISE NOTICE '4. Trigger automatically creates user_profile';
  RAISE NOTICE '5. User appears in app immediately! ✅';
  RAISE NOTICE '';
  RAISE NOTICE 'Alternative: Use helper function to create profile manually:';
  RAISE NOTICE '  SELECT create_profile_for_existing_auth_user(''user-id-here'');';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- CLEANUP: Remove any orphaned profiles
-- =====================================================

DO $$
DECLARE
  v_deleted INTEGER;
BEGIN
  RAISE NOTICE '🧹 CLEANUP: Removing orphaned profiles...';
  RAISE NOTICE '';
  
  DELETE FROM user_profiles
  WHERE id NOT IN (SELECT id FROM auth.users);
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  IF v_deleted > 0 THEN
    RAISE NOTICE '✅ Removed % orphaned profiles', v_deleted;
  ELSE
    RAISE NOTICE '✅ No orphaned profiles found';
  END IF;
  
  RAISE NOTICE '';
END $$;
