-- =====================================================
-- DIAGNOSE TRANSFER TRIGGERS
-- Check what triggers exist on the transfers table
-- =====================================================

-- 1. Show all triggers on the transfers table
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'transfers'
ORDER BY trigger_name;

-- 2. Show the complete_transfer function definition
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'complete_transfer';

-- 3. Count how many times the function exists
SELECT COUNT(*) as function_count
FROM pg_proc
WHERE proname = 'complete_transfer';

-- 4. Show all functions that might be related to transfers
SELECT 
  proname as function_name,
  pronargs as num_arguments,
  prorettype::regtype as return_type
FROM pg_proc
WHERE proname ILIKE '%transfer%'
ORDER BY proname;
