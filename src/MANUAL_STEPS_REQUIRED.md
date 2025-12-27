# 🛠️ Manual Steps Required

## ⚠️ Action Required Before Product History Works

### Step 1: Run Database Migration (CRITICAL) ⭐

**Why:** The sales table needs both `cashier_id` and `processed_by` columns to work properly.

**How:**

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Click "SQL Editor" in left sidebar

2. **Run This Migration:**
   - Open file: `/supabase/migrations/FIX_SALES_CASHIER_COLUMN.sql`
   - Copy the entire contents
   - Paste into Supabase SQL Editor
   - Click "Run" button

3. **Verify Success:**
   You should see output like:
   ```
   ========================================
   🔧 FIXING SALES CASHIER TRACKING
   ========================================
   
   cashier_id exists: true
   processed_by exists: true
   
   ✅ processed_by column already exists
   ✅ cashier_id column already exists
   
   🔄 Migrating data...
   ✅ Copied 0 rows from processed_by to cashier_id
   ✅ Copied 5 rows from cashier_id to processed_by
   
   ========================================
   ✅ MIGRATION COMPLETE
   ========================================
   ```

4. **If You See Errors:**
   - Check Supabase connection
   - Verify you have admin access
   - Try running migration in sections

---

### Step 2: Deploy Code Changes

**Already Done:**
- ✅ Removed DebugPanel.tsx
- ✅ Removed System tab from AdminPanel
- ✅ Fixed ProductHistory query
- ✅ Removed diagnostic routes

**What You Need To Do:**
```bash
# 1. Commit changes
git add .
git commit -m "fix: remove debug tools and fix product history"
git push

# 2. Deploy (if not auto-deployed)
# Your hosting platform will auto-deploy
# Or manually deploy if needed
```

---

### Step 3: Test Product History (REQUIRED)

**Quick Test:**

1. **Login as Owner/Admin**
2. **Go to POS Terminal**
3. **Make a test sale:**
   - Add any product
   - Complete sale
   - Remember the product

4. **Go to Product History page**
5. **Search for that product**
6. **Verify:**
   - [ ] Sale appears in the list
   - [ ] **Your name shows as cashier** (NOT "Unknown") ⭐
   - [ ] All details correct (date, time, quantity, price)

**If Your Name Shows:**
✅ **SUCCESS!** Everything is working

**If It Shows "Unknown":**
❌ Migration didn't run or didn't work
- Go back to Step 1
- Check migration output for errors
- Check database manually (see below)

---

## 🔍 Manual Database Checks

### Check if Columns Exist:

```sql
-- Run in Supabase SQL Editor
SELECT 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'sales' 
AND column_name IN ('cashier_id', 'processed_by');
```

**Expected Result:**
```
column_name  | data_type
-------------+-----------
cashier_id   | uuid
processed_by | uuid
```

**If Missing:**
- ❌ Migration didn't run
- Re-run migration from Step 1

---

### Check Recent Sales Have Cashier Data:

```sql
-- Run in Supabase SQL Editor
SELECT 
    id,
    customer_name,
    cashier_id,
    processed_by,
    created_at
FROM sales 
ORDER BY created_at DESC 
LIMIT 5;
```

**Expected Result:**
```
At least ONE of these columns should have UUID values:
- cashier_id: should be a UUID (e.g., 550e8400-e29b-41d4-a716-446655440000)
- processed_by: should be a UUID

Both can have values, that's fine!
```

**If BOTH are NULL:**
- ❌ Sales are not recording who made them
- Check POS Terminal is passing user ID
- Check api-supabase.ts createSale function

---

### Check User Profiles Exist:

```sql
-- Run in Supabase SQL Editor
SELECT 
    id, 
    name, 
    email,
    role
FROM user_profiles
WHERE organization_id = 'YOUR_ORG_ID_HERE'
ORDER BY name;
```

**Expected:**
- Should see list of users in your organization
- Including yourself

**If Empty:**
- ❌ User profiles not created during signup
- Need to create user profiles manually

---

## 🎯 What Success Looks Like

### ✅ After completing all steps:

1. **Product History page loads**
2. **Can search and select products**
3. **Sales history displays:**
   - Date and time ✅
   - Quantities ✅
   - Prices ✅
   - **Cashier NAMES** (not "Unknown") ✅
   - Branch names ✅
   - Customer names ✅
   - Payment methods ✅

4. **Statistics cards show data:**
   - Total Sales count ✅
   - Units Sold ✅
   - Revenue ✅
   - Average sale value ✅

5. **Export CSV works** ✅

6. **Admin Panel looks clean:**
   - No System tab ✅
   - No dangerous delete buttons ✅
   - No debug/diagnostic options ✅

---

## ❌ What If It Still Doesn't Work?

### Cashier Still Shows "Unknown"

**Debug Steps:**

1. **Check migration ran successfully**
   - Look at migration output
   - Should say "MIGRATION COMPLETE"

2. **Verify columns exist**
   - Run column check query above
   - Both should return rows

3. **Check recent sale has cashier**
   ```sql
   SELECT cashier_id, processed_by 
   FROM sales 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
   - At least ONE should have a UUID

4. **Check user exists**
   ```sql
   SELECT * FROM user_profiles 
   WHERE id = 'uuid-from-above';
   ```
   - Should return user details

5. **Check ProductHistory.tsx logs**
   - Open browser console (F12)
   - Go to Product History page
   - Look for errors
   - Should see successful queries

---

### Sales Not Showing At All

**Debug Steps:**

1. **Verify sale exists in database**
   ```sql
   SELECT * FROM sale_items 
   WHERE product_id = 'YOUR_PRODUCT_ID'
   ORDER BY created_at DESC;
   ```
   - Should see sale_items entries

2. **Check organization filter**
   - ProductHistory filters by organization_id
   - Make sure you're logged into correct org
   - Check appState.organizationId is correct

3. **Check RLS policies**
   ```sql
   SELECT * FROM sale_items 
   -- If this returns nothing, RLS might be blocking
   ```

---

## 📞 Get Help

**If still not working after all steps:**

1. **Check these files:**
   - `/CLEANUP_CHANGES.md` - Full technical details
   - `/PRODUCT_HISTORY_TEST_GUIDE.md` - Testing guide

2. **Provide this info when asking for help:**
   - Migration output (copy/paste)
   - Column check results
   - Recent sales check results
   - Browser console errors (F12 → Console tab)
   - Your role (Owner/Admin/Auditor?)

3. **Common mistakes:**
   - ❌ Forgot to run migration
   - ❌ Running migration on wrong database
   - ❌ Testing as Cashier (need Owner/Admin/Auditor)
   - ❌ Testing product with no sales
   - ❌ Date filter set to "Today" but sale was yesterday

---

## ✅ Quick Checklist

**Before testing Product History:**

- [ ] Database migration ran successfully
- [ ] Code deployed to production
- [ ] Logged in as Owner/Admin/Auditor (not Cashier)
- [ ] Made at least one test sale
- [ ] Browser cache cleared (Ctrl+Shift+R)

**Expected outcome:**
- [ ] Product History shows sales
- [ ] Cashier names display (not "Unknown")
- [ ] All data accurate
- [ ] Export works
- [ ] No console errors

---

## 🚀 Time Estimate

- **Step 1 (Database migration):** 2 minutes
- **Step 2 (Deploy code):** 5 minutes (auto) or 10 minutes (manual)
- **Step 3 (Testing):** 5-10 minutes

**Total:** ~15-20 minutes

---

**Priority:** 🔴 **HIGH** - Product History is broken until migration runs

**Status:** 🟡 **Waiting for manual steps**

**Next:** Run database migration → Deploy → Test
