-- =====================================================
-- FIX: Add missing 'processed_by' column to sales table
-- =====================================================
-- Error: Could not find the 'processed_by' column of 'sales' in the schema cache
-- =====================================================

-- Check if column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'sales' 
        AND column_name = 'processed_by'
    ) THEN
        RAISE NOTICE '❌ Column processed_by does NOT exist in sales table';
        RAISE NOTICE '🔧 Adding column now...';
        
        -- Add the column
        ALTER TABLE sales 
        ADD COLUMN processed_by UUID REFERENCES auth.users(id);
        
        RAISE NOTICE '✅ Column processed_by added successfully!';
        
        -- Add index for performance
        CREATE INDEX IF NOT EXISTS idx_sales_processed_by ON sales(processed_by);
        
        RAISE NOTICE '✅ Index created on processed_by column';
    ELSE
        RAISE NOTICE '✅ Column processed_by already exists';
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
        WHERE table_name = 'sales' 
        AND column_name = 'processed_by'
    ) INTO v_column_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICATION';
    RAISE NOTICE '========================================';
    
    IF v_column_exists THEN
        RAISE NOTICE '✅ processed_by column EXISTS in sales table';
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
        RAISE NOTICE '👉 Try manual fix (see FIX_SALES_COLUMN_MANUAL.md)';
    END IF;
    
    RAISE NOTICE '========================================';
END $$;

-- Show current sales table schema for verification
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'sales'
ORDER BY ordinal_position;
