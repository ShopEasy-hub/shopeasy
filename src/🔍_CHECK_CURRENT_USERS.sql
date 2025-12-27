-- Check what users exist
SELECT 
  'user_profiles' as source,
  id,
  email,
  name,
  role,
  status,
  created_at
FROM user_profiles
ORDER BY created_at DESC;

-- Check auth.users
SELECT 
  'auth.users' as source,
  id,
  email,
  created_at,
  confirmed_at,
  email_confirmed_at
FROM auth.users
ORDER BY created_at DESC;

-- Check if there are orphaned profiles (profile but no auth)
SELECT 
  'orphaned_profiles' as issue,
  up.id,
  up.email,
  up.name,
  'Profile exists but NO auth.users' as status
FROM user_profiles up
LEFT JOIN auth.users au ON au.id = up.id
WHERE au.id IS NULL;
