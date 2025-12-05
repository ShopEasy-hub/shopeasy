-- =====================================================
-- CHECK ALL REQUIRED COLUMNS
-- =====================================================
-- This script checks if all columns required by the app exist
-- =====================================================

DO $$
DECLARE
    missing_columns TEXT[] := '{}';
    v_exists BOOLEAN;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CHECKING SALES TABLE COLUMNS';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    -- List of required columns
    -- Check: organization_id
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'organization_id') INTO v_exists;
    IF NOT v_exists THEN missing_columns := array_append(missing_columns, 'organization_id'); END IF;
    RAISE NOTICE 'organization_id: %', CASE WHEN v_exists THEN '✅' ELSE '❌ MISSING' END;
    
    -- Check: branch_id
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'branch_id') INTO v_exists;
    IF NOT v_exists THEN missing_columns := array_append(missing_columns, 'branch_id'); END IF;
    RAISE NOTICE 'branch_id: %', CASE WHEN v_exists THEN '✅' ELSE '❌ MISSING' END;
    
    -- Check: customer_name
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'customer_name') INTO v_exists;
    IF NOT v_exists THEN missing_columns := array_append(missing_columns, 'customer_name'); END IF;
    RAISE NOTICE 'customer_name: %', CASE WHEN v_exists THEN '✅' ELSE '❌ MISSING' END;
    
    -- Check: customer_phone
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'customer_phone') INTO v_exists;
    IF NOT v_exists THEN missing_columns := array_append(missing_columns, 'customer_phone'); END IF;
    RAISE NOTICE 'customer_phone: %', CASE WHEN v_exists THEN '✅' ELSE '❌ MISSING' END;
    
    -- Check: customer_birth_date
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'customer_birth_date') INTO v_exists;
    IF NOT v_exists THEN missing_columns := array_append(missing_columns, 'customer_birth_date'); END IF;
    RAISE NOTICE 'customer_birth_date: %', CASE WHEN v_exists THEN '✅' ELSE '❌ MISSING' END;
    
    -- Check: subtotal
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'subtotal') INTO v_exists;
    IF NOT v_exists THEN missing_columns := array_append(missing_columns, 'subtotal'); END IF;
    RAISE NOTICE 'subtotal: %', CASE WHEN v_exists THEN '✅' ELSE '❌ MISSING' END;
    
    -- Check: discount
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'discount') INTO v_exists;
    IF NOT v_exists THEN missing_columns := array_append(missing_columns, 'discount'); END IF;
    RAISE NOTICE 'discount: %', CASE WHEN v_exists THEN '✅' ELSE '❌ MISSING' END;
    
    -- Check: total
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'total') INTO v_exists;
    IF NOT v_exists THEN missing_columns := array_append(missing_columns, 'total'); END IF;
    RAISE NOTICE 'total: %', CASE WHEN v_exists THEN '✅' ELSE '❌ MISSING' END;
    
    -- Check: payment_method
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'payment_method') INTO v_exists;
    IF NOT v_exists THEN missing_columns := array_append(missing_columns, 'payment_method'); END IF;
    RAISE NOTICE 'payment_method: %', CASE WHEN v_exists THEN '✅' ELSE '❌ MISSING' END;
    
    -- Check: amount_paid
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'amount_paid') INTO v_exists;
    IF NOT v_exists THEN missing_columns := array_append(missing_columns, 'amount_paid'); END IF;
    RAISE NOTICE 'amount_paid: %', CASE WHEN v_exists THEN '✅' ELSE '❌ MISSING' END;
    
    -- Check: change
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'change') INTO v_exists;
    IF NOT v_exists THEN missing_columns := array_append(missing_columns, 'change'); END IF;
    RAISE NOTICE 'change: %', CASE WHEN v_exists THEN '✅' ELSE '❌ MISSING' END;
    
    -- Check: status
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'status') INTO v_exists;
    IF NOT v_exists THEN missing_columns := array_append(missing_columns, 'status'); END IF;
    RAISE NOTICE 'status: %', CASE WHEN v_exists THEN '✅' ELSE '❌ MISSING' END;
    
    -- Check: processed_by (THE ONE THAT'S MISSING!)
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'processed_by') INTO v_exists;
    IF NOT v_exists THEN missing_columns := array_append(missing_columns, 'processed_by'); END IF;
    RAISE NOTICE 'processed_by: %', CASE WHEN v_exists THEN '✅' ELSE '❌ MISSING' END;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SUMMARY';
    RAISE NOTICE '========================================';
    
    IF array_length(missing_columns, 1) IS NULL THEN
        RAISE NOTICE '✅ ALL COLUMNS EXIST!';
        RAISE NOTICE '';
        RAISE NOTICE '👉 If POS still fails, the issue is elsewhere.';
        RAISE NOTICE '   Check browser console for the actual error.';
    ELSE
        RAISE NOTICE '❌ MISSING COLUMNS: %', array_to_string(missing_columns, ', ');
        RAISE NOTICE '';
        RAISE NOTICE '🔧 FIX: Run FIX_SALES_PROCESSED_BY.sql';
        RAISE NOTICE '   This will add the missing column(s).';
    END IF;
    
    RAISE NOTICE '========================================';
END $$;

-- Show all current columns in sales table
SELECT 
    '-- Current Sales Table Schema --' as info;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'sales'
ORDER BY ordinal_position;
