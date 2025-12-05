-- ==========================================
-- 🔧 FIX SUPPLIERS TABLE & LOGIN ISSUES
-- Add missing columns to suppliers table
-- ==========================================

-- ==========================================
-- STEP 1: ADD MISSING COLUMNS TO SUPPLIERS
-- ==========================================

-- Add 'company' column (was called 'contact' in old schema)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'company'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN company TEXT;
    RAISE NOTICE '✅ Added company column';
  ELSE
    RAISE NOTICE '⚠️  company column already exists';
  END IF;
END $$;

-- Add 'product_categories' column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'product_categories'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN product_categories TEXT;
    RAISE NOTICE '✅ Added product_categories column';
  ELSE
    RAISE NOTICE '⚠️  product_categories column already exists';
  END IF;
END $$;

-- Add 'notes' column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'notes'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN notes TEXT;
    RAISE NOTICE '✅ Added notes column';
  ELSE
    RAISE NOTICE '⚠️  notes column already exists';
  END IF;
END $$;

-- Add 'last_supply_date' column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'last_supply_date'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN last_supply_date TIMESTAMPTZ;
    RAISE NOTICE '✅ Added last_supply_date column';
  ELSE
    RAISE NOTICE '⚠️  last_supply_date column already exists';
  END IF;
END $$;

-- ==========================================
-- STEP 2: MIGRATE DATA IF NEEDED
-- ==========================================

-- Copy 'contact' to 'company' if company is empty
UPDATE suppliers 
SET company = contact 
WHERE company IS NULL AND contact IS NOT NULL;

-- ==========================================
-- STEP 3: CHECK USER_PROFILES FOR CASHIERS
-- ==========================================

-- Show all users and their roles
DO $$
DECLARE
  v_user RECORD;
  v_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '👥 CHECKING USER PROFILES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  SELECT COUNT(*) INTO v_count FROM user_profiles;
  RAISE NOTICE 'Total users in user_profiles: %', v_count;
  RAISE NOTICE '';
  
  FOR v_user IN 
    SELECT 
      up.id,
      up.name,
      up.email,
      up.role,
      up.organization_id,
      up.branch_id,
      au.email as auth_email
    FROM user_profiles up
    LEFT JOIN auth.users au ON au.id = up.id
    ORDER BY up.role, up.created_at
  LOOP
    RAISE NOTICE '  User: % (%) - Role: % - Auth Email: %', 
      v_user.name, 
      v_user.email, 
      v_user.role,
      COALESCE(v_user.auth_email, '❌ NOT IN AUTH');
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

-- ==========================================
-- STEP 4: VERIFICATION
-- ==========================================

DO $$
DECLARE
  v_has_company boolean;
  v_has_product_categories boolean;
  v_has_notes boolean;
  v_supplier_count integer;
  v_user_count integer;
BEGIN
  -- Check columns
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'company'
  ) INTO v_has_company;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'product_categories'
  ) INTO v_has_product_categories;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'notes'
  ) INTO v_has_notes;

  SELECT COUNT(*) INTO v_supplier_count FROM suppliers;
  SELECT COUNT(*) INTO v_user_count FROM user_profiles;

  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════════════';
  RAISE NOTICE '║  ✅ SUPPLIERS TABLE FIXED';
  RAISE NOTICE '╚════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Suppliers Table Columns:';
  RAISE NOTICE '  - company: %', CASE WHEN v_has_company THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '  - product_categories: %', CASE WHEN v_has_product_categories THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '  - notes: %', CASE WHEN v_has_notes THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '';
  RAISE NOTICE 'Data:';
  RAISE NOTICE '  - Total suppliers: %', v_supplier_count;
  RAISE NOTICE '  - Total users: %', v_user_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Check the user list above for cashier credentials';
  RAISE NOTICE '  2. Refresh browser (Ctrl+Shift+R)';
  RAISE NOTICE '  3. Try adding supplier again';
  RAISE NOTICE '  4. If cashier login fails, check if user exists in auth.users';
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
END $$;

-- ==========================================
-- SHOW CURRENT SUPPLIERS TABLE SCHEMA
-- ==========================================

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'suppliers'
ORDER BY ordinal_position;
