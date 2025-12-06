-- =====================================================
-- ShopEasy Complete Database Migration
-- From Deno KV to Supabase PostgreSQL
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: organizations
-- =====================================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo TEXT,
  subscription_plan TEXT DEFAULT 'starter' CHECK (subscription_plan IN ('starter', 'professional', 'enterprise', 'ultimate')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'expired', 'cancelled')),
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLE: branches
-- =====================================================
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- =====================================================
-- TABLE: warehouses
-- =====================================================
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  manager_name TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- =====================================================
-- TABLE: products
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  barcode TEXT,
  category TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
  cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  reorder_level INTEGER DEFAULT 10,
  tax_rate NUMERIC(5, 2) DEFAULT 0,
  expiry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, sku)
);

CREATE INDEX idx_products_organization ON products(organization_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_barcode ON products(barcode);

-- =====================================================
-- TABLE: suppliers
-- =====================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  invoice_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_suppliers_organization ON suppliers(organization_id);

-- =====================================================
-- TABLE: inventory
-- Core table for stock management across branches and warehouses
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Ensure stock is either in a branch OR warehouse, not both
  CONSTRAINT check_location CHECK (
    (branch_id IS NOT NULL AND warehouse_id IS NULL) OR
    (branch_id IS NULL AND warehouse_id IS NOT NULL)
  ),
  
  -- CRITICAL FIX: Prevent duplicate stock entries for same product in same location
  -- NULLS NOT DISTINCT ensures NULL values are treated as equal for uniqueness
  CONSTRAINT unique_stock_per_location UNIQUE NULLS NOT DISTINCT (product_id, branch_id, warehouse_id)
);

CREATE INDEX idx_inventory_organization ON inventory(organization_id);
CREATE INDEX idx_inventory_branch ON inventory(branch_id);
CREATE INDEX idx_inventory_warehouse ON inventory(warehouse_id);
CREATE INDEX idx_inventory_product ON inventory(product_id);

-- =====================================================
-- TABLE: transfers
-- =====================================================
CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Source location (either branch or warehouse)
  from_branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  from_warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  
  -- Destination location (either branch or warehouse)
  to_branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  to_warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  
  -- Note: product_id and quantity removed - now in transfer_items table
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'in_transit')),
  notes TEXT,
  
  initiated_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Ensure transfer has valid source and destination
  CONSTRAINT check_transfer_source CHECK (
    (from_branch_id IS NOT NULL AND from_warehouse_id IS NULL) OR
    (from_branch_id IS NULL AND from_warehouse_id IS NOT NULL)
  ),
  CONSTRAINT check_transfer_destination CHECK (
    (to_branch_id IS NOT NULL AND to_warehouse_id IS NULL) OR
    (to_branch_id IS NULL AND to_warehouse_id IS NOT NULL)
  )
);

CREATE INDEX idx_transfers_organization ON transfers(organization_id);
CREATE INDEX idx_transfers_from_branch ON transfers(from_branch_id);
CREATE INDEX idx_transfers_to_branch ON transfers(to_branch_id);
CREATE INDEX idx_transfers_status ON transfers(status);

-- =====================================================
-- TABLE: transfer_items
-- =====================================================
CREATE TABLE IF NOT EXISTS transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transfer_items_transfer ON transfer_items(transfer_id);
CREATE INDEX idx_transfer_items_product ON transfer_items(product_id);

-- =====================================================
-- TABLE: sales
-- =====================================================
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  customer_name TEXT DEFAULT 'Walk-in Customer',
  customer_phone TEXT,
  customer_birth_date TEXT,
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  payment_method TEXT CHECK (payment_method IN ('cash', 'pos', 'transfer')),
  amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0,
  change NUMERIC(10, 2) NOT NULL DEFAULT 0,
  cashier_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sales_organization ON sales(organization_id);
CREATE INDEX idx_sales_branch ON sales(branch_id);
CREATE INDEX idx_sales_created_at ON sales(created_at);

-- =====================================================
-- TABLE: sale_items
-- =====================================================
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  discount NUMERIC(5, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);

-- =====================================================
-- TABLE: users (extended profile)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  role TEXT DEFAULT 'cashier' CHECK (role IN ('owner', 'manager', 'auditor', 'cashier')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_organization ON user_profiles(organization_id);

-- =====================================================
-- TABLE: expenses
-- =====================================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_expenses_organization ON expenses(organization_id);
CREATE INDEX idx_expenses_branch ON expenses(branch_id);
CREATE INDEX idx_expenses_date ON expenses(date);

-- =====================================================
-- TABLE: returns
-- =====================================================
CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reason TEXT,
  refund_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  processed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_returns_organization ON returns(organization_id);
CREATE INDEX idx_returns_branch ON returns(branch_id);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INVENTORY UPSERT FUNCTION
-- Prevents duplicate stock entries by upserting instead of inserting
-- =====================================================
CREATE OR REPLACE FUNCTION upsert_inventory()
RETURNS TRIGGER AS $$
DECLARE
  existing_id UUID;
BEGIN
  -- Check if inventory record already exists for this product and location
  SELECT id INTO existing_id
  FROM inventory
  WHERE product_id = NEW.product_id
    AND COALESCE(branch_id::TEXT, '') = COALESCE(NEW.branch_id::TEXT, '')
    AND COALESCE(warehouse_id::TEXT, '') = COALESCE(NEW.warehouse_id::TEXT, '');
  
  IF existing_id IS NOT NULL THEN
    -- Update existing record
    UPDATE inventory
    SET quantity = NEW.quantity,
        updated_at = NOW(),
        updated_by = NEW.updated_by
    WHERE id = existing_id;
    
    -- Prevent the insert by returning NULL
    RETURN NULL;
  ELSE
    -- Allow the insert to proceed
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_inventory_upsert
  BEFORE INSERT ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION upsert_inventory();

-- =====================================================
-- TRANSFER COMPLETION TRIGGER
-- Automatically updates inventory when transfer is completed
-- =====================================================
CREATE OR REPLACE FUNCTION complete_transfer()
RETURNS TRIGGER AS $$
DECLARE
  transfer_item RECORD;
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    RAISE NOTICE '🔄 Completing transfer: %', NEW.id;
    
    -- Loop through all items in this transfer
    FOR transfer_item IN 
      SELECT product_id, quantity 
      FROM transfer_items 
      WHERE transfer_id = NEW.id
    LOOP
      RAISE NOTICE '📦 Processing item: product=% qty=%', transfer_item.product_id, transfer_item.quantity;
      
      -- Deduct from source location
      IF NEW.from_branch_id IS NOT NULL THEN
        RAISE NOTICE '📤 Deducting % units from branch %', transfer_item.quantity, NEW.from_branch_id;
        
        UPDATE inventory
        SET quantity = quantity - transfer_item.quantity,
            updated_at = NOW()
        WHERE product_id = transfer_item.product_id
          AND branch_id = NEW.from_branch_id;
          
      ELSIF NEW.from_warehouse_id IS NOT NULL THEN
        RAISE NOTICE '📤 Deducting % units from warehouse %', transfer_item.quantity, NEW.from_warehouse_id;
        
        UPDATE inventory
        SET quantity = quantity - transfer_item.quantity,
            updated_at = NOW()
        WHERE product_id = transfer_item.product_id
          AND warehouse_id = NEW.from_warehouse_id;
      END IF;
      
      -- Add to destination location (using UPSERT logic)
      IF NEW.to_branch_id IS NOT NULL THEN
        RAISE NOTICE '📥 Adding % units to branch %', transfer_item.quantity, NEW.to_branch_id;
        
        INSERT INTO inventory (organization_id, branch_id, product_id, quantity, updated_by)
        VALUES (NEW.organization_id, NEW.to_branch_id, transfer_item.product_id, transfer_item.quantity, NEW.approved_by)
        ON CONFLICT ON CONSTRAINT unique_stock_per_location
        DO UPDATE SET
          quantity = inventory.quantity + EXCLUDED.quantity,
          updated_at = NOW(),
          updated_by = EXCLUDED.updated_by;
          
      ELSIF NEW.to_warehouse_id IS NOT NULL THEN
        RAISE NOTICE '📥 Adding % units to warehouse %', transfer_item.quantity, NEW.to_warehouse_id;
        
        INSERT INTO inventory (organization_id, warehouse_id, product_id, quantity, updated_by)
        VALUES (NEW.organization_id, NEW.to_warehouse_id, transfer_item.product_id, transfer_item.quantity, NEW.approved_by)
        ON CONFLICT ON CONSTRAINT unique_stock_per_location
        DO UPDATE SET
          quantity = inventory.quantity + EXCLUDED.quantity,
          updated_at = NOW(),
          updated_by = EXCLUDED.updated_by;
      END IF;
      
    END LOOP;
    
    -- Set completion timestamp
    NEW.completed_at = NOW();
    
    RAISE NOTICE '✅ Transfer completed successfully: %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_transfer_completion
  BEFORE UPDATE ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION complete_transfer();

-- =====================================================
-- SALE STOCK DEDUCTION TRIGGER
-- Automatically deducts inventory when a sale is created
-- =====================================================
CREATE OR REPLACE FUNCTION deduct_sale_inventory()
RETURNS TRIGGER AS $$
BEGIN
  -- Deduct quantity from branch inventory
  UPDATE inventory
  SET quantity = quantity - NEW.quantity,
      updated_at = NOW()
  WHERE product_id = NEW.product_id
    AND branch_id = (SELECT branch_id FROM sales WHERE id = NEW.sale_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_sale_inventory_deduction
  AFTER INSERT ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION deduct_sale_inventory();

-- =====================================================
-- RETURN STOCK ADDITION TRIGGER
-- Automatically adds inventory back when a return is processed
-- =====================================================
CREATE OR REPLACE FUNCTION add_return_inventory()
RETURNS TRIGGER AS $$
BEGIN
  -- Add quantity back to branch inventory
  INSERT INTO inventory (organization_id, branch_id, product_id, quantity, updated_by)
  VALUES (NEW.organization_id, NEW.branch_id, NEW.product_id, NEW.quantity, NEW.processed_by)
  ON CONFLICT ON CONSTRAINT unique_stock_per_location
  DO UPDATE SET
    quantity = inventory.quantity + EXCLUDED.quantity,
    updated_at = NOW(),
    updated_by = EXCLUDED.updated_by;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_return_inventory_addition
  AFTER INSERT ON returns
  FOR EACH ROW
  EXECUTE FUNCTION add_return_inventory();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Organizations: Users can only see their own organization
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (
    id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    OR owner_id = auth.uid()
  );

CREATE POLICY "Owners can update their organization"
  ON organizations FOR UPDATE
  USING (owner_id = auth.uid());

-- Branches: Users can only see branches in their organization
CREATE POLICY "Users can view branches in their organization"
  ON branches FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Owners and managers can manage branches"
  ON branches FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Warehouses: Users can only see warehouses in their organization
CREATE POLICY "Users can view warehouses in their organization"
  ON warehouses FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Owners and managers can manage warehouses"
  ON warehouses FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Products: Users can view and manage products in their organization
CREATE POLICY "Users can view products in their organization"
  ON products FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage products in their organization"
  ON products FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

-- Suppliers: Users can view and manage suppliers in their organization
CREATE POLICY "Users can view suppliers in their organization"
  ON suppliers FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage suppliers in their organization"
  ON suppliers FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

-- Inventory: Users can view and manage inventory in their organization
CREATE POLICY "Users can view inventory in their organization"
  ON inventory FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage inventory in their organization"
  ON inventory FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

-- Transfers: Users can view and manage transfers in their organization
CREATE POLICY "Users can view transfers in their organization"
  ON transfers FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can create transfers in their organization"
  ON transfers FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Managers can approve transfers"
  ON transfers FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Transfer Items: Inherit from transfers
CREATE POLICY "Users can view transfer items in their organization"
  ON transfer_items FOR SELECT
  USING (
    transfer_id IN (
      SELECT id FROM transfers
      WHERE organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can create transfer items in their organization"
  ON transfer_items FOR INSERT
  WITH CHECK (
    transfer_id IN (
      SELECT id FROM transfers
      WHERE organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );

-- Sales: Users can view and create sales in their organization
CREATE POLICY "Users can view sales in their organization"
  ON sales FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can create sales in their organization"
  ON sales FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

-- Sale Items: Inherit from sales
CREATE POLICY "Users can view sale items in their organization"
  ON sale_items FOR SELECT
  USING (
    sale_id IN (
      SELECT id FROM sales
      WHERE organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can create sale items in their organization"
  ON sale_items FOR INSERT
  WITH CHECK (
    sale_id IN (
      SELECT id FROM sales
      WHERE organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );

-- User Profiles: Users can view profiles in their organization
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can view profiles in their organization"
  ON user_profiles FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Owners can manage user profiles"
  ON user_profiles FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Expenses: Users can view and manage expenses in their organization
CREATE POLICY "Users can view expenses in their organization"
  ON expenses FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage expenses in their organization"
  ON expenses FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

-- Returns: Users can view and manage returns in their organization
CREATE POLICY "Users can view returns in their organization"
  ON returns FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage returns in their organization"
  ON returns FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

-- =====================================================
-- STORAGE BUCKETS (for supplier invoices, etc.)
-- =====================================================

-- Create storage bucket for supplier invoices
INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-invoices', 'supplier-invoices', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for storage
CREATE POLICY "Users can upload invoices for their organization"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'supplier-invoices' AND
    auth.uid() IN (SELECT id FROM user_profiles)
  );

CREATE POLICY "Users can view invoices for their organization"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'supplier-invoices' AND
    auth.uid() IN (SELECT id FROM user_profiles)
  );

-- =====================================================
-- CLEANUP OLD KV DATA (Optional)
-- Run this manually if you want to clean up old KV references
-- =====================================================

COMMENT ON TABLE organizations IS 'Stores organization/tenant information for multi-tenant architecture';
COMMENT ON TABLE branches IS 'Physical retail locations for each organization';
COMMENT ON TABLE warehouses IS 'Storage facilities for each organization';
COMMENT ON TABLE inventory IS 'Stock levels across all branches and warehouses - prevents duplicates via unique constraint';
COMMENT ON TABLE transfers IS 'Stock transfers between branches and warehouses with approval workflow';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ ShopEasy database migration completed successfully!';
  RAISE NOTICE '📊 Tables created: organizations, branches, warehouses, products, suppliers, inventory, transfers, transfer_items, sales, sale_items, user_profiles, expenses, returns';
  RAISE NOTICE '🔒 RLS policies enabled on all tables';
  RAISE NOTICE '⚙️ Triggers created: inventory upsert, transfer completion, sale deduction, return addition';
  RAISE NOTICE '🎯 Next step: Update your API layer to use Supabase client instead of KV store';
END $$;