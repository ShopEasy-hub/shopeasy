-- =====================================================
-- 🗑️  Enable Cascade Delete for Users
-- =====================================================
-- This ensures when auth.users is deleted, user_profiles is also deleted
-- =====================================================

-- Drop existing foreign key
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- Add foreign key with CASCADE delete
ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_id_fkey
FOREIGN KEY (id) REFERENCES auth.users(id)
ON DELETE CASCADE;

-- =====================================================
-- 🔍 Verify Foreign Key
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ CASCADE DELETE ENABLED';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Foreign key setup:';
  RAISE NOTICE '  user_profiles.id → auth.users.id ON DELETE CASCADE';
  RAISE NOTICE '';
  RAISE NOTICE 'What this means:';
  RAISE NOTICE '  • When you delete from auth.users, user_profiles is auto-deleted';
  RAISE NOTICE '  • When you delete from frontend, both are cleaned up';
  RAISE NOTICE '  • No orphaned records';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;
