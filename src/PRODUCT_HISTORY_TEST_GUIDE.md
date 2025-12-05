# 🧪 Product History Testing Guide

## Quick Test (5 minutes)

### Step 1: Make a Test Sale
1. Go to **POS Terminal**
2. Add any product to cart (e.g., "Paracetamol")
3. Complete the sale
4. Note the product name

### Step 2: Check Product History
1. Go to **Product History** (from Dashboard navigation)
2. Search for the product you just sold
3. Click on it to select
4. **Expected Result:**
   - ✅ You should see the sale you just made
   - ✅ Your name should appear as the cashier
   - ✅ Date/time should be a few seconds ago
   - ✅ Quantity, price, and branch should be correct

---

## Full Test (15 minutes)

### Prerequisites:
- ✅ Login as Owner, Admin, or Auditor (only these roles have access)
- ✅ Have at least one completed sale in the system
- ✅ Database migration has been run

---

### Test 1: Access Control ✅

**Test as Cashier:**
1. Login as a cashier user
2. Try to navigate to Product History
3. **Expected:** ❌ "Access Denied" message
4. **Expected:** Message says "Only Owners, Admins, and Auditors can view product history"

**Test as Owner/Admin/Auditor:**
1. Login as owner/admin/auditor
2. Navigate to Product History
3. **Expected:** ✅ Page loads successfully

---

### Test 2: Product Selection ✅

1. **Search for product:**
   - Type product name in search box
   - **Expected:** Product appears in dropdown list
   
2. **Select product:**
   - Click on a product
   - **Expected:** Product is highlighted with blue background
   - **Expected:** "Change Product" button appears

3. **Change product:**
   - Click "Change Product"
   - **Expected:** Can search for different product

---

### Test 3: Sales History Display ✅

**After selecting a product:**

1. **Check statistics cards:**
   - [ ] Total Sales count (e.g., "5")
   - [ ] Units Sold (e.g., "12")
   - [ ] Total Revenue (e.g., "$1,234.56")
   - [ ] Avg Sale Value (e.g., "$246.91")

2. **Check sales table:**
   - [ ] Date & Time column shows correct dates
   - [ ] Quantity shows as badges (e.g., "2 units")
   - [ ] Price shows per-unit price
   - [ ] Discount shows (if any, otherwise "-")
   - [ ] Subtotal shows correctly
   - [ ] **Cashier name shows** (NOT "Unknown") ⭐ KEY FIX
   - [ ] Branch name shows
   - [ ] Customer name shows
   - [ ] Payment method shows (Cash/POS/Transfer)

3. **No sales case:**
   - Select product with no sales
   - **Expected:** Message "No sales history found for this product"

---

### Test 4: Filters & Sorting ✅

**Date Range Filter:**
1. Select "Today" - Should show only today's sales
2. Select "Last 7 Days" - Should show last week
3. Select "All Time" - Should show everything

**Branch Filter:**
1. Select "All Branches" - Shows all
2. Select specific branch - Shows only that branch's sales

**Sort Options:**
1. Sort by Date (Newest First)
2. Sort by Date (Oldest First)
3. Sort by Quantity
4. Sort by Revenue

**Expected:** List reorders correctly for each option

---

### Test 5: Real Transaction Test ✅

**Important: Test with a NEW sale**

1. **Go to POS:**
   - Add "Product A" to cart (Qty: 3)
   - Complete sale
   - Note the time

2. **Go to Product History:**
   - Search for "Product A"
   - Select it
   
3. **Verify NEW sale appears:**
   - [ ] Shows at top (newest first by default)
   - [ ] Date/time matches (just now)
   - [ ] Quantity = 3
   - [ ] **YOUR NAME shows as cashier** ⭐ KEY TEST
   - [ ] Branch matches your current branch
   - [ ] Payment method correct

**If your name doesn't show:**
- ❌ Bug still exists
- Check database migration ran
- Check console for errors

---

### Test 6: Export to CSV ✅

1. Select product with sales history
2. Click "Export CSV" button
3. **Expected:**
   - CSV file downloads
   - Opens in Excel/Google Sheets
   - Contains all sales data
   - Cashier names included (not "Unknown")

---

## 🐛 Known Issues (Should Be Fixed)

### ~~BEFORE FIX:~~
- ❌ ~~Sales not showing at all~~
- ❌ ~~Cashier always shows "Unknown"~~
- ❌ ~~Empty history even after sales~~

### AFTER FIX:
- ✅ Sales display correctly
- ✅ Cashier names show from user profiles
- ✅ Works with old AND new sales
- ✅ Handles both `cashier_id` and `processed_by` columns

---

## 🔍 Troubleshooting

### Issue: "No sales history found"

**Possible Causes:**

1. **Product has no sales**
   - Solution: Make a test sale with that product

2. **Wrong organization**
   - Solution: Check you're logged into correct org

3. **Date filter too restrictive**
   - Solution: Set to "All Time"

4. **Migration not run**
   - Solution: Run `/supabase/migrations/FIX_SALES_CASHIER_COLUMN.sql`

---

### Issue: Cashier shows "Unknown"

**This should be FIXED now. If still happening:**

1. **Check migration status:**
   ```sql
   -- In Supabase SQL Editor:
   SELECT 
     column_name, 
     data_type 
   FROM information_schema.columns 
   WHERE table_name = 'sales' 
   AND column_name IN ('cashier_id', 'processed_by');
   ```
   **Expected:** Both columns should exist

2. **Check sale has cashier:**
   ```sql
   SELECT 
     id, 
     cashier_id, 
     processed_by,
     created_at
   FROM sales 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```
   **Expected:** At least ONE of these columns has UUID values

3. **Check user profile exists:**
   ```sql
   SELECT id, name, email 
   FROM user_profiles 
   WHERE id = 'cashier-uuid-here';
   ```
   **Expected:** Returns user details

---

### Issue: Page loads slowly

**Normal:**
- First load: 2-3 seconds (loads all products)
- After selecting product: 1-2 seconds

**Too slow (5+ seconds):**
- Check database indexes exist
- Check internet connection
- Check Supabase project status

---

## ✅ Success Checklist

After testing, you should be able to confirm:

- [ ] ✅ Access control works (only Owner/Admin/Auditor)
- [ ] ✅ Can search and select products
- [ ] ✅ Sales history displays with all details
- [ ] ✅ **Cashier names show correctly** (MAIN FIX)
- [ ] ✅ New sales appear immediately
- [ ] ✅ Filters work (date, branch)
- [ ] ✅ Sorting works
- [ ] ✅ Export to CSV works
- [ ] ✅ Statistics cards show correct numbers
- [ ] ✅ No console errors

---

## 📸 Screenshots to Verify

### 1. Search Product
```
┌─────────────────────────────────────┐
│ Search by product name, SKU...     │
│ > Paracetamol                       │
│ ┌─────────────────────────────────┐ │
│ │ Paracetamol 500mg               │ │
│ │ SKU: MED001 • Medicines         │ │
│ │                          $5.00  │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 2. Sales History Table
```
┌────────────┬──────────┬───────┬──────────┬─────────┬────────────┬─────────┐
│ Date       │ Quantity │ Price │ Discount │ Subtotal│ Cashier    │ Branch  │
├────────────┼──────────┼───────┼──────────┼─────────┼────────────┼─────────┤
│ Dec 2, 2024│ 2 units  │ $5.00 │ -        │ $10.00  │ John Doe ✅│ Main    │
│ 10:45:23   │          │       │          │         │            │         │
├────────────┼──────────┼───────┼──────────┼─────────┼────────────┼─────────┤
│ Dec 1, 2024│ 1 unit   │ $5.00 │ 10%      │ $4.50   │ Jane Smith✅│ Branch2 │
│ 14:22:10   │          │       │          │         │            │         │
└────────────┴──────────┴───────┴──────────┴─────────┴────────────┴─────────┘
                                              ✅ Names showing (not "Unknown")
```

---

## 🎯 What This Page Should Do

**For Auditors:**
- Track which products are selling
- See who is selling what (cashier accountability)
- Identify high-performing products
- Detect anomalies (high discounts, unusual quantities)
- Export reports for management

**For Owners:**
- Monitor cashier performance
- Track product movement across branches
- Identify best-selling items
- Make informed inventory decisions

**For Admins:**
- Verify sales data accuracy
- Troubleshoot disputes
- Generate audit trails
- Ensure compliance

---

**Testing Complete When:**
✅ All checklist items pass  
✅ Cashier names display correctly  
✅ No "Unknown" cashiers  
✅ New sales appear immediately  
✅ Export works  
✅ No errors in console

---

**Need Help?**
- Check `/CLEANUP_CHANGES.md` for technical details
- Run database migration if cashier names still "Unknown"
- Verify user role has access (Owner/Admin/Auditor only)
