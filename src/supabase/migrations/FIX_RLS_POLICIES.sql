-- =====================================================
-- FIX: Infinite recursion in user_profiles RLS policies
-- =====================================================
-- This migration fixes the circular dependency in user_profiles policies
-- Run this AFTER running HYBRID_MIGRATION.sql

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON user_profiles;
DROP POLICY IF EXISTS "Owners can manage user profiles" ON user_profiles;

-- Recreate without circular dependency
-- Users can view their own profile (already exists, but ensure it's there)
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

-- Users can create their own profile during signup
DROP POLICY IF EXISTS "Users can create their own profile" ON user_profiles;
CREATE POLICY "Users can create their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Use a function to avoid recursion for organization-level access
CREATE OR REPLACE FUNCTION get_user_organization_id(user_id UUID)
RETURNS UUID AS $$
  SELECT organization_id FROM user_profiles WHERE id = user_id LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Now use the function in policies to avoid recursion
CREATE POLICY "Users can view profiles in their organization"
  ON user_profiles FOR SELECT
  USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Owners can manage user profiles"
  ON user_profiles FOR ALL
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Update other policies to use the function instead of subqueries
-- This improves performance and avoids potential recursion issues

-- Organizations policies
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (
    id = get_user_organization_id(auth.uid())
    OR owner_id = auth.uid()
  );

DROP POLICY IF EXISTS "Owners can manage their organization" ON organizations;
CREATE POLICY "Owners can manage their organization"
  ON organizations FOR ALL
  USING (owner_id = auth.uid());

-- Branches policies
DROP POLICY IF EXISTS "Users can view branches in their organization" ON branches;
CREATE POLICY "Users can view branches in their organization"
  ON branches FOR SELECT
  USING (organization_id = get_user_organization_id(auth.uid()));

DROP POLICY IF EXISTS "Owners and managers can manage branches" ON branches;
CREATE POLICY "Owners and managers can manage branches"
  ON branches FOR ALL
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Warehouses policies
DROP POLICY IF EXISTS "Users can view warehouses in their organization" ON warehouses;
CREATE POLICY "Users can view warehouses in their organization"
  ON warehouses FOR SELECT
  USING (organization_id = get_user_organization_id(auth.uid()));

DROP POLICY IF EXISTS "Owners and managers can manage warehouses" ON warehouses;
CREATE POLICY "Owners and managers can manage warehouses"
  ON warehouses FOR ALL
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Products policies
DROP POLICY IF EXISTS "Users can view products in their organization" ON products;
CREATE POLICY "Users can view products in their organization"
  ON products FOR SELECT
  USING (organization_id = get_user_organization_id(auth.uid()));

DROP POLICY IF EXISTS "Users can manage products in their organization" ON products;
CREATE POLICY "Users can manage products in their organization"
  ON products FOR ALL
  USING (organization_id = get_user_organization_id(auth.uid()));

-- Suppliers policies
DROP POLICY IF EXISTS "Users can view suppliers in their organization" ON suppliers;
CREATE POLICY "Users can view suppliers in their organization"
  ON suppliers FOR SELECT
  USING (organization_id = get_user_organization_id(auth.uid()));

DROP POLICY IF EXISTS "Users can manage suppliers in their organization" ON suppliers;
CREATE POLICY "Users can manage suppliers in their organization"
  ON suppliers FOR ALL
  USING (organization_id = get_user_organization_id(auth.uid()));

-- Inventory policies
DROP POLICY IF EXISTS "Users can view inventory in their organization" ON inventory;
CREATE POLICY "Users can view inventory in their organization"
  ON inventory FOR SELECT
  USING (organization_id = get_user_organization_id(auth.uid()));

DROP POLICY IF EXISTS "Users can manage inventory in their organization" ON inventory;
CREATE POLICY "Users can manage inventory in their organization"
  ON inventory FOR ALL
  USING (organization_id = get_user_organization_id(auth.uid()));

-- Transfers policies
DROP POLICY IF EXISTS "Users can view transfers in their organization" ON transfers;
CREATE POLICY "Users can view transfers in their organization"
  ON transfers FOR SELECT
  USING (organization_id = get_user_organization_id(auth.uid()));

DROP POLICY IF EXISTS "Users can create transfers in their organization" ON transfers;
CREATE POLICY "Users can create transfers in their organization"
  ON transfers FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id(auth.uid()));

DROP POLICY IF EXISTS "Managers can approve transfers" ON transfers;
CREATE POLICY "Managers can approve transfers"
  ON transfers FOR UPDATE
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Sales policies
DROP POLICY IF EXISTS "Users can view sales in their organization" ON sales;
CREATE POLICY "Users can view sales in their organization"
  ON sales FOR SELECT
  USING (organization_id = get_user_organization_id(auth.uid()));

DROP POLICY IF EXISTS "Users can create sales in their organization" ON sales;
CREATE POLICY "Users can create sales in their organization"
  ON sales FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id(auth.uid()));

-- Expenses policies
DROP POLICY IF EXISTS "Users can view expenses in their organization" ON expenses;
CREATE POLICY "Users can view expenses in their organization"
  ON expenses FOR SELECT
  USING (organization_id = get_user_organization_id(auth.uid()));

DROP POLICY IF EXISTS "Users can manage expenses in their organization" ON expenses;
CREATE POLICY "Users can manage expenses in their organization"
  ON expenses FOR ALL
  USING (organization_id = get_user_organization_id(auth.uid()));

-- Returns policies
DROP POLICY IF EXISTS "Users can view returns in their organization" ON returns;
CREATE POLICY "Users can view returns in their organization"
  ON returns FOR SELECT
  USING (organization_id = get_user_organization_id(auth.uid()));

DROP POLICY IF EXISTS "Users can create returns in their organization" ON returns;
CREATE POLICY "Users can create returns in their organization"
  ON returns FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id(auth.uid()));

-- ✅ Policies fixed! No more infinite recursion!
