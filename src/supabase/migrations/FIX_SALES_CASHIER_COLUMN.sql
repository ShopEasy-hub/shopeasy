-- =====================================================
-- FIX SALES CASHIER TRACKING
-- =====================================================
-- This migration ensures both cashier_id and processed_by
-- exist in the sales table and migrates data between them
-- =====================================================

DO $$
DECLARE
    v_cashier_id_exists BOOLEAN;
    v_processed_by_exists BOOLEAN;
    v_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔧 FIXING SALES CASHIER TRACKING';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    -- Check if columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'cashier_id'
    ) INTO v_cashier_id_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'processed_by'
    ) INTO v_processed_by_exists;
    
    RAISE NOTICE 'cashier_id exists: %', v_cashier_id_exists;
    RAISE NOTICE 'processed_by exists: %', v_processed_by_exists;
    RAISE NOTICE '';
    
    -- Add processed_by if it doesn't exist
    IF NOT v_processed_by_exists THEN
        RAISE NOTICE '❌ processed_by column is MISSING';
        RAISE NOTICE '🔧 Adding processed_by column...';
        
        ALTER TABLE sales 
        ADD COLUMN processed_by UUID REFERENCES auth.users(id);
        
        CREATE INDEX IF NOT EXISTS idx_sales_processed_by ON sales(processed_by);
        
        RAISE NOTICE '✅ processed_by column added successfully!';
    ELSE
        RAISE NOTICE '✅ processed_by column already exists';
    END IF;
    
    -- Add cashier_id if it doesn't exist
    IF NOT v_cashier_id_exists THEN
        RAISE NOTICE '❌ cashier_id column is MISSING';
        RAISE NOTICE '🔧 Adding cashier_id column...';
        
        ALTER TABLE sales 
        ADD COLUMN cashier_id UUID REFERENCES auth.users(id);
        
        CREATE INDEX IF NOT EXISTS idx_sales_cashier_id ON sales(cashier_id);
        
        RAISE NOTICE '✅ cashier_id column added successfully!';
    ELSE
        RAISE NOTICE '✅ cashier_id column already exists';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Migrating data...';
    
    -- Copy processed_by to cashier_id where cashier_id is null
    UPDATE sales 
    SET cashier_id = processed_by 
    WHERE cashier_id IS NULL AND processed_by IS NOT NULL;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ Copied % rows from processed_by to cashier_id', v_count;
    
    -- Copy cashier_id to processed_by where processed_by is null
    UPDATE sales 
    SET processed_by = cashier_id 
    WHERE processed_by IS NULL AND cashier_id IS NOT NULL;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ Copied % rows from cashier_id to processed_by', v_count;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ MIGRATION COMPLETE';
    RAISE NOTICE '========================================';
END $$;

-- Verify both columns exist
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'sales' AND column_name = 'cashier_id'
        ) THEN '✅ cashier_id exists'
        ELSE '❌ cashier_id missing'
    END as cashier_id_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'sales' AND column_name = 'processed_by'
        ) THEN '✅ processed_by exists'
        ELSE '❌ processed_by missing'
    END as processed_by_status;
