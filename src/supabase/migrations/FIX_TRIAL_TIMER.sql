-- =====================================================
-- Fix Trial Timer System
-- =====================================================
-- This migration adds trial_start_date column to organizations
-- to properly track 7-day trial periods

-- Add trial_start_date column to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ DEFAULT NOW();

-- Update existing organizations to set trial_start_date to created_at if null
UPDATE organizations 
SET trial_start_date = created_at 
WHERE trial_start_date IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN organizations.trial_start_date IS 'When the organization trial period started - used to calculate 7-day trial expiration';

-- Update subscription_status to 'expired' for organizations where trial has expired (more than 7 days)
-- and they don't have an active subscription
UPDATE organizations
SET subscription_status = 'expired'
WHERE subscription_status = 'trial'
  AND trial_start_date IS NOT NULL
  AND trial_start_date < NOW() - INTERVAL '7 days'
  AND (subscription_plan IS NULL OR subscription_plan = 'starter');

-- =====================================================
-- Update complete_signup function to set trial_start_date
-- =====================================================
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
  -- Create organization with trial_start_date
  INSERT INTO organizations (name, owner_id, subscription_plan, subscription_status, trial_start_date)
  VALUES (p_org_name, p_user_id, 'starter', 'trial', NOW())
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