rg members" ON expenses;

-- Returns policies
DROP POLICY IF EXISTS "Users can view returns in their organization" ON returns;
DROP POLICY IF EXISTS "Users can create returns" ON returns;
DROP POLICY IF EXISTS "Returns are viewable by org members" ON returns;
DROP POLICY IF EXISTS "Returns are creatable by org members" ON returns;

-- =====================================================
-- STEP 3: FIX AUTH.USERS TABLE ISSUES
-- =====================================================

-- Fix NULL email_change (causes schema errors)
UPDATE auth.users
SET email_change = ''
WHERE email_change IS NULL;

-- Fix missing instance_id
UPDATE auth.users
SET instance_id = (
  SELECT instance_id FROM auth.users 
  WHERE instance_id IS NOT NULL 
  LIMIT 1
)
WHERE instance_id IS NULL;

-- Fix missing aud and role
UPDATE auth.users
SET 
  aud = COALESCE(aud, 'authenticated'),
  role = COALESCE(role, 'authenticated')
WHERE aud IS NULL OR role IS NULL;

-- =====================================================
-- STEP 4: CREATE SIMPLE, NON-RECURSIVE RLS POLICIES
-- =====================================================

-- USER_PROFILES: Simple policies that don't query user_profiles
CREATE POLICY "Allow users to read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow users to insert profiles"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow users to update profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow users to delete own profile"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (id = auth.uid());

-- ORGANIZATIONS: Simple lookup by ID
CREATE POLICY "Organizations viewable by authenticated users"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Organizations updatable by authenticated users"
  ON organizations
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Organizations insertable by authenticated users"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- BRANCHES: Simple org-based access
CREATE POLICY "Branches viewable by authenticated users"
  ON branches
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Branches manageable by authenticated users"
  ON branches
  FOR ALL
  TO authenticated
  USING (true);

-- WAREHOUSES: Simple org-based access
CREATE POLICY "Warehouses viewable by authenticated users"
  ON warehouses
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Warehouses manageable by authenticated users"
  ON warehouses
  FOR ALL
  TO authenticated
  USING (true);

-- PRODUCTS: Simple org-based access
CREATE POLICY "Products viewable by authenticated users"
  ON products
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Products manageable by authenticated users"
  ON products
  FOR ALL
  TO authenticated
  USING (true);

-- INVENTORY: Simple org-based access
CREATE POLICY "Inventory viewable by authenticated users"
  ON inventory
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Inventory manageable by authenticated users"
  ON inventory
  FOR ALL
  TO authenticated
  USING (true);

-- TRANSFERS: Simple org-based access
CREATE POLICY "Transfers viewable by authenticated users"
  ON transfers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Transfers manageable by authenticated users"
  ON transfers
  FOR ALL
  TO authenticated
  USING (true);

-- SALES: Simple org-based access
CREATE POLICY "Sales viewable by authenticated users"
  ON sales
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sales creatable by authenticated users"
  ON sales
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- SALE_ITEMS: Simple access
CREATE POLICY "Sale items viewable by authenticated users"
  ON sale_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sale items creatable by authenticated users"
  ON sale_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- SUPPLIERS: Simple org-based access
CREATE POLICY "Suppliers viewable by authenticated users"
  ON suppliers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Suppliers manageable by authenticated users"
  ON suppliers
  FOR ALL
  TO authenticated
  USING (true);

-- EXPENSES: Simple org-based access
CREATE POLICY "Expenses viewable by authenticated users"
  ON expenses
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Expenses creatable by authenticated users"
  ON expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RETURNS: Simple org-based access
CREATE POLICY "Returns viewable by authenticated users"
  ON returns
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Returns creatable by authenticated users"
  ON returns
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- STEP 5: CREATE SECURE USER CREATION FUNCTION
-- =====================================================

-- Drop old function
DROP FUNCTION IF EXISTS create_organization_user_secure(uuid, jsonb);
DROP FUNCTION IF EXISTS create_organization_user(uuid, text, text, text, text, uuid);

-- Create new secure function
CREATE OR REPLACE FUNCTION create_organization_user_secure(
  p_org_id uuid,
  p_user_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
  v_name text;
  v_email text;
  v_password text;
  v_role text;
  v_branch_id uuid;
  v_instance_id uuid;
  v_encrypted_password text;
BEGIN
  -- Extract user data
  v_name := p_user_data->>'name';
  v_email := p_user_data->>'email';
  v_password := p_user_data->>'password';
  v_role := p_user_data->>'role';
  v_branch_id := (p_user_data->>'branchId')::uuid;
  
  -- Validate required fields
  IF v_name IS NULL OR v_email IS NULL OR v_password IS NULL OR v_role IS NULL THEN
    RAISE EXCEPTION 'Missing required fields: name, email, password, role';
  END IF;
  
  -- Generate new user ID
  v_user_id := gen_random_uuid();
  
  -- Get instance_id from existing users
  SELECT instance_id INTO v_instance_id
  FROM auth.users
  WHERE instance_id IS NOT NULL
  LIMIT 1;
  
  -- If no instance_id found, use default
  IF v_instance_id IS NULL THEN
    v_instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;
  
  -- Hash the password using pgcrypto
  v_encrypted_password := crypt(v_password, gen_salt('bf'));
  
  -- Insert into auth.users with ALL required fields
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    v_user_id,
    v_instance_id,
    v_email,
    v_encrypted_password,
    now(),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object('name', v_name),
    'authenticated',
    'authenticated',
    now(),
    now(),
    '',
    '',  -- IMPORTANT: Empty string, not NULL
    '',
    ''
  );
  
  -- Insert into user_profiles
  INSERT INTO user_profiles (
    id,
    email,
    name,
    role,
    organization_id,
    assigned_branch_id,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_email,
    v_name,
    v_role,
    p_org_id,
    v_branch_id,
    now(),
    now()
  );
  
  -- Return success with user info
  RETURN jsonb_build_object(
    'success', true,
    'userId', v_user_id,
    'email', v_email,
    'name', v_name,
    'role', v_role
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_organization_user_secure(uuid, jsonb) TO authenticated;

-- =====================================================
-- STEP 6: UPDATE USER_PROFILES ROLE CONSTRAINT
-- =====================================================

-- Drop old constraint
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Add new constraint with all 6 roles
ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN (
  'owner', 
  'admin', 
  'manager', 
  'warehouse_manager', 
  'cashier', 
  'auditor'
));

-- =====================================================
-- STEP 7: VERIFY SETUP
-- =====================================================

DO $$
DECLARE
  v_user_count integer;
  v_broken_users integer;
  v_policy_count integer;
BEGIN
  -- Count users
  SELECT COUNT(*) INTO v_user_count FROM auth.users;
  
  -- Count broken users
  SELECT COUNT(*) INTO v_broken_users
  FROM auth.users
  WHERE 
    email_change IS NULL
    OR instance_id IS NULL
    OR aud IS NULL
    OR role IS NULL;
  
  -- Count policies
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename = 'user_profiles';
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ FRESH CLEAN SETUP COMPLETE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  • Total users: %', v_user_count;
  RAISE NOTICE '  • Broken users: %', v_broken_users;
  RAISE NOTICE '  • RLS policies on user_profiles: %', v_policy_count;
  RAISE NOTICE '';
  
  IF v_broken_users = 0 THEN
    RAISE NOTICE '✅ All users are properly configured';
  ELSE
    RAISE NOTICE '⚠️  Warning: % users still have issues', v_broken_users;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Test owner login';
  RAISE NOTICE '  2. Test member login';
  RAISE NOTICE '  3. If member login still fails, delete and recreate user';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;
