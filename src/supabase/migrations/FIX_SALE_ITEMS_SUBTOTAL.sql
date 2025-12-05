-- =====================================================
-- FIX: Add missing 'subtotal' column to sale_items table
-- =====================================================
-- Error: Could not find the 'subtotal' column of 'sale_items' in the schema cache
-- =====================================================

-- Check if column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'sale_items' 
        AND column_name = 'subtotal'
    ) THEN
        RAISE NOTICE '❌ Column subtotal does NOT exist in sale_items table';
        RAISE NOTICE '🔧 Adding column now...';
        
        -- Add the column
        ALTER TABLE sale_items 
        ADD COLUMN subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0;
        
        RAISE NOTICE '✅ Column subtotal added successfully!';
        
        -- Update existing records to calculate subtotal
        UPDATE sale_items 
        SET subtotal = (price * quantity * (1 - COALESCE(discount, 0) / 100))
        WHERE subtotal = 0;
        
        RAISE NOTICE '✅ Existing records updated with calculated subtotal';
        
        -- Add index for performance
        CREATE INDEX IF NOT EXISTS idx_sale_items_subtotal ON sale_items(subtotal);
        
        RAISE NOTICE '✅ Index created on subtotal column';
    ELSE
        RAISE NOTICE '✅ Column subtotal already exists';
    END IF;
END $$;

-- Verify the column exists now
DO $$
DECLARE
    v_column_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'sale_items' 
        AND column_name = 'subtotal'
    ) INTO v_column_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICATION';
    RAISE NOTICE '========================================';
    
    IF v_column_exists THEN
        RAISE NOTICE '✅ subtotal column EXISTS in sale_items table';
        RAISE NOTICE '';
        RAISE NOTICE '👉 NEXT STEPS:';
        RAISE NOTICE '1. Hard refresh browser: Ctrl + Shift + R';
        RAISE NOTICE '2. Try POS sale again';
        RAISE NOTICE '3. Check if receipt appears';
        RAISE NOTICE '';
        RAISE NOTICE '✅ FIX COMPLETE!';
    ELSE
        RAISE NOTICE '❌ Column still missing - something went wrong';
        RAISE NOTICE '';
        RAISE NOTICE '👉 Try manual fix or contact support';
    END IF;
    
    RAISE NOTICE '========================================';
END $$;

-- Show current sale_items table schema for verification
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'sale_items'
ORDER BY ordinal_position;
