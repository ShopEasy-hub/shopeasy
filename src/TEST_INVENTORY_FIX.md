# 🧪 Test Plan: Verify Inventory Fix

## Before Running Tests

1. **Run the SQL fix** from `CRITICAL_FIX_INSTRUCTIONS.md`
2. **Refresh your browser** (F5 or Ctrl+R)
3. **Open browser console** (F12) to see detailed logs

## Test 1: Simple Transfer (5 minutes)

### Setup
1. Go to **Inventory** page
2. Note down current stock for a product in Branch A (e.g., "Product X: 100 units")
3. Note down current stock for same product in Branch B (e.g., "Product X: 50 units")

### Execute Transfer
1. Go to **Transfers** page
2. Click "New Transfer"
3. Select:
   - Source: Branch A
   - Destination: Branch B
   - Product: Product X
   - Quantity: 10
4. Add reason: "Test transfer for inventory fix"
5. Click "Create Transfer"

### Approve Transfer
1. Find the pending transfer in the list
2. Click "View" to see details
3. Click "Approve Transfer"
4. ✅ **Expected:** Success message, no errors

### Verify Stock After Approval
1. Go to **Inventory** page
2. Check Branch A stock for Product X
   - ✅ **Expected:** Should be **90** (100 - 10)
3. Check Branch B stock for Product X
   - ✅ **Expected:** Still **50** (not yet received)

### Mark In Transit
1. Go to **Transfers** page
2. Click "In Transit" button
3. ✅ **Expected:** Status changes, no errors

### Complete Transfer
1. Go to **Transfers** page
2. Click "View" on the in-transit transfer
3. Click "Accept" (receiving branch should do this)
4. ✅ **Expected:** Success message

### Verify Final Stock
1. Go to **Inventory** page
2. Check Branch A: **90** ✅
3. Check Branch B: **60** (50 + 10) ✅

---

## Test 2: POS Sale (3 minutes)

### Setup
1. Go to **Inventory** page
2. Note current stock for a product (e.g., "Product Y: 45 units")

### Make a Sale
1. Go to **POS Terminal**
2. Add "Product Y" to cart (quantity: 3)
3. Click "Complete Sale"
4. Enter:
   - Payment Method: Cash
   - Customer: "Test Customer"
5. Click confirm
6. ✅ **Expected:** Sale completes, receipt shows

### Verify Stock
1. Go to **Inventory** page
2. Check stock for Product Y
   - ✅ **Expected:** Should be **42** (45 - 3)

---

## Test 3: Multiple Items Transfer (7 minutes)

### Create Multi-Item Transfer
1. Go to **Transfers** page
2. Click "New Transfer"
3. Add multiple products:
   - Product A: 5 units
   - Product B: 10 units
   - Product C: 3 units
4. Click "Create Transfer"

### Approve All
1. Click "Approve Transfer"
2. ✅ **Expected:** All items' stock deducted from source

### Verify Inventory
1. Check each product's stock in source branch
2. All should be deducted correctly

---

## Test 4: Error Handling (2 minutes)

### Transfer More Than Available
1. Try to create transfer for 1000 units (when only 50 available)
2. ✅ **Expected:** Warning message, but allowed to proceed
3. On approval, stock goes to 0 (not negative)

---

## Console Checks

While performing tests, watch for these logs:

### ✅ Good Signs:
```
📊 adjustBranchStock: Branch=xxx, Product=xxx, Adjustment=-10
  Current: 100, Adjustment: -10, New: 90
✅ Branch stock adjusted successfully
🔄 Handling inventory update for transfer: xxx Status: approved
📤 Deducting from source branch
```

### ❌ Bad Signs (means fix didn't work):
```
❌ Error upserting inventory
duplicate key value violates unique constraint
Failed to approve transfer
```

---

## SQL Verification Queries

Run these in Supabase SQL Editor to verify:

### Check Constraint Exists:
```sql
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'inventory'::regclass 
AND contype = 'u';
```
✅ **Expected:** Should show `NULLS NOT DISTINCT`

### Check Function Exists:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'upsert_inventory_safe';
```
✅ **Expected:** Returns 1 row

### Check Inventory Data:
```sql
SELECT 
  p.name as product,
  b.name as branch,
  i.quantity
FROM inventory i
JOIN products p ON p.id = i.product_id
JOIN branches b ON b.id = i.branch_id
WHERE i.warehouse_id IS NULL
ORDER BY p.name, b.name;
```
✅ **Expected:** Shows current stock levels

### Check Recent Transfers:
```sql
SELECT 
  t.created_at,
  p.name as product,
  t.quantity,
  t.status,
  fb.name as from_branch,
  tb.name as to_branch
FROM transfers t
JOIN products p ON p.id = t.product_id
LEFT JOIN branches fb ON fb.id = t.from_branch_id
LEFT JOIN branches tb ON tb.id = t.to_branch_id
ORDER BY t.created_at DESC
LIMIT 10;
```
✅ **Expected:** Shows your test transfers

---

## Success Criteria

All tests should pass with:
- ✅ No errors in browser console
- ✅ Stock updates correctly after each operation
- ✅ Transfer workflow completes fully
- ✅ POS sales deduct inventory
- ✅ No duplicate key constraint errors

## If Tests Fail

1. Check `CRITICAL_FIX_INSTRUCTIONS.md` again
2. Verify SQL ran completely (all ✅ checkmarks)
3. Try running SQL fix again
4. Clear browser cache and reload
5. Check Supabase Dashboard → Database → Logs for errors

---

## Performance Check

After tests complete:

```sql
-- Check for orphaned inventory records
SELECT COUNT(*) FROM inventory 
WHERE branch_id IS NULL AND warehouse_id IS NULL;
```
✅ **Expected:** 0 (should have either branch or warehouse)

```sql
-- Check for duplicate records
SELECT product_id, branch_id, warehouse_id, COUNT(*) 
FROM inventory 
GROUP BY product_id, branch_id, warehouse_id 
HAVING COUNT(*) > 1;
```
✅ **Expected:** 0 rows (no duplicates)

---

**Once all tests pass, your system is ready for production!** 🚀
