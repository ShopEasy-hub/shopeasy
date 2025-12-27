-- =====================================================
-- Upgrade Demo Account to Unlimited Enterprise Plan
-- =====================================================
-- This script upgrades a specific account to Enterprise plan
-- with unlimited access for demo purposes

-- INSTRUCTIONS:
-- 1. Find the organization ID you want to upgrade
-- 2. Replace 'YOUR_ORG_EMAIL_HERE' with the owner's email
-- 3. Run this script in Supabase Dashboard SQL Editor

-- =====================================================
-- STEP 1: Find the organization by owner email
-- =====================================================
-- Run this query FIRST to find the organization:
/*
SELECT 
  o.id as org_id,
  o.name as org_name,
  o.subscription_plan,
  o.subscription_status,
  up.email as owner_email
FROM organizations o
JOIN user_profiles up ON up.id = o.owner_id
WHERE up.email = 'YOUR_ORG_EMAIL_HERE';
*/

-- =====================================================
-- STEP 2: Upgrade to Enterprise (replace ORG_ID)
-- =====================================================
-- Option A: Upgrade specific organization by ID
-- UPDATE organizations
-- SET 
--   subscription_plan = 'enterprise',
--   subscription_status = 'active',
--   subscription_end_date = NOW() + INTERVAL '1 year', -- 1 year access
--   trial_start_date = NULL -- Clear trial since now paid
-- WHERE id = 'YOUR_ORG_ID_HERE';

-- Option B: Upgrade by owner email (safer if you know the email)
UPDATE organizations o
SET 
  subscription_plan = 'enterprise',
  subscription_status = 'active',
  subscription_end_date = NOW() + INTERVAL '1 year', -- 1 year access
  trial_start_date = NULL, -- Clear trial since now paid
  updated_at = NOW()
FROM user_profiles up
WHERE o.owner_id = up.id
  AND up.email = 'YOUR_ORG_EMAIL_HERE'; -- ⚠️ REPLACE THIS

-- =====================================================
-- STEP 3: Verify the upgrade
-- =====================================================
SELECT 
  o.id,
  o.name as organization,
  o.subscription_plan as plan,
  o.subscription_status as status,
  o.subscription_end_date as expires_on,
  up.email as owner_email,
  up.name as owner_name
FROM organizations o
JOIN user_profiles up ON up.id = o.owner_id
WHERE up.email = 'YOUR_ORG_EMAIL_HERE'; -- ⚠️ REPLACE THIS

-- =====================================================
-- EXPECTED RESULT AFTER UPGRADE:
-- =====================================================
-- plan: enterprise
-- status: active
-- expires_on: 1 year from now
-- 
-- Enterprise Plan Features:
-- ✅ Unlimited warehouses
-- ✅ Unlimited branches
-- ✅ All features unlocked
-- ✅ No restrictions
-- =====================================================

-- =====================================================
-- QUICK REFERENCE: All Plan Limits
-- =====================================================
/*
Starter Plan:
- Branches: 1
- Warehouses: 0 (no access)
- Warehouse/Supplier/Supply Chain: ❌ Blocked

Standard Plan:
- Branches: 2
- Warehouses: 1
- Warehouse/Supplier/Supply Chain: ✅ Allowed

Growth Plan:
- Branches: 4
- Warehouses: 2
- Warehouse/Supplier/Supply Chain: ✅ Allowed

Enterprise Plan:
- Branches: Unlimited (999)
- Warehouses: Unlimited (999)
- Warehouse/Supplier/Supply Chain: ✅ Allowed
- All Features: ✅ Full Access
*/
