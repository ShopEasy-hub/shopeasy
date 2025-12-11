-- =====================================================
-- FIX: Schema-Qualify pgcrypto Calls (Option 1 - Best)
-- =====================================================
-- Based on Supabase AI diagnosis:
-- pgcrypto is in "extensions" schema, but RPC sets search_path to 'public'
-- Solution: Explicitly schema-qualify gen_salt and crypt calls
-- =====================================================

-- Drop and recreate the function with schema-qualified pgcrypto calls
DROP FUNCTION IF EXISTS create_organization_user_secure(uuid, text, text, text, text, uuid);

CREATE OR REPLACE FUNCTION create_organization_user_secure(
  p_org_id uuid,
  p_email text,
  p_password text,
  p_name text,
  p_role text DEFAULT 'cashier',
  p_branch_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_password_hash text;
  v_user_exists boolean;
  v_result json;
BEGIN
  -- Validate inputs
  IF p_email IS NULL OR p_email = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;
  
  IF p_password IS NULL OR p_password = '' THEN
    RAISE EXCEPTION 'Password is required';
  END IF;
  
  IF p_name IS NULL OR p_name = '' THEN
    RAISE EXCEPTION 'Name is required';
  END IF;

  -- Validate password length
  IF length(p_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;

  -- Check if user already exists in user_profiles
  SELECT EXISTS(
    SELECT 1 FROM user_profiles 
    WHERE email = lower(p_email) AND organization_id = p_org_id
  ) INTO v_user_exists;

  IF v_user_exists THEN
    RAISE EXCEPTION 'User with email % already exists in this organization', p_email;
  END IF;

  -- Check if user exists in auth.users
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE email = lower(p_email)
  ) INTO v_user_exists;

  IF v_user_exists THEN
    RAISE EXCEPTION 'A user with email % already exists in the system', p_email;
  END IF;

  -- Generate a new UUID for the user
  v_user_id := gen_random_uuid();

  -- ✅ FIX: Schema-qualify pgcrypto calls and cast literal to text
  -- OLD: crypt(v_password, gen_salt('bf'))
  -- NEW: extensions.crypt(v_password, extensions.gen_salt('bf'::text))
  v_password_hash := extensions.crypt(p_password, extensions.gen_salt('bf'::text));

  -- Insert into auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token,
    aud,
    role
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    lower(p_email),
    v_password_hash,
    now(), -- Auto-confirm the email
    jsonb_build_object('provider', 'email', 'providers', array['email']),
    jsonb_build_object('name', p_name),
    now(),
    now(),
    '',
    '',
    '',
    '',
    'authenticated',
    'authenticated'
  );

  -- Insert into user_profiles
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
  ) VALUES (
    v_user_id,
    p_org_id,
    lower(p_email),
    p_name,
    p_role,
    p_branch_id,
    'active',
    now(),
    now()
  );

  -- Return success
  v_result := json_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', lower(p_email),
    'name', p_name,
    'role', p_role,
    'message', 'User created successfully'
  );

  RETURN v_result;

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'User with email % already exists', p_email;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create user: %', SQLERRM;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_organization_user_secure(uuid, text, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_organization_user_secure(uuid, text, text, text, text, uuid) TO service_role;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_function_def text;
BEGIN
  -- Get the function definition to verify the fix
  SELECT pg_get_functiondef('create_organization_user_secure(uuid, text, text, text, text, uuid)'::regprocedure)
  INTO v_function_def;
  
  -- Check if it contains the schema-qualified calls
  IF v_function_def LIKE '%extensions.gen_salt%' AND v_function_def LIKE '%extensions.crypt%' THEN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ FUNCTION UPDATED SUCCESSFULLY';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ pgcrypto calls are now schema-qualified';
    RAISE NOTICE '✅ gen_salt literal is explicitly cast to text';
    RAISE NOTICE '✅ Function ready to use';
    RAISE NOTICE '';
    RAISE NOTICE 'Test by creating a user in ShopEasy:';
    RAISE NOTICE '→ Go to Users page';
    RAISE NOTICE '→ Click "Add User"';
    RAISE NOTICE '→ Fill in details and submit';
    RAISE NOTICE '→ User should be created automatically!';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
  ELSE
    RAISE NOTICE '⚠️ Function updated but schema qualification not detected';
    RAISE NOTICE 'Function definition: %', v_function_def;
  END IF;
END $$;
