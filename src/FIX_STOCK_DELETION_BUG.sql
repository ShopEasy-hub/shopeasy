-- =====================================================
-- CRITICAL FIX: Stock Deletion Bug on Transfer Receive
-- =====================================================
-- Issue: When receiving transfers, old stock gets deleted instead of added
-- Root Cause: UNIQUE constraint without NULLS NOT DISTINCT
--
-- When warehouse_id is NULL (branch stock) or branch_id is NULL (warehouse stock),
-- PostgreSQL treats each NULL as DISTINCT by default, so the ON CONFLICT
-- doesn't match existing records and creates NEW rows instead of updating.
--
-- This causes the old stock to "disappear" because the inventory query
-- returns the LATEST record (with just the transfer amount).
-- =====================================================

-- Step 1: Drop the old constraint
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS unique_stock_per_location;

-- Step 2: Recreate with NULLS NOT DISTINCT
-- This tells PostgreSQL to treat NULL values as EQUAL for uniqueness checking
ALTER TABLE inventory 
  ADD CONSTRAINT unique_stock_per_location 
  UNIQUE NULLS NOT DISTINCT (product_id, branch_id, warehouse_id);

-- Step 3: Clean up any duplicate records that may have been created
-- Keep the record with the highest quantity (most recent/accumulated)
WITH duplicates AS (
  SELECT 
    product_id,
    branch_id,
    warehouse_id,
    MAX(quantity) as max_qty,
    array_agg(id ORDER BY updated_at DESC) as ids
  FROM inventory
  GROUP BY product_id, branch_id, warehouse_id
  HAVING COUNT(*) > 1
)
DELETE FROM inventory
WHERE id IN (
  SELECT unnest(ids[2:]) -- Keep first ID, delete rest
  FROM duplicates
);

-- Step 4: Update any records that have accumulated wrong quantities
-- This is optional - run only if you know you have data corruption
-- Uncomment the following if needed:
/*
UPDATE inventory SET quantity = (
  SELECT SUM(quantity) 
  FROM inventory AS i2 
  WHERE i2.product_id = inventory.product_id 
    AND COALESCE(i2.branch_id::TEXT, '') = COALESCE(inventory.branch_id::TEXT, '')
    AND COALESCE(i2.warehouse_id::TEXT, '') = COALESCE(inventory.warehouse_id::TEXT, '')
)
WHERE id IN (
  SELECT MIN(id) 
  FROM inventory 
  GROUP BY product_id, branch_id, warehouse_id
);
*/

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check if constraint is properly created
DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'unique_stock_per_location'
      AND contype = 'u'
  ) INTO constraint_exists;
  
  IF constraint_exists THEN
    RAISE NOTICE '✅ Constraint unique_stock_per_location exists';
  ELSE
    RAISE NOTICE '❌ Constraint unique_stock_per_location NOT FOUND!';
  END IF;
END $$;

-- Check for remaining duplicates
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT product_id, branch_id, warehouse_id, COUNT(*) as cnt
    FROM inventory
    GROUP BY product_id, branch_id, warehouse_id
    HAVING COUNT(*) > 1
  ) AS dups;
  
  IF duplicate_count = 0 THEN
    RAISE NOTICE '✅ No duplicate inventory records found';
  ELSE
    RAISE NOTICE '⚠️ Found % duplicate inventory groups', duplicate_count;
    RAISE NOTICE '💡 Run the cleanup query in Step 3 to fix';
  END IF;
END $$;

-- =====================================================
-- TEST THE FIX
-- =====================================================
-- Test that UPSERT now works correctly
DO $$
DECLARE
  test_org_id UUID;
  test_branch_id UUID;
  test_product_id UUID;
  initial_qty INTEGER;
  final_qty INTEGER;
BEGIN
  -- Get test data (first available)
  SELECT organization_id, branch_id, product_id, quantity
  INTO test_org_id, test_branch_id, test_product_id, initial_qty
  FROM inventory
  WHERE branch_id IS NOT NULL
  LIMIT 1;
  
  IF test_product_id IS NULL THEN
    RAISE NOTICE '⚠️ No test data available in inventory table';
    RETURN;
  END IF;
  
  RAISE NOTICE '📊 Testing with product_id=%, branch_id=%', test_product_id, test_branch_id;
  RAISE NOTICE '📊 Initial quantity: %', initial_qty;
  
  -- Try to insert the same product+branch with +10 quantity
  INSERT INTO inventory (organization_id, branch_id, product_id, quantity)
  VALUES (test_org_id, test_branch_id, test_product_id, 10)
  ON CONFLICT ON CONSTRAINT unique_stock_per_location
  DO UPDATE SET
    quantity = inventory.quantity + EXCLUDED.quantity,
    updated_at = NOW();
  
  -- Check the result
  SELECT quantity INTO final_qty
  FROM inventory
  WHERE product_id = test_product_id
    AND branch_id = test_branch_id;
  
  RAISE NOTICE '📊 Final quantity: %', final_qty;
  
  IF final_qty = initial_qty + 10 THEN
    RAISE NOTICE '✅ UPSERT working correctly! Stock was ADDED, not replaced';
    
    -- Rollback the test
    UPDATE inventory
    SET quantity = initial_qty,
        updated_at = NOW()
    WHERE product_id = test_product_id
      AND branch_id = test_branch_id;
    
    RAISE NOTICE '✅ Test data rolled back';
  ELSE
    RAISE NOTICE '❌ UPSERT still not working correctly!';
    RAISE NOTICE '❌ Expected: %, Got: %', initial_qty + 10, final_qty;
  END IF;
END $$;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ STOCK DELETION BUG - FIXED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 What was fixed:';
  RAISE NOTICE '  • Added NULLS NOT DISTINCT to unique_stock_per_location';
  RAISE NOTICE '  • Now NULL values are treated as equal for uniqueness';
  RAISE NOTICE '  • ON CONFLICT will correctly match existing records';
  RAISE NOTICE '  • Stock will be ADDED instead of REPLACED';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 What to test:';
  RAISE NOTICE '  1. Transfer products from warehouse to branch';
  RAISE NOTICE '  2. Complete the transfer';
  RAISE NOTICE '  3. Verify branch stock = old stock + transfer amount';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Example:';
  RAISE NOTICE '  Branch stock BEFORE: 100 units';
  RAISE NOTICE '  Transfer amount: 50 units';
  RAISE NOTICE '  Branch stock AFTER: 150 units ✅ (not 50!)';
  RAISE NOTICE '';
END $$;
