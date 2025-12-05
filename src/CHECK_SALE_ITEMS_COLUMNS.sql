-- =====================================================
-- CHECK ALL REQUIRED COLUMNS IN SALE_ITEMS TABLE
-- =====================================================

DO $$
DECLARE
    missing_columns TEXT[] := '{}';
    v_exists BOOLEAN;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CHECKING SALE_ITEMS TABLE COLUMNS';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    -- Check: sale_id
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sale_items' AND column_name = 'sale_id') INTO v_exists;
    IF NOT v_exists THEN missing_columns := array_append(missing_columns, 'sale_id'); END IF;
    RAISE NOTICE 'sale_id: %', CASE WHEN v_exists THEN '✅' ELSE '❌ MISSING' END;
    
    -- Check: product_id
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sale_items' AND column_name = 'product_id') INTO v_exists;
    IF NOT v_exists THEN missing_columns := array_append(missing_columns, 'product_id'); END IF;
    RAISE NOTICE 'product_id: %', CASE WHEN v_exists THEN '✅' ELSE '❌ MISSING' END;
    
    -- Check: quantity
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sale_items' AND column_name = 'quantity') INTO v_exists;
    IF NOT v_exists THEN missing_columns := array_append(missing_columns, 'quantity'); END IF;
    RAISE NOTICE 'quantity: %', CASE WHEN v_exists THEN '✅' ELSE '❌ MISSING' END;
    
    -- Check: price
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sale_items' AND column_name = 'price') INTO v_exists;
    IF NOT v_exists THEN missing_columns := array_append(missing_columns, 'price'); END IF;
    RAISE NOTICE 'price: %', CASE WHEN v_exists THEN '✅' ELSE '❌ MISSING' END;
    
    -- Check: discount
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sale_items' AND column_name = 'discount') INTO v_exists;
    IF NOT v_exists THEN missing_columns := array_append(missing_columns, 'discount'); END IF;
    RAISE NOTICE 'discount: %', CASE WHEN v_exists THEN '✅' ELSE '❌ MISSING' END;
    
    -- Check: subtotal (THE ONE THAT'S MISSING NOW!)
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sale_items' AND column_name = 'subtotal') INTO v_exists;
    IF NOT v_exists THEN missing_columns := array_append(missing_columns, 'subtotal'); END IF;
    RAISE NOTICE 'subtotal: %', CASE WHEN v_exists THEN '✅' ELSE '❌ MISSING' END;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SUMMARY';
    RAISE NOTICE '========================================';
    
    IF array_length(missing_columns, 1) IS NULL THEN
        RAISE NOTICE '✅ ALL COLUMNS EXIST!';
        RAISE NOTICE '';
        RAISE NOTICE '👉 If POS still fails, check for other issues.';
    ELSE
        RAISE NOTICE '❌ MISSING COLUMNS: %', array_to_string(missing_columns, ', ');
        RAISE NOTICE '';
        RAISE NOTICE '🔧 FIX: Run FIX_SALE_ITEMS_SUBTOTAL.sql';
    END IF;
    
    RAISE NOTICE '========================================';
END $$;

-- Show all current columns in sale_items table
SELECT 
    '-- Current Sale Items Table Schema --' as info;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'sale_items'
ORDER BY ordinal_position;
