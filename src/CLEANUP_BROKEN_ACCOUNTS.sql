-- =====================================================
-- CLEANUP: Remove broken/orphaned accounts
-- =====================================================

-- Step 1: Find orphaned auth users (users without profiles)
SELECT 
  'Orphaned auth users (no profile):' as description,
  au.id,
  au.email,
  au.created_at
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE up.id IS NULL
ORDER BY au.created_at DESC;

-- Step 2: Find organizations without owners
SELECT 
  'Organizations with missing owners:' as description,
  o.id,
  o.name,
  o.owner_id,
  o.created_at
FROM organizations o
LEFT JOIN auth.users au ON o.owner_id = au.id
WHERE au.id IS NULL
ORDER BY o.created_at DESC;

-- =====================================================
-- CLEANUP ACTIONS - Run these AFTER reviewing above
-- =====================================================

-- Option 1: Delete ALL orphaned auth users (no profile)
-- Uncomment to run:
-- DELETE FROM auth.users 
-- WHERE id NOT IN (SELECT id FROM user_profiles);

-- Option 2: Delete specific user by email
-- Replace 'your-email@example.com' with the actual email:
-- DELETE FROM auth.users WHERE email = 'your-email@example.com';

-- Option 3: Delete orphaned organizations
-- DELETE FROM organizations 
-- WHERE owner_id NOT IN (SELECT id FROM auth.users);

-- =====================================================
-- After cleanup, verify:
-- =====================================================
SELECT 
  (SELECT COUNT(*) FROM auth.users) as total_auth_users,
  (SELECT COUNT(*) FROM user_profiles) as total_profiles,
  (SELECT COUNT(*) FROM organizations) as total_organizations,
  (SELECT COUNT(*) FROM auth.users WHERE id NOT IN (SELECT id FROM user_profiles)) as orphaned_users;
