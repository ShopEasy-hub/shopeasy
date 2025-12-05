-- =====================================================
-- COMPLETE FIX: Add missing 'address' column to branches
-- =====================================================

-- Step 1: Add the 'address' column
ALTER TABLE branches 
ADD COLUMN IF NOT EXISTS address TEXT;

-- Step 2: Migrate existing 'location' data to 'address' (if any)
UPDATE branches 
SET address = location 
WHERE address IS NULL AND location IS NOT NULL;

-- Step 3: Create an index for better performance (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_branches_organization 
ON branches(organization_id);

-- =====================================================
-- Verify the fix
-- =====================================================
SELECT 
  'Verification:' as info,
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'branches' 
  AND column_name IN ('id', 'organization_id', 'name', 'address', 'location', 'phone', 'is_headquarters')
ORDER BY ordinal_position;

-- Show current branches
SELECT 
  'Current branches:' as info,
  id, 
  organization_id, 
  name, 
  address, 
  location,
  phone,
  is_headquarters
FROM branches;
