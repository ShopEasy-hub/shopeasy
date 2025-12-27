-- =====================================================
-- 🔥 NUCLEAR OPTION: Complete User Reset
-- =====================================================
-- WARNING: This deletes ALL non-owner users and resets everything
-- Only use this if nothing else worked
-- =====================================================

-- =====================================================
-- STEP 1: BACKUP EXISTING USERS
-- =====================================================

DO $$
DECLARE
  v_user RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '📋 BACKING UP USER DATA';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Copy this information to recreate users:';
  RAISE NOTICE '';
  
  FOR v_user IN 
    SELECT 
      up.email,
      up.name,
      up.role,
      up.assigned_branch_id,
      o.name as org_name,
      b.name as branch_name
    FROM user_profiles up
    LEFT JOIN organizations o ON up.organization_id = o.id
    LEFT JOIN branches b ON up.assigned_branch_id = b.id
    WHERE up.role != 'owner'
    ORDER BY up.created_at
  LOOP
    RAISE NOTICE 'User: %', v_user.email;
    RAISE NOTICE '  Name: %', v_user.name;
    RAISE NOTICE '  Role: %', v_user.role;
    RAISE NOTICE '  Organization: %', v_user.org_name;
    RAISE NOTICE '  Branch: %', COALESCE(v_user.branch_name, 'None');
    RAISE NOTICE '';
  END LOOP;
  
  RAISE NOTICE '⚠️  COPY THE ABOVE INFORMATION BEFORE PROCEEDING!';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- =====================================================
-- STEP 2: DELETE ALL NON-OWNER USERS
-- =====================================================

DO $$
DECLARE
  v_deleted integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🗑️  DELETING NON-OWNER USERS';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Delete from auth.users (cascades to user_profiles)
  DELETE FROM auth.users
  WHERE id IN (
    SELECT id FROM user_profiles WHERE role != 'owner'
  );
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  RAISE NOTICE 'Deleted % non-owner users', v_deleted;
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- =====================================================
-- STEP 3: FIX OWNER USER (ENSURE IT'S CLEAN)
-- =====================================================

UPDATE auth.users
SET 
  email_change = '',
  instance_id = COALESCE(
    instance_id,
    (SELECT instance_id FROM auth.users WHERE instance_id IS NOT NULL LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  ),
  aud = COALESCE(aud, 'authenticated'),
  role = COALESCE(role, 'authenticated')
WHERE id IN (SELECT id FROM user_profiles WHERE role = 'owner');

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ OWNER USER CLEANED UP';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 4: VERIFY CLEAN STATE
-- =====================================================

DO $$
DECLARE
  v_total_users integer;
  v_owner_users integer;
BEGIN
  SELECT COUNT(*) INTO v_total_users FROM auth.users;
  SELECT COUNT(*) INTO v_owner_users FROM user_profiles WHERE role = 'owner';
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '📊 CURRENT STATE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Total auth users: %', v_total_users;
  RAISE NOTICE 'Owner users: %', v_owner_users;
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ DATABASE IS NOW CLEAN';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Test owner login (should work)';
  RAISE NOTICE '  2. Go to Users page in your app';
  RAISE NOTICE '  3. Click "Add User"';
  RAISE NOTICE '  4. Recreate each user from backup data above';
  RAISE NOTICE '  5. Test each new user login';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;
