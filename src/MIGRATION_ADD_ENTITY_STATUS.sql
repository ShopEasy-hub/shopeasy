-- =====================================================
-- Add Status Fields for Over-Limit Management
-- =====================================================
-- This migration adds status fields to branches, warehouses, users
-- to handle scenarios where users downgrade from trial to lower plans
-- =====================================================

-- Add status to branches if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'branches' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE branches ADD COLUMN is_active boolean DEFAULT true;
    RAISE NOTICE '✅ Added is_active to branches';
  ELSE
    RAISE NOTICE '✓ branches.is_active already exists';
  END IF;
END $$;

-- Add status to warehouses if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warehouses' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE warehouses ADD COLUMN is_active boolean DEFAULT true;
    RAISE NOTICE '✅ Added is_active to warehouses';
  ELSE
    RAISE NOTICE '✓ warehouses.is_active already exists';
  END IF;
END $$;

-- Add over_limit flag to track entities beyond plan limits
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'branches' AND column_name = 'is_over_limit'
  ) THEN
    ALTER TABLE branches ADD COLUMN is_over_limit boolean DEFAULT false;
    RAISE NOTICE '✅ Added is_over_limit to branches';
  ELSE
    RAISE NOTICE '✓ branches.is_over_limit already exists';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warehouses' AND column_name = 'is_over_limit'
  ) THEN
    ALTER TABLE warehouses ADD COLUMN is_over_limit boolean DEFAULT false;
    RAISE NOTICE '✅ Added is_over_limit to warehouses';
  ELSE
    RAISE NOTICE '✓ warehouses.is_over_limit already exists';
  END IF;
END $$;

-- Add deactivation reason (for user communication)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'deactivation_reason'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN deactivation_reason text;
    RAISE NOTICE '✅ Added deactivation_reason to user_profiles';
  ELSE
    RAISE NOTICE '✓ user_profiles.deactivation_reason already exists';
  END IF;
END $$;

-- Create function to mark entities over limit
CREATE OR REPLACE FUNCTION mark_over_limit_entities(
  p_org_id uuid,
  p_entity_type text, -- 'branches', 'warehouses', 'users'
  p_limit integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_count integer;
  v_marked_count integer;
  v_result json;
BEGIN
  -- Validate entity type
  IF p_entity_type NOT IN ('branches', 'warehouses', 'users') THEN
    RAISE EXCEPTION 'Invalid entity type: %. Must be branches, warehouses, or users', p_entity_type;
  END IF;

  IF p_entity_type = 'branches' THEN
    -- Count total branches
    SELECT COUNT(*) INTO v_total_count 
    FROM branches 
    WHERE organization_id = p_org_id;

    -- Mark branches over limit (keep oldest ones active)
    WITH ranked_branches AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn
      FROM branches
      WHERE organization_id = p_org_id
    )
    UPDATE branches
    SET 
      is_over_limit = CASE WHEN rb.rn > p_limit THEN true ELSE false END,
      is_active = CASE WHEN rb.rn > p_limit THEN false ELSE true END
    FROM ranked_branches rb
    WHERE branches.id = rb.id;

    GET DIAGNOSTICS v_marked_count = ROW_COUNT;

  ELSIF p_entity_type = 'warehouses' THEN
    -- Count total warehouses
    SELECT COUNT(*) INTO v_total_count 
    FROM warehouses 
    WHERE organization_id = p_org_id;

    -- Mark warehouses over limit
    WITH ranked_warehouses AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn
      FROM warehouses
      WHERE organization_id = p_org_id
    )
    UPDATE warehouses
    SET 
      is_over_limit = CASE WHEN rw.rn > p_limit THEN true ELSE false END,
      is_active = CASE WHEN rw.rn > p_limit THEN false ELSE true END
    FROM ranked_warehouses rw
    WHERE warehouses.id = rw.id;

    GET DIAGNOSTICS v_marked_count = ROW_COUNT;

  ELSIF p_entity_type = 'users' THEN
    -- Count total users
    SELECT COUNT(*) INTO v_total_count 
    FROM user_profiles 
    WHERE organization_id = p_org_id 
    AND status != 'inactive';

    -- Mark users over limit (always keep owner active)
    WITH ranked_users AS (
      SELECT 
        id, 
        role,
        ROW_NUMBER() OVER (
          ORDER BY 
            CASE WHEN role = 'owner' THEN 0 ELSE 1 END, -- Owner first
            created_at ASC
        ) as rn
      FROM user_profiles
      WHERE organization_id = p_org_id
      AND status != 'inactive'
    )
    UPDATE user_profiles
    SET 
      status = CASE 
        WHEN ru.rn > p_limit AND ru.role != 'owner' THEN 'over_limit' 
        ELSE status 
      END,
      deactivation_reason = CASE 
        WHEN ru.rn > p_limit AND ru.role != 'owner' 
        THEN 'Plan limit exceeded. Upgrade to reactivate this user.' 
        ELSE NULL 
      END
    FROM ranked_users ru
    WHERE user_profiles.id = ru.id;

    GET DIAGNOSTICS v_marked_count = ROW_COUNT;
  END IF;

  -- Return result
  v_result := json_build_object(
    'success', true,
    'entity_type', p_entity_type,
    'total_count', v_total_count,
    'limit', p_limit,
    'over_limit_count', GREATEST(0, v_total_count - p_limit),
    'message', format('Marked %s %s over limit', v_total_count - p_limit, p_entity_type)
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to mark over limit entities: %', SQLERRM;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION mark_over_limit_entities(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_over_limit_entities(uuid, text, integer) TO service_role;

-- Create function to check and enforce limits on subscription change
CREATE OR REPLACE FUNCTION enforce_plan_limits_on_subscription_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan_limits json;
  v_branch_limit integer;
  v_warehouse_limit integer;
  v_user_limit integer;
BEGIN
  -- Only run when subscription plan or status changes
  IF (NEW.subscription_plan != OLD.subscription_plan) OR 
     (NEW.subscription_status != OLD.subscription_status) THEN
    
    -- Don't enforce limits for trial or enterprise
    IF NEW.subscription_status = 'trial' OR NEW.subscription_plan = 'enterprise' THEN
      RETURN NEW;
    END IF;

    -- Get limits based on new plan (matching SubscriptionPlans.tsx)
    IF NEW.subscription_plan = 'starter' THEN
      v_branch_limit := 1;          -- 1 branch
      v_warehouse_limit := 0;       -- No warehouse
      v_user_limit := 2;            -- 2 users (owner + 1 staff)
    ELSIF NEW.subscription_plan = 'standard' THEN
      v_branch_limit := 2;          -- 2 branches
      v_warehouse_limit := 1;       -- 1 warehouse
      v_user_limit := 5;            -- 5 users maximum
    ELSIF NEW.subscription_plan = 'growth' THEN
      v_branch_limit := 4;          -- 4 branches
      v_warehouse_limit := 2;       -- 2 warehouses
      v_user_limit := 8;            -- 8 users maximum
    ELSE
      -- Default to starter limits if unknown plan
      v_branch_limit := 1;
      v_warehouse_limit := 0;
      v_user_limit := 2;
    END IF;

    -- Mark over-limit entities
    PERFORM mark_over_limit_entities(NEW.id, 'branches', v_branch_limit);
    PERFORM mark_over_limit_entities(NEW.id, 'warehouses', v_warehouse_limit);
    PERFORM mark_over_limit_entities(NEW.id, 'users', v_user_limit);

    RAISE NOTICE 'Plan limits enforced for organization %: % branches, % warehouses, % users', 
      NEW.id, v_branch_limit, v_warehouse_limit, v_user_limit;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to auto-enforce limits on subscription changes
DROP TRIGGER IF EXISTS trigger_enforce_plan_limits ON organizations;
CREATE TRIGGER trigger_enforce_plan_limits
  AFTER UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION enforce_plan_limits_on_subscription_change();

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ OVER-LIMIT MANAGEMENT SYSTEM READY';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Added columns:';
  RAISE NOTICE '• branches.is_active (boolean)';
  RAISE NOTICE '• branches.is_over_limit (boolean)';
  RAISE NOTICE '• warehouses.is_active (boolean)';
  RAISE NOTICE '• warehouses.is_over_limit (boolean)';
  RAISE NOTICE '• user_profiles.deactivation_reason (text)';
  RAISE NOTICE '';
  RAISE NOTICE 'Added functions:';
  RAISE NOTICE '• mark_over_limit_entities() - Manual limit enforcement';
  RAISE NOTICE '• enforce_plan_limits_on_subscription_change() - Auto trigger';
  RAISE NOTICE '';
  RAISE NOTICE 'How it works:';
  RAISE NOTICE '1. User downgrades from Trial → Starter';
  RAISE NOTICE '2. Trigger automatically runs';
  RAISE NOTICE '3. Extra branches/warehouses marked as over_limit';
  RAISE NOTICE '4. Extra users marked as "over_limit" status';
  RAISE NOTICE '5. Frontend shows warnings and read-only access';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;