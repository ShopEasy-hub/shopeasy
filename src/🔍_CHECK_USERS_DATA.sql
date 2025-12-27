-- =====================================================
-- 🔍 QUICK CHECK: What's in the database?
-- =====================================================
-- Run this to see exactly what users exist
-- =====================================================

-- 1. Show all organizations
SELECT 
  '=== ORGANIZATIONS ===' as info,
  id,
  name,
  subscription_status,
  subscription_plan,
  created_at::date as created
FROM organizations
ORDER BY created_at;

-- 2. Show all auth.users
SELECT 
  '=== AUTH.USERS ===' as info,
  email,
  email_confirmed_at IS NOT NULL as confirmed,
  encrypted_password IS NOT NULL as has_password,
  encrypted_password LIKE '$2%' as password_valid,
  email_change IS NULL as email_change_null,
  instance_id IS NULL as instance_null,
  created_at::date as created
FROM auth.users
ORDER BY created_at;

-- 3. Show all user_profiles
SELECT 
  '=== USER_PROFILES ===' as info,
  email,
  name,
  role,
  organization_id,
  assigned_branch_id,
  created_at::date as created
FROM user_profiles
ORDER BY created_at;

-- 4. Show sync status (auth vs profiles)
SELECT 
  '=== SYNC STATUS ===' as info,
  up.email as profile_email,
  au.email as auth_email,
  CASE 
    WHEN up.id IS NOT NULL AND au.id IS NOT NULL THEN '✅ In sync'
    WHEN up.id IS NOT NULL AND au.id IS NULL THEN '❌ Profile orphaned (no auth)'
    WHEN up.id IS NULL AND au.id IS NOT NULL THEN '❌ Auth orphaned (no profile)'
  END as status
FROM user_profiles up
FULL OUTER JOIN auth.users au ON up.id = au.id
ORDER BY up.created_at, au.created_at;

-- 5. Show RLS policies on user_profiles
SELECT 
  '=== RLS POLICIES ===' as info,
  policyname,
  cmd,
  LEFT(qual, 50) as using_clause
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY cmd, policyname;

-- 6. Count summary
SELECT 
  '=== SUMMARY ===' as info,
  (SELECT COUNT(*) FROM organizations) as total_orgs,
  (SELECT COUNT(*) FROM auth.users) as auth_users,
  (SELECT COUNT(*) FROM user_profiles) as user_profiles,
  (SELECT COUNT(*) FROM user_profiles up 
   LEFT JOIN auth.users au ON up.id = au.id 
   WHERE au.id IS NULL) as orphaned_profiles,
  (SELECT COUNT(*) FROM auth.users au 
   LEFT JOIN user_profiles up ON au.id = up.id 
   WHERE up.id IS NULL) as orphaned_auth;
