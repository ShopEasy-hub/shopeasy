-- =====================================================
-- URGENT FIX: Add Missing unique_stock_per_location Constraint
-- Run this directly in Supabase SQL Editor
-- =====================================================

-- Step 1: Check if constraint exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_stock_per_location' 
      AND conrelid = 'inventory'::regclass
  ) THEN
    RAISE NOTICE '✅ Constraint already exists, dropping it first...';
    ALTER TABLE inventory DROP CONSTRAINT unique_stock_per_location;
  ELSE
    RAISE NOTICE '⚠️ Constraint does not exist, will create it...';
  END IF;
END $$;

-- Step 2: Drop any other conflicting unique constraints
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'inventory_product_branch_warehouse_uniq' 
      AND conrelid = 'inventory'::regclass
  ) THEN
    ALTER TABLE inventory DROP CONSTRAINT inventory_product_branch_warehouse_uniq;
    RAISE NOTICE '✅ Dropped inventory_product_branch_warehouse_uniq';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'inventory_organization_id_product_id_branch_id_warehouse_id' 
      AND conrelid = 'inventory'::regclass
  ) THEN
    ALTER TABLE inventory DROP CONSTRAINT inventory_organization_id_product_id_branch_id_warehouse_id;
    RAISE NOTICE '✅ Dropped organization constraint';
  END IF;
END $$;

-- Step 3: Add the CORRECT constraint with NULLS NOT DISTINCT
-- This is CRITICAL for preventing duplicate inventory records
ALTER TABLE inventory 
  ADD CONSTRAINT unique_stock_per_location 
  UNIQUE NULLS NOT DISTINCT (product_id, branch_id, warehouse_id);

-- Step 4: Verify the constraint was added
DO $$
DECLARE
  constraint_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO constraint_count
  FROM pg_constraint 
  WHERE conname = 'unique_stock_per_location' 
    AND conrelid = 'inventory'::regclass;
  
  IF constraint_count = 1 THEN
    RAISE NOTICE '✅ SUCCESS! Constraint unique_stock_per_location is now active';
  ELSE
    RAISE EXCEPTION '❌ FAILED! Constraint was not created properly';
  END IF;
END $$;

-- Step 5: Show all current constraints on inventory table
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'inventory'::regclass
ORDER BY conname;
