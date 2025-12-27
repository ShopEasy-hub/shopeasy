-- =====================================================
-- TEST SCRIPT - Run AFTER COMPLETE_FIX_V2.sql
-- =====================================================

-- Test 1: Verify function exists
-- =====================================================
SELECT 
    'TEST 1: Function Exists' as test_name,
    CASE 
        WHEN COUNT(*) = 1 THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as result
FROM pg_proc
WHERE proname = 'upsert_inventory_safe';

-- Test 2: Verify unique constraint
-- =====================================================
SELECT 
    'TEST 2: Unique Constraint' as test_name,
    CASE 
        WHEN COUNT(*) = 1 AND 
             pg_get_constraintdef(oid) LIKE '%NULLS NOT DISTINCT%'
        THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as result
FROM pg_constraint
WHERE conname = 'inventory_unique_per_location';

-- Test 3: Verify RLS policies
-- =====================================================
SELECT 
    'TEST 3: RLS Policies' as test_name,
    CASE 
        WHEN COUNT(*) = 4 THEN '✅ PASS'
        ELSE '❌ FAIL - Found ' || COUNT(*) || ' policies'
    END as result
FROM pg_policies
WHERE tablename = 'inventory';

-- Test 4: Verify indexes
-- =====================================================
SELECT 
    'TEST 4: Indexes' as test_name,
    CASE 
        WHEN COUNT(*) >= 2 THEN '✅ PASS'
        ELSE '❌ FAIL - Found ' || COUNT(*) || ' indexes'
    END as result
FROM pg_indexes
WHERE tablename = 'inventory'
AND indexname IN ('idx_inventory_branch', 'idx_inventory_warehouse');

-- Test 5: Try to call the function
-- =====================================================
DO $$
DECLARE
    test_org UUID;
    test_prod UUID;
    test_branch UUID;
    result inventory;
BEGIN
    SELECT id INTO test_org FROM organizations LIMIT 1;
    SELECT id INTO test_prod FROM products LIMIT 1;
    SELECT id INTO test_branch FROM branches LIMIT 1;
    
    IF test_org IS NOT NULL AND test_prod IS NOT NULL AND test_branch IS NOT NULL THEN
        -- Try INSERT
        SELECT * INTO result FROM upsert_inventory_safe(
            test_org,
            test_prod,
            123,
            test_branch,
            NULL,
            NULL
        );
        
        RAISE NOTICE 'TEST 5: Function Call - ✅ PASS (inserted qty=%)', result.quantity;
        
        -- Try UPDATE
        SELECT * INTO result FROM upsert_inventory_safe(
            test_org,
            test_prod,
            456,
            test_branch,
            NULL,
            NULL
        );
        
        RAISE NOTICE 'TEST 5: Function Call - ✅ PASS (updated qty=%)', result.quantity;
        
        -- Cleanup
        DELETE FROM inventory WHERE id = result.id;
    ELSE
        RAISE NOTICE 'TEST 5: Function Call - ⚠️ SKIP (no test data)';
    END IF;
END $$;

-- Summary
-- =====================================================
SELECT 
    '=======================================' as summary
UNION ALL
SELECT 'MIGRATION TEST COMPLETE'
UNION ALL
SELECT '======================================='
UNION ALL
SELECT 'If all tests show ✅ PASS, you are ready!'
UNION ALL
SELECT 'Next: Hard refresh browser (Ctrl+Shift+R)'
UNION ALL
SELECT '=======================================';
