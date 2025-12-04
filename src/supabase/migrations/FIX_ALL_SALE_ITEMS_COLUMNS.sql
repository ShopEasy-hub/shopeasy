-- =====================================================
-- COMPLETE FIX: All sale_items required columns
-- =====================================================
-- Makes all potentially missing columns nullable
-- to prevent NOT NULL constraint violations
-- =====================================================

DO $$
DECLARE
    v_column_exists BOOLEAN;
    v_is_nullable BOOLEAN;
    v_columns_fixed INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════╗';
    RAISE NOTICE '║   FIXING sale_items TABLE SCHEMA      ║';
    RAISE NOTICE '╚════════════════════════════════════════╝';
    RAISE NOTICE '';
    
    -- =====================================================
    -- Check and fix: name column
    -- =====================================================
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sale_items' AND column_name = 'name'
    ) INTO v_column_exists;
    
    IF NOT v_column_exists THEN
        RAISE NOTICE '1. name: ❌ MISSING - Adding column...';
        ALTER TABLE sale_items ADD COLUMN name VARCHAR(255);
        v_columns_fixed := v_columns_fixed + 1;
    ELSE
        SELECT is_nullable = 'YES' INTO v_is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'sale_items' AND column_name = 'name';
        
        IF NOT v_is_nullable THEN
            RAISE NOTICE '1. name: ⚠️  NOT NULL - Making nullable...';
            ALTER TABLE sale_items ALTER COLUMN name DROP NOT NULL;
            v_columns_fixed := v_columns_fixed + 1;
        ELSE
            RAISE NOTICE '1. name: ✅ OK (nullable)';
        END IF;
    END IF;
    
    -- =====================================================
    -- Check and fix: sku column
    -- =====================================================
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sale_items' AND column_name = 'sku'
    ) INTO v_column_exists;
    
    IF NOT v_column_exists THEN
        RAISE NOTICE '2. sku: ❌ MISSING - Adding column...';
        ALTER TABLE sale_items ADD COLUMN sku VARCHAR(100);
        v_columns_fixed := v_columns_fixed + 1;
    ELSE
        SELECT is_nullable = 'YES' INTO v_is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'sale_items' AND column_name = 'sku';
        
        IF NOT v_is_nullable THEN
            RAISE NOTICE '2. sku: ⚠️  NOT NULL - Making nullable...';
            ALTER TABLE sale_items ALTER COLUMN sku DROP NOT NULL;
            v_columns_fixed := v_columns_fixed + 1;
        ELSE
            RAISE NOTICE '2. sku: ✅ OK (nullable)';
        END IF;
    END IF;
    
    -- =====================================================
    -- Check and fix: subtotal column
    -- =====================================================
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sale_items' AND column_name = 'subtotal'
    ) INTO v_column_exists;
    
    IF NOT v_column_exists THEN
        RAISE NOTICE '3. subtotal: ❌ MISSING - Adding column...';
        ALTER TABLE sale_items ADD COLUMN subtotal DECIMAL(10, 2) DEFAULT 0;
        
        -- Update existing records
        UPDATE sale_items 
        SET subtotal = (price * quantity * (1 - COALESCE(discount, 0) / 100))
        WHERE subtotal = 0 OR subtotal IS NULL;
        
        v_columns_fixed := v_columns_fixed + 1;
    ELSE
        RAISE NOTICE '3. subtotal: ✅ OK (exists)';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE 'Columns fixed: %', v_columns_fixed;
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';
END $$;

-- =====================================================
-- Also fix sales.processed_by if missing
-- =====================================================
DO $$
DECLARE
    v_column_exists BOOLEAN;
BEGIN
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE 'CHECKING sales.processed_by';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'processed_by'
    ) INTO v_column_exists;
    
    IF NOT v_column_exists THEN
        RAISE NOTICE 'processed_by: ❌ MISSING - Adding...';
        ALTER TABLE sales ADD COLUMN processed_by UUID REFERENCES auth.users(id);
        CREATE INDEX IF NOT EXISTS idx_sales_processed_by ON sales(processed_by);
        RAISE NOTICE 'processed_by: ✅ ADDED';
    ELSE
        RAISE NOTICE 'processed_by: ✅ OK';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================
DO $$
DECLARE
    v_all_good BOOLEAN := TRUE;
    v_name_ok BOOLEAN;
    v_sku_ok BOOLEAN;
    v_subtotal_ok BOOLEAN;
    v_processed_by_ok BOOLEAN;
    v_name_nullable BOOLEAN;
    v_sku_nullable BOOLEAN;
BEGIN
    RAISE NOTICE '╔════════════════════════════════════════╗';
    RAISE NOTICE '║       FINAL VERIFICATION              ║';
    RAISE NOTICE '╚════════════════════════════════════════╝';
    RAISE NOTICE '';
    
    -- Check sale_items columns
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sale_items' AND column_name = 'name') INTO v_name_ok;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sale_items' AND column_name = 'sku') INTO v_sku_ok;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sale_items' AND column_name = 'subtotal') INTO v_subtotal_ok;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'processed_by') INTO v_processed_by_ok;
    
    -- Check if nullable
    IF v_name_ok THEN
        SELECT is_nullable = 'YES' INTO v_name_nullable FROM information_schema.columns WHERE table_name = 'sale_items' AND column_name = 'name';
    END IF;
    
    IF v_sku_ok THEN
        SELECT is_nullable = 'YES' INTO v_sku_nullable FROM information_schema.columns WHERE table_name = 'sale_items' AND column_name = 'sku';
    END IF;
    
    RAISE NOTICE 'sale_items.name: % %', 
        CASE WHEN v_name_ok THEN '✅' ELSE '❌' END,
        CASE WHEN v_name_ok AND v_name_nullable THEN '(nullable)' WHEN v_name_ok THEN '(NOT NULL ⚠️)' ELSE '' END;
        
    RAISE NOTICE 'sale_items.sku: % %',
        CASE WHEN v_sku_ok THEN '✅' ELSE '❌' END,
        CASE WHEN v_sku_ok AND v_sku_nullable THEN '(nullable)' WHEN v_sku_ok THEN '(NOT NULL ⚠️)' ELSE '' END;
        
    RAISE NOTICE 'sale_items.subtotal: %',
        CASE WHEN v_subtotal_ok THEN '✅' ELSE '❌' END;
        
    RAISE NOTICE 'sales.processed_by: %',
        CASE WHEN v_processed_by_ok THEN '✅' ELSE '❌' END;
    
    RAISE NOTICE '';
    
    IF v_name_ok AND v_sku_ok AND v_subtotal_ok AND v_processed_by_ok AND v_name_nullable AND v_sku_nullable THEN
        RAISE NOTICE '╔════════════════════════════════════════╗';
        RAISE NOTICE '║   🎉 ALL COLUMNS READY FOR POS! 🎉   ║';
        RAISE NOTICE '╚════════════════════════════════════════╝';
        RAISE NOTICE '';
        RAISE NOTICE '👉 NEXT STEPS:';
        RAISE NOTICE '   1. Hard refresh: Ctrl + Shift + R';
        RAISE NOTICE '   2. Try POS sale';
        RAISE NOTICE '   3. Success! ✅';
    ELSE
        RAISE NOTICE '⚠️  Some columns still have issues';
        RAISE NOTICE '   Run this script again or contact support';
        v_all_good := FALSE;
    END IF;
    
    RAISE NOTICE '';
END $$;

-- Show final schema
SELECT '📋 Final sale_items schema:' as info;

SELECT 
    column_name,
    data_type,
    is_nullable,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'sale_items'
ORDER BY ordinal_position;
