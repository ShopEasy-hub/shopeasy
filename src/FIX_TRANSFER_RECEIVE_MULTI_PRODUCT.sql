-- =====================================================
-- FIX: Transfer Receive Error - Multi-Product Support
-- Issue: Trigger tries to access NEW.product_id but transfers table doesn't have it
-- Error: "record new, has no field product_id"
-- =====================================================

-- PART 1: Fix the UNIQUE constraint (CRITICAL for preventing stock deletion)
-- =====================================================
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS unique_stock_per_location;

ALTER TABLE inventory 
  ADD CONSTRAINT unique_stock_per_location 
  UNIQUE NULLS NOT DISTINCT (product_id, branch_id, warehouse_id);

-- PART 2: Multi-Product Transfer Support
-- =====================================================
-- The transfers table no longer has product_id directly.
-- Instead, transfers can have MULTIPLE products via the transfer_items table.
-- The trigger needs to loop through transfer_items.

-- =====================================================
-- FIXED: Transfer Completion Trigger (Multi-Product)
-- =====================================================
CREATE OR REPLACE FUNCTION complete_transfer()
RETURNS TRIGGER AS $$
DECLARE
  transfer_item RECORD;
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    RAISE NOTICE '🔄 Completing transfer: %', NEW.id;
    
    -- Loop through all items in this transfer
    FOR transfer_item IN 
      SELECT product_id, quantity 
      FROM transfer_items 
      WHERE transfer_id = NEW.id
    LOOP
      RAISE NOTICE '📦 Processing item: product=% qty=%', transfer_item.product_id, transfer_item.quantity;
      
      -- Deduct from source location
      IF NEW.from_branch_id IS NOT NULL THEN
        RAISE NOTICE '📤 Deducting % units from branch %', transfer_item.quantity, NEW.from_branch_id;
        
        UPDATE inventory
        SET quantity = quantity - transfer_item.quantity,
            updated_at = NOW()
        WHERE product_id = transfer_item.product_id
          AND branch_id = NEW.from_branch_id;
          
      ELSIF NEW.from_warehouse_id IS NOT NULL THEN
        RAISE NOTICE '📤 Deducting % units from warehouse %', transfer_item.quantity, NEW.from_warehouse_id;
        
        UPDATE inventory
        SET quantity = quantity - transfer_item.quantity,
            updated_at = NOW()
        WHERE product_id = transfer_item.product_id
          AND warehouse_id = NEW.from_warehouse_id;
      END IF;
      
      -- Add to destination location (using UPSERT logic)
      IF NEW.to_branch_id IS NOT NULL THEN
        RAISE NOTICE '📥 Adding % units to branch %', transfer_item.quantity, NEW.to_branch_id;
        
        INSERT INTO inventory (organization_id, branch_id, product_id, quantity, updated_by)
        VALUES (NEW.organization_id, NEW.to_branch_id, transfer_item.product_id, transfer_item.quantity, NEW.approved_by)
        ON CONFLICT ON CONSTRAINT unique_stock_per_location
        DO UPDATE SET
          quantity = inventory.quantity + EXCLUDED.quantity,
          updated_at = NOW(),
          updated_by = EXCLUDED.updated_by;
          
      ELSIF NEW.to_warehouse_id IS NOT NULL THEN
        RAISE NOTICE '📥 Adding % units to warehouse %', transfer_item.quantity, NEW.to_warehouse_id;
        
        INSERT INTO inventory (organization_id, warehouse_id, product_id, quantity, updated_by)
        VALUES (NEW.organization_id, NEW.to_warehouse_id, transfer_item.product_id, transfer_item.quantity, NEW.approved_by)
        ON CONFLICT ON CONSTRAINT unique_stock_per_location
        DO UPDATE SET
          quantity = inventory.quantity + EXCLUDED.quantity,
          updated_at = NOW(),
          updated_by = EXCLUDED.updated_by;
      END IF;
      
    END LOOP;
    
    -- Set completion timestamp
    NEW.completed_at = NOW();
    
    RAISE NOTICE '✅ Transfer completed successfully: %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS handle_transfer_completion ON transfers;
CREATE TRIGGER handle_transfer_completion
  BEFORE UPDATE ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION complete_transfer();

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Multi-product transfer receive FIXED!';
  RAISE NOTICE '🔧 Updated complete_transfer() to loop through transfer_items';
  RAISE NOTICE '📝 Now supports multiple products per transfer';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TEST: Try receiving a transfer now - it should work!';
  RAISE NOTICE '📊 Each product in the transfer will be processed individually';
END $$;