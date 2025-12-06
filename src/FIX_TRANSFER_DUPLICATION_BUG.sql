-- =====================================================
-- FIX TRANSFER DUPLICATION BUG
-- =====================================================
-- This fixes the critical bug where accepting a transfer
-- adds DOUBLE the quantity to inventory
--
-- ROOT CAUSE:
-- The complete_transfer() trigger was written for the OLD
-- single-product transfer system that stored product_id
-- and quantity directly in the transfers table.
--
-- The NEW system uses a transfer_items table to support
-- multiple products per transfer, but the trigger was
-- never updated to work with this new structure.
--
-- SOLUTION:
-- Update the trigger to:
-- 1. Loop through all items in transfer_items table
-- 2. Process each item's inventory update
-- 3. Deduct from source and add to destination correctly
-- =====================================================

-- Drop the old trigger
DROP TRIGGER IF EXISTS handle_transfer_completion ON transfers;

-- Create the new complete_transfer function that works with transfer_items
CREATE OR REPLACE FUNCTION complete_transfer()
RETURNS TRIGGER AS $$
DECLARE
  transfer_item RECORD;
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Loop through all items in this transfer
    FOR transfer_item IN 
      SELECT product_id, quantity 
      FROM transfer_items 
      WHERE transfer_id = NEW.id
    LOOP
      
      -- Deduct from source
      IF NEW.from_branch_id IS NOT NULL THEN
        UPDATE inventory
        SET quantity = GREATEST(0, quantity - transfer_item.quantity),
            updated_at = NOW()
        WHERE product_id = transfer_item.product_id 
          AND branch_id = NEW.from_branch_id;
          
      ELSIF NEW.from_warehouse_id IS NOT NULL THEN
        UPDATE inventory
        SET quantity = GREATEST(0, quantity - transfer_item.quantity),
            updated_at = NOW()
        WHERE product_id = transfer_item.product_id 
          AND warehouse_id = NEW.from_warehouse_id;
      END IF;
      
      -- Add to destination (using upsert logic)
      IF NEW.to_branch_id IS NOT NULL THEN
        INSERT INTO inventory (organization_id, branch_id, product_id, quantity, updated_by)
        VALUES (NEW.organization_id, NEW.to_branch_id, transfer_item.product_id, transfer_item.quantity, NEW.approved_by)
        ON CONFLICT (product_id, branch_id, warehouse_id)
        DO UPDATE SET
          quantity = inventory.quantity + EXCLUDED.quantity,
          updated_at = NOW(),
          updated_by = EXCLUDED.updated_by;
          
      ELSIF NEW.to_warehouse_id IS NOT NULL THEN
        INSERT INTO inventory (organization_id, warehouse_id, product_id, quantity, updated_by)
        VALUES (NEW.organization_id, NEW.to_warehouse_id, transfer_item.product_id, transfer_item.quantity, NEW.approved_by)
        ON CONFLICT (product_id, branch_id, warehouse_id)
        DO UPDATE SET
          quantity = inventory.quantity + EXCLUDED.quantity,
          updated_at = NOW(),
          updated_by = EXCLUDED.updated_by;
      END IF;
      
    END LOOP;
    
    -- Mark completion timestamp
    NEW.completed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER handle_transfer_completion
  BEFORE UPDATE ON transfers
  FOR EACH ROW EXECUTE FUNCTION complete_transfer();

-- Add helpful comment
COMMENT ON FUNCTION complete_transfer() IS 
  'Automatically updates inventory when a transfer is completed. Works with transfer_items table for multi-product transfers.';
