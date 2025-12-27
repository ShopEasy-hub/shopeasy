-- =====================================================
-- VERIFY AND FIX TRANSFER STOCK UPDATES
-- =====================================================
-- Ensures the upsert_inventory_safe function exists
-- This function is used when transfers are approved/completed
-- =====================================================

DO $$
DECLARE
    v_function_exists BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════╗';
    RAISE NOTICE '║   CHECKING TRANSFER REQUIREMENTS      ║';
    RAISE NOTICE '╚════════════════════════════════════════╝';
    RAISE NOTICE '';
    
    -- Check if upsert_inventory_safe function exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
          AND routine_name = 'upsert_inventory_safe'
    ) INTO v_function_exists;
    
    IF v_function_exists THEN
        RAISE NOTICE '✅ upsert_inventory_safe function EXISTS';
        RAISE NOTICE '   Transfers should work correctly';
    ELSE
        RAISE NOTICE '❌ upsert_inventory_safe function MISSING';
        RAISE NOTICE '   Creating function now...';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- =====================================================
-- CREATE OR REPLACE THE FUNCTION
-- =====================================================
-- Always recreate to ensure it has the latest code
-- =====================================================

CREATE OR REPLACE FUNCTION upsert_inventory_safe(
  p_organization_id UUID,
  p_product_id UUID,
  p_quantity INTEGER,
  p_branch_id UUID DEFAULT NULL,
  p_warehouse_id UUID DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL
)
RETURNS inventory
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inventory_id UUID;
  v_result inventory;
BEGIN
  RAISE NOTICE '🔧 upsert_inventory_safe called:';
  RAISE NOTICE '   Org: %, Product: %', p_organization_id, p_product_id;
  RAISE NOTICE '   Branch: %, Warehouse: %', p_branch_id, p_warehouse_id;
  RAISE NOTICE '   Quantity: %', p_quantity;
  
  -- Try to find existing inventory record
  SELECT id INTO v_inventory_id
  FROM inventory
  WHERE organization_id = p_organization_id
    AND product_id = p_product_id
    AND COALESCE(branch_id::text, '') = COALESCE(p_branch_id::text, '')
    AND COALESCE(warehouse_id::text, '') = COALESCE(p_warehouse_id::text, '');
  
  IF v_inventory_id IS NOT NULL THEN
    -- Update existing record
    RAISE NOTICE '   ✅ Updating existing inventory record: %', v_inventory_id;
    
    UPDATE inventory
    SET quantity = p_quantity,
        updated_by = p_updated_by,
        updated_at = NOW()
    WHERE id = v_inventory_id
    RETURNING * INTO v_result;
    
    RAISE NOTICE '   ✅ Updated! New quantity: %', v_result.quantity;
  ELSE
    -- Insert new record
    RAISE NOTICE '   📝 Creating new inventory record';
    
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
    
    RAISE NOTICE '   ✅ Created! Quantity: %', v_result.quantity;
  END IF;
  
  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION upsert_inventory_safe TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
    v_function_exists BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE 'FINAL VERIFICATION';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
          AND routine_name = 'upsert_inventory_safe'
    ) INTO v_function_exists;
    
    IF v_function_exists THEN
        RAISE NOTICE '✅ upsert_inventory_safe: EXISTS';
        RAISE NOTICE '';
        RAISE NOTICE '╔════════════════════════════════════════╗';
        RAISE NOTICE '║   🎉 TRANSFERS READY TO WORK! 🎉     ║';
        RAISE NOTICE '╚════════════════════════════════════════╝';
        RAISE NOTICE '';
        RAISE NOTICE '👉 NEXT STEPS:';
        RAISE NOTICE '   1. Hard refresh browser: Ctrl + Shift + R';
        RAISE NOTICE '   2. Create a test transfer';
        RAISE NOTICE '   3. Approve it → Source stock decreases';
        RAISE NOTICE '   4. Complete it → Destination stock increases';
        RAISE NOTICE '   5. Success! ✅';
    ELSE
        RAISE NOTICE '❌ Function still missing!';
        RAISE NOTICE '   Please contact support';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- Show function signature
SELECT 
    routine_name,
    routine_type,
    data_type AS return_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name = 'upsert_inventory_safe';
