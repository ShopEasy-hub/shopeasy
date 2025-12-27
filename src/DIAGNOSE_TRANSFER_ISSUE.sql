-- ==========================================
-- DIAGNOSE TRANSFER ISSUE
-- Run this to see what's happening
-- ==========================================

-- Check the most recent transfer
SELECT 
  t.id,
  t.status,
  t.from_warehouse_id,
  t.from_branch_id,
  t.to_warehouse_id,
  t.to_branch_id,
  t.created_at,
  t.completed_at
FROM transfers t
ORDER BY t.created_at DESC
LIMIT 5;

-- Check transfer items for the most recent transfer
SELECT 
  ti.id,
  ti.transfer_id,
  ti.product_id,
  p.name as product_name,
  ti.quantity,
  ti.unit_cost
FROM transfer_items ti
JOIN products p ON p.id = ti.product_id
WHERE ti.transfer_id IN (
  SELECT id FROM transfers ORDER BY created_at DESC LIMIT 5
)
ORDER BY ti.transfer_id, ti.created_at;

-- Check inventory for warehouses
SELECT 
  i.id,
  i.warehouse_id,
  w.name as warehouse_name,
  i.branch_id,
  i.product_id,
  p.name as product_name,
  i.quantity,
  i.updated_at
FROM inventory i
LEFT JOIN warehouses w ON w.id = i.warehouse_id
LEFT JOIN products p ON p.id = i.product_id
WHERE i.warehouse_id IS NOT NULL
ORDER BY i.updated_at DESC;

-- Check inventory for branches
SELECT 
  i.id,
  i.branch_id,
  b.name as branch_name,
  i.warehouse_id,
  i.product_id,
  p.name as product_name,
  i.quantity,
  i.updated_at
FROM inventory i
LEFT JOIN branches b ON b.id = i.branch_id
LEFT JOIN products p ON p.id = i.product_id
WHERE i.branch_id IS NOT NULL
ORDER BY i.updated_at DESC;

-- Check if trigger exists and is enabled
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  tgtype as type
FROM pg_trigger
WHERE tgname = 'process_transfer_completion';

RAISE NOTICE 'Diagnostic queries complete. Check the results above.';
