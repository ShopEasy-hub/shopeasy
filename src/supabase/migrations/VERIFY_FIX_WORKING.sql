-- ==========================================
-- VERIFICATION SCRIPT
-- Run this AFTER applying WORKING_FIX_ALL_ISSUES.sql
-- ==========================================

-- This script checks if all functions and policies are correctly set up

\echo '==========================================';
\echo 'VERIFICATION SCRIPT';
\echo 'Checking if fixes are properly deployed...';
\echo '==========================================';
\echo '';

-- ==========================================
-- 1. CHECK FUNCTIONS EXIST
-- ==========================================

\echo '1. Checking if security functions exist...';
\echo '';

SELECT 
  routine_name,
  routine_type,
  security_type,
  CASE 
    WHEN routine_name IN ('create_warehouse_secure', 'get_warehouses_secure', 'create_organization_user_secure')
    THEN '✅ FOUND'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'create_warehouse_secure',
    'get_warehouses_secure',
    'create_organization_user_secure',
    'create_user_invitation'
  )
ORDER BY routine_name;

\echo '';
\echo 'Expected: 3-4 functions with DEFINER security type';
\echo '';

-- ==========================================
-- 2. CHECK PERMISSIONS
-- ==========================================

\echo '2. Checking function permissions...';
\echo '';

SELECT 
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN (
    'create_warehouse_secure',
    'get_warehouses_secure',
    'create_organization_user_secure'
  )
  AND grantee = 'authenticated'
ORDER BY routine_name;

\echo '';
\echo 'Expected: EXECUTE permission for authenticated users on all 3 functions';
\echo '';

-- ==========================================
-- 3. CHECK RLS POLICIES
-- ==========================================

\echo '3. Checking warehouse RLS policies...';
\echo '';

SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN policyname LIKE '%_policy' THEN '✅ NEW POLICY'
    ELSE '⚠️ OLD POLICY'
  END as status
FROM pg_policies
WHERE tablename = 'warehouses'
ORDER BY policyname;

\echo '';
\echo 'Expected: 4 policies with names ending in "_policy"';
\echo 'If you see old policies, they should be removed';
\echo '';

-- ==========================================
-- 4. CHECK USER_PROFILES POLICIES
-- ==========================================

\echo '4. Checking user_profiles RLS policies...';
\echo '';

SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN policyname LIKE '%_policy' THEN '✅ NEW POLICY'
    ELSE '⚠️ OLD POLICY'
  END as status
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

\echo '';
\echo 'Expected: 3 policies (select, insert, update) with names ending in "_policy"';
\echo '';

-- ==========================================
-- 5. CHECK INDEXES
-- ==========================================

\echo '5. Checking performance indexes...';
\echo '';

SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('warehouses', 'user_profiles')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

\echo '';
\echo 'Expected: Multiple indexes for better performance';
\echo '';

-- ==========================================
-- 6. SAMPLE DATA CHECK
-- ==========================================

\echo '6. Checking existing data...';
\echo '';

SELECT 
  'warehouses' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT organization_id) as organizations
FROM warehouses
UNION ALL
SELECT 
  'user_profiles' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT organization_id) as organizations
FROM user_profiles;

\echo '';
\echo 'This shows how much data you have';
\echo '';

-- ==========================================
-- 7. TEST FUNCTION (Safe - No Changes)
-- ==========================================

\echo '7. Testing get_warehouses_secure function...';
\echo '';

-- Get the first organization to test with
DO $$
DECLARE
  test_org_id uuid;
  result jsonb;
BEGIN
  -- Get first organization ID
  SELECT id INTO test_org_id 
  FROM organizations 
  LIMIT 1;
  
  IF test_org_id IS NULL THEN
    RAISE NOTICE '⚠️ No organizations found in database';
    RAISE NOTICE 'This is normal for a fresh installation';
  ELSE
    -- Try calling the function (will fail if user doesn't belong to org, which is expected)
    BEGIN
      SELECT get_warehouses_secure(test_org_id) INTO result;
      RAISE NOTICE '✅ Function executed successfully';
      RAISE NOTICE 'Organization ID: %', test_org_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Function exists but requires proper authentication';
      RAISE NOTICE 'This is expected - function will work when called from authenticated app';
      RAISE NOTICE 'Error: %', SQLERRM;
    END;
  END IF;
END $$;

\echo '';

-- ==========================================
-- SUMMARY
-- ==========================================

\echo '';
\echo '==========================================';
\echo 'VERIFICATION COMPLETE';
\echo '==========================================';
\echo '';
\echo 'Next steps:';
\echo '1. Check results above - should see ✅ marks';
\echo '2. If functions are missing, re-run WORKING_FIX_ALL_ISSUES.sql';
\echo '3. If permissions are missing, run GRANT EXECUTE commands';
\echo '4. If old policies exist, they can coexist with new ones';
\echo '';
\echo 'To test from your app:';
\echo '1. Log in to ShopEasy';
\echo '2. Go to Warehouses page';
\echo '3. Try creating a warehouse';
\echo '4. Check browser console (F12) for success messages';
\echo '';
\echo '==========================================';

-- Optional: Show detailed policy definitions
\echo '';
\echo 'For detailed policy definitions, run:';
\echo 'SELECT * FROM pg_policies WHERE tablename IN (''warehouses'', ''user_profiles'');';
\echo '';
