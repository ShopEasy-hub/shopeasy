-- =====================================================
-- FIX: Add 'address' column to branches table
-- =====================================================

-- Option 1: Add 'address' as a new column (recommended)
ALTER TABLE branches 
ADD COLUMN IF NOT EXISTS address TEXT;

-- Copy existing 'location' data to 'address' if needed
UPDATE branches 
SET address = location 
WHERE address IS NULL AND location IS NOT NULL;

-- =====================================================
-- Verify the change
-- =====================================================
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'branches' 
  AND column_name IN ('address', 'location', 'phone', 'name')
ORDER BY ordinal_position;
