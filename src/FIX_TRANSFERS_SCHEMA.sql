-- ==========================================
-- FIX TRANSFERS TABLE SCHEMA
-- Remove old single-product columns
-- ==========================================

-- The transfers table was designed for single products
-- Now we use transfer_items for multiple products per transfer
-- So we need to remove product_id and quantity from transfers table

-- ==========================================
-- STEP 1: Make columns nullable first (safe)
-- ==========================================

ALTER TABLE transfers 
  ALTER COLUMN product_id DROP NOT NULL;

ALTER TABLE transfers 
  ALTER COLUMN quantity DROP NOT NULL;

-- ==========================================
-- STEP 2: Drop the columns completely
-- ==========================================

-- Drop product_id column (now in transfer_items)
ALTER TABLE transfers 
  DROP COLUMN IF EXISTS product_id;

-- Drop quantity column (now in transfer_items)
ALTER TABLE transfers 
  DROP COLUMN IF EXISTS quantity;

-- ==========================================
-- STEP 3: Ensure all required columns exist
-- ==========================================

DO $$
BEGIN
  -- from_warehouse_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transfers' AND column_name = 'from_warehouse_id'
  ) THEN
    ALTER TABLE transfers ADD COLUMN from_warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL;
  END IF;

  -- to_warehouse_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transfers' AND column_name = 'to_warehouse_id'
  ) THEN
    ALTER TABLE transfers ADD COLUMN to_warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL;
  END IF;

  -- from_branch_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transfers' AND column_name = 'from_branch_id'
  ) THEN
    ALTER TABLE transfers ADD COLUMN from_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
  END IF;

  -- to_branch_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transfers' AND column_name = 'to_branch_id'
  ) THEN
    ALTER TABLE transfers ADD COLUMN to_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
  END IF;

  -- approved_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transfers' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE transfers ADD COLUMN approved_by UUID;
  END IF;

  -- completed_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transfers' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE transfers ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;

  -- notes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transfers' AND column_name = 'notes'
  ) THEN
    ALTER TABLE transfers ADD COLUMN notes TEXT;
  END IF;

  -- status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transfers' AND column_name = 'status'
  ) THEN
    ALTER TABLE transfers ADD COLUMN status TEXT DEFAULT 'pending';
  END IF;

  -- initiated_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transfers' AND column_name = 'initiated_by'
  ) THEN
    ALTER TABLE transfers ADD COLUMN initiated_by UUID;
  END IF;
END $$;

-- ==========================================
-- VERIFICATION
-- ==========================================

DO $$
DECLARE
  v_has_product_id boolean;
  v_has_quantity boolean;
  v_column_count integer;
BEGIN
  -- Check if old columns are gone
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transfers' AND column_name = 'product_id'
  ) INTO v_has_product_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transfers' AND column_name = 'quantity'
  ) INTO v_has_quantity;

  -- Count all columns
  SELECT COUNT(*) INTO v_column_count
  FROM information_schema.columns 
  WHERE table_name = 'transfers';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ TRANSFERS TABLE SCHEMA FIXED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Old columns removed:';
  RAISE NOTICE '  - product_id: %', CASE WHEN v_has_product_id THEN '❌ STILL EXISTS' ELSE '✅ REMOVED' END;
  RAISE NOTICE '  - quantity: %', CASE WHEN v_has_quantity THEN '❌ STILL EXISTS' ELSE '✅ REMOVED' END;
  RAISE NOTICE '';
  RAISE NOTICE 'New structure:';
  RAISE NOTICE '  - Total columns: %', v_column_count;
  RAISE NOTICE '  - Products stored in: transfer_items table';
  RAISE NOTICE '  - One transfer can have multiple products';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Refresh browser (Ctrl+Shift+R)';
  RAISE NOTICE '  2. Create a new transfer';
  RAISE NOTICE '  3. Should work without errors! ✅';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

-- ==========================================
-- SHOW CURRENT SCHEMA
-- ==========================================

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'transfers'
ORDER BY ordinal_position;
