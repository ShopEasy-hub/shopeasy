-- ==========================================
-- 🚀 COMPLETE TRANSFER FIX - RUN THIS ONE FILE
-- Fixes everything in the correct order
-- ==========================================

-- ==========================================
-- PART 1: FIX TRANSFERS TABLE SCHEMA
-- ==========================================

-- Remove old single-product design columns
ALTER TABLE transfers 
  ALTER COLUMN product_id DROP NOT NULL;

ALTER TABLE transfers 
  ALTER COLUMN quantity DROP NOT NULL;

ALTER TABLE transfers 
  DROP COLUMN IF EXISTS product_id;

ALTER TABLE transfers 
  DROP COLUMN IF EXISTS quantity;

-- Add required columns for new multi-item design
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transfers' AND column_name = 'from_warehouse_id'
  ) THEN
    ALTER TABLE transfers ADD COLUMN from_warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transfers' AND column_name = 'to_warehouse_id'
  ) THEN
    ALTER TABLE transfers ADD COLUMN to_warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transfers' AND column_name = 'from_branch_id'
  ) THEN
    ALTER TABLE transfers ADD COLUMN from_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transfers' AND column_name = 'to_branch_id'
  ) THEN
    ALTER TABLE transfers ADD COLUMN to_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transfers' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE transfers ADD COLUMN approved_by UUID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transfers' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE transfers ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transfers' AND column_name = 'notes'
  ) THEN
    ALTER TABLE transfers ADD COLUMN notes TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transfers' AND column_name = 'status'
  ) THEN
    ALTER TABLE transfers ADD COLUMN status TEXT DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transfers' AND column_name = 'initiated_by'
  ) THEN
    ALTER TABLE transfers ADD COLUMN initiated_by UUID;
  END IF;
END $$;

-- ==========================================
-- PART 2: CREATE transfer_items TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfer_items_transfer_id ON transfer_items(transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfer_items_product_id ON transfer_items(product_id);

-- Enable RLS
ALTER TABLE transfer_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view transfer items for their org" ON transfer_items;
CREATE POLICY "Users can view transfer items for their org"
  ON transfer_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transfers t
      WHERE t.id = transfer_items.transfer_id
      AND t.organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert transfer items for their org" ON transfer_items;
CREATE POLICY "Users can insert transfer items for their org"
  ON transfer_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transfers t
      WHERE t.id = transfer_items.transfer_id
      AND t.organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update transfer items for their org" ON transfer_items;
CREATE POLICY "Users can update transfer items for their org"
  ON transfer_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transfers t
      WHERE t.id = transfer_items.transfer_id
      AND t.organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete transfer items for their org" ON transfer_items;
CREATE POLICY "Users can delete transfer items for their org"
  ON transfer_items FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transfers t
      WHERE t.id = transfer_items.transfer_id
      AND t.organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

GRANT ALL ON transfer_items TO authenticated;
GRANT ALL ON transfer_items TO service_role;

-- ==========================================
-- PART 3: CREATE COMPLETION TRIGGER
-- ==========================================

DROP TRIGGER IF EXISTS process_transfer_completion ON transfers;

CREATE OR REPLACE FUNCTION complete_transfer()
RETURNS TRIGGER AS $$
DECLARE
  existing_qty INTEGER;
  transfer_item RECORD;
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    RAISE NOTICE '🔄 Processing transfer completion: %', NEW.id;
    
    -- Process each item in the transfer
    FOR transfer_item IN 
      SELECT product_id, quantity, unit_cost 
      FROM transfer_items 
      WHERE transfer_id = NEW.id
    LOOP
      RAISE NOTICE '  📦 Item: product=%, qty=%', transfer_item.product_id, transfer_item.quantity;
      
      -- Deduct from source
      IF NEW.from_branch_id IS NOT NULL THEN
        UPDATE inventory
        SET quantity = GREATEST(0, quantity - transfer_item.quantity),
            updated_at = NOW()
        WHERE product_id = transfer_item.product_id 
          AND branch_id = NEW.from_branch_id
          AND warehouse_id IS NULL;
        
        RAISE NOTICE '  🔻 Deducted % from branch %', transfer_item.quantity, NEW.from_branch_id;
        
      ELSIF NEW.from_warehouse_id IS NOT NULL THEN
        UPDATE inventory
        SET quantity = GREATEST(0, quantity - transfer_item.quantity),
            updated_at = NOW()
        WHERE product_id = transfer_item.product_id 
          AND warehouse_id = NEW.from_warehouse_id
          AND branch_id IS NULL;
        
        RAISE NOTICE '  🔻 Deducted % from warehouse %', transfer_item.quantity, NEW.from_warehouse_id;
      END IF;
      
      -- Add to destination
      IF NEW.to_branch_id IS NOT NULL THEN
        SELECT quantity INTO existing_qty
        FROM inventory
        WHERE product_id = transfer_item.product_id
          AND branch_id = NEW.to_branch_id
          AND warehouse_id IS NULL;
        
        IF existing_qty IS NOT NULL THEN
          UPDATE inventory
          SET quantity = quantity + transfer_item.quantity,
              updated_at = NOW(),
              updated_by = NEW.approved_by
          WHERE product_id = transfer_item.product_id
            AND branch_id = NEW.to_branch_id
            AND warehouse_id IS NULL;
          
          RAISE NOTICE '  🔺 Added % to branch % (was %, now %)', 
            transfer_item.quantity, NEW.to_branch_id, existing_qty, existing_qty + transfer_item.quantity;
        ELSE
          INSERT INTO inventory (
            id, organization_id, branch_id, warehouse_id,
            product_id, quantity, updated_by
          ) VALUES (
            gen_random_uuid(), NEW.organization_id, NEW.to_branch_id, NULL,
            transfer_item.product_id, transfer_item.quantity, NEW.approved_by
          );
          
          RAISE NOTICE '  🔺 Created new inventory at branch % with qty %', NEW.to_branch_id, transfer_item.quantity;
        END IF;
        
      ELSIF NEW.to_warehouse_id IS NOT NULL THEN
        SELECT quantity INTO existing_qty
        FROM inventory
        WHERE product_id = transfer_item.product_id
          AND warehouse_id = NEW.to_warehouse_id
          AND branch_id IS NULL;
        
        IF existing_qty IS NOT NULL THEN
          UPDATE inventory
          SET quantity = quantity + transfer_item.quantity,
              updated_at = NOW(),
              updated_by = NEW.approved_by
          WHERE product_id = transfer_item.product_id
            AND warehouse_id = NEW.to_warehouse_id
            AND branch_id IS NULL;
          
          RAISE NOTICE '  🔺 Added % to warehouse % (was %, now %)', 
            transfer_item.quantity, NEW.to_warehouse_id, existing_qty, existing_qty + transfer_item.quantity;
        ELSE
          INSERT INTO inventory (
            id, organization_id, branch_id, warehouse_id,
            product_id, quantity, updated_by
          ) VALUES (
            gen_random_uuid(), NEW.organization_id, NULL, NEW.to_warehouse_id,
            transfer_item.product_id, transfer_item.quantity, NEW.approved_by
          );
          
          RAISE NOTICE '  🔺 Created new inventory at warehouse % with qty %', NEW.to_warehouse_id, transfer_item.quantity;
        END IF;
      END IF;
    END LOOP;
    
    NEW.completed_at = NOW();
    RAISE NOTICE '✅ Transfer % completed', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER process_transfer_completion
  BEFORE UPDATE ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION complete_transfer();

-- ==========================================
-- VERIFICATION
-- ==========================================

DO $$
DECLARE
  v_has_product_id boolean;
  v_transfer_items_exists boolean;
  v_trigger_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transfers' AND column_name = 'product_id'
  ) INTO v_has_product_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'transfer_items'
  ) INTO v_transfer_items_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'process_transfer_completion'
  ) INTO v_trigger_exists;

  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════════════';
  RAISE NOTICE '║  🎉 TRANSFER SYSTEM COMPLETELY FIXED';
  RAISE NOTICE '╚════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Status:';
  RAISE NOTICE '  1. Old product_id column: %', CASE WHEN v_has_product_id THEN '❌ STILL EXISTS (ERROR)' ELSE '✅ REMOVED' END;
  RAISE NOTICE '  2. transfer_items table: %', CASE WHEN v_transfer_items_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '  3. Completion trigger: %', CASE WHEN v_trigger_exists THEN '✅ ACTIVE' ELSE '❌ MISSING' END;
  RAISE NOTICE '';
  RAISE NOTICE 'What changed:';
  RAISE NOTICE '  ✅ Removed single-product columns from transfers';
  RAISE NOTICE '  ✅ Created transfer_items for multi-product support';
  RAISE NOTICE '  ✅ Fixed completion trigger to read from transfer_items';
  RAISE NOTICE '  ✅ Added RLS policies for security';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Refresh browser (Ctrl+Shift+R)';
  RAISE NOTICE '  2. Create transfer from warehouse to branch';
  RAISE NOTICE '  3. Complete the transfer';
  RAISE NOTICE '  4. Inventory should update correctly! 🚀';
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
END $$;
