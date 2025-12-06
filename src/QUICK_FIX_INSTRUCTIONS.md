# 🚨 QUICK FIX: Transfer Receive Error

## Error You're Seeing
```
failed to receive transfer: there is no unique or exclusion 
constraint matching the on conflict specification
```

## 🔧 Quick Fix (30 seconds)

### Step 1: Go to Supabase SQL Editor
1. Open your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Copy and Paste This SQL

```sql
-- Fix Transfer Receive Constraint Error
CREATE OR REPLACE FUNCTION complete_transfer()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    -- Deduct from source
    IF NEW.from_branch_id IS NOT NULL THEN
      UPDATE inventory
      SET quantity = quantity - NEW.quantity, updated_at = NOW()
      WHERE product_id = NEW.product_id AND branch_id = NEW.from_branch_id;
    ELSIF NEW.from_warehouse_id IS NOT NULL THEN
      UPDATE inventory
      SET quantity = quantity - NEW.quantity, updated_at = NOW()
      WHERE product_id = NEW.product_id AND warehouse_id = NEW.from_warehouse_id;
    END IF;
    
    -- Add to destination (FIXED LINE BELOW)
    IF NEW.to_branch_id IS NOT NULL THEN
      INSERT INTO inventory (organization_id, branch_id, product_id, quantity, updated_by)
      VALUES (NEW.organization_id, NEW.to_branch_id, NEW.product_id, NEW.quantity, NEW.approved_by)
      ON CONFLICT ON CONSTRAINT unique_stock_per_location
      DO UPDATE SET
        quantity = inventory.quantity + EXCLUDED.quantity,
        updated_at = NOW(),
        updated_by = EXCLUDED.updated_by;
    ELSIF NEW.to_warehouse_id IS NOT NULL THEN
      INSERT INTO inventory (organization_id, warehouse_id, product_id, quantity, updated_by)
      VALUES (NEW.organization_id, NEW.to_warehouse_id, NEW.product_id, NEW.quantity, NEW.approved_by)
      ON CONFLICT ON CONSTRAINT unique_stock_per_location
      DO UPDATE SET
        quantity = inventory.quantity + EXCLUDED.quantity,
        updated_at = NOW(),
        updated_by = EXCLUDED.updated_by;
    END IF;
    
    NEW.completed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix Return Inventory (bonus fix)
CREATE OR REPLACE FUNCTION add_return_inventory()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO inventory (organization_id, branch_id, product_id, quantity, updated_by)
  VALUES (NEW.organization_id, NEW.branch_id, NEW.product_id, NEW.quantity, NEW.processed_by)
  ON CONFLICT ON CONSTRAINT unique_stock_per_location
  DO UPDATE SET
    quantity = inventory.quantity + EXCLUDED.quantity,
    updated_at = NOW(),
    updated_by = EXCLUDED.updated_by;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Step 3: Run It
1. Click **Run** button (or press Ctrl+Enter / Cmd+Enter)
2. Wait for "Success" message

### Step 4: Test
1. Go back to your ShopEasy app
2. Try to receive a transfer
3. ✅ It should work now!

---

## 📋 What Changed?

**Before (BROKEN):**
```sql
ON CONFLICT (product_id, branch_id, warehouse_id)
```

**After (FIXED):**
```sql
ON CONFLICT ON CONSTRAINT unique_stock_per_location
```

That's it! This tells PostgreSQL to use the named constraint instead of trying to guess which constraint matches the columns.

---

## 🆘 If It Still Doesn't Work

1. **Check the constraint exists:**
   ```sql
   SELECT constraint_name, constraint_type 
   FROM information_schema.table_constraints 
   WHERE table_name = 'inventory' AND constraint_name = 'unique_stock_per_location';
   ```
   Should return 1 row.

2. **Check for other errors:**
   - Look at browser console (F12)
   - Check Supabase logs in dashboard
   - Verify you have the right permissions

3. **Contact Support:**
   - Share the exact error message
   - Share the SQL output from step 1 above

---

**Time to Fix:** ~30 seconds  
**Difficulty:** Copy & Paste  
**Risk:** None (just recreates existing functions)
