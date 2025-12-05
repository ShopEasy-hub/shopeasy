# ⚡ ACTION PLAN - Fix All Critical Issues

**Date:** November 24, 2025  
**Status:** 🔴 CRITICAL - Requires Immediate Action

---

## 🚨 CRITICAL ISSUE SUMMARY

You're experiencing 4 major problems:
1. **Warehouses disappearing after logout** ← DATABASE/RLS ISSUE
2. **Cannot see warehouses in Warehouse Inventory**  
3. **Product creation failing validation**
4. **User creation failing**

**Root Cause:** RLS (Row Level Security) policies are too restrictive and missing `warehouse_manager` role.

---

## 📋 STEP-BY-STEP FIX (DO THIS IN ORDER)

### ✅ STEP 1: Run the SQL Fix Script

**This is THE MOST IMPORTANT step!**

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Open the file `/supabase/migrations/FIX_ALL_CRITICAL_ISSUES.sql`
4. Copy the ENTIRE contents
5. Paste into Supabase SQL Editor
6. Click **RUN** button

**What this does:**
- Fixes warehouse policies to include `warehouse_manager` role
- Fixes product policies  
- Fixes inventory policies
- Fixes user_profiles policies
- Adds helpful database functions
- Creates proper indexes for performance

**Expected Output:**
```
✅ ALL CRITICAL FIXES APPLIED
----------------------------------------
Fixed:
  ✓ Warehouse policies (added warehouse_manager)
  ✓ Product policies (added warehouse_manager)
  ✓ Inventory policies (all roles)
  ✓ User profile policies
  ✓ Database indexes
  ✓ Helper functions
```

---

### ✅ STEP 2: Test Warehouse Creation & Persistence

After running the SQL script:

1. **Logout** of your app completely
2. **Login** again (fresh session)
3. Go to **Warehouses** page
4. Click **Create Warehouse**
5. Fill in:
   - Name: "Main Warehouse"
   - Location: "Lagos"  
   - Manager: "Your Name"
   - Phone: "+234..."
6. Click **Create**
7. **Logout** and **Login** again
8. Go back to **Warehouses** page
9. **VERIFY:** The warehouse should still be there!

**If it's still disappearing:**
- Open browser console (F12)
- Look for errors
- Check if `organization_id` is present in logs
- Send me the error messages

---

### ✅ STEP 3: Test Warehouse Inventory

1. Go to **Warehouse Inventory** page
2. **Check the console logs** (F12 → Console tab)
3. Look for these messages:
   ```
   📦 Loading warehouses for organization: <uuid>
   ✅ Warehouses API response: [...]
   📊 Number of warehouses: X
   ```

4. **If you see "0 warehouses":**
   - This means Step 2 failed
   - Warehouses aren't being saved properly
   - Check RLS policies in Supabase

5. **If you see warehouses in console but not in UI:**
   - This is a UI state issue
   - Refresh the page (Ctrl+R)
   - Clear cache and reload (Ctrl+Shift+R)

---

### ✅ STEP 4: Test Product Creation

1. Make sure Step 3 is working (warehouse is selected)
2. Click **Add Product** button
3. Fill in ONLY the required fields:
   - **Name:** "Test Product"
   - **SKU:** "TEST001"  
   - **Price:** 100
4. Leave all other fields empty
5. Click **Add Product**

**Expected Result:**
```
✅ Product "Test Product" created successfully!
No initial stock added
```

**If it still fails:**
- Open console (F12)
- Look for the error message starting with "❌"
- Send me the exact error

---

### ✅ STEP 5: Deploy Edge Function for User Creation

**Why this is needed:** User creation requires admin privileges that can't be used from the browser.

**Option A: Using Supabase CLI (Recommended)**

```bash
# 1. Install Supabase CLI (if not already)
npm install -g supabase

# 2. Login to Supabase
supabase login

# 3. Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# 4. Deploy the function
supabase functions deploy create-organization-user

# 5. Verify deployment
supabase functions list
```

**Option B: Manual Deployment via Dashboard**

1. Go to Supabase Dashboard
2. Click **Edge Functions** in sidebar
3. Click **Create a new function**
4. Name: `create-organization-user`
5. Copy code from `/supabase/functions/create-organization-user/index.ts`
6. Paste into editor
7. Click **Deploy**

---

### ✅ STEP 6: Test User Creation

After deploying the Edge Function:

1. Go to **Users** page (as owner or admin)
2. Click **Add User**
3. Fill in:
   - Name: "Test Cashier"
   - Email: "test@example.com"
   - Password: "Test123456"
   - Role: "cashier"
   - Branch: (select any branch)
4. Click **Create User**

**Expected Result:**
```
✅ User created successfully!
```

**If it fails:**
- Check Edge Function logs in Supabase Dashboard
- Look for error message in console
- Verify function is deployed: `supabase functions list`

---

## 🔍 DEBUGGING GUIDE

### Problem: "No warehouses available"

**Check these in order:**

1. **Browser Console (F12 → Console)**
   ```javascript
   // Look for these logs:
   📦 Loading warehouses for organization: <uuid>
   ✅ Warehouses API response: [...]
   ```

2. **Supabase SQL Editor**
   ```sql
   -- Run this to see YOUR warehouses
   SELECT * FROM warehouses 
   WHERE organization_id = (
     SELECT organization_id FROM user_profiles WHERE id = auth.uid()
   );
   ```

3. **Check RLS Policies**
   ```sql
   -- Run this to see warehouse policies
   SELECT policyname, cmd, qual 
   FROM pg_policies 
   WHERE tablename = 'warehouses';
   ```

4. **Verify your user profile has organization_id**
   ```sql
   SELECT id, organization_id, role 
   FROM user_profiles 
   WHERE id = auth.uid();
   ```

---

### Problem: "Product creation fails"

**Common causes:**

1. **Warehouse not selected**
   - Solution: Select a warehouse from dropdown first

2. **Price is invalid**
   - Must be a number > 0
   - Example: 100 (not "100 Naira")

3. **SKU already exists**
   - SKUs must be unique within organization
   - Try a different SKU like "TEST-" + random numbers

**Debug steps:**
```javascript
// In browser console, paste this before creating product:
console.log('Form data:', {
  name: 'value from form',
  sku: 'value from form',
  price: 'value from form',
  selectedWarehouse: 'warehouse id'
});
```

---

### Problem: "User creation fails"

**Most common cause:** Edge Function not deployed

**Check if deployed:**
```bash
supabase functions list
# Should show: create-organization-user
```

**Check function logs:**
1. Go to Supabase Dashboard
2. Click **Edge Functions**
3. Click **create-organization-user**
4. Click **Logs** tab
5. Look for recent errors

**Common errors:**
- "No authorization header" → User not logged in
- "Insufficient permissions" → User is not owner/admin
- "Email already exists" → Try different email

---

## ✅ VERIFICATION CHECKLIST

After completing all steps, verify:

- [ ] Run SQL script in Supabase
- [ ] Create a warehouse
- [ ] Logout and login
- [ ] Warehouse still exists
- [ ] Warehouse Inventory shows the warehouse
- [ ] Can create a product with only Name/SKU/Price
- [ ] Product appears in warehouse inventory
- [ ] Deploy Edge Function
- [ ] Can create a user
- [ ] New user can login

---

## 📊 WHAT THE SQL SCRIPT FIXES

### Before (Current State - BROKEN)
```sql
-- Warehouse policies only allow 'owner' and 'manager'
CREATE POLICY "Owners and managers can manage warehouses"
  ON warehouses FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('owner', 'manager')  -- ❌ Missing warehouse_manager
    )
  );
```

### After (Fixed)
```sql
-- Now includes 'warehouse_manager' and 'admin'
CREATE POLICY "Owners, managers, and warehouse managers can manage warehouses"
  ON warehouses FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('owner', 'manager', 'admin', 'warehouse_manager')  -- ✅ Fixed!
    )
  );
```

**This means:**
- warehouse_manager role can now create/update warehouses
- admin role can manage warehouses  
- Separate policies for INSERT/UPDATE/DELETE (more secure)
- Better performance with indexes

---

## 🆘 IF NOTHING WORKS

**Collect this information and send to me:**

1. **Browser Console Logs**
   ```
   Open F12 → Console tab
   Try the failing action
   Copy ALL red error messages
   ```

2. **SQL Query Result**
   ```sql
   -- Run in Supabase SQL Editor
   SELECT 
     (SELECT COUNT(*) FROM warehouses) as total_warehouses,
     (SELECT COUNT(*) FROM warehouses WHERE organization_id = 
       (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
     ) as my_warehouses,
     (SELECT role FROM user_profiles WHERE id = auth.uid()) as my_role,
     (SELECT organization_id FROM user_profiles WHERE id = auth.uid()) as my_org_id;
   ```

3. **Edge Function Status**
   ```bash
   supabase functions list
   ```

4. **RLS Policy Check**
   ```sql
   SELECT tablename, policyname, cmd, roles
   FROM pg_policies 
   WHERE tablename IN ('warehouses', 'products', 'inventory', 'user_profiles');
   ```

---

## 🎯 EXPECTED TIMELINE

- **Step 1 (SQL Script):** 2 minutes
- **Step 2 (Test Warehouse):** 3 minutes  
- **Step 3 (Test Inventory):** 2 minutes
- **Step 4 (Test Product):** 2 minutes
- **Step 5 (Deploy Function):** 5 minutes
- **Step 6 (Test User):** 2 minutes

**Total Time:** ~15-20 minutes

---

## 📞 SUPPORT

If you're stuck after following all steps:

1. Take screenshots of:
   - Browser console errors
   - SQL query results
   - The page where it's failing

2. Note exactly which step failed

3. Share the logs from browser console

I'll help you debug further!

---

**Remember:** The SQL script (Step 1) is THE MOST IMPORTANT. Everything else depends on it.

**Status:** 🟡 Ready to fix - follow steps above
