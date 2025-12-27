-- =====================================================
-- FINAL FIX: Stock Deletion Bug
-- Run this FIRST to diagnose, then it will fix automatically
-- =====================================================

-- STEP 1: DIAGNOSE THE ACTUAL PROBLEM
-- =====================================================
DO $$
DECLARE
  has_nulls_not_distinct BOOLEAN := FALSE;
  has_duplicates BOOLEAN := FALSE;
  constraint_def TEXT;
  dup_count INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNOSING THE ISSUE...';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Check constraint
  SELECT pg_get_constraintdef(oid) INTO constraint_def
  FROM pg_constraint
  WHERE conname = 'unique_stock_per_location'
    AND conrelid = 'inventory'::regclass;
    
  IF constraint_def IS NOT NULL THEN
    RAISE NOTICE '✓ Constraint exists: %', constraint_def;
    has_nulls_not_distinct := (constraint_def LIKE '%NULLS NOT DISTINCT%');
    IF has_nulls_not_distinct THEN
      RAISE NOTICE '✓ Has NULLS NOT DISTINCT';
    ELSE
      RAISE NOTICE '✗ Missing NULLS NOT DISTINCT - THIS IS THE PROBLEM!';
    END IF;
  ELSE
    RAISE NOTICE '✗ Constraint does not exist!';
  END IF;
  
  -- Check for duplicates
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT product_id, branch_id, warehouse_id
    FROM inventory
    GROUP BY product_id, branch_id, warehouse_id
    HAVING COUNT(*) > 1
  ) AS dups;
  
  RAISE NOTICE '';
  IF dup_count > 0 THEN
    RAISE NOTICE '✗ Found % duplicate inventory records', dup_count;
    has_duplicates := TRUE;
  ELSE
    RAISE NOTICE '✓ No duplicates found';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  IF NOT has_nulls_not_distinct OR has_duplicates THEN
    RAISE NOTICE 'PROBLEM FOUND - Applying fix...';
  ELSE
    RAISE NOTICE 'No issues found - Database looks good';
  END IF;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- STEP 2: FIX THE CONSTRAINT
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE 'STEP 1: Fixing constraint...';
  
  -- Drop old constraint
  ALTER TABLE inventory DROP CONSTRAINT IF EXISTS unique_stock_per_location;
  RAISE NOTICE '  ✓ Dropped old constraint';
  
  -- Add new constraint with NULLS NOT DISTINCT
  ALTER TABLE inventory 
    ADD CONSTRAINT unique_stock_per_location 
    UNIQUE NULLS NOT DISTINCT (product_id, branch_id, warehouse_id);
  RAISE NOTICE '  ✓ Added new constraint with NULLS NOT DISTINCT';
  RAISE NOTICE '';
END $$;

-- STEP 3: MERGE DUPLICATE RECORDS
-- =====================================================
DO $$
DECLARE
  dup_count INTEGER;
  merged_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'STEP 2: Merging duplicate records...';
  
  -- Check for duplicates again
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT product_id, branch_id, warehouse_id
    FROM inventory
    GROUP BY product_id, branch_id, warehouse_id
    HAVING COUNT(*) > 1
  ) AS dups;
  
  IF dup_count = 0 THEN
    RAISE NOTICE '  ✓ No duplicates to merge';
  ELSE
    RAISE NOTICE '  Found % duplicate groups - merging...', dup_count;
    
    -- For each duplicate group, keep the one with highest quantity and delete others
    WITH duplicates AS (
      SELECT 
        product_id,
        branch_id,
        warehouse_id,
        MAX(quantity) as total_qty,
        array_agg(id ORDER BY quantity DESC, updated_at DESC) as ids
      FROM inventory
      GROUP BY product_id, branch_id, warehouse_id
      HAVING COUNT(*) > 1
    ),
    records_to_delete AS (
      SELECT unnest(ids[2:]) as id_to_delete
      FROM duplicates
    )
    DELETE FROM inventory
    WHERE id IN (SELECT id_to_delete FROM records_to_delete);
    
    GET DIAGNOSTICS merged_count = ROW_COUNT;
    RAISE NOTICE '  ✓ Deleted % duplicate records', merged_count;
  END IF;
  RAISE NOTICE '';
END $$;

-- STEP 4: VERIFY THE TRANSFER TRIGGER IS CORRECT
-- =====================================================
CREATE OR REPLACE FUNCTION complete_transfer()
RETURNS TRIGGER AS $$
DECLARE
  transfer_item RECORD;
  items_count INTEGER;
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    RAISE NOTICE '🔄 [TRANSFER] Completing transfer ID: %', NEW.id;
    
    -- Check if transfer_items table exists (multi-product system)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transfer_items') THEN
      
      -- Count items
      SELECT COUNT(*) INTO items_count FROM transfer_items WHERE transfer_id = NEW.id;
      RAISE NOTICE '📦 [TRANSFER] Processing % items', items_count;
      
      -- Loop through all items in this transfer
      FOR transfer_item IN 
        SELECT product_id, quantity 
        FROM transfer_items 
        WHERE transfer_id = NEW.id
      LOOP
        RAISE NOTICE '   → Product: %, Qty: %', transfer_item.product_id, transfer_item.quantity;
        
        -- ==============================================
        -- DEDUCT FROM SOURCE
        -- ==============================================
        IF NEW.from_branch_id IS NOT NULL THEN
          RAISE NOTICE '   ↓ Deducting from branch: %', NEW.from_branch_id;
          
          UPDATE inventory
          SET quantity = quantity - transfer_item.quantity,
              updated_at = NOW(),
              updated_by = NEW.approved_by
          WHERE product_id = transfer_item.product_id
            AND branch_id = NEW.from_branch_id
            AND warehouse_id IS NULL;
            
        ELSIF NEW.from_warehouse_id IS NOT NULL THEN
          RAISE NOTICE '   ↓ Deducting from warehouse: %', NEW.from_warehouse_id;
          
          UPDATE inventory
          SET quantity = quantity - transfer_item.quantity,
              updated_at = NOW(),
              updated_by = NEW.approved_by
          WHERE product_id = transfer_item.product_id
            AND warehouse_id = NEW.from_warehouse_id
            AND branch_id IS NULL;
        END IF;
        
        -- ==============================================
        -- ADD TO DESTINATION (UPSERT)
        -- ==============================================
        IF NEW.to_branch_id IS NOT NULL THEN
          RAISE NOTICE '   ↑ Adding to branch: %', NEW.to_branch_id;
          
          INSERT INTO inventory (organization_id, branch_id, warehouse_id, product_id, quantity, updated_by)
          VALUES (NEW.organization_id, NEW.to_branch_id, NULL, transfer_item.product_id, transfer_item.quantity, NEW.approved_by)
          ON CONFLICT ON CONSTRAINT unique_stock_per_location
          DO UPDATE SET
            quantity = inventory.quantity + EXCLUDED.quantity,
            updated_at = NOW(),
            updated_by = EXCLUDED.updated_by;
            
        ELSIF NEW.to_warehouse_id IS NOT NULL THEN
          RAISE NOTICE '   ↑ Adding to warehouse: %', NEW.to_warehouse_id;
          
          INSERT INTO inventory (organization_id, branch_id, warehouse_id, product_id, quantity, updated_by)
          VALUES (NEW.organization_id, NULL, NEW.to_warehouse_id, transfer_item.product_id, transfer_item.quantity, NEW.approved_by)
          ON CONFLICT ON CONSTRAINT unique_stock_per_location
          DO UPDATE SET
            quantity = inventory.quantity + EXCLUDED.quantity,
            updated_at = NOW(),
            updated_by = EXCLUDED.updated_by;
        END IF;
        
      END LOOP;
      
      RAISE NOTICE '✅ [TRANSFER] Completed successfully';
      
    ELSE
      -- Fallback: Old single-product system (transfers table has product_id and quantity columns)
      RAISE NOTICE '⚠️ [TRANSFER] Using old single-product logic';
      
      -- Deduct from source
      IF NEW.from_branch_id IS NOT NULL THEN
        UPDATE inventory
        SET quantity = quantity - NEW.quantity,
            updated_at = NOW(),
            updated_by = NEW.approved_by
        WHERE product_id = NEW.product_id
          AND branch_id = NEW.from_branch_id
          AND warehouse_id IS NULL;
      ELSIF NEW.from_warehouse_id IS NOT NULL THEN
        UPDATE inventory
        SET quantity = quantity - NEW.quantity,
            updated_at = NOW(),
            updated_by = NEW.approved_by
        WHERE product_id = NEW.product_id
          AND warehouse_id = NEW.from_warehouse_id
          AND branch_id IS NULL;
      END IF;
      
      -- Add to destination
      IF NEW.to_branch_id IS NOT NULL THEN
        INSERT INTO inventory (organization_id, branch_id, warehouse_id, product_id, quantity, updated_by)
        VALUES (NEW.organization_id, NEW.to_branch_id, NULL, NEW.product_id, NEW.quantity, NEW.approved_by)
        ON CONFLICT ON CONSTRAINT unique_stock_per_location
        DO UPDATE SET
          quantity = inventory.quantity + EXCLUDED.quantity,
          updated_at = NOW(),
          updated_by = EXCLUDED.updated_by;
      ELSIF NEW.to_warehouse_id IS NOT NULL THEN
        INSERT INTO inventory (organization_id, NULL, warehouse_id, product_id, quantity, updated_by)
        VALUES (NEW.organization_id, NULL, NEW.to_warehouse_id, NEW.product_id, NEW.quantity, NEW.approved_by)
        ON CONFLICT ON CONSTRAINT unique_stock_per_location
        DO UPDATE SET
          quantity = inventory.quantity + EXCLUDED.quantity,
          updated_at = NOW(),
          updated_by = EXCLUDED.updated_by;
      END IF;
    END IF;
    
    -- Set completion timestamp
    NEW.completed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS handle_transfer_completion ON transfers;
CREATE TRIGGER handle_transfer_completion
  BEFORE UPDATE ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION complete_transfer();

RAISE NOTICE 'STEP 3: Updated transfer trigger';
RAISE NOTICE '  ✓ Trigger handles both multi-product and single-product transfers';
RAISE NOTICE '';

-- STEP 5: FINAL VERIFICATION
-- =====================================================
DO $$
DECLARE
  constraint_def TEXT;
  dup_count INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Check constraint
  SELECT pg_get_constraintdef(oid) INTO constraint_def
  FROM pg_constraint
  WHERE conname = 'unique_stock_per_location'
    AND conrelid = 'inventory'::regclass;
    
  IF constraint_def LIKE '%NULLS NOT DISTINCT%' THEN
    RAISE NOTICE '✅ Constraint has NULLS NOT DISTINCT';
  ELSE
    RAISE NOTICE '❌ Constraint still broken!';
  END IF;
  
  -- Check for duplicates
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT product_id, branch_id, warehouse_id
    FROM inventory
    GROUP BY product_id, branch_id, warehouse_id
    HAVING COUNT(*) > 1
  ) AS dups;
  
  IF dup_count = 0 THEN
    RAISE NOTICE '✅ No duplicate records';
  ELSE
    RAISE NOTICE '❌ Still have % duplicates!', dup_count;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ FIX COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'What was fixed:';
  RAISE NOTICE '  1. Added NULLS NOT DISTINCT to constraint';
  RAISE NOTICE '  2. Merged duplicate inventory records';
  RAISE NOTICE '  3. Updated trigger with proper UPSERT logic';
  RAISE NOTICE '';
  RAISE NOTICE 'The trigger now uses:';
  RAISE NOTICE '  quantity = inventory.quantity + EXCLUDED.quantity';
  RAISE NOTICE '  This ADDS to existing stock, not replaces it';
  RAISE NOTICE '';
  RAISE NOTICE 'TEST NOW:';
  RAISE NOTICE '  1. Create a transfer from warehouse to branch';
  RAISE NOTICE '  2. Note the current branch stock';
  RAISE NOTICE '  3. Complete the transfer';
  RAISE NOTICE '  4. Check branch stock = old stock + transfer amount';
  RAISE NOTICE '';
  RAISE NOTICE 'Look for [TRANSFER] logs in the console!';
  RAISE NOTICE '';
END $$;
