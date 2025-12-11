-- =====================================================
-- NUCLEAR OPTION: Bypass RLS completely for signup
-- =====================================================
-- This creates server-side functions that bypass ALL RLS policies

-- Function to create organization (bypasses RLS)
CREATE OR REPLACE FUNCTION create_organization_bypass_rls(
  p_name TEXT,
  p_owner_id UUID
)
RETURNS TABLE(id UUID, name TEXT, owner_id UUID) AS $$
BEGIN
  RETURN QUERY
  INSERT INTO organizations (name, owner_id, subscription_plan, subscription_status)
  VALUES (p_name, p_owner_id, 'starter', 'active')
  RETURNING organizations.id, organizations.name, organizations.owner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create user profile (bypasses RLS)
CREATE OR REPLACE FUNCTION create_user_profile_bypass_rls(
  p_id UUID,
  p_organization_id UUID,
  p_name TEXT,
  p_email TEXT,
  p_role TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_profiles (id, organization_id, name, email, role, status)
  VALUES (p_id, p_organization_id, p_name, p_email, p_role, 'active');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Complete signup function (creates both org and profile)
CREATE OR REPLACE FUNCTION complete_signup(
  p_user_id UUID,
  p_org_name TEXT,
  p_user_name TEXT,
  p_email TEXT
)
RETURNS JSON AS $$
DECLARE
  v_org_id UUID;
  v_result JSON;
BEGIN
  -- Create organization
  INSERT INTO organizations (name, owner_id, subscription_plan, subscription_status)
  VALUES (p_org_name, p_user_id, 'starter', 'active')
  RETURNING id INTO v_org_id;

  -- Create user profile
  INSERT INTO user_profiles (id, organization_id, name, email, role, status)
  VALUES (p_user_id, v_org_id, p_user_name, p_email, 'owner', 'active');

  -- Return result
  SELECT json_build_object(
    'organization_id', v_org_id,
    'user_id', p_user_id
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION complete_signup(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_organization_bypass_rls(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_profile_bypass_rls(UUID, UUID, TEXT, TEXT, TEXT) TO authenticated;

-- ✅ Now you can call complete_signup() from your app to bypass ALL RLS!
