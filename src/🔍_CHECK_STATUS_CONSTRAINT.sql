-- =====================================================
-- 🔍 CHECK IF THE STATUS CONSTRAINT WAS UPDATED
-- =====================================================
-- Run this in Supabase SQL Editor to check if in_transit is allowed

-- Check current constraint
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'transfers'::regclass 
    AND conname LIKE '%status%';

-- =====================================================
-- Expected output should show:
-- CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'in_transit'::text, 'rejected'::text, 'completed'::text])))
--
-- If you see this without 'in_transit'::text, then run the fix below:
-- CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'completed'::text])))
-- =====================================================

-- If in_transit is MISSING, run this FIX:
ALTER TABLE transfers 
DROP CONSTRAINT IF EXISTS transfers_status_check;

ALTER TABLE transfers 
ADD CONSTRAINT transfers_status_check 
CHECK (status IN ('pending', 'approved', 'in_transit', 'rejected', 'completed'));

-- Verify it worked
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'transfers'::regclass 
    AND conname LIKE '%status%';
