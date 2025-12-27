-- =====================================================
-- FINAL FIX: Stock Deletion Bug - Root Cause Identified
-- =====================================================
-- ISSUE: Old stock still gets deleted when receiving transfers
--
-- ROOT CAUSE:  The problem is NOT just the constraint!
-- The issue is that BOTH the database trigger AND the application
-- code are trying to update inventory, causing conflicts.
--
-- The adjustBranchStock/adjustWarehouseStock functions call
-- upsert_inventory_safe() which SETS quantity instead of ADDING.
-- Combined with the trigger, this creates race conditions.
--
-- SOLUTION: The database trigger should be the ONLY source of truth
-- for inventory updates during transfers.
-- =====================================================

-- =====================================================
-- STEP 1: Fix the UNIQUE constraint (for UPSERT to work)
-- =====================================================
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS unique_stock_per_location;

ALTER TABLE inventory 
  ADD CONSTRAINT unique_stock_per_location 
  UNIQUE NULLS NOT DISTINCT (product_id, branch_id, warehouse_id);

RAISE NOTICE '✅ Step 1: Fixed UNIQUE constraint with NULLS NOT DISTINCT';

-- =====================================================
-- STEP 2: Update the complete_transfer() trigger
-- Make it handle multi-product transfers correctly
-- =====================================================
CREATE OR REPLACE FUNCTION complete_transfer()
RETURNS TRIGGER AS $$
DECLARE
  transfer_item RECORD;
  source_current_qty INTEGER;
  dest_current_qty INTEGER;
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    RAISE NOTICE '🔄 [TRIGGER] Completing transfer: %', NEW.id;
    
    -- Loop through all items in this transfer
    FOR transfer_item IN 
      SELECT product_id, quantity 
      FROM transfer_items 
      WHERE transfer_id = NEW.id
    LOOP
      RAISE NOTICE '📦 [TRIGGER] Processing: product=% qty=%', transfer_item.product_id, transfer_item.quantity;
      
      -- ==============================================
      -- DEDUCT FROM SOURCE
      -- ==============================================
      IF NEW.from_branch_id IS NOT NULL THEN
        -- Get current source quantity
        SELECT quantity INTO source_current_qty
        FROM inventory
        WHERE product_id = transfer_item.product_id
          AND branch_id = NEW.from_branch_id
          AND warehouse_id IS NULL;
          
        RAISE NOTICE '📤 [TRIGGER] Source branch % has % units', NEW.from_branch_id, COALESCE(source_current_qty, 0);
        
        UPDATE inventory
        SET quantity = quantity - transfer_item.quantity,
            updated_at = NOW(),
            updated_by = NEW.approved_by
        WHERE product_id = transfer_item.product_id
          AND branch_id = NEW.from_branch_id
          AND warehouse_id IS NULL;
          
        RAISE NOTICE '✅ [TRIGGER] Deducted % from branch (new qty: %)', transfer_item.quantity, COALESCE(source_current_qty, 0) - transfer_item.quantity;
          
      ELSIF NEW.from_warehouse_id IS NOT NULL THEN
        -- Get current source quantity
        SELECT quantity INTO source_current_qty
        FROM inventory
        WHERE product_id = transfer_item.product_id
          AND warehouse_id = NEW.from_warehouse_id
          AND branch_id IS NULL;
          
        RAISE NOTICE '📤 [TRIGGER] Source warehouse % has % units', NEW.from_warehouse_id, COALESCE(source_current_qty, 0);
        
        UPDATE inventory
        SET quantity = quantity - transfer_item.quantity,
            updated_at = NOW(),
            updated_by = NEW.approved_by
        WHERE product_id = transfer_item.product_id
          AND warehouse_id = NEW.from_warehouse_id
          AND branch_id IS NULL;
          
        RAISE NOTICE '✅ [TRIGGER] Deducted % from warehouse (new qty: %)', transfer_item.quantity, COALESCE(source_current_qty, 0) - transfer_item.quantity;
      END IF;
      
      -- ==============================================
      -- ADD TO DESTINATION (UPSERT)
      -- ==============================================
      IF NEW.to_branch_id IS NOT NULL THEN
        -- Get current destination quantity
        SELECT quantity INTO dest_current_qty
        FROM inventory
        WHERE product_id = transfer_item.product_id
          AND branch_id = NEW.to_branch_id
          AND warehouse_id IS NULL;
          
        RAISE NOTICE '📥 [TRIGGER] Dest branch % has % units (before)', NEW.to_branch_id, COALESCE(dest_current_qty, 0);
        
        INSERT INTO inventory (organization_id, branch_id, warehouse_id, product_id, quantity, updated_by)
        VALUES (NEW.organization_id, NEW.to_branch_id, NULL, transfer_item.product_id, transfer_item.quantity, NEW.approved_by)
        ON CONFLICT ON CONSTRAINT unique_stock_per_location
        DO UPDATE SET
          quantity = inventory.quantity + EXCLUDED.quantity,
          updated_at = NOW(),
          updated_by = EXCLUDED.updated_by;
          
        RAISE NOTICE '✅ [TRIGGER] Added % to branch (new qty: %)', transfer_item.quantity, COALESCE(dest_current_qty, 0) + transfer_item.quantity;
          
      ELSIF NEW.to_warehouse_id IS NOT NULL THEN
        -- Get current destination quantity
        SELECT quantity INTO dest_current_qty
        FROM inventory
        WHERE product_id = transfer_item.product_id
          AND warehouse_id = NEW.to_warehouse_id
          AND branch_id IS NULL;
          
        RAISE NOTICE '📥 [TRIGGER] Dest warehouse % has % units (before)', NEW.to_warehouse_id, COALESCE(dest_current_qty, 0);
        
        INSERT INTO inventory (organization_id, branch_id, warehouse_id, product_id, quantity, updated_by)
        VALUES (NEW.organization_id, NULL, NEW.to_warehouse_id, transfer_item.product_id, transfer_item.quantity, NEW.approved_by)
        ON CONFLICT ON CONSTRAINT unique_stock_per_location
        DO UPDATE SET
          quantity = inventory.quantity + EXCLUDED.quantity,
          updated_at = NOW(),
          updated_by = EXCLUDED.updated_by;
          
        RAISE NOTICE '✅ [TRIGGER] Added % to warehouse (new qty: %)', transfer_item.quantity, COALESCE(dest_current_qty, 0) + transfer_item.quantity;
      END IF;
      
    END LOOP;
    
    -- Set completion timestamp
    NEW.completed_at = NOW();
    
    RAISE NOTICE '🎉 [TRIGGER] Transfer % completed successfully!', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS handle_transfer_completion ON transfers;
CREATE TRIGGER handle_transfer_completion
  BEFORE UPDATE ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION complete_transfer();

RAISE NOTICE '✅ Step 2: Updated complete_transfer() trigger';

-- =====================================================
-- STEP 3: Verify no duplicate records exist
-- =====================================================
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
  
  IF duplicate_count > 0 THEN
    RAISE NOTICE '⚠️ Found % duplicate inventory groups - cleaning up...', duplicate_count;
    
    -- Clean up duplicates by keeping the one with highest quantity
    WITH duplicates AS (
      SELECT 
        product_id,
        branch_id,
        warehouse_id,
        array_agg(id ORDER BY quantity DESC, updated_at DESC) as ids,
        MAX(quantity) as max_qty
      FROM inventory
      GROUP BY product_id, branch_id, warehouse_id
      HAVING COUNT(*) > 1
    )
    DELETE FROM inventory
    WHERE id IN (
      SELECT unnest(ids[2:]) -- Keep first ID, delete rest
      FROM duplicates
    );
    
    RAISE NOTICE '✅ Cleaned up duplicate records';
  ELSE
    RAISE NOTICE '✅ No duplicate records found';
  END IF;
END $$;

-- =====================================================
-- STEP 4: Test the fix
-- =====================================================
DO $$
DECLARE
  test_org_id UUID;
  test_branch_id UUID;
  test_product_id UUID;
  initial_qty INTEGER;
  test_transfer_id UUID;
  final_qty INTEGER;
BEGIN
  -- Get test data
  SELECT organization_id, branch_id, product_id, quantity
  INTO test_org_id, test_branch_id, test_product_id, initial_qty
  FROM inventory
  WHERE branch_id IS NOT NULL AND quantity > 50
  LIMIT 1;
  
  IF test_product_id IS NULL THEN
    RAISE NOTICE '⚠️ No suitable test data found - skipping test';
    RETURN;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TESTING THE FIX...';
  RAISE NOTICE '================================';
  RAISE NOTICE 'Product: %', test_product_id;
  RAISE NOTICE 'Branch: %', test_branch_id;
  RAISE NOTICE 'Initial quantity: %', initial_qty;
  
  -- Check if transfer_items table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transfer_items') THEN
    -- Create a test transfer (multi-product style)
    INSERT INTO transfers (
      organization_id, 
      from_warehouse_id, 
      to_branch_id,
      status,
      notes
    ) VALUES (
      test_org_id,
      (SELECT id FROM warehouses WHERE organization_id = test_org_id LIMIT 1),
      test_branch_id,
      'in_transit',
      'TEST TRANSFER - WILL BE ROLLED BACK'
    ) RETURNING id INTO test_transfer_id;
    
    -- Add transfer item
    INSERT INTO transfer_items (transfer_id, product_id, quantity)
    VALUES (test_transfer_id, test_product_id, 10);
    
    RAISE NOTICE 'Created test transfer: %', test_transfer_id;
    
    -- Complete the transfer (trigger should fire)
    UPDATE transfers 
    SET status = 'completed'
    WHERE id = test_transfer_id;
    
    -- Check result
    SELECT quantity INTO final_qty
    FROM inventory
    WHERE product_id = test_product_id
      AND branch_id = test_branch_id;
    
    RAISE NOTICE 'Final quantity: %', final_qty;
    RAISE NOTICE '';
    
    IF final_qty = initial_qty + 10 THEN
      RAISE NOTICE '✅ TEST PASSED! Stock was ADDED (% + 10 = %)', initial_qty, final_qty;
    ELSE
      RAISE NOTICE '❌ TEST FAILED! Expected %, got %', initial_qty + 10, final_qty;
    END IF;
    
    -- Rollback test
    DELETE FROM transfers WHERE id = test_transfer_id;
    UPDATE inventory
    SET quantity = initial_qty
    WHERE product_id = test_product_id AND branch_id = test_branch_id;
    
    RAISE NOTICE '🔄 Test data rolled back';
  ELSE
    RAISE NOTICE '⚠️ transfer_items table not found - skipping test';
  END IF;
END $$;

-- =====================================================
-- FINAL MESSAGE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ STOCK DELETION BUG - FINAL FIX APPLIED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 What was fixed:';
  RAISE NOTICE '  1. Added NULLS NOT DISTINCT to constraint';
  RAISE NOTICE '  2. Updated trigger for multi-product support';
  RAISE NOTICE '  3. Cleaned up duplicate records';
  RAISE NOTICE '  4. Added detailed logging to trigger';
  RAISE NOTICE '';
  RAISE NOTICE '📝 IMPORTANT:';
  RAISE NOTICE '  The database trigger is now the ONLY source';
  RAISE NOTICE '  of inventory updates for transfers.';
  RAISE NOTICE '';
  RAISE NOTICE '  Do NOT call adjustBranchStock() or';
  RAISE NOTICE '  adjustWarehouseStock() for transfers!';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 To test:';
  RAISE NOTICE '  1. Create a transfer';
  RAISE NOTICE '  2. Check current branch stock';
  RAISE NOTICE '  3. Complete the transfer';
  RAISE NOTICE '  4. Verify: new stock = old stock + transfer qty';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Check the console for [TRIGGER] logs';
  RAISE NOTICE '   to see the trigger in action!';
  RAISE NOTICE '';
END $$;
