-- =====================================================
-- FIX: Transfer Receive Constraint Error
-- Issue: ON CONFLICT clause doesn't match unique constraint
-- Error: "there is no unique or exclusion constraint matching the on conflict specification"
-- =====================================================

-- The problem is that the triggers use:
--   ON CONFLICT (product_id, branch_id, warehouse_id)
-- But they should use the named constraint:
--   ON CONFLICT ON CONSTRAINT unique_stock_per_location

-- =====================================================
-- FIX 1: Update Transfer Completion Trigger
-- =====================================================
CREATE OR REPLACE FUNCTION complete_transfer()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    -- Deduct from source location
    IF NEW.from_branch_id IS NOT NULL THEN
      UPDATE inventory
      SET quantity = quantity - NEW.quantity,
          updated_at = NOW()
      WHERE product_id = NEW.product_id
        AND branch_id = NEW.from_branch_id;
    ELSIF NEW.from_warehouse_id IS NOT NULL THEN
      UPDATE inventory
      SET quantity = quantity - NEW.quantity,
          updated_at = NOW()
      WHERE product_id = NEW.product_id
        AND warehouse_id = NEW.from_warehouse_id;
    END IF;
    
    -- Add to destination location (using UPSERT logic)
    IF NEW.to_branch_id IS NOT NULL THEN
      INSERT INTO inventory (organization_id, branch_id, product_id, quantity, updated_by)
      VALUES (NEW.organization_id, NEW.to_branch_id, NEW.product_id, NEW.quantity, NEW.approved_by)
      ON CONFLICT ON CONSTRAINT unique_stock_per_location  -- FIXED: Use named constraint
      DO UPDATE SET
        quantity = inventory.quantity + EXCLUDED.quantity,
        updated_at = NOW(),
        updated_by = EXCLUDED.updated_by;
    ELSIF NEW.to_warehouse_id IS NOT NULL THEN
      INSERT INTO inventory (organization_id, warehouse_id, product_id, quantity, updated_by)
      VALUES (NEW.organization_id, NEW.to_warehouse_id, NEW.product_id, NEW.quantity, NEW.approved_by)
      ON CONFLICT ON CONSTRAINT unique_stock_per_location  -- FIXED: Use named constraint
      DO UPDATE SET
        quantity = inventory.quantity + EXCLUDED.quantity,
        updated_at = NOW(),
        updated_by = EXCLUDED.updated_by;
    END IF;
    
    NEW.completed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FIX 2: Update Return Stock Addition Trigger
-- =====================================================
CREATE OR REPLACE FUNCTION add_return_inventory()
RETURNS TRIGGER AS $$
BEGIN
  -- Add quantity back to branch inventory
  INSERT INTO inventory (organization_id, branch_id, product_id, quantity, updated_by)
  VALUES (NEW.organization_id, NEW.branch_id, NEW.product_id, NEW.quantity, NEW.processed_by)
  ON CONFLICT ON CONSTRAINT unique_stock_per_location  -- FIXED: Use named constraint
  DO UPDATE SET
    quantity = inventory.quantity + EXCLUDED.quantity,
    updated_at = NOW(),
    updated_by = EXCLUDED.updated_by;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Transfer receive constraint error FIXED!';
  RAISE NOTICE '🔧 Updated complete_transfer() function to use named constraint';
  RAISE NOTICE '🔧 Updated add_return_inventory() function to use named constraint';
  RAISE NOTICE '📝 Changed: ON CONFLICT (product_id, branch_id, warehouse_id)';
  RAISE NOTICE '📝 To: ON CONFLICT ON CONSTRAINT unique_stock_per_location';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TEST: Try receiving a transfer now - it should work!';
END $$;
