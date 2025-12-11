-- =====================================================
-- CRITICAL FIX: Inventory Stock Not Updating
-- This fixes the unique constraint and RLS policies
-- =====================================================

-- Step 1: Drop the old constraint (it doesn't handle NULLs properly)
DO $$
BEGIN
  -- Drop all variations of the unique constraint
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_stock_per_location' AND conrelid = 'inventory'::regclass
  ) THEN
    ALTER TABLE inventory DROP CONSTRAINT unique_stock_per_location;
    RAISE NOTICE '✅ Dropped old unique_stock_per_location constraint';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'inventory_product_branch_warehouse_uniq' AND conrelid = 'inventory'::regclass
  ) THEN
    ALTER TABLE inventory DROP CONSTRAINT inventory_product_branch_warehouse_uniq;
    RAISE NOTICE '✅ Dropped old inventory_product_branch_warehouse_uniq constraint';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'inventory_organization_id_product_id_branch_id_warehouse_id' AND conrelid = 'inventory'::regclass
  ) THEN
    ALTER TABLE inventory DROP CONSTRAINT inventory_organization_id_product_id_branch_id_warehouse_id;
    RAISE NOTICE '✅ Dropped old organization constraint';
  END IF;
END $$;

-- Step 2: Add the CORRECT unique constraint with NULLS NOT DISTINCT
-- This ensures NULL values are treated as equal in the constraint
DO $$
BEGIN
  ALTER TABLE inventory 
    ADD CONSTRAINT unique_stock_per_location 
    UNIQUE NULLS NOT DISTINCT (product_id, branch_id, warehouse_id);
  RAISE NOTICE '✅ Added NULLS NOT DISTINCT unique constraint';
END $$;

-- Step 3: Create a partial unique index for branch stock
DO $$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_branch_stock 
    ON inventory(product_id, branch_id) 
    WHERE warehouse_id IS NULL;
  RAISE NOTICE '✅ Added partial index for branch stock';
END $$;

-- Step 4: Create a partial unique index for warehouse stock
DO $$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_warehouse_stock 
    ON inventory(product_id, warehouse_id) 
    WHERE branch_id IS NULL;
  RAISE NOTICE '✅ Added partial index for warehouse stock';
END $$;

-- Step 5: Ensure RLS policies allow all operations
DROP POLICY IF EXISTS "Users can view inventory in their organization" ON inventory;
DROP POLICY IF EXISTS "Users can manage inventory in their organization" ON inventory;
DROP POLICY IF EXISTS "Users can insert inventory in their organization" ON inventory;
DROP POLICY IF EXISTS "Users can update inventory in their organization" ON inventory;
DROP POLICY IF EXISTS "Users can delete inventory in their organization" ON inventory;
DROP POLICY IF EXISTS "Service role can manage all inventory" ON inventory;

-- Create comprehensive RLS policies
CREATE POLICY "Users can view inventory in their organization"
  ON inventory FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert inventory in their organization"
  ON inventory FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update inventory in their organization"
  ON inventory FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete inventory in their organization"
  ON inventory FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Step 6: Grant necessary permissions
GRANT ALL ON inventory TO authenticated;
GRANT ALL ON inventory TO service_role;

-- Step 7: Create helper function for safe inventory upsert
CREATE OR REPLACE FUNCTION upsert_inventory_safe(
  p_organization_id UUID,
  p_product_id UUID,
  p_quantity INTEGER,
  p_branch_id UUID DEFAULT NULL,
  p_warehouse_id UUID DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL
) RETURNS inventory AS $$
DECLARE
  v_existing inventory;
  v_result inventory;
BEGIN
  -- Validate: must have either branch_id or warehouse_id, not both, not neither
  IF (p_branch_id IS NULL AND p_warehouse_id IS NULL) THEN
    RAISE EXCEPTION 'Must specify either branch_id or warehouse_id';
  END IF;
  
  IF (p_branch_id IS NOT NULL AND p_warehouse_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Cannot specify both branch_id and warehouse_id';
  END IF;

  -- Try to find existing record
  SELECT * INTO v_existing
  FROM inventory
  WHERE product_id = p_product_id
    AND (branch_id = p_branch_id OR (branch_id IS NULL AND p_branch_id IS NULL))
    AND (warehouse_id = p_warehouse_id OR (warehouse_id IS NULL AND p_warehouse_id IS NULL));

  IF FOUND THEN
    -- Update existing record
    UPDATE inventory
    SET quantity = p_quantity,
        updated_at = NOW(),
        updated_by = COALESCE(p_updated_by, updated_by)
    WHERE id = v_existing.id
    RETURNING * INTO v_result;
    
    RAISE NOTICE 'Updated inventory: product=%, qty=%', p_product_id, p_quantity;
  ELSE
    -- Insert new record
    INSERT INTO inventory (
      organization_id,
      product_id,
      branch_id,
      warehouse_id,
      quantity,
      updated_by
    ) VALUES (
      p_organization_id,
      p_product_id,
      p_branch_id,
      p_warehouse_id,
      p_quantity,
      p_updated_by
    )
    RETURNING * INTO v_result;
    
    RAISE NOTICE 'Inserted inventory: product=%, qty=%', p_product_id, p_quantity;
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Grant execute permission on the function
GRANT EXECUTE ON FUNCTION upsert_inventory_safe TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_inventory_safe TO service_role;

-- Final message
DO $$
BEGIN
  RAISE NOTICE '✅ All fixes applied successfully!';
  RAISE NOTICE '🎉 Inventory should now update correctly for transfers and sales';
END $$;
