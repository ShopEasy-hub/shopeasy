-- =====================================================
-- 🔧 QUICK FIX: Add Missing User Roles
-- Run this in Supabase SQL Editor NOW
-- =====================================================

-- This will add 'admin' and 'warehouse_manager' to allowed roles

-- Step 1: Drop the old constraint
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Step 2: Add new constraint with ALL roles
ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN (
  'owner', 
  'admin', 
  'manager', 
  'warehouse_manager', 
  'cashier', 
  'auditor',
  'super_admin'
));

-- Step 3: Verify it worked
SELECT 
  constraint_name, 
  check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'user_profiles_role_check';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ User roles constraint fixed!';
  RAISE NOTICE 'You can now create users with these roles:';
  RAISE NOTICE '  • owner';
  RAISE NOTICE '  • admin';
  RAISE NOTICE '  • manager';
  RAISE NOTICE '  • warehouse_manager';
  RAISE NOTICE '  • cashier';
  RAISE NOTICE '  • auditor';
END $$;
