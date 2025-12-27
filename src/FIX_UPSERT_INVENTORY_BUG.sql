-- =====================================================
-- FIX: upsert_inventory trigger REPLACES stock instead of ADDING
-- =====================================================
-- 
-- THE BUG:
-- The upsert_inventory() trigger intercepts INSERTs and converts them to UPDATEs
-- But it does: SET quantity = NEW.quantity (REPLACES stock)
-- Instead of: SET quantity = quantity + NEW.quantity (ADDS stock)
--
-- This breaks the complete_transfer() trigger which tries to use ON CONFLICT
-- to ADD stock, but upsert_inventory() intercepts it and REPLACES instead!
--
-- THE FIX:
-- Drop the upsert_inventory trigger - we don't need it!
-- The complete_transfer() trigger already uses ON CONFLICT properly
-- =====================================================

-- Drop the problematic trigger
DROP TRIGGER IF EXISTS handle_inventory_upsert ON inventory;

-- Drop the function
DROP FUNCTION IF EXISTS upsert_inventory();

-- That's it! The complete_transfer() trigger already handles everything correctly
-- with its INSERT ... ON CONFLICT DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity

-- Verify the fix
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ UPSERT_INVENTORY TRIGGER REMOVED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'The upsert_inventory() trigger was REPLACING stock instead of ADDING.';
  RAISE NOTICE 'complete_transfer() already handles upserts correctly with ON CONFLICT.';
  RAISE NOTICE '';
  RAISE NOTICE 'Next test:';
  RAISE NOTICE '  1. Create a transfer from warehouse to branch';
  RAISE NOTICE '  2. Note current branch stock (e.g., 100 units)';
  RAISE NOTICE '  3. Complete the transfer (e.g., +50 units)';
  RAISE NOTICE '  4. Check branch stock = 100 + 50 = 150 units ✅';
  RAISE NOTICE '';
END $$;
