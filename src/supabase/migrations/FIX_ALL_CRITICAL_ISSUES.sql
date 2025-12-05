-- ==========================================
-- COMPREHENSIVE FIX FOR ALL CRITICAL ISSUES
-- Date: 2025-11-24
-- ==========================================

-- This script fixes:
-- 1. Warehouse policies - add warehouse_manager role
-- 2. Product creation validation
-- 3. User profile RLS policies
-- 4. Ensure all tables have proper indexes

-- ==========================================
-- 1. FIX WAREHOUSE POLICIES
-- ==========================================

-- Drop existing warehouse policies
DROP POLICY IF EXISTS "Users can view warehouses in their organization" ON warehouses;
DROP POLICY IF EXISTS "Owners and managers can manage warehouses" ON warehouses;
DROP POLICY IF EXISTS "Super admins can access all warehouses" ON warehouses;

-- Recreate with warehouse_manager included
CREATE POLICY "Users can view warehouses in their organization"
  ON warehouses FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Owners, managers, and warehouse managers can manage warehouses"
  ON warehouses FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('owner', 'manager', 'admin', 'warehouse_manager')
    )
  );

CREATE POLICY "Owners, managers, and warehouse managers can update warehouses"
  ON warehouses FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('owner', 'manager', 'admin', 'warehouse_manager')
    )
  );

CREATE POLICY "Owners and managers can delete warehouses"
  ON warehouses FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('owner', 'manager', 'admin')
    )
  );

-- ==========================================
-- 2. FIX PRODUCT POLICIES
-- ==========================================

-- Drop existing product policies
DROP POLICY IF EXISTS "Users can view products in their organization" ON products;
DROP POLICY IF EXISTS "Owners and managers can manage products" ON products;
DROP POLICY IF EXISTS "Super admins can access all products" ON products;

-- Recreate with proper roles
CREATE POLICY "Users can view products in their organization"
  ON products FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Authorized users can insert products"
  ON products FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('owner', 'manager', 'admin', 'warehouse_manager')
    )
  );

CREATE POLICY "Authorized users can update products"
  ON products FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('owner', 'manager', 'admin', 'warehouse_manager')
    )
  );

CREATE POLICY "Owners and managers can delete products"
  ON products FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('owner', 'manager', 'admin')
    )
  );

-- ==========================================
-- 3. FIX INVENTORY POLICIES
-- ==========================================

-- Drop existing inventory policies
DROP POLICY IF EXISTS "Users can view inventory in their organization" ON inventory;
DROP POLICY IF EXISTS "Staff can manage inventory" ON inventory;
DROP POLICY IF EXISTS "Warehouse managers can manage warehouse inventory" ON inventory;

-- Recreate with proper separation
CREATE POLICY "Users can view inventory in their organization"
  ON inventory FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Staff can insert inventory"
  ON inventory FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('owner', 'manager', 'admin', 'warehouse_manager', 'cashier')
    )
  );

CREATE POLICY "Staff can update inventory"
  ON inventory FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('owner', 'manager', 'admin', 'warehouse_manager', 'cashier')
    )
  );

CREATE POLICY "Managers can delete inventory"
  ON inventory FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('owner', 'manager', 'admin')
    )
  );

-- ==========================================
-- 4. FIX USER_PROFILES POLICIES
-- ==========================================

-- Drop existing user_profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON user_profiles;
DROP POLICY IF EXISTS "Owners and admins can manage users" ON user_profiles;

-- Recreate with proper permissions
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can view profiles in their organization"
  ON user_profiles FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can insert users"
  ON user_profiles FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can update users"
  ON user_profiles FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid());

-- ==========================================
-- 5. ENSURE INDEXES EXIST
-- ==========================================

-- Warehouses indexes
CREATE INDEX IF NOT EXISTS idx_warehouses_org_id ON warehouses(organization_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_name ON warehouses(organization_id, name);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_org_id ON products(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(organization_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(organization_id, barcode) WHERE barcode IS NOT NULL;

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_org_id ON inventory(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_branch ON inventory(organization_id, branch_id) WHERE branch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_warehouse ON inventory(organization_id, warehouse_id) WHERE warehouse_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(organization_id, product_id);

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_org_id ON user_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(organization_id, role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- ==========================================
-- 6. VERIFY TABLES HAVE RLS ENABLED
-- ==========================================

ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 7. ADD HELPFUL FUNCTIONS
-- ==========================================

-- Function to get user's organization ID (cached for performance)
CREATE OR REPLACE FUNCTION get_user_org_id(user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT organization_id FROM user_profiles WHERE id = user_id LIMIT 1;
$$;

-- Function to check if user has role
CREATE OR REPLACE FUNCTION user_has_role(user_id UUID, required_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = user_id 
    AND role = ANY(required_roles)
  );
$$;

-- ==========================================
-- 8. VERIFY DATA INTEGRITY
-- ==========================================

-- Check for warehouses without organization_id (should be none)
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM warehouses
  WHERE organization_id IS NULL;
  
  IF orphan_count > 0 THEN
    RAISE NOTICE 'WARNING: Found % warehouses without organization_id', orphan_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All warehouses have organization_id';
  END IF;
END $$;

-- Check for products without organization_id
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM products
  WHERE organization_id IS NULL;
  
  IF orphan_count > 0 THEN
    RAISE NOTICE 'WARNING: Found % products without organization_id', orphan_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All products have organization_id';
  END IF;
END $$;

-- ==========================================
-- 9. GRANT NECESSARY PERMISSIONS
-- ==========================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_user_org_id TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_role TO authenticated;

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- These can be run separately to verify the fix

-- 1. Check if warehouses are visible
-- SELECT * FROM warehouses;

-- 2. Check if you can insert a warehouse
-- INSERT INTO warehouses (organization_id, name, location) 
-- VALUES ((SELECT organization_id FROM user_profiles WHERE id = auth.uid()), 'Test Warehouse', 'Test Location');

-- 3. Check your user profile
-- SELECT id, organization_id, role FROM user_profiles WHERE id = auth.uid();

-- 4. Check all policies on warehouses
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE tablename = 'warehouses';

-- ==========================================
-- COMPLETION MESSAGE
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ALL CRITICAL FIXES APPLIED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Fixed:';
  RAISE NOTICE '  ✓ Warehouse policies (added warehouse_manager)';
  RAISE NOTICE '  ✓ Product policies (added warehouse_manager)';
  RAISE NOTICE '  ✓ Inventory policies (all roles)';
  RAISE NOTICE '  ✓ User profile policies';
  RAISE NOTICE '  ✓ Database indexes';
  RAISE NOTICE '  ✓ Helper functions';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Refresh your app (Ctrl+R)';
  RAISE NOTICE '  2. Try creating a warehouse';
  RAISE NOTICE '  3. Try creating a product';
  RAISE NOTICE '  4. Logout and login to verify persistence';
  RAISE NOTICE '========================================';
END $$;
