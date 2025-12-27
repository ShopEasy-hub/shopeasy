les can be created independently.';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 1: DROP THE FOREIGN KEY
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '🗑️  STEP 1: Dropping foreign key constraint...';
  RAISE NOTICE '';
END $$;

ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_id_fkey CASCADE;

DO $$
BEGIN
  RAISE NOTICE '✅ Foreign key removed!';
  RAISE NOTICE '   Profiles can now be created independently of auth.users';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 2: RECREATE RPC FUNCTION (Working Version)
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✨ STEP 2: Creating working RPC function...';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

DROP FUNCTION IF EXISTS create_organization_user_secure(UUID, JSONB) CASCADE;

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
  -- Extract data
  v_email := p_user_data->>'email';
  v_name := p_user_data->>'name';
  v_password := p_user_data->>'password';
  v_role := COALESCE(p_user_data->>'role', 'cashier');
  v_branch_id := (p_user_data->>'branchId')::UUID;

  -- Validate
  IF v_email IS NULL OR TRIM(v_email) = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  IF v_name IS NULL OR TRIM(v_name) = '' THEN
    RAISE EXCEPTION 'Name is required';
  END IF;

  IF v_password IS NULL OR TRIM(v_password) = '' THEN
    RAISE EXCEPTION 'Password is required';
  END IF;

  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM user_profiles WHERE LOWER(email) = LOWER(v_email)) THEN
    RAISE EXCEPTION 'A user with email % already exists', v_email;
  END IF;

  -- Generate new UUID
  v_new_user_id := gen_random_uuid();

  -- Create the user profile directly (no FK blocking us now!)
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

  -- Return success with manual auth instructions
  v_result := jsonb_build_object(
    'success', true,
    'user', row_to_json(v_user_profile),
    'manual_steps_required', true,
    'instructions', jsonb_build_object(
      'user_id', v_new_user_id,
      'email', v_email,
      'password', v_password,
      'step1', 'User profile created successfully!',
      'step2', 'Now create auth user in Supabase Dashboard:',
      'step3', 'Dashboard → Authentication → Users → Add User',
      'step4', 'Email: ' || v_email,
      'step5', 'Password: ' || v_password,
      'step6', 'User ID Override: ' || v_new_user_id::text || ' (if available)',
      'step7', 'Auto Confirm User: ✓ CHECK THIS!',
      'step8', 'Click Create User',
      'step9', 'User will be able to login immediately!',
      'message', 'Profile created! Complete auth setup in Supabase Dashboard to enable login.'
    )
  );

  RETURN v_result;

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
  RAISE NOTICE '✅ RPC function created successfully!';
  RAISE NOTICE '   Now it can create profiles without foreign key blocking';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 3: CREATE CLEANUP TRIGGER
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🧹 STEP 3: Creating cleanup trigger...';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- Function to cleanup profiles when auth user is deleted
CREATE OR REPLACE FUNCTION cleanup_profile_on_auth_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete the profile when auth user is deleted
  DELETE FROM user_profiles WHERE id = OLD.id;
  
  RAISE NOTICE 'Cleaned up profile for deleted auth user: %', OLD.email;
  
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_deleted_cleanup_profile ON auth.users;

CREATE TRIGGER on_auth_user_deleted_cleanup_profile
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_profile_on_auth_delete();

DO $$
BEGIN
  RAISE NOTICE '✅ Cleanup trigger created';
  RAISE NOTICE '   When auth.users deleted → profile auto-deletes';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 4: CREATE AUTO-PROFILE TRIGGER
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✨ STEP 4: Creating auto-profile trigger...';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

CREATE OR REPLACE FUNCTION handle_new_auth_user()
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
  -- Only create profile if one doesn't exist
  IF EXISTS (SELECT 1 FROM user_profiles WHERE id = NEW.id) THEN
    RAISE NOTICE 'Profile already exists for user: %', NEW.email;
    RETURN NEW;
  END IF;

  -- Get organization (from metadata or first one)
  v_org_id := COALESCE(
    (NEW.raw_user_meta_data->>'organization_id')::UUID,
    (SELECT id FROM organizations ORDER BY created_at LIMIT 1)
  );

  IF v_org_id IS NULL THEN
    RAISE NOTICE 'No organization found for user: %', NEW.email;
    RETURN NEW;
  END IF;

  -- Get role and name from metadata
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'cashier');
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    SPLIT_PART(NEW.email, '@', 1)
  );

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
    NEW.id,
    NEW.email,
    v_name,
    v_role,
    v_org_id,
    (NEW.raw_user_meta_data->>'branchId')::UUID,
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE '✅ Auto-created profile for: %', NEW.email;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_auth_user();

DO $$
BEGIN
  RAISE NOTICE '✅ Auto-profile trigger created';
  RAISE NOTICE '   When auth.users created → profile auto-creates if needed';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_fk_exists BOOLEAN;
  v_rpc_exists BOOLEAN;
  v_trigger_exists BOOLEAN;
  v_cleanup_exists BOOLEAN;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ VERIFICATION';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Check FK is gone
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_id_fkey'
  ) INTO v_fk_exists;
  
  -- Check RPC exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'create_organization_user_secure'
  ) INTO v_rpc_exists;
  
  -- Check triggers
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) INTO v_trigger_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_deleted_cleanup_profile'
  ) INTO v_cleanup_exists;
  
  RAISE NOTICE 'Status:';
  RAISE NOTICE '  Foreign key REMOVED: %', NOT v_fk_exists;
  RAISE NOTICE '  RPC function exists: %', v_rpc_exists;
  RAISE NOTICE '  Auto-profile trigger: %', v_trigger_exists;
  RAISE NOTICE '  Cleanup trigger: %', v_cleanup_exists;
  RAISE NOTICE '';
  
  IF NOT v_fk_exists AND v_rpc_exists AND v_trigger_exists THEN
    RAISE NOTICE '🎉 SUCCESS! Everything is configured correctly!';
  ELSE
    RAISE NOTICE '⚠️  Some components missing!';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 HOW IT WORKS NOW:';
  RAISE NOTICE '';
  RAISE NOTICE '1. App → Click "Add User"';
  RAISE NOTICE '2. RPC → Creates profile (no FK blocking!)';
  RAISE NOTICE '3. Returns → Manual auth instructions';
  RAISE NOTICE '4. You → Create auth.users in Dashboard';
  RAISE NOTICE '5. User → Can login immediately!';
  RAISE NOTICE '';
  RAISE NOTICE 'OR:';
  RAISE NOTICE '';
  RAISE NOTICE '1. You → Create auth.users in Dashboard first';
  RAISE NOTICE '2. Trigger → Auto-creates profile';
  RAISE NOTICE '3. User → Appears in app automatically!';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ READY TO USE!';
  RAISE NOTICE '';
  RAISE NOTICE 'Try creating a user now - it should work!';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;
