-- =====================================================
-- CHECK & CLEAN: Find and optionally remove stuck accounts
-- =====================================================

-- Step 1: Check what accounts exist
SELECT 
  'AUTH USERS' as table_name,
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- Step 2: Check organizations
SELECT 
  'ORGANIZATIONS' as table_name,
  id,
  name,
  owner_id,
  created_at
FROM organizations
ORDER BY created_at DESC
LIMIT 10;

-- Step 3: Check user profiles
SELECT 
  'USER PROFILES' as table_name,
  id,
  email,
  name,
  organization_id,
  role,
  created_at
FROM user_profiles
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- OPTIONAL: Delete specific stuck account
-- =====================================================
-- Uncomment and replace 'user@example.com' with your email to delete

-- DELETE FROM user_profiles WHERE email = 'user@example.com';
-- DELETE FROM organizations WHERE owner_id IN (SELECT id FROM auth.users WHERE email = 'user@example.com');
-- DELETE FROM auth.users WHERE email = 'user@example.com';

-- Or to find orphaned records:
-- SELECT * FROM auth.users WHERE id NOT IN (SELECT id FROM user_profiles);
-- SELECT * FROM organizations WHERE owner_id NOT IN (SELECT id FROM auth.users);
