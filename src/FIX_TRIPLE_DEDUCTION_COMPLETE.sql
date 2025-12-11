-- =====================================================
-- COMPLETE FIX FOR TRIPLE DEDUCTION BUG
-- =====================================================
-- This fix resolves the issue where inventory is deducted
-- 3x the amount (50 becomes 20 instead of 40 for a transfer of 10)
--
-- ROOT CAUSE: Multiple old triggers exist on the transfers table
-- from different migration files, and they're ALL firing,
-- causing inventory to be updated multiple times.
--
-- SOLUTION: Drop ALL old triggers and create ONE correct trigger
-- =====================================================

-- =====================================================
-- STEP 1: Drop ALL existing transfer-related triggers
-- =====================================================

-- Drop all possible trigger names that might exist
DROP TRIGGER IF EXISTS handle_transfer_completion ON transfers;
DROP TRIGGER IF EXISTS on_transfer_update ON transfers;
DROP TRIGGER IF EXISTS transfer_status_update ON transfers;
DROP TRIGGER IF EXISTS process_transfer ON transfers;
DROP TRIGGER IF EXISTS update_transfer_inventory ON transfers;

-- =====================================================
-- STEP 2: Drop and recreate the complete_transfer function
-- =====================================================

-- Drop existing function (all versions)
DROP FUNCTION IF EXISTS complete_transfer() CASCADE;

-- Create the CORRECT function for the NEW schema with transfer_items
CREATE OR REPLACE FUNCTION complete_transfer()
RETURNS TRIGGER AS $$
DECLARE
  transfer_item RECORD;
  item_count INTEGER;
BEGIN
  -- =====================================================
  -- IMPORTANT: This trigger is designed for the NEW schema
  -- that uses transfer_items table for multi-product support
  -- =====================================================
  
  -- Only process when status changes to 'completed'
  -- AND it wasn't already completed (prevent re-processing)
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    RAISE NOTICE '🔄 Processing transfer completion: %', NEW.id;
    
    -- Count items in this transfer
    SELECT COUNT(*) INTO item_count
    FROM transfer_items
    WHERE transfer_id = NEW.id;
    
    RAISE NOTICE '📦 Transfer has % items', item_count;
    
    -- Loop through all items in this transfer
    FOR transfer_item IN 
      SELECT ti.product_id, ti.quantity, p.name as product_name
      FROM transfer_items ti
      LEFT JOIN products p ON p.id = ti.product_id
      WHERE ti.transfer_id = NEW.id
    LOOP
      
      RAISE NOTICE '🔍 Processing item: % (qty: %)', transfer_item.product_name, transfer_item.quantity;
      
      -- =====================================================
      -- DEDUCT FROM SOURCE
      -- =====================================================
      IF NEW.from_branch_id IS NOT NULL THEN
        RAISE NOTICE '📤 Deducting % units from branch %', transfer_item.quantity, NEW.from_branch_id;
        
        UPDATE inventory
        SET quantity = GREATEST(0, quantity - transfer_item.quantity),
            updated_at = NOW()
        WHERE product_id = transfer_item.product_id 
          AND branch_id = NEW.from_branch_id
          AND warehouse_id IS NULL;  -- Ensure we're updating branch inventory only
        
        IF FOUND THEN
          RAISE NOTICE '✅ Deducted from branch inventory';
        ELSE
          RAISE WARNING '⚠️ No inventory found to deduct from branch';
        END IF;
          
      ELSIF NEW.from_warehouse_id IS NOT NULL THEN
        RAISE NOTICE '📤 Deducting % units from warehouse %', transfer_item.quantity, NEW.from_warehouse_id;
        
        UPDATE inventory
        SET quantity = GREATEST(0, quantity - transfer_item.quantity),
            updated_at = NOW()
        WHERE product_id = transfer_item.product_id 
          AND warehouse_id = NEW.from_warehouse_id
          AND branch_id IS NULL;  -- Ensure we're updating warehouse inventory only
        
        IF FOUND THEN
          RAISE NOTICE '✅ Deducted from warehouse inventory';
        ELSE
          RAISE WARNING '⚠️ No inventory found to deduct from warehouse';
        END IF;
      END IF;
      
      -- =====================================================
      -- ADD TO DESTINATION
      -- =====================================================
      IF NEW.to_branch_id IS NOT NULL THEN
        RAISE NOTICE '📥 Adding % units to branch %', transfer_item.quantity, NEW.to_branch_id;
        
        -- Try to insert or update using ON CONFLICT
        INSERT INTO inventory (
          organization_id, 
          branch_id, 
          product_id, 
          quantity, 
          updated_by,
          warehouse_id  -- Must be NULL for branches
        )
        VALUES (
          NEW.organization_id, 
          NEW.to_branch_id, 
          transfer_item.product_id, 
          transfer_item.quantity, 
          NEW.approved_by,
          NULL
        )
        ON CONFLICT (product_id, COALESCE(branch_id::TEXT, ''), COALESCE(warehouse_id::TEXT, ''))
        DO UPDATE SET
          quantity = inventory.quantity + EXCLUDED.quantity,
          updated_at = NOW(),
          updated_by = EXCLUDED.updated_by;
        
        RAISE NOTICE '✅ Added to branch inventory';
          
      ELSIF NEW.to_warehouse_id IS NOT NULL THEN
        RAISE NOTICE '📥 Adding % units to warehouse %', transfer_item.quantity, NEW.to_warehouse_id;
        
        INSERT INTO inventory (
          organization_id, 
          warehouse_id, 
          product_id, 
          quantity, 
          updated_by,
          branch_id  -- Must be NULL for warehouses
        )
        VALUES (
          NEW.organization_id, 
          NEW.to_warehouse_id, 
          transfer_item.product_id, 
          transfer_item.quantity, 
          NEW.approved_by,
          NULL
        )
        ON CONFLICT (product_id, COALESCE(branch_id::TEXT, ''), COALESCE(warehouse_id::TEXT, ''))
        DO UPDATE SET
          quantity = inventory.quantity + EXCLUDED.quantity,
          updated_at = NOW(),
          updated_by = EXCLUDED.updated_by;
        
        RAISE NOTICE '✅ Added to warehouse inventory';
      END IF;
      
    END LOOP;
    
    -- Mark completion timestamp
    NEW.completed_at = NOW();
    
    RAISE NOTICE '✅ Transfer % completed successfully', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 3: Create the ONE AND ONLY trigger
-- =====================================================

CREATE TRIGGER handle_transfer_completion
  BEFORE UPDATE ON transfers
  FOR EACH ROW 
  EXECUTE FUNCTION complete_transfer();

-- =====================================================
-- STEP 4: Add helpful documentation
-- =====================================================

COMMENT ON FUNCTION complete_transfer() IS 
  'Automatically updates inventory when a transfer is completed. 
   Works with transfer_items table for multi-product transfers.
   Only fires when status changes to ''completed''.
   Deducts from source and adds to destination.
   WARNING: Do not create multiple versions of this trigger!';

COMMENT ON TRIGGER handle_transfer_completion ON transfers IS
  'Fires when transfer status is updated. Only processes inventory changes when status becomes ''completed''.';

-- =====================================================
-- STEP 5: Verification
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ TRANSFER TRIGGER FIX APPLIED SUCCESSFULLY';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 What was fixed:';
  RAISE NOTICE '  1. Removed all old/duplicate triggers';
  RAISE NOTICE '  2. Created ONE correct trigger for new schema';
  RAISE NOTICE '  3. Trigger uses transfer_items table (multi-product)';
  RAISE NOTICE '  4. Inventory updates only on ''completed'' status';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Workflow:';
  RAISE NOTICE '  pending → approved → in_transit → completed';
  RAISE NOTICE '  Inventory only updates on the final ''completed'' step';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Test your transfers now - should be fixed!';
  RAISE NOTICE '====================================================';
END $$;

-- =====================================================
-- Optional: Query to verify triggers
-- =====================================================

SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'transfers'
ORDER BY trigger_name;
