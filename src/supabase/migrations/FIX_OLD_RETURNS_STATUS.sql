-- =====================================================
-- Fix old returns that are stuck in 'pending' status
-- =====================================================
-- Since all returns immediately restore stock when processed,
-- they should be marked as 'completed' not 'pending'

-- Update all existing returns to 'completed' status
UPDATE returns 
SET status = 'completed'
WHERE status = 'pending';

-- Log the changes
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % returns from pending to completed', updated_count;
END $$;
