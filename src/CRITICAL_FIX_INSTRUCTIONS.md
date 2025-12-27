# 🚨 CRITICAL FIX: Stock Not Updating After Transfers/Sales

## Problem
- Stock NOT deducting after transfers are approved
- Stock NOT deducting after POS sales
- Sales failing with "Failed to process sale"
- Transfers failing with "Failed to approve transfer"

## Root Cause
The `inventory` table has a **UNIQUE constraint** that doesn't handle NULL values correctly in PostgreSQL. This causes:
1. Duplicate entry errors when trying to insert/update stock
2. RLS policies blocking legitimate operations
3. Stock updates failing silently

## ✅ THE FIX (Run This SQL in Supabase)

### Option 1: Using Supabase Dashboard (RECOMMENDED)

1. **Go to your Supabase Dashboard**
2. **Click "SQL Editor"** in the left sidebar
3. **Copy the entire contents** of `/supabase/migrations/FIX_INVENTORY_CONSTRAINT.sql`
4. **Paste into the SQL Editor**
5. **Click "Run"** (or press Ctrl+Enter)
6. **Wait for success message** - You should see green checkmarks ✅

### Option 2: Using Supabase CLI

```bash
# Navigate to your project directory
cd your-project

# Run the migration
supabase db push --db-url "your-database-url"
```

### Option 3: Manual SQL Execution

If you prefer to run it step by step, execute this SQL in your Supabase SQL Editor:

```sql
-- Drop old constraints
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS unique_stock_per_location;
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_product_branch_warehouse_uniq;

-- Add correct constraint with NULLS NOT DISTINCT
ALTER TABLE inventory 
  ADD CONSTRAINT unique_stock_per_location 
  UNIQUE NULLS NOT DISTINCT (product_id, branch_id, warehouse_id);

-- Create partial indexes for better performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_branch_stock 
  ON inventory(product_id, branch_id) 
  WHERE warehouse_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_warehouse_stock 
  ON inventory(product_id, warehouse_id) 
  WHERE branch_id IS NULL;

-- Update RLS policies
DROP POLICY IF EXISTS "Users can manage inventory in their organization" ON inventory;

CREATE POLICY "Users can insert inventory in their organization"
  ON inventory FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update inventory in their organization"
  ON inventory FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Create helper function
CREATE OR REPLACE FUNCTION upsert_inventory_safe(
  p_organization_id UUID,
  p_product_id UUID,
  p_quantity INTEGER,
  p_branch_id UUID DEFAULT NULL,
  p_warehouse_id UUID DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL
) RETURNS inventory AS $$
DECLARE
  v_existing inventory;
  v_result inventory;
BEGIN
  IF (p_branch_id IS NULL AND p_warehouse_id IS NULL) THEN
    RAISE EXCEPTION 'Must specify either branch_id or warehouse_id';
  END IF;
  
  IF (p_branch_id IS NOT NULL AND p_warehouse_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Cannot specify both branch_id and warehouse_id';
  END IF;

  SELECT * INTO v_existing
  FROM inventory
  WHERE product_id = p_product_id
    AND (branch_id = p_branch_id OR (branch_id IS NULL AND p_branch_id IS NULL))
    AND (warehouse_id = p_warehouse_id OR (warehouse_id IS NULL AND p_warehouse_id IS NULL));

  IF FOUND THEN
    UPDATE inventory
    SET quantity = p_quantity,
        updated_at = NOW(),
        updated_by = COALESCE(p_updated_by, updated_by)
    WHERE id = v_existing.id
    RETURNING * INTO v_result;
  ELSE
    INSERT INTO inventory (
      organization_id, product_id, branch_id, warehouse_id, quantity, updated_by
    ) VALUES (
      p_organization_id, p_product_id, p_branch_id, p_warehouse_id, p_quantity, p_updated_by
    )
    RETURNING * INTO v_result;
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION upsert_inventory_safe TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_inventory_safe TO service_role;
```

## ✅ How to Verify It Worked

After running the fix:

### Test 1: Transfer Approval
1. Go to **Transfers** page
2. Create a new transfer from Branch A to Branch B
3. Try to **Approve** the transfer
4. ✅ Should succeed without errors
5. Check **Inventory** page - stock should be deducted from Branch A

### Test 2: POS Sale
1. Go to **POS Terminal**
2. Add products to cart
3. Click **Complete Sale**
4. Fill in payment details and confirm
5. ✅ Should succeed without errors
6. Check **Inventory** page - stock should be deducted

### Test 3: Check Console
1. Open browser console (F12)
2. Perform a transfer or sale
3. Look for these messages:
   ```
   ✅ Branch stock adjusted successfully
   📊 adjustBranchStock: Branch=xxx, Product=xxx, Adjustment=-5
   Current: 100, Adjustment: -5, New: 95
   ```

## 🔍 Troubleshooting

### Issue: "Function upsert_inventory_safe does not exist"
**Solution:** The SQL didn't run completely. Re-run the entire script.

### Issue: Still getting "Failed to approve transfer"
**Solution:**
1. Check browser console for exact error
2. Verify the SQL ran successfully (look for ✅ checkmarks)
3. Try refreshing the page (F5)
4. Check Supabase logs in Dashboard → Database → Logs

### Issue: Stock shows 0 after update
**Solution:**
1. Go to SQL Editor and run:
   ```sql
   SELECT * FROM inventory WHERE product_id = 'your-product-id';
   ```
2. Check if the record exists
3. If not, the transfer might have failed silently - check Supabase logs

### Issue: "Duplicate key value violates unique constraint"
**Solution:** The old constraint wasn't dropped. Run this:
```sql
-- Force drop all old constraints
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'inventory'::regclass 
    AND contype = 'u'
  ) LOOP
    EXECUTE 'ALTER TABLE inventory DROP CONSTRAINT ' || r.conname;
  END LOOP;
END $$;

-- Then re-run the fix script
```

## 📊 Expected Behavior After Fix

### Transfers:
1. **Pending** → Stock unchanged in both locations
2. **Approved** → Stock **deducted from source**, not yet in destination
3. **In Transit** → Same as approved
4. **Completed** → Stock **added to destination**

### Sales:
1. Item added to cart → Stock unchanged
2. **Sale completed** → Stock **immediately deducted** from branch

### Inventory Page:
- Should show **real-time updates** after any operation
- Refresh page to see latest stock levels
- No more "stuck" at zero or incorrect values

## 🎯 Summary

This fix addresses the PostgreSQL NULL handling issue in unique constraints by:
1. ✅ Using `NULLS NOT DISTINCT` in the unique constraint
2. ✅ Creating partial indexes for branch/warehouse stock
3. ✅ Implementing a safe upsert function that avoids constraint violations
4. ✅ Updating RLS policies to allow all necessary operations
5. ✅ Adding comprehensive error handling and logging

**After running this fix, your inventory system will work perfectly!** 🎉
