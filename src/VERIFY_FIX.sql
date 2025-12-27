-- =====================================================
-- VERIFY THE FIX IS WORKING
-- =====================================================

-- 1. Check if the function exists
SELECT 
  'Function exists:' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'complete_signup') 
    THEN '✅ YES' 
    ELSE '❌ NO - Run the NUCLEAR_FIX_BYPASS_RLS.sql first!' 
  END as status;

-- 2. Check if permissions are granted
SELECT 
  'Permissions granted:' as check_name,
  CASE 
    WHEN has_function_privilege('authenticated', 'complete_signup(uuid, text, text, text)', 'EXECUTE') 
    THEN '✅ YES' 
    ELSE '❌ NO - Run GRANT EXECUTE command!' 
  END as status;

-- 3. Check current RLS policies on user_profiles
SELECT 
  '--- user_profiles policies ---' as info,
  policyname,
  cmd as operation
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY cmd, policyname;

-- 4. Check current RLS policies on organizations  
SELECT 
  '--- organizations policies ---' as info,
  policyname,
  cmd as operation
FROM pg_policies 
WHERE tablename = 'organizations'
ORDER BY cmd, policyname;

-- 5. Test the function (won't work unless you're logged in, but shows syntax)
-- SELECT complete_signup(
--   'test-uuid'::uuid,
--   'Test Org',
--   'Test User',
--   'test@example.com'
-- );
