-- =====================================================
-- DIAGNOSTIC: Find out what's ACTUALLY happening
-- =====================================================

-- Step 1: Check current constraint on inventory table
DO $$
DECLARE
  constraint_def TEXT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '1. CHECKING INVENTORY CONSTRAINT';
  RAISE NOTICE '========================================';
  
  SELECT pg_get_constraintdef(oid) INTO constraint_def
  FROM pg_constraint
  WHERE conname = 'unique_stock_per_location'
    AND conrelid = 'inventory'::regclass;
  
  IF constraint_def IS NULL THEN
    RAISE NOTICE '❌ Constraint unique_stock_per_location NOT FOUND!';
  ELSE
    RAISE NOTICE '✅ Constraint exists: %', constraint_def;
    
    IF constraint_def LIKE '%NULLS NOT DISTINCT%' THEN
      RAISE NOTICE '✅ Has NULLS NOT DISTINCT';
    ELSE
      RAISE NOTICE '⚠️ Missing NULLS NOT DISTINCT - this could cause duplicates';
    END IF;
  END IF;
END $$;

-- Step 2: Check for duplicate inventory records
DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '2. CHECKING FOR DUPLICATE RECORDS';
  RAISE NOTICE '========================================';
  
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT product_id, branch_id, warehouse_id, COUNT(*) as cnt
    FROM inventory
    GROUP BY product_id, branch_id, warehouse_id
    HAVING COUNT(*) > 1
  ) AS dups;
  
  IF dup_count = 0 THEN
    RAISE NOTICE '✅ No duplicates found';
  ELSE
    RAISE NOTICE '❌ Found % duplicate groups!', dup_count;
    
    -- Show details of duplicates
    RAISE NOTICE '';
    RAISE NOTICE 'Duplicate details:';
    FOR r IN (
      SELECT 
        product_id,
        branch_id,
        warehouse_id,
        COUNT(*) as count,
        array_agg(quantity ORDER BY updated_at) as quantities,
        array_agg(updated_at ORDER BY updated_at) as dates
      FROM inventory
      GROUP BY product_id, branch_id, warehouse_id
      HAVING COUNT(*) > 1
      LIMIT 5
    ) LOOP
      RAISE NOTICE 'Product: %, Branch: %, Warehouse: %, Count: %, Quantities: %, Dates: %',
        r.product_id, r.branch_id, r.warehouse_id, r.count, r.quantities, r.dates;
    END LOOP;
  END IF;
END $$;

-- Step 3: Check the complete_transfer trigger
DO $$
DECLARE
  trigger_exists BOOLEAN;
  function_body TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '3. CHECKING TRANSFER TRIGGER';
  RAISE NOTICE '========================================';
  
  -- Check if trigger exists
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'handle_transfer_completion'
  ) INTO trigger_exists;
  
  IF trigger_exists THEN
    RAISE NOTICE '✅ Trigger handle_transfer_completion exists';
  ELSE
    RAISE NOTICE '❌ Trigger handle_transfer_completion NOT FOUND!';
  END IF;
  
  -- Check if function exists and show snippet
  SELECT prosrc INTO function_body
  FROM pg_proc
  WHERE proname = 'complete_transfer';
  
  IF function_body IS NULL THEN
    RAISE NOTICE '❌ Function complete_transfer NOT FOUND!';
  ELSE
    RAISE NOTICE '✅ Function complete_transfer exists';
    
    -- Check if it references transfer_items table
    IF function_body LIKE '%transfer_items%' THEN
      RAISE NOTICE '✅ Function uses transfer_items table (multi-product support)';
    ELSE
      RAISE NOTICE '⚠️ Function does NOT use transfer_items table!';
      RAISE NOTICE '   This means it''s using old single-product logic';
    END IF;
    
    -- Check if it has ON CONFLICT clause
    IF function_body LIKE '%ON CONFLICT%' THEN
      RAISE NOTICE '✅ Function has ON CONFLICT clause';
    ELSE
      RAISE NOTICE '⚠️ Function does NOT have ON CONFLICT clause!';
    END IF;
  END IF;
END $$;

-- Step 4: Check transfer_items table exists
DO $$
DECLARE
  table_exists BOOLEAN;
  row_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '4. CHECKING TRANSFER_ITEMS TABLE';
  RAISE NOTICE '========================================';
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'transfer_items'
  ) INTO table_exists;
  
  IF table_exists THEN
    RAISE NOTICE '✅ transfer_items table exists';
    
    -- Count rows
    EXECUTE 'SELECT COUNT(*) FROM transfer_items' INTO row_count;
    RAISE NOTICE '   Total records: %', row_count;
  ELSE
    RAISE NOTICE '❌ transfer_items table does NOT exist!';
    RAISE NOTICE '   System is still using old single-product transfers';
  END IF;
END $$;

-- Step 5: Check recent transfers
DO $$
DECLARE
  recent_transfer RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '5. CHECKING RECENT COMPLETED TRANSFERS';
  RAISE NOTICE '========================================';
  
  FOR recent_transfer IN (
    SELECT 
      id,
      status,
      from_warehouse_id,
      from_branch_id,
      to_branch_id,
      to_warehouse_id,
      completed_at,
      created_at
    FROM transfers
    WHERE status = 'completed'
    ORDER BY completed_at DESC NULLS LAST
    LIMIT 3
  ) LOOP
    RAISE NOTICE '';
    RAISE NOTICE 'Transfer ID: %', recent_transfer.id;
    RAISE NOTICE '  Status: %', recent_transfer.status;
    RAISE NOTICE '  From Warehouse: %', recent_transfer.from_warehouse_id;
    RAISE NOTICE '  From Branch: %', recent_transfer.from_branch_id;
    RAISE NOTICE '  To Branch: %', recent_transfer.to_branch_id;
    RAISE NOTICE '  To Warehouse: %', recent_transfer.to_warehouse_id;
    RAISE NOTICE '  Completed: %', recent_transfer.completed_at;
    
    -- Check if this transfer has items
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transfer_items') THEN
      DECLARE
        item_count INTEGER;
      BEGIN
        EXECUTE format('SELECT COUNT(*) FROM transfer_items WHERE transfer_id = %L', recent_transfer.id) INTO item_count;
        RAISE NOTICE '  Items count: %', item_count;
      END;
    END IF;
  END LOOP;
END $$;

-- Step 6: Sample inventory query (how the app fetches stock)
DO $$
DECLARE
  sample RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '6. SAMPLE INVENTORY RECORDS';
  RAISE NOTICE '========================================';
  
  FOR sample IN (
    SELECT 
      product_id,
      branch_id,
      warehouse_id,
      quantity,
      updated_at,
      COUNT(*) OVER (PARTITION BY product_id, branch_id, warehouse_id) as duplicate_count
    FROM inventory
    WHERE branch_id IS NOT NULL
    ORDER BY updated_at DESC
    LIMIT 5
  ) LOOP
    RAISE NOTICE '';
    RAISE NOTICE 'Product: %', sample.product_id;
    RAISE NOTICE '  Branch: %', sample.branch_id;
    RAISE NOTICE '  Quantity: %', sample.quantity;
    RAISE NOTICE '  Updated: %', sample.updated_at;
    IF sample.duplicate_count > 1 THEN
      RAISE NOTICE '  ⚠️ DUPLICATE! (% records for this product+branch)', sample.duplicate_count;
    END IF;
  END LOOP;
END $$;

-- SUMMARY
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNOSIS COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Please review the output above and check:';
  RAISE NOTICE '1. Does the constraint have NULLS NOT DISTINCT?';
  RAISE NOTICE '2. Are there duplicate inventory records?';
  RAISE NOTICE '3. Does the trigger use transfer_items table?';
  RAISE NOTICE '4. Does transfer_items table exist?';
  RAISE NOTICE '';
  RAISE NOTICE 'Share this output so we can identify the exact issue.';
END $$;
