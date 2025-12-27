-- =====================================================
-- Auto-Expire Trial Subscriptions After 7 Days
-- =====================================================
-- This function automatically checks and expires trial subscriptions
-- that have passed the 7-day trial period

-- Create function to check and expire trials
CREATE OR REPLACE FUNCTION check_and_expire_trial(p_org_id UUID)
RETURNS JSON AS $$
DECLARE
  v_org RECORD;
  v_days_since_trial INT;
  v_result JSON;
BEGIN
  -- Get organization details
  SELECT 
    id,
    subscription_status,
    trial_start_date,
    subscription_end_date
  INTO v_org
  FROM organizations
  WHERE id = p_org_id;

  -- If organization not found, return error
  IF v_org IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Organization not found'
    );
  END IF;

  -- If status is 'trial', check if it should be expired
  IF v_org.subscription_status = 'trial' AND v_org.trial_start_date IS NOT NULL THEN
    -- Calculate days since trial started
    v_days_since_trial := EXTRACT(DAY FROM (NOW() - v_org.trial_start_date));
    
    -- If more than 7 days have passed, expire the trial
    IF v_days_since_trial > 7 THEN
      UPDATE organizations
      SET 
        subscription_status = 'expired',
        updated_at = NOW()
      WHERE id = p_org_id;
      
      RETURN json_build_object(
        'success', true,
        'status', 'expired',
        'message', 'Trial period has ended',
        'days_elapsed', v_days_since_trial
      );
    ELSE
      RETURN json_build_object(
        'success', true,
        'status', 'trial',
        'message', 'Trial is still active',
        'days_remaining', 7 - v_days_since_trial
      );
    END IF;
  END IF;

  -- If status is 'active', check if paid subscription has expired
  IF v_org.subscription_status = 'active' AND v_org.subscription_end_date IS NOT NULL THEN
    IF v_org.subscription_end_date < NOW() THEN
      UPDATE organizations
      SET 
        subscription_status = 'expired',
        updated_at = NOW()
      WHERE id = p_org_id;
      
      RETURN json_build_object(
        'success', true,
        'status', 'expired',
        'message', 'Subscription has ended'
      );
    END IF;
  END IF;

  -- Return current status if no changes
  RETURN json_build_object(
    'success', true,
    'status', v_org.subscription_status,
    'message', 'Subscription is ' || v_org.subscription_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_and_expire_trial(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION check_and_expire_trial IS 
'Checks if a trial or paid subscription has expired and updates the status accordingly. Call this function on user login.';

-- =====================================================
-- Batch expire all overdue trials (run periodically)
-- =====================================================
CREATE OR REPLACE FUNCTION batch_expire_trials()
RETURNS TABLE(org_id UUID, org_name TEXT, expired_count INT) AS $$
DECLARE
  v_expired_count INT;
BEGIN
  -- Expire trials that are more than 7 days old
  UPDATE organizations
  SET 
    subscription_status = 'expired',
    updated_at = NOW()
  WHERE subscription_status = 'trial'
    AND trial_start_date IS NOT NULL
    AND trial_start_date < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;

  -- Expire paid subscriptions that have passed end date
  UPDATE organizations
  SET 
    subscription_status = 'expired',
    updated_at = NOW()
  WHERE subscription_status = 'active'
    AND subscription_end_date IS NOT NULL
    AND subscription_end_date < NOW();
  
  -- Return summary
  RETURN QUERY
  SELECT 
    NULL::UUID as org_id,
    'Batch process completed'::TEXT as org_name,
    v_expired_count as expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service_role only (for cron jobs)
GRANT EXECUTE ON FUNCTION batch_expire_trials() TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION batch_expire_trials IS 
'Batch expires all overdue trials and subscriptions. Should be run via cron job daily.';

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================

-- Check and expire a specific organization's trial (call on login):
-- SELECT check_and_expire_trial('org-uuid-here');

-- Batch expire all overdue trials (run daily via cron):
-- SELECT * FROM batch_expire_trials();

-- =====================================================
-- RECOMMENDATION: Set up Supabase Cron Job
-- =====================================================
-- Go to Supabase Dashboard > Database > Cron Jobs
-- Add a new job that runs daily:
-- 
-- Schedule: 0 2 * * * (every day at 2 AM)
-- SQL: SELECT batch_expire_trials();
-- =====================================================
