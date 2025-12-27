-- =====================================================
-- 🛠️ MANUAL USER CREATION WORKAROUND
-- =====================================================
-- Create users manually when automatic creation fails
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🛠️  MANUAL USER CREATION WORKAROUND';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Use this script to create users when automatic creation fails.';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: You must create auth.users in Supabase Dashboard first!';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- INSTRUCTIONS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'STEP-BY-STEP INSTRUCTIONS:';
  RAISE NOTICE '';
  RAISE NOTICE '1. Open Supabase Dashboard → Authentication → Users';
  RAISE NOTICE '2. Click "Add User" button';
  RAISE NOTICE '3. Enter user email and password';
  RAISE NOTICE '4. IMPORTANT: Check "Auto Confirm User" ✓';
  RAISE NOTICE '5. Click "Create User"';
  RAISE NOTICE '6. Copy the User ID (UUID) from the created user';
  RAISE NOTICE '7. Come back here and edit this script';
  RAISE NOTICE '8. Paste the User ID and other details below';
  RAISE NOTICE '9. Run this script';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- EDIT THESE VALUES
-- =====================================================

DO $$
DECLARE
  -- 👇 EDIT THESE VALUES 👇
  v_auth_user_id UUID := 'PASTE_USER_ID_HERE';  -- Get from Supabase Dashboard after creating auth user
  v_email TEXT := 'user@example.com';            -- Same email used in dashboard
  v_name TEXT := 'User Name';                    -- Full name
  v_role TEXT := 'cashier';                      -- owner, admin, manager, warehouse_manager, cashier, auditor
  v_branch_id UUID := NULL;                      -- Branch UUID or NULL for owner/admin/auditor
  -- 👆 EDIT THESE VALUES 👆
  
  v_org_id UUID;
  v_result RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🚀 CREATING USER PROFILE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Validate inputs
  IF v_auth_user_id::TEXT = 'PASTE_USER_ID_HERE' THEN
    RAISE EXCEPTION 'Please edit the script and paste the User ID from Supabase Dashboard!';
  END IF;
  
  IF v_email = 'user@example.com' THEN
    RAISE EXCEPTION 'Please edit the script and enter the actual user email!';
  END IF;
  
  -- Get organization (use first one)
  SELECT id INTO v_org_id FROM organizations ORDER BY created_at LIMIT 1;
  
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organization found! Create an organization first.';
  END IF;
  
  RAISE NOTICE 'Creating user with:';
  RAISE NOTICE '  User ID: %', v_auth_user_id;
  RAISE NOTICE '  Email: %', v_email;
  RAISE NOTICE '  Name: %', v_name;
  RAISE NOTICE '  Role: %', v_role;
  RAISE NOTICE '  Organization: %', v_org_id;
  RAISE NOTICE '  Branch: %', COALESCE(v_branch_id::TEXT, 'NULL');
  RAISE NOTICE '';
  
  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM user_profiles WHERE id = v_auth_user_id) THEN
    RAISE NOTICE '⚠️  Profile already exists for this user ID!';
    
    SELECT * INTO v_result FROM user_profiles WHERE id = v_auth_user_id;
    RAISE NOTICE '';
    RAISE NOTICE 'Existing profile:';
    RAISE NOTICE '  Email: %', v_result.email;
    RAISE NOTICE '  Name: %', v_result.name;
    RAISE NOTICE '  Role: %', v_result.role;
    RAISE NOTICE '';
    RAISE NOTICE 'Skipping creation.';
    RAISE NOTICE '';
    RETURN;
  END IF;
  
  -- Check if email is already used
  IF EXISTS (SELECT 1 FROM user_profiles WHERE email = v_email) THEN
    RAISE EXCEPTION 'Email % is already used by another user!', v_email;
  END IF;
  
  -- Create the user profile
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
    v_auth_user_id,
    v_email,
    v_name,
    v_role,
    v_org_id,
    v_branch_id,
    'active',
    NOW(),
    NOW()
  );
  
  RAISE NOTICE '✅ User profile created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'User can now login with:';
  RAISE NOTICE '  Email: %', v_email;
  RAISE NOTICE '  Password: (the one you set in Supabase Dashboard)';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_user RECORD;
  v_count INTEGER;
BEGIN
  RAISE NOTICE '✅ CURRENT USERS:';
  RAISE NOTICE '';
  
  SELECT COUNT(*) INTO v_count FROM user_profiles;
  RAISE NOTICE 'Total users: %', v_count;
  RAISE NOTICE '';
  
  IF v_count > 0 THEN
    RAISE NOTICE 'User list:';
    FOR v_user IN (
      SELECT 
        email,
        name,
        role,
        status,
        created_at::date as created
      FROM user_profiles
      ORDER BY created_at
    )
    LOOP
      RAISE NOTICE '  • % - % (%) - Created: %', 
        v_user.name, v_user.email, v_user.role, v_user.created;
    END LOOP;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- QUICK REFERENCE: Available Roles
-- =====================================================

/*
Available roles:
  - owner            : Full access to everything
  - admin            : Manage branches, users, products, approvals
  - manager          : Manage products, transfers, reports, staff
  - warehouse_manager: Manage warehouse, suppliers, send to branches
  - cashier          : Process sales, view inventory
  - auditor          : View reports, transactions, export data

Roles that need branch assignment:
  - manager
  - warehouse_manager
  - cashier

Roles that don't need branch (can be NULL):
  - owner
  - admin
  - auditor
*/

-- =====================================================
-- EXAMPLE USAGE
-- =====================================================

/*
EXAMPLE: Create a cashier

1. Go to Supabase Dashboard → Authentication → Add User
   Email: john@example.com
   Password: SecurePass123!
   Auto Confirm: ✓ YES
   
2. Copy the generated User ID (e.g., "a1b2c3d4-...")

3. Edit this script:
   v_auth_user_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
   v_email TEXT := 'john@example.com';
   v_name TEXT := 'John Doe';
   v_role TEXT := 'cashier';
   v_branch_id UUID := '12345678-90ab-cdef-1234-567890abcdef';  -- Get from branches table
   
4. Run this script

5. User can now login!
*/
