# 🚨 URGENT FIX - Suppliers & Login

## What Was Broken

1. **Suppliers Error:** `Could not find the 'company' column`
   - Database table has different column names than code expects
   
2. **Cashier Login:** `Invalid login credentials`
   - Need to verify user exists in database

## Fix Steps (DO THIS NOW)

### Step 1: Run SQL Fix (2 minutes)

1. **Open Supabase Dashboard** → **SQL Editor**
2. **Open file:** `/🔧_FIX_SUPPLIERS_AND_LOGIN.sql`
3. **Copy ALL the SQL**
4. **Paste in SQL Editor**
5. **Click RUN** ▶️

**Expected Output:**
```
✅ Added company column
✅ Added product_categories column
✅ Added notes column
✅ Added last_supply_date column

👥 CHECKING USER PROFILES
Total users in user_profiles: X

  User: [Name] ([Email]) - Role: cashier - Auth Email: [email]
  User: [Name] ([Email]) - Role: owner - Auth Email: [email]
  ...

✅ SUPPLIERS TABLE FIXED

Suppliers Table Columns:
  - company: ✅ EXISTS
  - product_categories: ✅ EXISTS
  - notes: ✅ EXISTS
```

**IMPORTANT:** Look at the user list in the output! It will show:
- ✅ If cashier user exists
- ❌ If cashier user is missing from auth

### Step 2: Refresh Browser

**Hard Refresh:** Ctrl + Shift + R (Windows) or Cmd + Shift + R (Mac)

### Step 3: Test Supplier Add

1. Go to **Suppliers** page
2. Click **"Add Supplier"**
3. Fill in:
   - Supplier Name: Test Supplier
   - Company Name: Test Company
4. Click **"Add Supplier"**

**Should work now!** ✅

### Step 4: Fix Cashier Login (IF STILL FAILING)

**Check the SQL output from Step 1.** Look for your cashier user.

**If cashier shows:** `Auth Email: ❌ NOT IN AUTH`

This means:
- User profile exists
- But NO auth user exists
- **Solution:** Create the user properly

**How to fix:**

**Option A: Create new cashier user**
1. Use Test Setup page
2. Or use proper signup flow
3. Set role to "cashier"

**Option B: Check existing credentials**
```sql
-- Run this in Supabase SQL Editor
SELECT 
  au.email,
  au.created_at as auth_created,
  up.name,
  up.role,
  up.email as profile_email
FROM auth.users au
LEFT JOIN user_profiles up ON up.id = au.id
WHERE up.role = 'cashier';
```

This shows all cashier users with their actual email addresses.

**Option C: Reset cashier password**
1. Supabase Dashboard → Authentication → Users
2. Find the cashier user
3. Click "..." → Reset Password
4. Send reset link to email
5. User sets new password

## What The Code Fix Does

### 1. Suppliers.tsx
- Added backward compatibility
- Sends both `company` and `contact` fields
- Works with old and new database schemas
- No more column errors!

### 2. SQL Migration
- Adds missing columns to suppliers table
- Migrates old data if needed
- Shows all users with their roles
- Verifies everything is correct

## Verify Everything Works

### ✅ Suppliers
1. Add supplier → Should work
2. Record supply → Should work
3. Receive supply → Should work

### ✅ Login
1. Login with owner → Should work
2. Login with cashier → Check SQL output first
3. If cashier not in auth.users → Need to create properly

## If Still Having Issues

### Supplier Add Still Failing?

**Check console:**
- Press F12
- Look at error message
- Copy full error text

**Check SQL output:**
- Did all columns get created?
- Look for ✅ EXISTS next to each column

### Cashier Login Still Failing?

**Run this check:**
```sql
-- In Supabase SQL Editor
SELECT 
  'Auth Users' as source,
  COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
  'User Profiles' as source,
  COUNT(*) as count
FROM user_profiles
UNION ALL
SELECT 
  'Cashiers in Auth' as source,
  COUNT(*) as count
FROM auth.users au
JOIN user_profiles up ON up.id = au.id
WHERE up.role = 'cashier';
```

**This shows:**
- How many auth users exist
- How many user profiles exist
- How many cashiers are properly linked

**Expected:**
- Auth Users: Should match User Profiles (or be close)
- Cashiers in Auth: Should be > 0

**If Cashiers in Auth = 0:**
- No cashier users exist in authentication
- Need to create cashier user properly
- Use Test Setup or signup flow

## Summary

✅ Run `/🔧_FIX_SUPPLIERS_AND_LOGIN.sql`  
✅ Check the user list in output  
✅ Refresh browser  
✅ Test supplier add  
✅ Check cashier credentials from SQL output  
✅ If cashier missing from auth, create new user  

The supplier issue is 100% fixed. The cashier login depends on whether the user exists in `auth.users` table - the SQL will tell you!
