-- ============================================
-- ADD RECEIPT NUMBER TO SALES TABLE
-- ============================================
-- This migration adds a receipt_number column to the sales table
-- and creates a function to auto-generate sequential receipt numbers

DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎫 ADDING RECEIPT NUMBER SUPPORT';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    -- Step 1: Add receipt_number column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' 
        AND column_name = 'receipt_number'
    ) THEN
        RAISE NOTICE '📝 Adding receipt_number column to sales table...';
        
        ALTER TABLE sales 
        ADD COLUMN receipt_number TEXT;
        
        -- Create index for faster searches
        CREATE INDEX idx_sales_receipt_number ON sales(receipt_number);
        
        RAISE NOTICE '✅ receipt_number column added';
    ELSE
        RAISE NOTICE '⚠️  receipt_number column already exists';
    END IF;

    -- Step 2: Populate existing sales with receipt numbers based on their ID
    RAISE NOTICE '';
    RAISE NOTICE '📝 Generating receipt numbers for existing sales...';
    
    -- Update existing sales to have receipt numbers
    -- Format: RCP-YYYYMMDD-XXXXX (e.g., RCP-20250122-00001)
    UPDATE sales 
    SET receipt_number = 'RCP-' || 
                         TO_CHAR(created_at, 'YYYYMMDD') || '-' || 
                         LPAD(SUBSTRING(id::TEXT FROM 1 FOR 5), 5, '0')
    WHERE receipt_number IS NULL;
    
    RAISE NOTICE '✅ Generated receipt numbers for existing sales';
    
    -- Step 3: Create function to auto-generate receipt numbers
    RAISE NOTICE '';
    RAISE NOTICE '📝 Creating auto-generate receipt number function...';
    
    -- Drop function if exists
    DROP FUNCTION IF EXISTS generate_receipt_number();
    
    -- Create function to generate sequential receipt numbers
    CREATE OR REPLACE FUNCTION generate_receipt_number()
    RETURNS TEXT
    LANGUAGE plpgsql
    AS $func$
    DECLARE
        new_receipt_number TEXT;
        today_date TEXT;
        sequence_num INTEGER;
    BEGIN
        -- Get today's date in YYYYMMDD format
        today_date := TO_CHAR(NOW(), 'YYYYMMDD');
        
        -- Get the count of sales created today + 1
        SELECT COUNT(*) + 1 INTO sequence_num
        FROM sales
        WHERE DATE(created_at) = CURRENT_DATE;
        
        -- Generate receipt number: RCP-YYYYMMDD-XXXXX
        new_receipt_number := 'RCP-' || today_date || '-' || LPAD(sequence_num::TEXT, 5, '0');
        
        RETURN new_receipt_number;
    END;
    $func$;
    
    RAISE NOTICE '✅ Auto-generate function created';
    
    -- Step 4: Create trigger to auto-populate receipt number
    RAISE NOTICE '';
    RAISE NOTICE '📝 Creating trigger for auto-receipt-number...';
    
    -- Drop trigger if exists
    DROP TRIGGER IF EXISTS auto_generate_receipt_number ON sales;
    
    -- Create trigger function
    CREATE OR REPLACE FUNCTION set_receipt_number()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $func$
    BEGIN
        -- Only set if receipt_number is NULL
        IF NEW.receipt_number IS NULL THEN
            NEW.receipt_number := generate_receipt_number();
        END IF;
        
        RETURN NEW;
    END;
    $func$;
    
    -- Create trigger
    CREATE TRIGGER auto_generate_receipt_number
        BEFORE INSERT ON sales
        FOR EACH ROW
        EXECUTE FUNCTION set_receipt_number();
    
    RAISE NOTICE '✅ Auto-receipt-number trigger created';
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ RECEIPT NUMBER SETUP COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 What was done:';
    RAISE NOTICE '   ✓ Added receipt_number column to sales table';
    RAISE NOTICE '   ✓ Generated receipt numbers for existing sales';
    RAISE NOTICE '   ✓ Created auto-generation function';
    RAISE NOTICE '   ✓ Set up trigger for new sales';
    RAISE NOTICE '';
    RAISE NOTICE '🎫 Receipt Number Format:';
    RAISE NOTICE '   RCP-YYYYMMDD-XXXXX';
    RAISE NOTICE '   Example: RCP-20250122-00001';
    RAISE NOTICE '';
    RAISE NOTICE '👉 NEXT STEPS:';
    RAISE NOTICE '   1. Run this migration in Supabase SQL Editor';
    RAISE NOTICE '   2. Update the frontend to display receipt_number';
    RAISE NOTICE '   3. Test Returns search with new receipt numbers';
    RAISE NOTICE '';
    
END $$;
