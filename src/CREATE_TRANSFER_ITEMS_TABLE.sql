-- ==========================================
-- CREATE MISSING TRANSFER_ITEMS TABLE
-- This table is required for the transfer system
-- ==========================================

-- ==========================================
-- 1. CREATE transfer_items TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 2. CREATE INDEXES for performance
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_transfer_items_transfer_id 
  ON transfer_items(transfer_id);

CREATE INDEX IF NOT EXISTS idx_transfer_items_product_id 
  ON transfer_items(product_id);

-- ==========================================
-- 3. ENABLE RLS (Row Level Security)
-- ==========================================

ALTER TABLE transfer_items ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 4. CREATE RLS POLICIES
-- ==========================================

-- Allow authenticated users to read transfer items for their org
DROP POLICY IF EXISTS "Users can view transfer items for their org" ON transfer_items;
CREATE POLICY "Users can view transfer items for their org"
  ON transfer_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transfers t
      WHERE t.id = transfer_items.transfer_id
      AND t.organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Allow authenticated users to insert transfer items for their org
DROP POLICY IF EXISTS "Users can insert transfer items for their org" ON transfer_items;
CREATE POLICY "Users can insert transfer items for their org"
  ON transfer_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transfers t
      WHERE t.id = transfer_items.transfer_id
      AND t.organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Allow authenticated users to update transfer items for their org
DROP POLICY IF EXISTS "Users can update transfer items for their org" ON transfer_items;
CREATE POLICY "Users can update transfer items for their org"
  ON transfer_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transfers t
      WHERE t.id = transfer_items.transfer_id
      AND t.organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Allow authenticated users to delete transfer items for their org
DROP POLICY IF EXISTS "Users can delete transfer items for their org" ON transfer_items;
CREATE POLICY "Users can delete transfer items for their org"
  ON transfer_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transfers t
      WHERE t.id = transfer_items.transfer_id
      AND t.organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- ==========================================
-- 5. GRANT PERMISSIONS
-- ==========================================

GRANT ALL ON transfer_items TO authenticated;
GRANT ALL ON transfer_items TO service_role;

-- ==========================================
-- 6. ADD updated_at TRIGGER
-- ==========================================

CREATE OR REPLACE FUNCTION update_transfer_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS transfer_items_updated_at ON transfer_items;
CREATE TRIGGER transfer_items_updated_at
  BEFORE UPDATE ON transfer_items
  FOR EACH ROW
  EXECUTE FUNCTION update_transfer_items_updated_at();

-- ==========================================
-- 7. VERIFICATION
-- ==========================================

DO $$
DECLARE
  v_table_exists boolean;
  v_rls_enabled boolean;
  v_policy_count integer;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'transfer_items'
  ) INTO v_table_exists;

  -- Check if RLS is enabled
  SELECT relrowsecurity INTO v_rls_enabled
  FROM pg_class
  WHERE relname = 'transfer_items';

  -- Count policies
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename = 'transfer_items';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ TRANSFER_ITEMS TABLE CREATED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Status:';
  RAISE NOTICE '  1. Table exists: %', CASE WHEN v_table_exists THEN '✅ YES' ELSE '❌ NO' END;
  RAISE NOTICE '  2. RLS enabled: %', CASE WHEN v_rls_enabled THEN '✅ YES' ELSE '❌ NO' END;
  RAISE NOTICE '  3. Policies created: % policies', v_policy_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Table structure:';
  RAISE NOTICE '  - id: UUID (Primary Key)';
  RAISE NOTICE '  - transfer_id: UUID → transfers(id)';
  RAISE NOTICE '  - product_id: UUID → products(id)';
  RAISE NOTICE '  - quantity: INTEGER (> 0)';
  RAISE NOTICE '  - unit_cost: DECIMAL(10,2)';
  RAISE NOTICE '  - created_at, updated_at: TIMESTAMPTZ';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Refresh browser (Ctrl+Shift+R)';
  RAISE NOTICE '  2. Try accepting a transfer';
  RAISE NOTICE '  3. Should work now!';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
