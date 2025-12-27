-- =====================================================
-- FIX USER ROLES CONSTRAINT
-- Add missing roles: 'admin' and 'warehouse_manager'
-- =====================================================

-- Drop the old check constraint
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Add new check constraint with all 6 roles
ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('owner', 'admin', 'manager', 'warehouse_manager', 'cashier', 'auditor'));

-- Update the default role to 'cashier' (keep existing default)
ALTER TABLE user_profiles 
ALTER COLUMN role SET DEFAULT 'cashier';

-- Comment to document the available roles
COMMENT ON COLUMN user_profiles.role IS 'User role - allowed values: owner, admin, manager, warehouse_manager, cashier, auditor';

-- Log the fix
DO $$
BEGIN
  RAISE NOTICE '✅ User roles constraint updated successfully';
  RAISE NOTICE 'Allowed roles: owner, admin, manager, warehouse_manager, cashier, auditor';
END $$;
