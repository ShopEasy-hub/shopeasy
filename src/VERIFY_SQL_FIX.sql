-- =====================================================
-- VERIFICATION SCRIPT
-- Run this AFTER applying FIX_INVENTORY_CONSTRAINT.sql
-- =====================================================

-- Test 1: Check if function exists
SELECT 
  routine_name, 
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name = 'upsert_inventory_safe';
-- Expected: 1 row with routine_name = 'upsert_inventory_safe'

-- Test 2: Check unique constraint
SELECT 
  conname, 
  pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'inventory'::regclass 
AND contype = 'u';
-- Expected: Shows 'NULLS NOT DISTINCT'

-- Test 3: Check RLS policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'inventory';
-- Expected: 4 policies (SELECT, INSERT, UPDATE, DELETE)

-- Test 4: Check indexes
SELECT 
  indexname, 
  indexdef
FROM pg_indexes 
WHERE tablename = 'inventory';
-- Expected: idx_inventory_branch_stock and idx_inventory_warehouse_stock

-- =====================================================
-- If all tests pass, try a manual inventory insert:
-- =====================================================

-- Get your organization ID and product ID first:
-- SELECT id, name FROM organizations LIMIT 1;
-- SELECT id, name FROM products LIMIT 1;
-- SELECT id, name FROM branches LIMIT 1;

-- Then test the function (replace UUIDs with your actual IDs):
-- SELECT * FROM upsert_inventory_safe(
--   'your-org-id-here'::uuid,
--   'your-product-id-here'::uuid,
--   100, -- quantity
--   'your-branch-id-here'::uuid, -- branch_id
--   NULL, -- warehouse_id
--   NULL -- updated_by
-- );

-- This should either insert or update the inventory
-- Check result:
-- SELECT * FROM inventory WHERE product_id = 'your-product-id-here';
