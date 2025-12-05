-- =====================================================
-- FIX ALL MISSING COLUMNS FOR POS SALES
-- =====================================================
-- This script adds ALL missing columns in both tables:
-- 1. sales.processed_by
-- 2. sale_items.subtotal
-- =====================================================

DO $$
DECLARE
    v_sales_processed_by_exists BOOLEAN;
    v_sale_items_subtotal_exists BOOLEAN;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔧 FIXING ALL MISSING COLUMNS';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    -- =====================================================
    -- FIX 1: sales.processed_by
    -- =====================================================
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'processed_by'
    ) INTO v_sales_processed_by_exists;
    
    IF NOT v_sales_processed_by_exists THEN
        RAISE NOTICE '❌ sales.processed_by is MISSING';
        RAISE NOTICE '🔧 Adding sales.processed_by...';
        
        ALTER TABLE sales 
        ADD COLUMN processed_by UUID REFERENCES auth.users(id);
        
        CREATE INDEX IF NOT EXISTS idx_sales_processed_by ON sales(processed_by);
        
        RAISE NOTICE '✅ sales.processed_by added successfully!';
    ELSE
        RAISE NOTICE '✅ sales.processed_by already exists';
    END IF;
    
    RAISE NOTICE '';
    
    -- =====================================================
    -- FIX 2: sale_items.subtotal
    -- =====================================================
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sale_items' AND column_name = 'subtotal'
    ) INTO v_sale_items_subtotal_exists;
    
    IF NOT v_sale_items_subtotal_exists THEN
        RAISE NOTICE '❌ sale_items.subtotal is MISSING';
        RAISE NOTICE '🔧 Adding sale_items.subtotal...';
        
        ALTER TABLE sale_items 
        ADD COLUMN subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0;
        
        -- Update existing records
        UPDATE sale_items 
        SET subtotal = (price * quantity * (1 - COALESCE(discount, 0) / 100))
        WHERE subtotal = 0;
        
        CREATE INDEX IF NOT EXISTS idx_sale_items_subtotal ON sale_items(subtotal);
        
        RAISE NOTICE '✅ sale_items.subtotal added successfully!';
        RAISE NOTICE '✅ Existing records updated';
    ELSE
        RAISE NOTICE '✅ sale_items.subtotal already exists';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅✅✅ ALL FIXES COMPLETE! ✅✅✅';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '👉 NEXT STEPS:';
    RAISE NOTICE '1. Hard refresh browser: Ctrl + Shift + R';
    RAISE NOTICE '2. Try POS sale again';
    RAISE NOTICE '3. Receipt should appear!';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;

-- Verify both columns exist
DO $$
DECLARE
    v_sales_ok BOOLEAN;
    v_sale_items_ok BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'processed_by'
    ) INTO v_sales_ok;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sale_items' AND column_name = 'subtotal'
    ) INTO v_sale_items_ok;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FINAL VERIFICATION';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'sales.processed_by: %', CASE WHEN v_sales_ok THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE 'sale_items.subtotal: %', CASE WHEN v_sale_items_ok THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE '';
    
    IF v_sales_ok AND v_sale_items_ok THEN
        RAISE NOTICE '🎉 SUCCESS! All columns are ready!';
        RAISE NOTICE '';
        RAISE NOTICE '🚀 POS should work now!';
    ELSE
        RAISE NOTICE '⚠️  Some columns still missing';
        RAISE NOTICE '   Try running this script again';
    END IF;
    
    RAISE NOTICE '========================================';
END $$;
