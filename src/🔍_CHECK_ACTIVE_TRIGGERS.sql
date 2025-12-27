-- =====================================================
-- 🔍 CHECK WHAT TRIGGERS ARE ACTIVE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔍 CHECKING ACTIVE TRIGGERS ON auth.users';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- Show all triggers on auth.users
SELECT 
  tgname as trigger_name,
  proname as function_name,
  tgenabled as is_enabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' 
  AND c.relname = 'users'
  AND tgname NOT LIKE 'RI_%'  -- Exclude foreign key triggers
ORDER BY tgname;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🎯 SOLUTION';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'If you see triggers like:';
  RAISE NOTICE '  - on_auth_user_created';
  RAISE NOTICE '  - on_auth_user_created_auto_profile';
  RAISE NOTICE '  - handle_new_user';
  RAISE NOTICE '';
  RAISE NOTICE 'These are AUTO-CREATING profiles when auth users are created!';
  RAISE NOTICE '';
  RAISE NOTICE 'This conflicts with the Edge Function that also tries to create profiles.';
  RAISE NOTICE '';
  RAISE NOTICE 'OPTION 1: Disable the trigger (let Edge Function handle it)';
  RAISE NOTICE 'OPTION 2: Remove profile creation from Edge Function (let trigger handle it)';
  RAISE NOTICE '';
  RAISE NOTICE 'See: ⚡_FIX_TRIGGER_CONFLICT.sql for the fix';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;
