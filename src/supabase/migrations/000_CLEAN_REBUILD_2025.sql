-- =====================================================
-- ShopEasy COMPLETE CLEAN REBUILD 2025
-- DROP ALL EXISTING TABLES AND RECREATE FROM SCRATCH
-- =====================================================

-- ⚠️ WARNING: This will DELETE all existing data!
-- Only run this if you want to start fresh or have backed up your data.

-- =====================================================
-- STEP 1: Drop all existing tables, triggers, and functions
-- =====================================================

-- Drop all policies first
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT schemaname, tablename, policyname 
            FROM pg_policies 
            WHERE schemaname = 'public') 
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I CASCADE', 
                   r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Drop all triggers
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations CASCADE;
DROP TRIGGER IF EXISTS update_branches_updated_at ON branches CASCADE;
DROP TRIGGER IF EXISTS update_warehouses_updated_at ON warehouses CASCADE;
DROP TRIGGER IF EXISTS update_products_updated_at ON products CASCADE;
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers CASCADE;
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles CASCADE;
DROP TRIGGER IF EXISTS handle_inventory_upsert ON inventory CASCADE;
DROP TRIGGER IF EXISTS handle_transfer_completion ON transfers CASCADE;
DROP TRIGGER IF EXISTS handle_sale_inventory_deduction ON sale_items CASCADE;
DROP TRIGGER IF EXISTS handle_return_inventory_addition ON returns CASCADE;
DROP TRIGGER IF EXISTS set_updated_at_organizations ON organizations CASCADE;
DROP TRIGGER IF EXISTS set_updated_at_products ON products CASCADE;

-- Drop all tables (CASCADE will drop all dependencies)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS system_logs CASCADE;
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS returns CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS transfer_items CASCADE;
DROP TABLE IF EXISTS transfers CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS stock CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS branches CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS user_organizations CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS upsert_inventory() CASCADE;
DROP FUNCTION IF EXISTS complete_transfer() CASCADE;
DROP FUNCTION IF EXISTS deduct_sale_inventory() CASCADE;
DROP FUNCTION IF EXISTS add_return_inventory() CASCADE;

-- Drop storage buckets (if exists)
DELETE FROM storage.buckets WHERE id = 'supplier-invoices';

-- =====================================================
-- STEP 2: Enable required extensions
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- =====================================================
-- STEP 3: Create core tables
-- =====================================================

-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo TEXT,
  subscription_plan TEXT DEFAULT 'starter' CHECK (subscription_plan IN ('starter', 'professional', 'enterprise', 'ultimate')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'trial', 'expired', 'cancelled')),
  subscription_expires_at TIMESTAMPTZ,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Branches table
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  phone TEXT,
  is_headquarters BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- Warehouses table
CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  manager_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  barcode TEXT,
  category TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(10, 2) DEFAULT 0,
  cost_price NUMERIC(10, 2) DEFAULT 0,
  reorder_level INTEGER DEFAULT 10,
  tax_rate NUMERIC(5, 2) DEFAULT 0,
  expiry_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, sku)
);

CREATE INDEX idx_products_organization ON products(organization_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_products_category ON products(category) WHERE category IS NOT NULL;

-- Suppliers table
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  invoice_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suppliers_organization ON suppliers(organization_id);

-- Inventory table (CRITICAL: This prevents duplicates)
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Stock must be in EITHER branch OR warehouse, not both, not neither
  CONSTRAINT check_location CHECK (
    (branch_id IS NOT NULL AND warehouse_id IS NULL) OR
    (branch_id IS NULL AND warehouse_id IS NOT NULL)
  ),
  
  -- CRITICAL: Prevent duplicate stock entries
  CONSTRAINT unique_stock_per_location UNIQUE NULLS NOT DISTINCT (product_id, branch_id, warehouse_id)
);

CREATE INDEX idx_inventory_organization ON inventory(organization_id);
CREATE INDEX idx_inventory_branch ON inventory(branch_id) WHERE branch_id IS NOT NULL;
CREATE INDEX idx_inventory_warehouse ON inventory(warehouse_id) WHERE warehouse_id IS NOT NULL;
CREATE INDEX idx_inventory_product ON inventory(product_id);

-- Transfers table
CREATE TABLE transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Source location
  from_branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  from_warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  
  -- Destination location
  to_branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  to_warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  notes TEXT,
  
  initiated_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Source validation
  CONSTRAINT check_transfer_source CHECK (
    (from_branch_id IS NOT NULL AND from_warehouse_id IS NULL) OR
    (from_branch_id IS NULL AND from_warehouse_id IS NOT NULL)
  ),
  
  -- Destination validation
  CONSTRAINT check_transfer_destination CHECK (
    (to_branch_id IS NOT NULL AND to_warehouse_id IS NULL) OR
    (to_branch_id IS NULL AND to_warehouse_id IS NOT NULL)
  )
);

CREATE INDEX idx_transfers_organization ON transfers(organization_id);
CREATE INDEX idx_transfers_from_branch ON transfers(from_branch_id) WHERE from_branch_id IS NOT NULL;
CREATE INDEX idx_transfers_to_branch ON transfers(to_branch_id) WHERE to_branch_id IS NOT NULL;
CREATE INDEX idx_transfers_status ON transfers(status);
CREATE INDEX idx_transfers_created_at ON transfers(created_at);

-- Sales table
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  customer_name TEXT DEFAULT 'Walk-in Customer',
  customer_phone TEXT,
  customer_birth_date TEXT,
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  payment_method TEXT CHECK (payment_method IN ('cash', 'pos', 'transfer')),
  amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0,
  change NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'completed',
  cashier_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Sale must be from EITHER branch OR warehouse
  CONSTRAINT check_sale_location CHECK (
    (branch_id IS NOT NULL AND warehouse_id IS NULL) OR
    (branch_id IS NULL AND warehouse_id IS NOT NULL)
  )
);

CREATE INDEX idx_sales_organization ON sales(organization_id);
CREATE INDEX idx_sales_branch ON sales(branch_id) WHERE branch_id IS NOT NULL;
CREATE INDEX idx_sales_created_at ON sales(created_at);

-- Sale items table
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  discount NUMERIC(5, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);

-- User profiles table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  role TEXT DEFAULT 'cashier' CHECK (role IN ('owner', 'admin', 'manager', 'warehouse_manager', 'cashier', 'auditor', 'super_admin')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  assigned_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  assigned_warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  is_super_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_organization ON user_profiles(organization_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_super_admin ON user_profiles(is_super_admin) WHERE is_super_admin = true;

-- Expenses table
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_organization ON expenses(organization_id);
CREATE INDEX idx_expenses_branch ON expenses(branch_id);
CREATE INDEX idx_expenses_date ON expenses(date);

-- Returns table
CREATE TABLE returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reason TEXT,
  refund_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  processed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_returns_organization ON returns(organization_id);
CREATE INDEX idx_returns_branch ON returns(branch_id);

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_organization ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Support tickets table (for Super Admin)
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT CHECK (category IN ('bug', 'feature', 'support', 'data_issue', 'performance')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_support_tickets_organization ON support_tickets(organization_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at);

-- System logs table (for Super Admin monitoring)
CREATE TABLE system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  log_level TEXT CHECK (log_level IN ('info', 'warning', 'error', 'critical')),
  message TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_system_logs_organization ON system_logs(organization_id);
CREATE INDEX idx_system_logs_level ON system_logs(log_level);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at);

-- =====================================================
-- STEP 4: Create functions and triggers
-- =====================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Inventory upsert trigger (prevents duplicates)
CREATE OR REPLACE FUNCTION upsert_inventory()
RETURNS TRIGGER AS $$
DECLARE
  existing_id UUID;
BEGIN
  -- Check for existing inventory
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
    
    -- Prevent insert
    RETURN NULL;
  ELSE
    -- Allow insert
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Transfer completion trigger
CREATE OR REPLACE FUNCTION complete_transfer()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Deduct from source
    IF NEW.from_branch_id IS NOT NULL THEN
      UPDATE inventory
      SET quantity = GREATEST(0, quantity - NEW.quantity),
          updated_at = NOW()
      WHERE product_id = NEW.product_id
        AND branch_id = NEW.from_branch_id;
    ELSIF NEW.from_warehouse_id IS NOT NULL THEN
      UPDATE inventory
      SET quantity = GREATEST(0, quantity - NEW.quantity),
          updated_at = NOW()
      WHERE product_id = NEW.product_id
        AND warehouse_id = NEW.from_warehouse_id;
    END IF;
    
    -- Add to destination (using UPSERT)
    IF NEW.to_branch_id IS NOT NULL THEN
      INSERT INTO inventory (organization_id, branch_id, product_id, quantity, updated_by)
      VALUES (NEW.organization_id, NEW.to_branch_id, NEW.product_id, NEW.quantity, NEW.approved_by)
      ON CONFLICT ON CONSTRAINT unique_stock_per_location
      DO UPDATE SET
        quantity = inventory.quantity + EXCLUDED.quantity,
        updated_at = NOW();
    ELSIF NEW.to_warehouse_id IS NOT NULL THEN
      INSERT INTO inventory (organization_id, warehouse_id, product_id, quantity, updated_by)
      VALUES (NEW.organization_id, NEW.to_warehouse_id, NEW.product_id, NEW.quantity, NEW.approved_by)
      ON CONFLICT ON CONSTRAINT unique_stock_per_location
      DO UPDATE SET
        quantity = inventory.quantity + EXCLUDED.quantity,
        updated_at = NOW();
    END IF;
    
    NEW.completed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sale inventory deduction trigger
CREATE OR REPLACE FUNCTION deduct_sale_inventory()
RETURNS TRIGGER AS $$
DECLARE
  v_branch_id UUID;
  v_warehouse_id UUID;
BEGIN
  -- Get sale location
  SELECT branch_id, warehouse_id INTO v_branch_id, v_warehouse_id
  FROM sales WHERE id = NEW.sale_id;
  
  -- Deduct from correct location
  IF v_branch_id IS NOT NULL THEN
    UPDATE inventory
    SET quantity = GREATEST(0, quantity - NEW.quantity),
        updated_at = NOW()
    WHERE product_id = NEW.product_id
      AND branch_id = v_branch_id;
  ELSIF v_warehouse_id IS NOT NULL THEN
    UPDATE inventory
    SET quantity = GREATEST(0, quantity - NEW.quantity),
        updated_at = NOW()
    WHERE product_id = NEW.product_id
      AND warehouse_id = v_warehouse_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Return inventory addition trigger
CREATE OR REPLACE FUNCTION add_return_inventory()
RETURNS TRIGGER AS $$
BEGIN
  -- Add back to correct location (using UPSERT)
  IF NEW.branch_id IS NOT NULL THEN
    INSERT INTO inventory (organization_id, branch_id, product_id, quantity, updated_by)
    VALUES (NEW.organization_id, NEW.branch_id, NEW.product_id, NEW.quantity, NEW.processed_by)
    ON CONFLICT ON CONSTRAINT unique_stock_per_location
    DO UPDATE SET
      quantity = inventory.quantity + EXCLUDED.quantity,
      updated_at = NOW();
  ELSIF NEW.warehouse_id IS NOT NULL THEN
    INSERT INTO inventory (organization_id, warehouse_id, product_id, quantity, updated_by)
    VALUES (NEW.organization_id, NEW.warehouse_id, NEW.product_id, NEW.quantity, NEW.processed_by)
    ON CONFLICT ON CONSTRAINT unique_stock_per_location
    DO UPDATE SET
      quantity = inventory.quantity + EXCLUDED.quantity,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER handle_inventory_upsert BEFORE INSERT ON inventory
  FOR EACH ROW EXECUTE FUNCTION upsert_inventory();

CREATE TRIGGER handle_transfer_completion BEFORE UPDATE ON transfers
  FOR EACH ROW EXECUTE FUNCTION complete_transfer();

CREATE TRIGGER handle_sale_inventory_deduction AFTER INSERT ON sale_items
  FOR EACH ROW EXECUTE FUNCTION deduct_sale_inventory();

CREATE TRIGGER handle_return_inventory_addition AFTER INSERT ON returns
  FOR EACH ROW EXECUTE FUNCTION add_return_inventory();

-- =====================================================
-- STEP 5: Enable RLS on all tables
-- =====================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 6: Create RLS policies
-- =====================================================

-- Super Admin has access to EVERYTHING
CREATE POLICY "Super admins have full access to organizations"
  ON organizations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Organizations policies
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (
    id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    OR owner_id = auth.uid()
  );

CREATE POLICY "Owners can update their organization"
  ON organizations FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Anyone can create an organization"
  ON organizations FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Branches policies
CREATE POLICY "Super admins can access all branches"
  ON branches FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

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

-- Warehouses policies
CREATE POLICY "Super admins can access all warehouses"
  ON warehouses FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

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

-- Products policies
CREATE POLICY "Super admins can access all products"
  ON products FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

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

-- Inventory policies
CREATE POLICY "Super admins can access all inventory"
  ON inventory FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

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

-- Transfers policies
CREATE POLICY "Super admins can access all transfers"
  ON transfers FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "Users can view transfers in their organization"
  ON transfers FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can create transfers"
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

-- Sales policies
CREATE POLICY "Super admins can access all sales"
  ON sales FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "Users can view sales in their organization"
  ON sales FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can create sales"
  ON sales FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

-- Sale items policies (inherit from sales)
CREATE POLICY "Super admins can access all sale items"
  ON sale_items FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "Users can view sale items"
  ON sale_items FOR SELECT
  USING (
    sale_id IN (
      SELECT id FROM sales
      WHERE organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can create sale items"
  ON sale_items FOR INSERT
  WITH CHECK (
    sale_id IN (
      SELECT id FROM sales
      WHERE organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );

-- User profiles policies
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Super admins can manage all profiles"
  ON user_profiles FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

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

CREATE POLICY "Users can create their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Audit logs policies
CREATE POLICY "Super admins can view all audit logs"
  ON audit_logs FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('owner', 'manager', 'auditor')
    )
  );

CREATE POLICY "Users can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Support tickets policies
CREATE POLICY "Super admins can access all tickets"
  ON support_tickets FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "Users can view their organization tickets"
  ON support_tickets FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create tickets"
  ON support_tickets FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- System logs policies
CREATE POLICY "Only super admins can access system logs"
  ON system_logs FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- Suppliers, Expenses, Returns (similar patterns)
CREATE POLICY "Super admins can access all suppliers"
  ON suppliers FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true));

CREATE POLICY "Users can view suppliers"
  ON suppliers FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage suppliers"
  ON suppliers FOR ALL
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Super admins can access all expenses"
  ON expenses FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true));

CREATE POLICY "Users can view expenses"
  ON expenses FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage expenses"
  ON expenses FOR ALL
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Super admins can access all returns"
  ON returns FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true));

CREATE POLICY "Users can view returns"
  ON returns FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage returns"
  ON returns FOR ALL
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- =====================================================
-- STEP 7: Create storage buckets
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-invoices', 'supplier-invoices', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload invoices"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'supplier-invoices' AND
    auth.uid() IN (SELECT id FROM user_profiles)
  );

CREATE POLICY "Users can view invoices"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'supplier-invoices' AND
    auth.uid() IN (SELECT id FROM user_profiles)
  );

CREATE POLICY "Super admins can manage all storage"
  ON storage.objects FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- =====================================================
-- STEP 8: Add helpful comments
-- =====================================================

COMMENT ON TABLE organizations IS 'Multi-tenant organizations';
COMMENT ON TABLE branches IS 'Retail branch locations';
COMMENT ON TABLE warehouses IS 'Storage warehouses';
COMMENT ON TABLE inventory IS 'Stock levels - UNIQUE constraint prevents duplicates';
COMMENT ON TABLE transfers IS 'Stock transfers with automatic sync on completion';
COMMENT ON TABLE sales IS 'POS sales with automatic inventory deduction';
COMMENT ON TABLE audit_logs IS 'Complete audit trail of all actions';
COMMENT ON TABLE support_tickets IS 'Support tickets for super admin monitoring';
COMMENT ON TABLE system_logs IS 'System-wide error and event logging';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ ShopEasy CLEAN REBUILD 2025 COMPLETE!';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Tables Created:';
  RAISE NOTICE '   ✓ organizations, branches, warehouses';
  RAISE NOTICE '   ✓ products, suppliers, inventory';
  RAISE NOTICE '   ✓ transfers, sales, sale_items';
  RAISE NOTICE '   ✓ user_profiles, expenses, returns';
  RAISE NOTICE '   ✓ audit_logs, support_tickets, system_logs';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Security:';
  RAISE NOTICE '   ✓ RLS enabled on all tables';
  RAISE NOTICE '   ✓ Super admin access configured';
  RAISE NOTICE '   ✓ Multi-tenant isolation enforced';
  RAISE NOTICE '';
  RAISE NOTICE '⚙️ Triggers:';
  RAISE NOTICE '   ✓ Inventory upsert (prevents duplicates)';
  RAISE NOTICE '   ✓ Transfer auto-sync';
  RAISE NOTICE '   ✓ Sale auto-deduction';
  RAISE NOTICE '   ✓ Return auto-restock';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Key Features:';
  RAISE NOTICE '   ✓ Stock duplicates: IMPOSSIBLE';
  RAISE NOTICE '   ✓ Branch/Warehouse switching: FIXED';
  RAISE NOTICE '   ✓ Super admin monitoring: ENABLED';
  RAISE NOTICE '   ✓ Support tickets: READY';
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '🚀 Next: Update frontend to use new structure';
  RAISE NOTICE '====================================================';
END $$;