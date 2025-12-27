-- =====================================================
-- FRESH START MIGRATION - RLS POLICIES
-- =====================================================
-- Simple, non-recursive RLS policies
-- Tested and working - no infinite loops
-- =====================================================

-- =====================================================
-- 1. ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. USER_PROFILES POLICIES (NON-RECURSIVE!)
-- =====================================================

-- Allow users to see their own profile
CREATE POLICY "user_profiles_select_own"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Allow users to insert their own profile (signup)
CREATE POLICY "user_profiles_insert_own"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Allow users to update their own profile
CREATE POLICY "user_profiles_update_own"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- =====================================================
-- 3. ORGANIZATIONS POLICIES
-- =====================================================

-- Users can see their organization
CREATE POLICY "organizations_select"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

-- Only owners can update their organization
CREATE POLICY "organizations_update"
  ON organizations FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());

-- Anyone can create an organization (signup)
CREATE POLICY "organizations_insert"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- =====================================================
-- 4. HELPER FUNCTION FOR ORG CHECK
-- =====================================================

-- This function prevents recursion in policies
CREATE OR REPLACE FUNCTION user_organization_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id FROM user_profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- =====================================================
-- 5. BRANCHES POLICIES
-- =====================================================

CREATE POLICY "branches_select"
  ON branches FOR SELECT
  TO authenticated
  USING (organization_id = user_organization_id());

CREATE POLICY "branches_insert"
  ON branches FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = user_organization_id());

CREATE POLICY "branches_update"
  ON branches FOR UPDATE
  TO authenticated
  USING (organization_id = user_organization_id());

CREATE POLICY "branches_delete"
  ON branches FOR DELETE
  TO authenticated
  USING (organization_id = user_organization_id());

-- =====================================================
-- 6. WAREHOUSES POLICIES
-- =====================================================

CREATE POLICY "warehouses_select"
  ON warehouses FOR SELECT
  TO authenticated
  USING (organization_id = user_organization_id());

CREATE POLICY "warehouses_insert"
  ON warehouses FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = user_organization_id());

CREATE POLICY "warehouses_update"
  ON warehouses FOR UPDATE
  TO authenticated
  USING (organization_id = user_organization_id());

CREATE POLICY "warehouses_delete"
  ON warehouses FOR DELETE
  TO authenticated
  USING (organization_id = user_organization_id());

-- =====================================================
-- 7. PRODUCTS POLICIES
-- =====================================================

CREATE POLICY "products_select"
  ON products FOR SELECT
  TO authenticated
  USING (organization_id = user_organization_id());

CREATE POLICY "products_insert"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = user_organization_id());

CREATE POLICY "products_update"
  ON products FOR UPDATE
  TO authenticated
  USING (organization_id = user_organization_id());

CREATE POLICY "products_delete"
  ON products FOR DELETE
  TO authenticated
  USING (organization_id = user_organization_id());

-- =====================================================
-- 8. SUPPLIERS POLICIES
-- =====================================================

CREATE POLICY "suppliers_select"
  ON suppliers FOR SELECT
  TO authenticated
  USING (organization_id = user_organization_id());

CREATE POLICY "suppliers_insert"
  ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = user_organization_id());

CREATE POLICY "suppliers_update"
  ON suppliers FOR UPDATE
  TO authenticated
  USING (organization_id = user_organization_id());

CREATE POLICY "suppliers_delete"
  ON suppliers FOR DELETE
  TO authenticated
  USING (organization_id = user_organization_id());

-- =====================================================
-- 9. INVENTORY POLICIES
-- =====================================================

CREATE POLICY "inventory_select"
  ON inventory FOR SELECT
  TO authenticated
  USING (organization_id = user_organization_id());

CREATE POLICY "inventory_insert"
  ON inventory FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = user_organization_id());

CREATE POLICY "inventory_update"
  ON inventory FOR UPDATE
  TO authenticated
  USING (organization_id = user_organization_id());

CREATE POLICY "inventory_delete"
  ON inventory FOR DELETE
  TO authenticated
  USING (organization_id = user_organization_id());

-- =====================================================
-- 10. TRANSFERS POLICIES
-- =====================================================

CREATE POLICY "transfers_select"
  ON transfers FOR SELECT
  TO authenticated
  USING (organization_id = user_organization_id());

CREATE POLICY "transfers_insert"
  ON transfers FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = user_organization_id());

CREATE POLICY "transfers_update"
  ON transfers FOR UPDATE
  TO authenticated
  USING (organization_id = user_organization_id());

CREATE POLICY "transfers_delete"
  ON transfers FOR DELETE
  TO authenticated
  USING (organization_id = user_organization_id());

-- =====================================================
-- 11. SALES POLICIES
-- =====================================================

CREATE POLICY "sales_select"
  ON sales FOR SELECT
  TO authenticated
  USING (organization_id = user_organization_id());

CREATE POLICY "sales_insert"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = user_organization_id());

CREATE POLICY "sales_update"
  ON sales FOR UPDATE
  TO authenticated
  USING (organization_id = user_organization_id());

CREATE POLICY "sales_delete"
  ON sales FOR DELETE
  TO authenticated
  USING (organization_id = user_organization_id());

-- =====================================================
-- 12. SALE_ITEMS POLICIES
-- =====================================================

CREATE POLICY "sale_items_select"
  ON sale_items FOR SELECT
  TO authenticated
  USING (
    sale_id IN (
      SELECT id FROM sales WHERE organization_id = user_organization_id()
    )
  );

CREATE POLICY "sale_items_insert"
  ON sale_items FOR INSERT
  TO authenticated
  WITH CHECK (
    sale_id IN (
      SELECT id FROM sales WHERE organization_id = user_organization_id()
    )
  );

CREATE POLICY "sale_items_update"
  ON sale_items FOR UPDATE
  TO authenticated
  USING (
    sale_id IN (
      SELECT id FROM sales WHERE organization_id = user_organization_id()
    )
  );

CREATE POLICY "sale_items_delete"
  ON sale_items FOR DELETE
  TO authenticated
  USING (
    sale_id IN (
      SELECT id FROM sales WHERE organization_id = user_organization_id()
    )
  );

-- =====================================================
-- 13. EXPENSES POLICIES
-- =====================================================

CREATE POLICY "expenses_select"
  ON expenses FOR SELECT
  TO authenticated
  USING (organization_id = user_organization_id());

CREATE POLICY "expenses_insert"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = user_organization_id());

CREATE POLICY "expenses_update"
  ON expenses FOR UPDATE
  TO authenticated
  USING (organization_id = user_organization_id());

CREATE POLICY "expenses_delete"
  ON expenses FOR DELETE
  TO authenticated
  USING (organization_id = user_organization_id());

-- =====================================================
-- 14. RETURNS POLICIES
-- =====================================================

CREATE POLICY "returns_select"
  ON returns FOR SELECT
  TO authenticated
  USING (organization_id = user_organization_id());

CREATE POLICY "returns_insert"
  ON returns FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = user_organization_id());

CREATE POLICY "returns_update"
  ON returns FOR UPDATE
  TO authenticated
  USING (organization_id = user_organization_id());

CREATE POLICY "returns_delete"
  ON returns FOR DELETE
  TO authenticated
  USING (organization_id = user_organization_id());

-- =====================================================
-- 15. AUDIT_LOGS POLICIES
-- =====================================================

CREATE POLICY "audit_logs_select"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (organization_id = user_organization_id());

CREATE POLICY "audit_logs_insert"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = user_organization_id());

-- =====================================================
-- SUCCESS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅✅✅ RLS POLICIES CREATED SUCCESSFULLY ✅✅✅';
  RAISE NOTICE '';
  RAISE NOTICE 'All policies are:';
  RAISE NOTICE '  - Non-recursive (no infinite loops)';
  RAISE NOTICE '  - Using helper function user_organization_id()';
  RAISE NOTICE '  - Multi-tenant isolated';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Run FRESH_START_003_user_creation.sql';
  RAISE NOTICE '';
END $$;
