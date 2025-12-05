-- =====================================================
-- ShopEasy - Supabase Row Level Security (RLS) Setup
-- =====================================================
-- 
-- This file contains SQL commands to set up proper database tables
-- with Row Level Security if you want to migrate from KV store to
-- PostgreSQL tables in Supabase.
--
-- Current Implementation: Uses Deno KV store
-- Optional Migration: Use this SQL to create proper tables
--
-- Run these commands in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. ORGANIZATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo TEXT,
  owner_id UUID REFERENCES auth.users(id),
  subscription_status TEXT DEFAULT 'trial',
  subscription_plan TEXT,
  trial_start_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read organizations they belong to
CREATE POLICY "Users can read their organization"
  ON organizations
  FOR SELECT
  USING (
    id IN (
      SELECT org_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: Only owners can update organizations
CREATE POLICY "Owners can update organization"
  ON organizations
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- =====================================================
-- 2. USER PROFILES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  org_id TEXT REFERENCES organizations(id),
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  assigned_branch_id TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Admins/owners can read all profiles in their org
CREATE POLICY "Admins can read org profiles"
  ON user_profiles
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- 3. BRANCHES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  org_id TEXT REFERENCES organizations(id) NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  manager_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read branches in their org
CREATE POLICY "Users can read org branches"
  ON branches
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: Admins/owners can manage branches
CREATE POLICY "Admins can manage branches"
  ON branches
  FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- 4. WAREHOUSES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS warehouses (
  id TEXT PRIMARY KEY,
  org_id TEXT REFERENCES organizations(id) NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  manager_id UUID REFERENCES auth.users(id),
  capacity INTEGER,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read warehouses in their org
CREATE POLICY "Users can read org warehouses"
  ON warehouses
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: Admins/owners can manage warehouses
CREATE POLICY "Admins can manage warehouses"
  ON warehouses
  FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- 5. PRODUCTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  org_id TEXT REFERENCES organizations(id) NOT NULL,
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  barcode TEXT,
  category TEXT,
  price DECIMAL(10, 2) NOT NULL,
  unit_cost DECIMAL(10, 2),
  reorder_level INTEGER DEFAULT 0,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  expiry_date DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, sku)
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read products in their org
CREATE POLICY "Users can read org products"
  ON products
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: Staff can insert/update products
CREATE POLICY "Staff can manage products"
  ON products
  FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 6. STOCK TABLE (Branch Stock)
-- =====================================================

CREATE TABLE IF NOT EXISTS stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id TEXT REFERENCES organizations(id) NOT NULL,
  branch_id TEXT REFERENCES branches(id) NOT NULL,
  product_id TEXT REFERENCES products(id) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(branch_id, product_id)
);

-- Enable RLS
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read stock for their org
CREATE POLICY "Users can read org stock"
  ON stock
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: Staff can update stock
CREATE POLICY "Staff can update stock"
  ON stock
  FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Index for performance
CREATE INDEX idx_stock_branch_product ON stock(branch_id, product_id);
CREATE INDEX idx_stock_org ON stock(org_id);

-- =====================================================
-- 7. WAREHOUSE STOCK TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS warehouse_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id TEXT REFERENCES organizations(id) NOT NULL,
  warehouse_id TEXT REFERENCES warehouses(id) NOT NULL,
  product_id TEXT REFERENCES products(id) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(warehouse_id, product_id)
);

-- Enable RLS
ALTER TABLE warehouse_stock ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read warehouse stock for their org
CREATE POLICY "Users can read org warehouse stock"
  ON warehouse_stock
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: Staff can update warehouse stock
CREATE POLICY "Staff can update warehouse stock"
  ON warehouse_stock
  FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Index for performance
CREATE INDEX idx_warehouse_stock_warehouse_product ON warehouse_stock(warehouse_id, product_id);

-- =====================================================
-- 8. TRANSFERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS transfers (
  id TEXT PRIMARY KEY,
  org_id TEXT REFERENCES organizations(id) NOT NULL,
  source_branch_id TEXT,
  source_warehouse_id TEXT,
  destination_branch_id TEXT,
  destination_warehouse_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT,
  requires_approval BOOLEAN DEFAULT true,
  initiated_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  received_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  in_transit_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read transfers for their org
CREATE POLICY "Users can read org transfers"
  ON transfers
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: Admins can manage transfers
CREATE POLICY "Admins can manage transfers"
  ON transfers
  FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- 9. TRANSFER ITEMS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS transfer_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_id TEXT REFERENCES transfers(id) NOT NULL,
  product_id TEXT REFERENCES products(id) NOT NULL,
  quantity INTEGER NOT NULL,
  received_quantity INTEGER,
  unit_cost DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE transfer_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read items for transfers in their org
CREATE POLICY "Users can read transfer items"
  ON transfer_items
  FOR SELECT
  USING (
    transfer_id IN (
      SELECT id FROM transfers WHERE org_id IN (
        SELECT org_id FROM user_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- 10. SALES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  org_id TEXT REFERENCES organizations(id) NOT NULL,
  branch_id TEXT REFERENCES branches(id) NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_birth_date TEXT,
  subtotal DECIMAL(10, 2) NOT NULL,
  discount DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  amount_paid DECIMAL(10, 2),
  change DECIMAL(10, 2),
  cashier_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read sales for their org
CREATE POLICY "Users can read org sales"
  ON sales
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: Staff can insert sales
CREATE POLICY "Staff can create sales"
  ON sales
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 11. SALE ITEMS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id TEXT REFERENCES sales(id) NOT NULL,
  product_id TEXT REFERENCES products(id) NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  discount DECIMAL(5, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read sale items for their org
CREATE POLICY "Users can read sale items"
  ON sale_items
  FOR SELECT
  USING (
    sale_id IN (
      SELECT id FROM sales WHERE org_id IN (
        SELECT org_id FROM user_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- 12. SUPPLIERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  org_id TEXT REFERENCES organizations(id) NOT NULL,
  name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  email TEXT,
  product_categories TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read suppliers for their org
CREATE POLICY "Users can read org suppliers"
  ON suppliers
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: Staff can manage suppliers
CREATE POLICY "Staff can manage suppliers"
  ON suppliers
  FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 13. SUPPLIER INVOICES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS supplier_invoices (
  id TEXT PRIMARY KEY,
  supplier_id TEXT REFERENCES suppliers(id) NOT NULL,
  org_id TEXT REFERENCES organizations(id) NOT NULL,
  transaction_id TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE supplier_invoices ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read invoices for their org
CREATE POLICY "Users can read org invoices"
  ON supplier_invoices
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: Staff can upload invoices
CREATE POLICY "Staff can upload invoices"
  ON supplier_invoices
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 14. STOCK MOVEMENT AUDIT TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id TEXT REFERENCES organizations(id) NOT NULL,
  branch_id TEXT,
  warehouse_id TEXT,
  product_id TEXT REFERENCES products(id) NOT NULL,
  operation TEXT NOT NULL, -- 'add', 'subtract', 'set'
  quantity INTEGER NOT NULL,
  previous_quantity INTEGER,
  new_quantity INTEGER,
  reason TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read stock movements for their org
CREATE POLICY "Users can read org stock movements"
  ON stock_movements
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Index for audit queries
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id, created_at DESC);
CREATE INDEX idx_stock_movements_branch ON stock_movements(branch_id, created_at DESC);

-- =====================================================
-- 15. FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_warehouses_updated_at
  BEFORE UPDATE ON warehouses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_stock_updated_at
  BEFORE UPDATE ON stock
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_warehouse_stock_updated_at
  BEFORE UPDATE ON warehouse_stock
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 16. SUPABASE STORAGE BUCKET FOR INVOICES
-- =====================================================

-- Run this in Supabase Storage UI or via API:
-- 
-- Bucket Name: supplier-invoices
-- Public: No
-- Allowed MIME types: application/pdf, image/jpeg, image/png
-- Max file size: 10MB
-- 
-- RLS Policy for storage:
-- SELECT: Allow users to read files for their org
-- INSERT: Allow users to upload files for their org
-- UPDATE: Deny
-- DELETE: Allow users to delete their own uploads

-- =====================================================
-- MIGRATION NOTES
-- =====================================================
--
-- TO MIGRATE FROM KV STORE TO POSTGRESQL:
--
-- 1. Run all SQL commands above in Supabase SQL Editor
-- 2. Update backend server to use Supabase client instead of KV
-- 3. Create migration script to move data from KV to tables
-- 4. Test thoroughly in staging environment
-- 5. Deploy to production
--
-- ADVANTAGES OF POSTGRESQL:
-- - Complex queries and joins
-- - Better performance for large datasets
-- - Built-in full-text search
-- - Easier reporting and analytics
-- - Industry-standard SQL
--
-- ADVANTAGES OF KV STORE (Current):
-- - Simpler setup
-- - No schema migrations needed
-- - Good for rapid prototyping
-- - Works well for small-medium datasets
--
-- RECOMMENDATION:
-- - Start with KV (current implementation)
-- - Migrate to PostgreSQL when:
--   * Data > 10,000 records
--   * Need complex reporting
--   * Need full-text search
--   * Multiple users need concurrent access
--
-- =====================================================

-- Query to check RLS is enabled on all tables:
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Query to check all RLS policies:
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
