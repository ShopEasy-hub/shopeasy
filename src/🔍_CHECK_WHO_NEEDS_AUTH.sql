-- =====================================================
-- 🔍 CHECK WHICH USERS NEED AUTH SETUP
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔍 CHECKING USER AUTH STATUS';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- Show all user profiles
SELECT 
  '📋 ALL USER PROFILES' as status,
  id,
  email,
  name,
  role,
  created_at
FROM user_profiles
ORDER BY created_at DESC;

-- Show auth.users
SELECT 
  '🔐 AUTH USERS (Can Login)' as status,
  id,
  email,
  created_at,
  confirmed_at,
  email_confirmed_at
FROM auth.users
ORDER BY created_at DESC;

-- Show users WITHOUT auth (THESE NEED AUTH SETUP!)
SELECT 
  '⚠️ NEEDS AUTH SETUP' as status,
  up.id,
  up.email,
  up.name,
  up.role,
  'Cannot login - no auth.users entry' as issue
FROM user_profiles up
LEFT JOIN auth.users au ON au.id = up.id
WHERE au.id IS NULL
ORDER BY up.created_at DESC;

-- Show pending auth with passwords
SELECT 
  '🔑 PENDING AUTH (with passwords)' as status,
  uap.user_id,
  uap.email,
  up.name,
  uap.password_hash as password_to_use,
  uap.created_at
FROM user_auth_pending uap
INNER JOIN user_profiles up ON up.id = uap.user_id
LEFT JOIN auth.users au ON au.id = uap.user_id
WHERE au.id IS NULL
  AND uap.processed = FALSE
  AND uap.expires_at > NOW()
ORDER BY uap.created_at DESC;

DO $$
DECLARE
  v_total_profiles INTEGER;
  v_total_auth INTEGER;
  v_needs_auth INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '📊 SUMMARY';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  SELECT COUNT(*) INTO v_total_profiles FROM user_profiles;
  SELECT COUNT(*) INTO v_total_auth FROM auth.users;
  
  SELECT COUNT(*) INTO v_needs_auth
  FROM user_profiles up
  LEFT JOIN auth.users au ON au.id = up.id
  WHERE au.id IS NULL;
  
  RAISE NOTICE 'Total Profiles: %', v_total_profiles;
  RAISE NOTICE 'Total Auth Users: %', v_total_auth;
  RAISE NOTICE 'Needs Auth Setup: %', v_needs_auth;
  RAISE NOTICE '';
  
  IF v_needs_auth > 0 THEN
    RAISE NOTICE '⚠️  ACTION REQUIRED:';
    RAISE NOTICE '   % users need auth setup in Supabase Dashboard', v_needs_auth;
    RAISE NOTICE '';
    RAISE NOTICE '📋 Steps:';
    RAISE NOTICE '   1. Look at "NEEDS AUTH SETUP" results above';
    RAISE NOTICE '   2. For each user:';
    RAISE NOTICE '      Dashboard → Authentication → Users → Add User';
    RAISE NOTICE '      Email: (from results)';
    RAISE NOTICE '      Password: (set new password)';
    RAISE NOTICE '      ✓ Auto Confirm User ← MUST CHECK!';
    RAISE NOTICE '      Create User';
    RAISE NOTICE '';
    RAISE NOTICE '   OR use "PENDING AUTH" results if passwords saved';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '✅ All users have auth setup!';
    RAISE NOTICE '   All users can login.';
    RAISE NOTICE '';
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;
