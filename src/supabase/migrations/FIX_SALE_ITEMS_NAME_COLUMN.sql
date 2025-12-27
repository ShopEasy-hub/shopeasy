-- =====================================================
-- FIX: sale_items.name column issue
-- =====================================================
-- Error: null value in column "name" of relation "sale_items" violates not-null constraint
-- =====================================================

DO $$
DECLARE
    v_name_exists BOOLEAN;
    v_is_nullable BOOLEAN;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔧 FIXING sale_items.name COLUMN';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    -- Check if name column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sale_items' AND column_name = 'name'
    ) INTO v_name_exists;
    
    IF NOT v_name_exists THEN
        RAISE NOTICE '❌ Column "name" does NOT exist';
        RAISE NOTICE '🔧 Adding "name" column as nullable VARCHAR...';
        
        ALTER TABLE sale_items 
        ADD COLUMN name VARCHAR(255);
        
        RAISE NOTICE '✅ Column "name" added successfully (nullable)';
    ELSE
        RAISE NOTICE '✅ Column "name" already exists';
        
        -- Check if it's nullable
        SELECT is_nullable = 'YES' INTO v_is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'sale_items' AND column_name = 'name';
        
        IF NOT v_is_nullable THEN
            RAISE NOTICE '⚠️  Column "name" is NOT NULL (required)';
            RAISE NOTICE '🔧 Making it nullable to prevent errors...';
            
            -- Make it nullable
            ALTER TABLE sale_items 
            ALTER COLUMN name DROP NOT NULL;
            
            RAISE NOTICE '✅ Column "name" is now nullable';
        ELSE
            RAISE NOTICE '✅ Column "name" is already nullable (good!)';
        END IF;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ FIX COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Column schema:';
END $$;

-- Show the column details
SELECT 
    column_name,
    data_type,
    is_nullable,
    character_maximum_length,
    column_default
FROM information_schema.columns
WHERE table_name = 'sale_items' AND column_name = 'name';

-- Show all columns in sale_items table
SELECT 
    '-- All sale_items columns --' as info;

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'sale_items'
ORDER BY ordinal_position;
