-- =====================================================
-- Product History Audit - Database Setup
-- =====================================================
-- This migration adds the audit_logs table for tracking
-- product sales history and general system auditing.
-- 
-- Run this ONLY if you haven't run:
-- - 000_CLEAN_REBUILD_2025.sql (already includes this)
-- - Updated HYBRID_MIGRATION.sql (already includes this)
-- =====================================================

-- Step 1: Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  changes JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Step 3: Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;

CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin', 'auditor')
    )
  );

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- Step 5: Add helpful comments
COMMENT ON TABLE audit_logs IS 'Audit trail for system actions and product history tracking';
COMMENT ON COLUMN audit_logs.action IS 'Type of action performed (e.g., sale, update, delete)';
COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity affected (e.g., product, sale, inventory)';
COMMENT ON COLUMN audit_logs.entity_id IS 'UUID of the affected entity';
COMMENT ON COLUMN audit_logs.changes IS 'JSON object containing before/after values';

-- Step 6: Verification query
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Product History Audit Setup Complete!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 What was created:';
  RAISE NOTICE '   ✓ audit_logs table';
  RAISE NOTICE '   ✓ 5 indexes for performance';
  RAISE NOTICE '   ✓ Row Level Security enabled';
  RAISE NOTICE '   ✓ 2 RLS policies (read for admins, write for system)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next steps:';
  RAISE NOTICE '   1. Navigate to Dashboard in your app';
  RAISE NOTICE '   2. Look for "📊 Product History" in sidebar';
  RAISE NOTICE '   3. Click to access (Owner/Admin/Auditor only)';
  RAISE NOTICE '';
  RAISE NOTICE '📚 Documentation:';
  RAISE NOTICE '   → PRODUCT_HISTORY_GUIDE.md (full guide)';
  RAISE NOTICE '   → 🎯_PRODUCT_HISTORY_SETUP.md (quick setup)';
  RAISE NOTICE '';
END $$;

-- Final verification
SELECT 
  'audit_logs' AS table_name,
  COUNT(*) FILTER (WHERE indexname LIKE 'idx_audit_logs%') AS indexes_created,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'audit_logs') AS policies_created
FROM pg_indexes 
WHERE tablename = 'audit_logs';
