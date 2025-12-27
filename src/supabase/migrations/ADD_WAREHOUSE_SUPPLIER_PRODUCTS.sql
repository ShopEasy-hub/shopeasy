-- ============================================
-- ADD WAREHOUSE SUPPLIER PRODUCT RELATIONSHIPS
-- ============================================
-- This migration adds support for tracking which suppliers provide
-- which products to which warehouses, including pricing and terms

DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🏭 WAREHOUSE SUPPLIER PRODUCT SETUP';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    -- Step 1: Create warehouse_supplier_products table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'warehouse_supplier_products'
    ) THEN
        RAISE NOTICE '📝 Creating warehouse_supplier_products table...';
        
        CREATE TABLE warehouse_supplier_products (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
            product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
            
            -- Pricing information
            cost_price NUMERIC(10, 2) NOT NULL,
            minimum_order_quantity INTEGER DEFAULT 1,
            lead_time_days INTEGER DEFAULT 7,
            
            -- Supply status
            is_primary_supplier BOOLEAN DEFAULT false,
            is_active BOOLEAN DEFAULT true,
            
            -- Additional information
            supplier_product_code TEXT,
            notes TEXT,
            
            -- Audit fields
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            
            -- Constraints
            CONSTRAINT unique_warehouse_product_supplier 
                UNIQUE(warehouse_id, product_id, supplier_id),
            CONSTRAINT check_positive_cost 
                CHECK (cost_price > 0),
            CONSTRAINT check_positive_quantity 
                CHECK (minimum_order_quantity > 0),
            CONSTRAINT check_positive_lead_time 
                CHECK (lead_time_days >= 0)
        );
        
        -- Create indexes
        CREATE INDEX idx_warehouse_supplier_products_warehouse 
            ON warehouse_supplier_products(warehouse_id);
        CREATE INDEX idx_warehouse_supplier_products_product 
            ON warehouse_supplier_products(product_id);
        CREATE INDEX idx_warehouse_supplier_products_supplier 
            ON warehouse_supplier_products(supplier_id);
        CREATE INDEX idx_warehouse_supplier_products_active 
            ON warehouse_supplier_products(is_active) WHERE is_active = true;
        CREATE INDEX idx_warehouse_supplier_products_primary 
            ON warehouse_supplier_products(is_primary_supplier) WHERE is_primary_supplier = true;
        
        RAISE NOTICE '✅ warehouse_supplier_products table created';
    ELSE
        RAISE NOTICE '⚠️  warehouse_supplier_products table already exists';
    END IF;

    -- Step 2: Create function to update updated_at timestamp
    RAISE NOTICE '';
    RAISE NOTICE '📝 Creating trigger for updated_at...';
    
    CREATE OR REPLACE FUNCTION update_warehouse_supplier_products_updated_at()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $func$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $func$;
    
    -- Drop trigger if exists
    DROP TRIGGER IF EXISTS trigger_update_warehouse_supplier_products_updated_at 
        ON warehouse_supplier_products;
    
    -- Create trigger
    CREATE TRIGGER trigger_update_warehouse_supplier_products_updated_at
        BEFORE UPDATE ON warehouse_supplier_products
        FOR EACH ROW
        EXECUTE FUNCTION update_warehouse_supplier_products_updated_at();
    
    RAISE NOTICE '✅ Trigger created';

    -- Step 3: Enable RLS
    RAISE NOTICE '';
    RAISE NOTICE '📝 Enabling Row Level Security...';
    
    ALTER TABLE warehouse_supplier_products ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view warehouse supplier products" 
        ON warehouse_supplier_products;
    DROP POLICY IF EXISTS "Users can insert warehouse supplier products" 
        ON warehouse_supplier_products;
    DROP POLICY IF EXISTS "Users can update warehouse supplier products" 
        ON warehouse_supplier_products;
    DROP POLICY IF EXISTS "Users can delete warehouse supplier products" 
        ON warehouse_supplier_products;
    
    -- Create RLS policies
    CREATE POLICY "Users can view warehouse supplier products"
        ON warehouse_supplier_products
        FOR SELECT
        USING (
            organization_id IN (
                SELECT organization_id 
                FROM user_profiles 
                WHERE user_id = auth.uid()
            )
        );
    
    CREATE POLICY "Users can insert warehouse supplier products"
        ON warehouse_supplier_products
        FOR INSERT
        WITH CHECK (
            organization_id IN (
                SELECT organization_id 
                FROM user_profiles 
                WHERE user_id = auth.uid()
                AND role IN ('owner', 'admin', 'manager')
            )
        );
    
    CREATE POLICY "Users can update warehouse supplier products"
        ON warehouse_supplier_products
        FOR UPDATE
        USING (
            organization_id IN (
                SELECT organization_id 
                FROM user_profiles 
                WHERE user_id = auth.uid()
                AND role IN ('owner', 'admin', 'manager')
            )
        );
    
    CREATE POLICY "Users can delete warehouse supplier products"
        ON warehouse_supplier_products
        FOR DELETE
        USING (
            organization_id IN (
                SELECT organization_id 
                FROM user_profiles 
                WHERE user_id = auth.uid()
                AND role IN ('owner', 'admin')
            )
        );
    
    RAISE NOTICE '✅ RLS policies created';

    -- Step 4: Create helper function to get warehouse product suppliers
    RAISE NOTICE '';
    RAISE NOTICE '📝 Creating helper functions...';
    
    CREATE OR REPLACE FUNCTION get_warehouse_product_suppliers(
        p_warehouse_id UUID,
        p_product_id UUID
    )
    RETURNS TABLE (
        supplier_id UUID,
        supplier_name TEXT,
        cost_price NUMERIC,
        minimum_order_quantity INTEGER,
        lead_time_days INTEGER,
        is_primary_supplier BOOLEAN,
        supplier_product_code TEXT
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $func$
    BEGIN
        RETURN QUERY
        SELECT 
            wsp.supplier_id,
            s.name as supplier_name,
            wsp.cost_price,
            wsp.minimum_order_quantity,
            wsp.lead_time_days,
            wsp.is_primary_supplier,
            wsp.supplier_product_code
        FROM warehouse_supplier_products wsp
        JOIN suppliers s ON s.id = wsp.supplier_id
        WHERE wsp.warehouse_id = p_warehouse_id
            AND wsp.product_id = p_product_id
            AND wsp.is_active = true
        ORDER BY wsp.is_primary_supplier DESC, wsp.cost_price ASC;
    END;
    $func$;
    
    RAISE NOTICE '✅ Helper functions created';

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ WAREHOUSE SUPPLIER SETUP COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 What was done:';
    RAISE NOTICE '   ✓ Created warehouse_supplier_products table';
    RAISE NOTICE '   ✓ Set up unique constraints';
    RAISE NOTICE '   ✓ Created indexes for performance';
    RAISE NOTICE '   ✓ Enabled RLS with role-based policies';
    RAISE NOTICE '   ✓ Created helper functions';
    RAISE NOTICE '';
    RAISE NOTICE '💡 Usage:';
    RAISE NOTICE '   • Link products to suppliers per warehouse';
    RAISE NOTICE '   • Track cost prices by supplier and warehouse';
    RAISE NOTICE '   • Set primary suppliers for each product';
    RAISE NOTICE '   • Manage minimum order quantities';
    RAISE NOTICE '   • Track lead times for planning';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Example Query:';
    RAISE NOTICE '   SELECT * FROM get_warehouse_product_suppliers(';
    RAISE NOTICE '     ''warehouse-uuid'', ''product-uuid''';
    RAISE NOTICE '   );';
    RAISE NOTICE '';
    
END $$;
