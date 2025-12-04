-- ==========================================
-- FIX TRANSFER COMPLETION TRIGGER V2
-- With detailed logging to see what's happening
-- ==========================================

DROP TRIGGER IF EXISTS process_transfer_completion ON transfers;

CREATE OR REPLACE FUNCTION complete_transfer()
RETURNS TRIGGER AS $$
DECLARE
  existing_qty INTEGER;
  transfer_item RECORD;
  v_source_type TEXT;
  v_dest_type TEXT;
  v_rows_affected INTEGER;
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    RAISE NOTICE '╔════════════════════════════════════════════════════════════════';
    RAISE NOTICE '║ PROCESSING TRANSFER COMPLETION';
    RAISE NOTICE '╠════════════════════════════════════════════════════════════════';
    RAISE NOTICE '║ Transfer ID: %', NEW.id;
    RAISE NOTICE '║ Organization: %', NEW.organization_id;
    RAISE NOTICE '║ From Warehouse: %', NEW.from_warehouse_id;
    RAISE NOTICE '║ From Branch: %', NEW.from_branch_id;
    RAISE NOTICE '║ To Warehouse: %', NEW.to_warehouse_id;
    RAISE NOTICE '║ To Branch: %', NEW.to_branch_id;
    RAISE NOTICE '╚════════════════════════════════════════════════════════════════';
    
    -- Determine source and destination types
    IF NEW.from_warehouse_id IS NOT NULL THEN
      v_source_type := 'WAREHOUSE';
    ELSIF NEW.from_branch_id IS NOT NULL THEN
      v_source_type := 'BRANCH';
    ELSE
      v_source_type := 'UNKNOWN';
    END IF;

    IF NEW.to_warehouse_id IS NOT NULL THEN
      v_dest_type := 'WAREHOUSE';
    ELSIF NEW.to_branch_id IS NOT NULL THEN
      v_dest_type := 'BRANCH';
    ELSE
      v_dest_type := 'UNKNOWN';
    END IF;

    RAISE NOTICE '→ Transfer type: % → %', v_source_type, v_dest_type;
    RAISE NOTICE '';
    
    -- Process each item in the transfer
    FOR transfer_item IN 
      SELECT product_id, quantity, unit_cost 
      FROM transfer_items 
      WHERE transfer_id = NEW.id
    LOOP
      RAISE NOTICE '┌────────────────────────────────────────────────────────────────';
      RAISE NOTICE '│ Processing item:';
      RAISE NOTICE '│   Product ID: %', transfer_item.product_id;
      RAISE NOTICE '│   Quantity: %', transfer_item.quantity;
      RAISE NOTICE '└────────────────────────────────────────────────────────────────';
      
      -- ===================
      -- DEDUCT FROM SOURCE
      -- ===================
      
      IF NEW.from_branch_id IS NOT NULL THEN
        RAISE NOTICE '  🔻 Deducting % from BRANCH %', transfer_item.quantity, NEW.from_branch_id;
        
        -- Check current stock
        SELECT quantity INTO existing_qty
        FROM inventory
        WHERE product_id = transfer_item.product_id 
          AND branch_id = NEW.from_branch_id
          AND warehouse_id IS NULL;
        
        RAISE NOTICE '     Current stock: %', COALESCE(existing_qty, 0);
        
        -- Deduct from branch
        UPDATE inventory
        SET quantity = GREATEST(0, quantity - transfer_item.quantity),
            updated_at = NOW()
        WHERE product_id = transfer_item.product_id 
          AND branch_id = NEW.from_branch_id
          AND warehouse_id IS NULL;
        
        GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
        RAISE NOTICE '     Rows updated: %', v_rows_affected;
        RAISE NOTICE '     New stock: %', GREATEST(0, COALESCE(existing_qty, 0) - transfer_item.quantity);
        
      ELSIF NEW.from_warehouse_id IS NOT NULL THEN
        RAISE NOTICE '  🔻 Deducting % from WAREHOUSE %', transfer_item.quantity, NEW.from_warehouse_id;
        
        -- Check current stock
        SELECT quantity INTO existing_qty
        FROM inventory
        WHERE product_id = transfer_item.product_id 
          AND warehouse_id = NEW.from_warehouse_id
          AND branch_id IS NULL;
        
        RAISE NOTICE '     Current stock: %', COALESCE(existing_qty, 0);
        
        -- Deduct from warehouse
        UPDATE inventory
        SET quantity = GREATEST(0, quantity - transfer_item.quantity),
            updated_at = NOW()
        WHERE product_id = transfer_item.product_id 
          AND warehouse_id = NEW.from_warehouse_id
          AND branch_id IS NULL;
        
        GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
        RAISE NOTICE '     Rows updated: %', v_rows_affected;
        RAISE NOTICE '     New stock: %', GREATEST(0, COALESCE(existing_qty, 0) - transfer_item.quantity);
        
        IF v_rows_affected = 0 THEN
          RAISE WARNING '     ⚠️  NO INVENTORY FOUND TO DEDUCT FROM!';
        END IF;
      END IF;
      
      RAISE NOTICE '';
      
      -- =======================
      -- ADD TO DESTINATION
      -- =======================
      
      IF NEW.to_branch_id IS NOT NULL THEN
        RAISE NOTICE '  🔺 Adding % to BRANCH %', transfer_item.quantity, NEW.to_branch_id;
        
        -- Check if inventory exists
        SELECT quantity INTO existing_qty
        FROM inventory
        WHERE product_id = transfer_item.product_id
          AND branch_id = NEW.to_branch_id
          AND warehouse_id IS NULL;
        
        IF existing_qty IS NOT NULL THEN
          RAISE NOTICE '     Found existing inventory: % units', existing_qty;
          
          -- Update existing inventory
          UPDATE inventory
          SET quantity = quantity + transfer_item.quantity,
              updated_at = NOW(),
              updated_by = NEW.approved_by
          WHERE product_id = transfer_item.product_id
            AND branch_id = NEW.to_branch_id
            AND warehouse_id IS NULL;
          
          GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
          RAISE NOTICE '     Rows updated: %', v_rows_affected;
          RAISE NOTICE '     New stock: %', existing_qty + transfer_item.quantity;
        ELSE
          RAISE NOTICE '     No existing inventory - creating new';
          
          -- Create new inventory
          INSERT INTO inventory (
            id, organization_id, branch_id, warehouse_id,
            product_id, quantity, updated_by
          ) VALUES (
            gen_random_uuid(), NEW.organization_id, NEW.to_branch_id, NULL,
            transfer_item.product_id, transfer_item.quantity, NEW.approved_by
          );
          
          GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
          RAISE NOTICE '     Rows inserted: %', v_rows_affected;
          RAISE NOTICE '     New stock: %', transfer_item.quantity;
        END IF;
        
      ELSIF NEW.to_warehouse_id IS NOT NULL THEN
        RAISE NOTICE '  🔺 Adding % to WAREHOUSE %', transfer_item.quantity, NEW.to_warehouse_id;
        
        -- Check if inventory exists
        SELECT quantity INTO existing_qty
        FROM inventory
        WHERE product_id = transfer_item.product_id
          AND warehouse_id = NEW.to_warehouse_id
          AND branch_id IS NULL;
        
        IF existing_qty IS NOT NULL THEN
          RAISE NOTICE '     Found existing inventory: % units', existing_qty;
          
          -- Update existing inventory
          UPDATE inventory
          SET quantity = quantity + transfer_item.quantity,
              updated_at = NOW(),
              updated_by = NEW.approved_by
          WHERE product_id = transfer_item.product_id
            AND warehouse_id = NEW.to_warehouse_id
            AND branch_id IS NULL;
          
          GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
          RAISE NOTICE '     Rows updated: %', v_rows_affected;
          RAISE NOTICE '     New stock: %', existing_qty + transfer_item.quantity;
        ELSE
          RAISE NOTICE '     No existing inventory - creating new';
          
          -- Create new inventory
          INSERT INTO inventory (
            id, organization_id, branch_id, warehouse_id,
            product_id, quantity, updated_by
          ) VALUES (
            gen_random_uuid(), NEW.organization_id, NULL, NEW.to_warehouse_id,
            transfer_item.product_id, transfer_item.quantity, NEW.approved_by
          );
          
          GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
          RAISE NOTICE '     Rows inserted: %', v_rows_affected;
          RAISE NOTICE '     New stock: %', transfer_item.quantity;
        END IF;
      END IF;
      
      RAISE NOTICE '';
    END LOOP;
    
    NEW.completed_at = NOW();
    
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ Transfer % completed at %', NEW.id, NEW.completed_at;
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER process_transfer_completion
  BEFORE UPDATE ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION complete_transfer();

-- Verification
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Transfer completion trigger updated with detailed logging';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. First run: /DIAGNOSE_TRANSFER_ISSUE.sql to see current state';
  RAISE NOTICE '  2. Refresh browser';
  RAISE NOTICE '  3. Complete a transfer';
  RAISE NOTICE '  4. Check Supabase Logs to see detailed trigger output';
  RAISE NOTICE '';
  RAISE NOTICE 'To view trigger logs:';
  RAISE NOTICE '  Supabase Dashboard → Logs → Postgres Logs';
  RAISE NOTICE '  Look for messages starting with "PROCESSING TRANSFER COMPLETION"';
  RAISE NOTICE '';
END $$;
