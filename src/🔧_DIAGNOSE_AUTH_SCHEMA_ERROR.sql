-- ==========================================
-- 🔍 DIAGNOSE AUTH SCHEMA ERROR
-- ==========================================
-- This script checks for common auth.users schema issues
-- that cause "Database error querying schema" errors
-- ==========================================

DO $$
DECLARE
  v_user RECORD;
  v_auth_count integer;
  v_issue_count integer := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔍 DIAGNOSING AUTH SCHEMA ISSUES';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Count auth users
  SELECT COUNT(*) INTO v_auth_count FROM auth.users;
  RAISE NOTICE 'Total users in auth.users: %', v_auth_count;
  RAISE NOTICE '';
  
  -- Check each user for issues
  RAISE NOTICE 'Checking each user for schema issues...';
  RAISE NOTICE '';
  
  FOR v_user IN 
    SELECT 
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      instance_id,
      aud,
      role,
      created_at,
      updated_at
    FROM auth.users
    ORDER BY created_at DESC
  LOOP
    -- Check for NULL critical fields
    IF v_user.instance_id IS NULL THEN
      v_issue_count := v_issue_count + 1;
      RAISE NOTICE '  ❌ %: Missing instance_id', v_user.email;
    END IF;
    
    IF v_user.aud IS NULL THEN
      v_issue_count := v_issue_count + 1;
      RAISE NOTICE '  ❌ %: Missing aud field', v_user.email;
    END IF;
    
    IF v_user.role IS NULL THEN
      v_issue_count := v_issue_count + 1;
      RAISE NOTICE '  ❌ %: Missing role field', v_user.email;
    END IF;
    
    IF v_user.encrypted_password IS NULL OR v_user.encrypted_password = '' THEN
      v_issue_count := v_issue_count + 1;
      RAISE NOTICE '  ❌ %: Missing or empty password', v_user.email;
    END IF;
    
    -- Check password format (should be bcrypt hash starting with $2)
    IF v_user.encrypted_password IS NOT NULL AND 
       NOT v_user.encrypted_password LIKE '$2%' THEN
      v_issue_count := v_issue_count + 1;
      RAISE NOTICE '  ❌ %: Invalid password hash format (not bcrypt)', v_user.email;
    END IF;
    
    IF v_issue_count = 0 THEN
      RAISE NOTICE '  ✅ %: OK', v_user.email;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  
  IF v_issue_count > 0 THEN
    RAISE NOTICE '❌ FOUND % ISSUES!', v_issue_count;
    RAISE NOTICE '';
    RAISE NOTICE 'These issues will cause login failures.';
    RAISE NOTICE 'Recommended action: Delete problematic users and recreate them.';
  ELSE
    RAISE NOTICE '✅ NO SCHEMA ISSUES FOUND';
    RAISE NOTICE '';
    RAISE NOTICE 'The auth.users table looks correct.';
    RAISE NOTICE 'The "Database error querying schema" might be:';
    RAISE NOTICE '  1. A temporary Supabase issue - try again';
    RAISE NOTICE '  2. An RLS policy issue';
    RAISE NOTICE '  3. A database connection issue';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
END $$;

-- ==========================================
-- Check auth.users table structure
-- ==========================================

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'auth' 
  AND table_name = 'users'
ORDER BY ordinal_position;
