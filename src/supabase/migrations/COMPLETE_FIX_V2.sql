-- =====================================================
-- COMPLETE FIX - ONE FOR ALL SOLUTION
-- Run this entire script in Supabase SQL Editor
-- =====================================================

-- STEP 1: Clean up old constraints and indexes
-- =====================================================
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all existing unique constraints on inventory
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'inventory'::regclass 
        AND contype = 'u'
    ) LOOP
        EXECUTE 'ALTER TABLE inventory DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
        RAISE NOTICE 'Dropped constraint: %', r.conname;
    END LOOP;
    
    -- Drop existing indexes
    DROP INDEX IF EXISTS idx_inventory_branch_stock;
    DROP INDEX IF EXISTS idx_inventory_warehouse_stock;
    
    RAISE NOTICE '✅ Cleaned up old constraints and indexes';
END $$;

-- STEP 2: Add new unique constraint with NULLS NOT DISTINCT
-- =====================================================
DO $$
BEGIN
    ALTER TABLE inventory 
        ADD CONSTRAINT inventory_unique_per_location 
        UNIQUE NULLS NOT DISTINCT (organization_id, product_id, branch_id, warehouse_id);
    
    RAISE NOTICE '✅ Added unique constraint with NULLS NOT DISTINCT';
EXCEPTION
    WHEN duplicate_key THEN
        RAISE NOTICE '⚠️ Constraint already exists, skipping';
END $$;

-- STEP 3: Create optimized partial indexes
-- =====================================================
DO $$
BEGIN
    CREATE UNIQUE INDEX idx_inventory_branch 
        ON inventory(organization_id, product_id, branch_id) 
        WHERE warehouse_id IS NULL;
    RAISE NOTICE '✅ Created branch inventory index';
EXCEPTION
    WHEN duplicate_table THEN
        RAISE NOTICE '⚠️ Branch index already exists';
END $$;

DO $$
BEGIN
    CREATE UNIQUE INDEX idx_inventory_warehouse 
        ON inventory(organization_id, product_id, warehouse_id) 
        WHERE branch_id IS NULL;
    RAISE NOTICE '✅ Created warehouse inventory index';
EXCEPTION
    WHEN duplicate_table THEN
        RAISE NOTICE '⚠️ Warehouse index already exists';
END $$;

-- STEP 4: Drop and recreate RLS policies
-- =====================================================
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view inventory in their organization" ON inventory;
    DROP POLICY IF EXISTS "Users can insert inventory in their organization" ON inventory;
    DROP POLICY IF EXISTS "Users can update inventory in their organization" ON inventory;
    DROP POLICY IF EXISTS "Users can delete inventory in their organization" ON inventory;
    DROP POLICY IF EXISTS "Users can manage inventory in their organization" ON inventory;
    DROP POLICY IF EXISTS "Service role can manage all inventory" ON inventory;
    
    RAISE NOTICE '✅ Dropped old RLS policies';
END $$;

-- Enable RLS if not already enabled
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Create new RLS policies
CREATE POLICY "inventory_select_policy"
    ON inventory FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
        OR auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "inventory_insert_policy"
    ON inventory FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
        OR auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "inventory_update_policy"
    ON inventory FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
        OR auth.jwt() ->> 'role' = 'service_role'
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
        OR auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "inventory_delete_policy"
    ON inventory FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
        OR auth.jwt() ->> 'role' = 'service_role'
    );

-- STEP 5: Grant permissions
-- =====================================================
GRANT ALL ON inventory TO authenticated;
GRANT ALL ON inventory TO service_role;
GRANT ALL ON inventory TO anon;

-- STEP 6: Drop and recreate the upsert function
-- =====================================================
DROP FUNCTION IF EXISTS upsert_inventory_safe(UUID, UUID, INTEGER, UUID, UUID, UUID);

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
    v_result inventory;
    v_existing_id UUID;
BEGIN
    -- Log input
    RAISE NOTICE 'upsert_inventory_safe called: org=%, prod=%, qty=%, branch=%, warehouse=%', 
        p_organization_id, p_product_id, p_quantity, p_branch_id, p_warehouse_id;

    -- Validate inputs
    IF p_organization_id IS NULL OR p_product_id IS NULL THEN
        RAISE EXCEPTION 'organization_id and product_id are required';
    END IF;
    
    IF (p_branch_id IS NULL AND p_warehouse_id IS NULL) THEN
        RAISE EXCEPTION 'Must specify either branch_id or warehouse_id';
    END IF;
    
    IF (p_branch_id IS NOT NULL AND p_warehouse_id IS NOT NULL) THEN
        RAISE EXCEPTION 'Cannot specify both branch_id and warehouse_id';
    END IF;

    -- Check if record exists
    SELECT id INTO v_existing_id
    FROM inventory
    WHERE organization_id = p_organization_id
        AND product_id = p_product_id
        AND (
            (branch_id = p_branch_id) OR (branch_id IS NULL AND p_branch_id IS NULL)
        )
        AND (
            (warehouse_id = p_warehouse_id) OR (warehouse_id IS NULL AND p_warehouse_id IS NULL)
        );

    IF v_existing_id IS NOT NULL THEN
        -- Update existing record
        UPDATE inventory
        SET 
            quantity = p_quantity,
            updated_at = NOW(),
            updated_by = COALESCE(p_updated_by, updated_by)
        WHERE id = v_existing_id
        RETURNING * INTO v_result;
        
        RAISE NOTICE 'Updated inventory record: id=%, qty=%', v_existing_id, p_quantity;
    ELSE
        -- Insert new record
        INSERT INTO inventory (
            organization_id,
            product_id,
            branch_id,
            warehouse_id,
            quantity,
            updated_by,
            created_at,
            updated_at
        ) VALUES (
            p_organization_id,
            p_product_id,
            p_branch_id,
            p_warehouse_id,
            p_quantity,
            p_updated_by,
            NOW(),
            NOW()
        )
        RETURNING * INTO v_result;
        
        RAISE NOTICE 'Inserted new inventory record: id=%, qty=%', v_result.id, p_quantity;
    END IF;

    RETURN v_result;
END;
$$;

-- Grant execute permissions on function
GRANT EXECUTE ON FUNCTION upsert_inventory_safe TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_inventory_safe TO service_role;
GRANT EXECUTE ON FUNCTION upsert_inventory_safe TO anon;

-- STEP 7: Create helper function to get stock level
-- =====================================================
CREATE OR REPLACE FUNCTION get_stock_level(
    p_product_id UUID,
    p_branch_id UUID DEFAULT NULL,
    p_warehouse_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_quantity INTEGER;
BEGIN
    SELECT quantity INTO v_quantity
    FROM inventory
    WHERE product_id = p_product_id
        AND (
            (branch_id = p_branch_id) OR (branch_id IS NULL AND p_branch_id IS NULL)
        )
        AND (
            (warehouse_id = p_warehouse_id) OR (warehouse_id IS NULL AND p_warehouse_id IS NULL)
        )
    LIMIT 1;
    
    RETURN COALESCE(v_quantity, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION get_stock_level TO authenticated;
GRANT EXECUTE ON FUNCTION get_stock_level TO service_role;
GRANT EXECUTE ON FUNCTION get_stock_level TO anon;

-- STEP 8: Verify everything is set up
-- =====================================================
DO $$
DECLARE
    constraint_count INTEGER;
    index_count INTEGER;
    policy_count INTEGER;
    function_count INTEGER;
BEGIN
    -- Check constraint
    SELECT COUNT(*) INTO constraint_count
    FROM pg_constraint
    WHERE conname = 'inventory_unique_per_location';
    
    -- Check indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE tablename = 'inventory' 
    AND indexname IN ('idx_inventory_branch', 'idx_inventory_warehouse');
    
    -- Check policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'inventory';
    
    -- Check function
    SELECT COUNT(*) INTO function_count
    FROM pg_proc
    WHERE proname = 'upsert_inventory_safe';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICATION RESULTS:';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Unique Constraint: % (expected: 1)', constraint_count;
    RAISE NOTICE 'Indexes: % (expected: 2)', index_count;
    RAISE NOTICE 'RLS Policies: % (expected: 4)', policy_count;
    RAISE NOTICE 'Upsert Function: % (expected: 1)', function_count;
    RAISE NOTICE '========================================';
    
    IF constraint_count = 1 AND index_count = 2 AND policy_count = 4 AND function_count = 1 THEN
        RAISE NOTICE '✅✅✅ ALL CHECKS PASSED! ✅✅✅';
        RAISE NOTICE 'Database is ready for inventory operations';
    ELSE
        RAISE WARNING '⚠️ Some checks failed. Review the counts above.';
    END IF;
END $$;

-- STEP 9: Test the function
-- =====================================================
DO $$
DECLARE
    test_org_id UUID;
    test_product_id UUID;
    test_branch_id UUID;
    test_result inventory;
BEGIN
    -- Get sample IDs
    SELECT id INTO test_org_id FROM organizations LIMIT 1;
    SELECT id INTO test_product_id FROM products LIMIT 1;
    SELECT id INTO test_branch_id FROM branches LIMIT 1;
    
    IF test_org_id IS NOT NULL AND test_product_id IS NOT NULL AND test_branch_id IS NOT NULL THEN
        -- Test insert
        SELECT * INTO test_result FROM upsert_inventory_safe(
            test_org_id,
            test_product_id,
            999,
            test_branch_id,
            NULL,
            NULL
        );
        
        RAISE NOTICE '✅ Function test INSERT successful: qty=%', test_result.quantity;
        
        -- Test update
        SELECT * INTO test_result FROM upsert_inventory_safe(
            test_org_id,
            test_product_id,
            888,
            test_branch_id,
            NULL,
            NULL
        );
        
        RAISE NOTICE '✅ Function test UPDATE successful: qty=%', test_result.quantity;
        
        -- Clean up test data
        DELETE FROM inventory WHERE id = test_result.id;
        RAISE NOTICE '✅ Test data cleaned up';
    ELSE
        RAISE NOTICE '⚠️ Skipping function test - no sample data available';
    END IF;
END $$;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎉 MIGRATION COMPLETE! 🎉';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Hard refresh your browser (Ctrl+Shift+R)';
    RAISE NOTICE '2. Test POS sales';
    RAISE NOTICE '3. Test transfers';
    RAISE NOTICE '4. Check browser console for logs';
    RAISE NOTICE '========================================';
END $$;
