-- =====================================================
-- ADD IN_TRANSIT STATUS TO TRANSFERS
-- =====================================================
-- This adds the 'in_transit' status to the transfers table
-- and fixes the workflow so transfers can be properly completed
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════╗';
    RAISE NOTICE '║   FIXING TRANSFER STATUS WORKFLOW     ║';
    RAISE NOTICE '╚════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '📦 Adding in_transit status to transfers...';
END $$;

-- Drop the existing check constraint
ALTER TABLE transfers 
DROP CONSTRAINT IF EXISTS transfers_status_check;

-- Add the new constraint with in_transit included
ALTER TABLE transfers 
ADD CONSTRAINT transfers_status_check 
CHECK (status IN ('pending', 'approved', 'in_transit', 'rejected', 'completed'));

DO $$
BEGIN
    RAISE NOTICE '✅ Status constraint updated successfully';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Allowed statuses:';
    RAISE NOTICE '   • pending      - Initial state';
    RAISE NOTICE '   • approved     - Approved, stock deducted from source';
    RAISE NOTICE '   • in_transit   - Being transported';
    RAISE NOTICE '   • completed    - Received, stock added to destination';
    RAISE NOTICE '   • rejected     - Transfer cancelled';
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════╗';
    RAISE NOTICE '║   ✅ TRANSFER STATUS FIX COMPLETE!    ║';
    RAISE NOTICE '╚════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '👉 NEXT STEPS:';
    RAISE NOTICE '   1. The code will now be updated';
    RAISE NOTICE '   2. Hard refresh browser: Ctrl + Shift + R';
    RAISE NOTICE '   3. Transfers will now complete properly!';
    RAISE NOTICE '';
END $$;
