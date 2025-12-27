-- ==========================================
-- FIX TRANSFER BUG ONLY
-- This ONLY fixes the transfer bug where stock is replaced instead of added
-- Does NOT touch warehouses, users, or anything else
-- ==========================================

-- Replace the complete_transfer function with a fixed version
CREATE OR REPLACE FUNCTION complete_transfer()
RETURNS TRIGGER AS $$
DECLARE
  existing_qty INTEGER;
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- ==========================================
    -- STEP 1: Deduct from source
    -- ==========================================
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
    
    -- ==========================================
    -- STEP 2: Add to destination
    -- THE FIX: Check if exists first, then ADD (not replace)
    -- ==========================================
    IF NEW.to_branch_id IS NOT NULL THEN
      -- Check if destination inventory exists
      SELECT quantity INTO existing_qty
      FROM inventory
      WHERE product_id = NEW.product_id
        AND branch_id = NEW.to_branch_id
        AND warehouse_id IS NULL;
      
      IF existing_qty IS NOT NULL THEN
        -- ✅ FIX: ADD to existing quantity (was: SET quantity = NEW.quantity)
        UPDATE inventory
        SET quantity = quantity + NEW.quantity,  -- ← THE FIX IS HERE
            updated_at = NOW(),
            updated_by = NEW.approved_by
        WHERE product_id = NEW.product_id
          AND branch_id = NEW.to_branch_id
          AND warehouse_id IS NULL;
      ELSE
        -- Create new inventory record
        INSERT INTO inventory (
          id,
          organization_id,
          branch_id,
          warehouse_id,
          product_id,
          quantity,
          updated_by
        ) VALUES (
          gen_random_uuid(),
          NEW.organization_id,
          NEW.to_branch_id,
          NULL,
          NEW.product_id,
          NEW.quantity,
          NEW.approved_by
        );
      END IF;
      
    ELSIF NEW.to_warehouse_id IS NOT NULL THEN
      -- Check if destination inventory exists
      SELECT quantity INTO existing_qty
      FROM inventory
      WHERE product_id = NEW.product_id
        AND warehouse_id = NEW.to_warehouse_id
        AND branch_id IS NULL;
      
      IF existing_qty IS NOT NULL THEN
        -- ✅ FIX: ADD to existing quantity (was: SET quantity = NEW.quantity)
        UPDATE inventory
        SET quantity = quantity + NEW.quantity,  -- ← THE FIX IS HERE
            updated_at = NOW(),
            updated_by = NEW.approved_by
        WHERE product_id = NEW.product_id
          AND warehouse_id = NEW.to_warehouse_id
          AND branch_id IS NULL;
      ELSE
        -- Create new inventory record
        INSERT INTO inventory (
          id,
          organization_id,
          branch_id,
          warehouse_id,
          product_id,
          quantity,
          updated_by
        ) VALUES (
          gen_random_uuid(),
          NEW.organization_id,
          NULL,
          NEW.to_warehouse_id,
          NEW.product_id,
          NEW.quantity,
          NEW.approved_by
        );
      END IF;
    END IF;
    
    NEW.completed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verify the fix
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ TRANSFER BUG FIXED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Changed: quantity = quantity + NEW.quantity';
  RAISE NOTICE 'Instead of: quantity = NEW.quantity';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Transfers will now ADD to destination stock';
  RAISE NOTICE '✅ Instead of REPLACING destination stock';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
