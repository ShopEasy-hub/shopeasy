-- =====================================================
-- ⚡ FIX TRIGGER CONFLICT - EDGE FUNCTION vs DATABASE TRIGGER
-- =====================================================
-- This fixes the duplicate key error by removing the
-- conflicting database trigger that auto-creates profiles
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '⚡ FIXING TRIGGER CONFLICT';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'THE PROBLEM:';
  RAISE NOTICE '  1. Edge Function creates auth user ✓';
  RAISE NOTICE '  2. Database trigger auto-creates profile ✓';
  RAISE NOTICE '  3. Edge Function tries to create profile → ✗ Duplicate!';
  RAISE NOTICE '  4. Edge Function rolls back → Deletes auth user';
  RAISE NOTICE '  5. Result: User cant login';
  RAISE NOTICE '';
  RAISE NOTICE 'THE FIX:';
  RAISE NOTICE '  Disable the database trigger, let Edge Function handle everything';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 1: Disable all auto-profile creation triggers
-- =====================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_auto_profile ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS trigger_handle_new_auth_user ON auth.users;
DROP TRIGGER IF EXISTS auto_create_profile ON auth.users;

DO $$
BEGIN
  RAISE NOTICE '✅ Disabled conflicting triggers';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 2: Keep cleanup trigger (important!)
-- =====================================================

-- This trigger is good - it cleans up profiles when auth users are deleted
-- Keep it active!

CREATE OR REPLACE FUNCTION cleanup_profile_on_auth_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete the user profile when auth user is deleted
  DELETE FROM public.user_profiles WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_deleted_cleanup_profile ON auth.users;

CREATE TRIGGER on_auth_user_deleted_cleanup_profile
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_profile_on_auth_delete();

DO $$
BEGIN
  RAISE NOTICE '✅ Kept cleanup trigger (deletes profiles when auth deleted)';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_trigger_count INTEGER;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ VERIFICATION';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Count remaining triggers
  SELECT COUNT(*) INTO v_trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'auth' 
    AND c.relname = 'users'
    AND tgname NOT LIKE 'RI_%'
    AND tgname NOT LIKE '%_cleanup_%';
  
  RAISE NOTICE 'Active auto-creation triggers: %', v_trigger_count;
  
  IF v_trigger_count = 0 THEN
    RAISE NOTICE '✅ Perfect! No conflicting triggers.';
    RAISE NOTICE '';
    RAISE NOTICE 'Edge Function will now handle user creation completely.';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '  1. ✓ Triggers disabled';
    RAISE NOTICE '  2. Test user creation in app';
    RAISE NOTICE '  3. Should work perfectly!';
  ELSE
    RAISE NOTICE '⚠️  Some triggers still active. Check manually.';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- SHOW REMAINING TRIGGERS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '📋 REMAINING TRIGGERS ON auth.users:';
  RAISE NOTICE '';
END $$;

SELECT 
  tgname as trigger_name,
  proname as function_name,
  CASE 
    WHEN tgname LIKE '%cleanup%' THEN '✅ Keep (cleanup)'
    ELSE '⚠️  Check this one'
  END as status
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' 
  AND c.relname = 'users'
  AND tgname NOT LIKE 'RI_%'
ORDER BY tgname;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ DONE!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Now test user creation in your app!';
  RAISE NOTICE '';
  RAISE NOTICE 'Expected flow:';
  RAISE NOTICE '  1. Edge Function creates auth user';
  RAISE NOTICE '  2. NO trigger fires (disabled)';
  RAISE NOTICE '  3. Edge Function creates profile';
  RAISE NOTICE '  4. ✅ Success!';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;
