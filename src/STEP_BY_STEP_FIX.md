# 🔧 STEP-BY-STEP FIX GUIDE

## ❌ PROBLEMS YOU'RE EXPERIENCING:
1. ❌ Sales not completing (no receipt)
2. ❌ Transfer stock not adding to inventory
3. ❌ Warehouse transfers not showing

## ✅ ROOT CAUSES IDENTIFIED:
1. **SQL Syntax Errors** in migration file (RAISE NOTICE outside DO blocks)
2. **Wrong Foreign Key Syntax** in transfers query 
3. **Missing organization_id** when fetching branch/warehouse

---

## 🚀 STEP 1: APPLY FIXED SQL MIGRATION

### A. Open Supabase Dashboard
```
1. Go to https://app.supabase.com
2. Select your project
3. Click "SQL Editor" in left sidebar
```

### B. Run the Fixed SQL
```
1. Copy ENTIRE contents of: /supabase/migrations/FIX_INVENTORY_CONSTRAINT.sql
2. Paste into SQL Editor
3. Click "Run" button (or Ctrl+Enter)
4. Wait for completion
```

### C. Verify It Worked
```
1. Copy contents of: /VERIFY_SQL_FIX.sql
2. Paste into SQL Editor
3. Click "Run" 
4. Check results:
   - Test 1: Should show 1 row (function exists)
   - Test 2: Should show NULLS NOT DISTINCT
   - Test 3: Should show 4 policies
   - Test 4: Should show 2 indexes
```

**If ANY test fails, the SQL didn't run correctly. Try again.**

---

## 🚀 STEP 2: HARD REFRESH YOUR BROWSER

```bash
Windows/Linux: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

**OR** clear all browser cache:
```
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"
```

---

## 🚀 STEP 3: TEST EACH FUNCTION

### TEST A: Check if Function Exists in Browser

Open browser console (F12) and run:

```javascript
// Test if the API can call the function
const { supabase } = await import('./lib/supabase');
const { data, error } = await supabase.rpc('upsert_inventory_safe', {
  p_organization_id: 'test',
  p_product_id: 'test',
  p_quantity: 100,
  p_branch_id: 'test',
  p_warehouse_id: null,
  p_updated_by: null
});

console.log('Result:', data, error);
// Should show error about invalid UUID, but NOT "function does not exist"
```

### TEST B: Create a Sale

1. Go to **POS Terminal**
2. Add a product to cart
3. Click "Complete Sale"
4. Fill in payment details
5. Click Confirm

**Watch console (F12) for:**
```
✅ Good:
🛒 [SALE] Deducting stock for: ProductName
  Current stock: 50, Deducting: 1, New: 49
✅ Stock deducted successfully for ProductName
✅ Sale completed successfully

❌ Bad:
function upsert_inventory_safe does not exist
Failed to process sale
```

### TEST C: Create and Approve Transfer

1. Go to **Transfers** page
2. Create new transfer: Branch A → Branch B, Product X, Qty: 5
3. Click "Approve"
4. **Watch console for:**
```
✅ Good:
📤 [APPROVED] Deducting from source branch
  Current: 100, Adjustment: -5, New: 95
✅ Branch stock adjusted successfully

❌ Bad:
❌ Error upserting inventory
function upsert_inventory_safe does not exist
```

5. Click "Complete" (or "Accept" at destination)
6. **Watch console for:**
```
✅ Good:
📥 [COMPLETED] Adding to destination branch
  Current: 50, Adjustment: 5, New: 55
✅ Branch stock adjusted successfully

❌ Bad:
❌ Error upserting inventory
```

### TEST D: Check Warehouse Transfers

1. Go to **Transfers** page
2. Create transfer: Warehouse → Branch
3. Check if it appears in the transfers list

**If it doesn't appear:**
- Check browser console for errors
- Check if the transfer was created (go to Supabase → Table Editor → transfers)

---

## 🔍 TROUBLESHOOTING

### Problem: "function upsert_inventory_safe does not exist"

**Solution:**
```sql
-- Run in Supabase SQL Editor:
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'upsert_inventory_safe';
```

If returns **0 rows**:
- The SQL didn't run
- Re-run `/supabase/migrations/FIX_INVENTORY_CONSTRAINT.sql`
- Check for errors in Supabase SQL Editor output

### Problem: "duplicate key value violates unique constraint"

**Solution:**
```sql
-- Check current constraints:
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'inventory'::regclass AND contype = 'u';
```

If it doesn't show `NULLS NOT DISTINCT`:
- The constraint wasn't updated
- Run this manually:
```sql
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS unique_stock_per_location;
ALTER TABLE inventory 
  ADD CONSTRAINT unique_stock_per_location 
  UNIQUE NULLS NOT DISTINCT (product_id, branch_id, warehouse_id);
```

### Problem: Sales still failing

**Check these in order:**

1. **Is function callable?**
```sql
SELECT upsert_inventory_safe(
  (SELECT id FROM organizations LIMIT 1),
  (SELECT id FROM products LIMIT 1),
  100,
  (SELECT id FROM branches LIMIT 1),
  NULL,
  NULL
);
```

2. **Are RLS policies correct?**
```sql
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'inventory';
-- Should show 4 rows: SELECT, INSERT, UPDATE, DELETE
```

3. **Check actual error:**
- Open browser console (F12)
- Try to complete a sale
- Copy the EXACT error message
- Look for it in Supabase Dashboard → Logs

### Problem: Transfers not showing

**Solution:**
1. Check if transfers exist:
```sql
SELECT * FROM transfers ORDER BY created_at DESC LIMIT 10;
```

2. Check the foreign key joins:
```sql
SELECT 
  t.*,
  fb.name as from_branch_name,
  tb.name as to_branch_name,
  fw.name as from_warehouse_name,
  tw.name as to_warehouse_name
FROM transfers t
LEFT JOIN branches fb ON fb.id = t.from_branch_id
LEFT JOIN branches tb ON tb.id = t.to_branch_id
LEFT JOIN warehouses fw ON fw.id = t.from_warehouse_id
LEFT JOIN warehouses tw ON tw.id = t.to_warehouse_id
ORDER BY t.created_at DESC
LIMIT 10;
```

If this works but app doesn't show them:
- Hard refresh browser (Ctrl+Shift+R)
- Check browser console for errors when loading transfers page

---

## 📊 EXPECTED CONSOLE LOGS

When everything works, you should see:

### On Sale Complete:
```
🛒 [SALE] Deducting stock for: Aspirin 500mg, Qty: 2, Branch: abc-123
  Current stock: 100, Deducting: 2, New: 98
Updated inventory: product=xyz-789, qty=98
✅ Stock deducted successfully for Aspirin 500mg
✅ Sale completed successfully: ID sale-456, Total: 1500
```

### On Transfer Approve:
```
🔄 Handling inventory update for transfer: trans-123 Status: approved
📤 [APPROVED] Deducting from source branch: branch-abc Product: prod-xyz Qty: 10
📊 adjustBranchStock: Branch=branch-abc, Product=prod-xyz, Adjustment=-10
  Organization: org-123
  Current: 50, Adjustment: -10, New: 40
Updated inventory: product=prod-xyz, qty=40
✅ Branch stock adjusted successfully
```

### On Transfer Complete:
```
🔄 Handling inventory update for transfer: trans-123 Status: completed
📥 [COMPLETED] Adding to destination branch: branch-def Product: prod-xyz Qty: 10
📊 adjustBranchStock: Branch=branch-def, Product=prod-xyz, Adjustment=10
  Organization: org-123
  Current: 25, Adjustment: 10, New: 35
Inserted inventory: product=prod-xyz, qty=35
✅ Branch stock adjusted successfully
```

---

## ✅ SUCCESS CRITERIA

All of these must work:

- [ ] SQL migration runs without errors
- [ ] Function `upsert_inventory_safe` exists
- [ ] Unique constraint has `NULLS NOT DISTINCT`
- [ ] 4 RLS policies exist on inventory table
- [ ] Sales complete and show receipt
- [ ] Transfers deduct from source on approve
- [ ] Transfers add to destination on complete
- [ ] Warehouse transfers show in list
- [ ] No errors in browser console
- [ ] Inventory table updates correctly

---

## 🆘 STILL NOT WORKING?

### Last Resort: Manual Test

1. **Get your IDs:**
```sql
SELECT 'Org:', id, name FROM organizations LIMIT 1;
SELECT 'Branch:', id, name FROM branches LIMIT 1;
SELECT 'Product:', id, name FROM products LIMIT 1;
```

2. **Manually call the function:**
```sql
SELECT * FROM upsert_inventory_safe(
  'your-org-id'::uuid,
  'your-product-id'::uuid,
  100, -- quantity
  'your-branch-id'::uuid,
  NULL, -- warehouse_id
  NULL -- updated_by
);
```

3. **Check if it worked:**
```sql
SELECT * FROM inventory 
WHERE product_id = 'your-product-id' 
AND branch_id = 'your-branch-id';
```

**If this fails:**
- Copy the EXACT error message
- Check Supabase Dashboard → Database → Logs
- The error will tell you exactly what's wrong

---

## 📝 CHECKLIST BEFORE ASKING FOR HELP

If it still doesn't work, provide:

- [ ] Screenshot of SQL Editor after running migration
- [ ] Result of `/VERIFY_SQL_FIX.sql` queries
- [ ] Browser console logs when trying to complete sale
- [ ] Browser console logs when trying to approve transfer
- [ ] Exact error message from Supabase logs

---

**This should fix ALL your issues. Follow every step carefully!**
