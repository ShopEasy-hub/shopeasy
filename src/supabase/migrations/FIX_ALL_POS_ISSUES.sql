-- =====================================================
-- ULTIMATE FIX: ALL POS SALE ISSUES
-- =====================================================
-- Fixes 3 issues:
-- 1. sales.processed_by - Missing column
-- 2. sale_items.subtotal - Missing column
-- 3. sale_items.name - Not nullable causing errors
-- =====================================================

DO $$
DECLARE
    v_column_exists BOOLEAN;
    v_is_nullable BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════╗';
    RAISE NOTICE '║   ULTIMATE POS FIX - STARTING...      ║';
    RAISE NOTICE '╚════════════════════════════════════════╝';
    RAISE NOTICE '';
    
    -- =====================================================
    -- FIX 1: sales.processed_by
    -- =====================================================
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '1️⃣  Checking sales.processed_by';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'processed_by'
    ) INTO v_column_exists;
    
    IF NOT v_column_exists THEN
        RAISE NOTICE '❌ sales.processed_by is MISSING';
        RAISE NOTICE '🔧 Adding column...';
        
        ALTER TABLE sales 
        ADD COLUMN processed_by UUID REFERENCES auth.users(id);
        
        CREATE INDEX IF NOT EXISTS idx_sales_processed_by ON sales(processed_by);
        
        RAISE NOTICE '✅ sales.processed_by ADDED';
    ELSE
        RAISE NOTICE '✅ sales.processed_by EXISTS';
    END IF;
    
    RAISE NOTICE '';
    
    -- =====================================================
    -- FIX 2: sale_items.subtotal
    -- =====================================================
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '2️⃣  Checking sale_items.subtotal';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sale_items' AND column_name = 'subtotal'
    ) INTO v_column_exists;
    
    IF NOT v_column_exists THEN
        RAISE NOTICE '❌ sale_items.subtotal is MISSING';
        RAISE NOTICE '🔧 Adding column...';
        
        ALTER TABLE sale_items 
        ADD COLUMN subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0;
        
        -- Update existing records
        UPDATE sale_items 
        SET subtotal = (price * quantity * (1 - COALESCE(discount, 0) / 100))
        WHERE subtotal = 0;
        
        CREATE INDEX IF NOT EXISTS idx_sale_items_subtotal ON sale_items(subtotal);
        
        RAISE NOTICE '✅ sale_items.subtotal ADDED';
    ELSE
        RAISE NOTICE '✅ sale_items.subtotal EXISTS';
    END IF;
    
    RAISE NOTICE '';
    
    -- =====================================================
    -- FIX 3: sale_items.name - Make nullable
    -- =====================================================
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '3️⃣  Checking sale_items.name';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sale_items' AND column_name = 'name'
    ) INTO v_column_exists;
    
    IF NOT v_column_exists THEN
        RAISE NOTICE '❌ sale_items.name is MISSING';
        RAISE NOTICE '🔧 Adding column as nullable...';
        
        ALTER TABLE sale_items 
        ADD COLUMN name VARCHAR(255);
        
        RAISE NOTICE '✅ sale_items.name ADDED (nullable)';
    ELSE
        RAISE NOTICE '✅ sale_items.name EXISTS';
        
        -- Check if it's nullable
        SELECT is_nullable = 'YES' INTO v_is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'sale_items' AND column_name = 'name';
        
        IF NOT v_is_nullable THEN
            RAISE NOTICE '⚠️  Column is NOT NULL (causing errors)';
            RAISE NOTICE '🔧 Making it nullable...';
            
            ALTER TABLE sale_items 
            ALTER COLUMN name DROP NOT NULL;
            
            RAISE NOTICE '✅ sale_items.name is now NULLABLE';
        ELSE
            RAISE NOTICE '✅ sale_items.name is already nullable';
        END IF;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════╗';
    RAISE NOTICE '║   ✅✅✅ ALL FIXES COMPLETE! ✅✅✅    ║';
    RAISE NOTICE '╚════════════════════════════════════════╝';
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
DECLARE
    v_sales_processed_by BOOLEAN;
    v_sale_items_subtotal BOOLEAN;
    v_sale_items_name BOOLEAN;
    v_name_nullable BOOLEAN;
    v_all_good BOOLEAN := TRUE;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '🔍 FINAL VERIFICATION';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';
    
    -- Check sales.processed_by
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'processed_by'
    ) INTO v_sales_processed_by;
    
    RAISE NOTICE '1. sales.processed_by: %', 
        CASE WHEN v_sales_processed_by THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    IF NOT v_sales_processed_by THEN v_all_good := FALSE; END IF;
    
    -- Check sale_items.subtotal
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sale_items' AND column_name = 'subtotal'
    ) INTO v_sale_items_subtotal;
    
    RAISE NOTICE '2. sale_items.subtotal: %', 
        CASE WHEN v_sale_items_subtotal THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    IF NOT v_sale_items_subtotal THEN v_all_good := FALSE; END IF;
    
    -- Check sale_items.name
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sale_items' AND column_name = 'name'
    ) INTO v_sale_items_name;
    
    IF NOT v_sale_items_name THEN
        RAISE NOTICE '3. sale_items.name: ❌ MISSING';
        v_all_good := FALSE;
    ELSE
        -- Check if nullable
        SELECT is_nullable = 'YES' INTO v_name_nullable
        FROM information_schema.columns 
        WHERE table_name = 'sale_items' AND column_name = 'name';
        
        RAISE NOTICE '3. sale_items.name: ✅ EXISTS (%)', 
            CASE WHEN v_name_nullable THEN 'nullable ✓' ELSE 'NOT NULL ⚠️' END;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    
    IF v_all_good THEN
        RAISE NOTICE '🎉 SUCCESS! Database is ready for POS!';
        RAISE NOTICE '';
        RAISE NOTICE '👉 NEXT STEPS:';
        RAISE NOTICE '   1. Hard refresh browser: Ctrl + Shift + R';
        RAISE NOTICE '   2. Try POS sale';
        RAISE NOTICE '   3. Receipt should appear!';
    ELSE
        RAISE NOTICE '⚠️  Some issues remain - run this script again';
    END IF;
    
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';
END $$;

-- Show final schema
SELECT '📋 sale_items table schema:' as info;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'sale_items'
ORDER BY ordinal_position;
