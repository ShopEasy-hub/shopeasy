-- =====================================================
-- 🔍 QUICK DIAGNOSTIC: Member Login Issues
-- =====================================================
-- Run this first to see what's wrong
-- =====================================================

-- Check 1: All auth users
SELECT 
  '=== ALL AUTH USERS ===' as check_type,
  '' as detail;

SELECT 
  email,
  CASE 
    WHEN encrypted_password IS NULL THEN '❌ NULL'
    WHEN encrypted_password = '' THEN '❌ EMPTY'
    WHEN NOT encrypted_password LIKE '$2%' THEN '❌ INVALID HASH'
    ELSE '✅ VALID'
  END as password_status,
  CASE 
    WHEN email_change IS NULL THEN '❌ NULL (ERROR!)'
    WHEN email_change = '' THEN '✅ EMPTY STRING'
    ELSE '⚠️  HAS VALUE: ' || email_change
  END as email_change_status,
  CASE 
    WHEN instance_id IS NULL THEN '❌ NULL'
    ELSE '✅ ' || LEFT(instance_id::text, 8) || '...'
  END as instance_id_status,
  CASE 
    WHEN aud IS NULL THEN '❌ NULL'
    ELSE '✅ ' || aud
  END as aud_status,
  CASE 
    WHEN role IS NULL THEN '❌ NULL'
    ELSE '✅ ' || role
  END as role_status
FROM auth.users
ORDER BY created_at DESC;

-- Check 2: User profiles with auth status
SELECT 
  '' as separator,
  '=== USER PROFILES ===' as check_type;

SELECT 
  up.email,
  up.role as profile_role,
  o.name as organization,
  CASE 
    WHEN au.id IS NOT NULL THEN '✅ HAS AUTH USER'
    ELSE '❌ NO AUTH USER (ORPHANED!)'
  END as auth_status,
  CASE 
    WHEN up.organization_id IS NULL THEN '❌ NO ORG'
    ELSE '✅ HAS ORG'
  END as org_status
FROM user_profiles up
LEFT JOIN organizations o ON up.organization_id = o.id
LEFT JOIN auth.users au ON up.id = au.id
ORDER BY up.created_at DESC;

-- Check 3: RLS Policies
SELECT 
  '' as separator,
  '=== RLS POLICIES ===' as check_type;

SELECT 
  policyname,
  cmd as command,
  LEFT(qual, 100) as using_clause,
  CASE 
    WHEN qual LIKE '%user_profiles%' AND tablename = 'user_profiles' THEN '⚠️  RECURSIVE!'
    WHEN qual LIKE '%true%' THEN '✅ PERMISSIVE'
    ELSE 'ℹ️  RESTRICTIVE'
  END as policy_type
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- Summary
SELECT 
  '' as separator,
  '=== SUMMARY ===' as check_type;

SELECT 
  '1. Auth Users with Problems' as metric,
  COUNT(*) as count
FROM auth.users
WHERE 
  encrypted_password IS NULL 
  OR encrypted_password = '' 
  OR NOT encrypted_password LIKE '$2%'
  OR email_change IS NULL
  OR instance_id IS NULL
  OR aud IS NULL
  OR role IS NULL;

SELECT 
  '2. Orphaned Profiles' as metric,
  COUNT(*) as count
FROM user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
WHERE au.id IS NULL;

SELECT 
  '3. Recursive RLS Policies' as metric,
  COUNT(*) as count
FROM pg_policies
WHERE tablename = 'user_profiles'
AND qual LIKE '%user_profiles%';

-- Recommendations
SELECT 
  '' as separator,
  '=== NEXT STEPS ===' as check_type;

DO $$
DECLARE
  v_problem_count integer;
  v_orphaned_count integer;
  v_recursive_count integer;
BEGIN
  -- Count problems
  SELECT COUNT(*) INTO v_problem_count
  FROM auth.users
  WHERE 
    encrypted_password IS NULL 
    OR encrypted_password = '' 
    OR NOT encrypted_password LIKE '$2%'
    OR email_change IS NULL
    OR instance_id IS NULL
    OR aud IS NULL
    OR role IS NULL;
  
  SELECT COUNT(*) INTO v_orphaned_count
  FROM user_profiles up
  LEFT JOIN auth.users au ON up.id = au.id
  WHERE au.id IS NULL;
  
  SELECT COUNT(*) INTO v_recursive_count
  FROM pg_policies
  WHERE tablename = 'user_profiles'
  AND qual LIKE '%user_profiles%';
  
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════════';
  RAISE NOTICE '🎯 DIAGNOSTIC COMPLETE';
  RAISE NOTICE '════════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  IF v_problem_count > 0 THEN
    RAISE NOTICE '❌ Found % auth user(s) with problems', v_problem_count;
    RAISE NOTICE '   → Run: 🔧_FIX_MEMBER_LOGIN_ERROR.sql';
  ELSE
    RAISE NOTICE '✅ All auth users look valid';
  END IF;
  
  IF v_orphaned_count > 0 THEN
    RAISE NOTICE '❌ Found % orphaned profile(s)', v_orphaned_count;
    RAISE NOTICE '   → Delete orphaned profiles or recreate auth users';
  ELSE
    RAISE NOTICE '✅ No orphaned profiles';
  END IF;
  
  IF v_recursive_count > 0 THEN
    RAISE NOTICE '⚠️  Found % recursive RLS polic(ies)', v_recursive_count;
    RAISE NOTICE '   → Run: 🔧_FIX_MEMBER_LOGIN_ERROR.sql';
  ELSE
    RAISE NOTICE '✅ RLS policies look good';
  END IF;
  
  RAISE NOTICE '';
  
  IF v_problem_count = 0 AND v_orphaned_count = 0 AND v_recursive_count = 0 THEN
    RAISE NOTICE '🎉 NO ISSUES FOUND!';
    RAISE NOTICE '';
    RAISE NOTICE 'If users still cannot login:';
    RAISE NOTICE '  1. Clear browser cache';
    RAISE NOTICE '  2. Try incognito/private mode';
    RAISE NOTICE '  3. Check browser console for errors (F12)';
    RAISE NOTICE '  4. Verify network connection';
  ELSE
    RAISE NOTICE '🔧 FIXES NEEDED:';
    RAISE NOTICE '';
    RAISE NOTICE 'Run this file to fix all issues:';
    RAISE NOTICE '  → 🔧_FIX_MEMBER_LOGIN_ERROR.sql';
    RAISE NOTICE '';
    RAISE NOTICE 'Or read the troubleshooting guide:';
    RAISE NOTICE '  → 🚨_MEMBER_LOGIN_TROUBLESHOOTING.md';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;
