-- =====================================================
-- DEBUG CHECK - Run this to see what's wrong
-- =====================================================

-- Check 1: Does the function exist?
SELECT 
    'Function Check' as check_name,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Function EXISTS'
        ELSE '❌ Function MISSING - Run COMPLETE_FIX_V3_CORRECTED.sql'
    END as status
FROM pg_proc 
WHERE proname = 'upsert_inventory_safe';

-- Check 2: What are the function parameters?
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as parameters
FROM pg_proc p
WHERE proname = 'upsert_inventory_safe';

-- Check 3: What columns does inventory table have?
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'inventory'
ORDER BY ordinal_position;

-- Check 4: What constraints exist?
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'inventory'::regclass;

-- Check 5: What indexes exist?
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'inventory';

-- Check 6: What RLS policies exist?
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'inventory';

-- Check 7: Try a test call (will fail if function doesn't exist)
DO $$
DECLARE
    test_org_id UUID;
    test_product_id UUID;
    test_branch_id UUID;
BEGIN
    -- Get sample IDs
    SELECT id INTO test_org_id FROM organizations LIMIT 1;
    SELECT id INTO test_product_id FROM products LIMIT 1;
    SELECT id INTO test_branch_id FROM branches LIMIT 1;
    
    IF test_org_id IS NOT NULL AND test_product_id IS NOT NULL AND test_branch_id IS NOT NULL THEN
        RAISE NOTICE '========================================';
        RAISE NOTICE 'TEST FUNCTION CALL';
        RAISE NOTICE '========================================';
        RAISE NOTICE 'Org: %', test_org_id;
        RAISE NOTICE 'Product: %', test_product_id;
        RAISE NOTICE 'Branch: %', test_branch_id;
        RAISE NOTICE '';
        RAISE NOTICE 'Attempting to call upsert_inventory_safe...';
        
        -- Try the call
        PERFORM upsert_inventory_safe(
            test_org_id,
            test_product_id,
            999,
            test_branch_id,
            NULL,
            NULL
        );
        
        RAISE NOTICE '✅ Function call succeeded!';
        
        -- Clean up
        DELETE FROM inventory WHERE organization_id = test_org_id AND product_id = test_product_id AND quantity = 999;
        RAISE NOTICE '✅ Test data cleaned up';
    ELSE
        RAISE NOTICE '⚠️ Cannot test - no sample data found';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Function call FAILED: %', SQLERRM;
        RAISE NOTICE '';
        RAISE NOTICE '👉 This means you need to run: COMPLETE_FIX_V3_CORRECTED.sql';
END $$;

-- Final Summary
DO $$
DECLARE
    func_count INTEGER;
    constraint_count INTEGER;
    index_count INTEGER;
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO func_count FROM pg_proc WHERE proname = 'upsert_inventory_safe';
    SELECT COUNT(*) INTO constraint_count FROM pg_constraint WHERE conname = 'inventory_unique_per_location';
    SELECT COUNT(*) INTO index_count FROM pg_indexes WHERE tablename = 'inventory' AND indexname IN ('idx_inventory_branch', 'idx_inventory_warehouse');
    SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename = 'inventory';
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Function exists: % (need: 1)', func_count;
    RAISE NOTICE 'Unique constraint: % (need: 1)', constraint_count;
    RAISE NOTICE 'Indexes: % (need: 2)', index_count;
    RAISE NOTICE 'RLS Policies: % (need: 4)', policy_count;
    RAISE NOTICE '';
    
    IF func_count = 0 THEN
        RAISE NOTICE '❌ PROBLEM: Function does not exist';
        RAISE NOTICE '';
        RAISE NOTICE '🔧 SOLUTION:';
        RAISE NOTICE '1. Open: /supabase/migrations/COMPLETE_FIX_V3_CORRECTED.sql';
        RAISE NOTICE '2. Copy the entire file';
        RAISE NOTICE '3. Paste in Supabase SQL Editor';
        RAISE NOTICE '4. Click Run';
        RAISE NOTICE '5. Wait for "ALL CHECKS PASSED"';
    ELSIF func_count >= 1 AND constraint_count >= 1 AND index_count >= 2 AND policy_count >= 4 THEN
        RAISE NOTICE '✅ Everything looks good!';
        RAISE NOTICE '';
        RAISE NOTICE '👉 If POS still fails:';
        RAISE NOTICE '1. Hard refresh browser (Ctrl+Shift+R)';
        RAISE NOTICE '2. Check browser console (F12)';
        RAISE NOTICE '3. Try POS sale again';
        RAISE NOTICE '4. Copy the EXACT error message';
    ELSE
        RAISE NOTICE '⚠️ Some components are missing';
        RAISE NOTICE '';
        RAISE NOTICE '🔧 SOLUTION: Run COMPLETE_FIX_V3_CORRECTED.sql';
    END IF;
    RAISE NOTICE '========================================';
END $$;
