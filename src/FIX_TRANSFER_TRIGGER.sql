-- =====================================================
-- FIX: Update transfer trigger to handle proper workflow
-- This prevents double inventory updates
-- =====================================================

-- Drop the old trigger
DROP TRIGGER IF EXISTS on_transfer_update ON transfers;

-- Replace the complete_transfer function with a better version
CREATE OR REPLACE FUNCTION complete_transfer()
RETURNS TRIGGER AS $$
BEGIN
  -- ===================================================
  -- WORKFLOW: pending → approved → in_transit → completed
  -- ===================================================
  
  -- APPROVED: Deduct from source (inventory leaves source location)
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    RAISE NOTICE '📤 [APPROVED] Deducting from source: transfer %', NEW.id;
    
    IF NEW.from_branch_id IS NOT NULL THEN
      UPDATE inventory
      SET quantity = GREATEST(0, quantity - NEW.quantity),
          updated_at = NOW()
      WHERE product_id = NEW.product_id
        AND branch_id = NEW.from_branch_id
        AND warehouse_id IS NULL;
    ELSIF NEW.from_warehouse_id IS NOT NULL THEN
      UPDATE inventory
      SET quantity = GREATEST(0, quantity - NEW.quantity),
          updated_at = NOW()
      WHERE product_id = NEW.product_id
        AND warehouse_id = NEW.from_warehouse_id
        AND branch_id IS NULL;
    END IF;
  END IF;
  
  -- COMPLETED: Add to destination (inventory arrives at destination)
  -- Only deduct from source if it wasn't approved first (direct pending→completed)
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    RAISE NOTICE '📥 [COMPLETED] Adding to destination: transfer %', NEW.id;
    
    -- If transfer was never approved, deduct from source now
    IF OLD.status = 'pending' THEN
      RAISE NOTICE '⚡ [DIRECT COMPLETE] Deducting from source (was not approved first)';
      
      IF NEW.from_branch_id IS NOT NULL THEN
        UPDATE inventory
        SET quantity = GREATEST(0, quantity - NEW.quantity),
            updated_at = NOW()
        WHERE product_id = NEW.product_id
          AND branch_id = NEW.from_branch_id
          AND warehouse_id IS NULL;
      ELSIF NEW.from_warehouse_id IS NOT NULL THEN
        UPDATE inventory
        SET quantity = GREATEST(0, quantity - NEW.quantity),
            updated_at = NOW()
        WHERE product_id = NEW.product_id
          AND warehouse_id = NEW.from_warehouse_id
          AND branch_id IS NULL;
      END IF;
    END IF;
    
    -- Always add to destination when completed
    IF NEW.to_branch_id IS NOT NULL THEN
      INSERT INTO inventory (organization_id, branch_id, product_id, quantity, updated_by)
      VALUES (NEW.organization_id, NEW.to_branch_id, NEW.product_id, NEW.quantity, NEW.approved_by)
      ON CONFLICT ON CONSTRAINT unique_stock_per_location
      DO UPDATE SET
        quantity = inventory.quantity + EXCLUDED.quantity,
        updated_at = NOW();
    ELSIF NEW.to_warehouse_id IS NOT NULL THEN
      INSERT INTO inventory (organization_id, warehouse_id, product_id, quantity, updated_by)
      VALUES (NEW.organization_id, NEW.to_warehouse_id, NEW.product_id, NEW.quantity, NEW.approved_by)
      ON CONFLICT ON CONSTRAINT unique_stock_per_location
      DO UPDATE SET
        quantity = inventory.quantity + EXCLUDED.quantity,
        updated_at = NOW();
    END IF;
    
    -- Set completion timestamp
    NEW.completed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-attach the trigger
CREATE TRIGGER on_transfer_update
  BEFORE UPDATE ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION complete_transfer();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Transfer trigger updated successfully!';
  RAISE NOTICE '📝 Workflow: pending → approved (deduct source) → in_transit → completed (add destination)';
  RAISE NOTICE '⚡ Or: pending → completed (deduct source + add destination in one step)';
END $$;
