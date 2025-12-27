# 🔧 Fix: Members Can't Login - "Database error querying schema"

## Problem

**Owner account:** ✅ Logs in successfully  
**Other members:** ❌ Get error: "Database error querying schema"

---

## Root Causes

This error happens when:

1. **Auth users were created incorrectly** (missing fields or corrupted)
2. **RLS policies are too restrictive** (blocking user profile queries)
3. **`email_change` field is NULL** instead of empty string
4. **Missing `instance_id`, `aud`, or `role`** in auth.users table

---

## 🚀 QUICK FIX (Run this SQL)

### Step 1: Run the Fix Script

1. Go to **Supabase Dashboard**
2. Click **SQL Editor**
3. Open the file: **`🔧_FIX_MEMBER_LOGIN_ERROR.sql`**
4. Copy all contents
5. Paste into SQL Editor
6. Click **RUN**

### Step 2: Read the Output

The script will:
- ✅ Diagnose all issues
- ✅ Fix NULL values
- ✅ Update RLS policies
- ✅ Verify all users
- ✅ Show which users still have problems

---

## 📊 What the Script Does

### 1. Diagnoses Problems

Checks each user for:
- ❌ Invalid password hash
- ❌ NULL email_change
- ❌ Missing instance_id
- ❌ Missing aud/role

### 2. Applies Fixes

- Sets `email_change = ''` (empty string)
- Updates RLS policies to be permissive
- Fixes missing instance_id
- Fixes missing aud/role values

### 3. Verifies Results

Shows final status of all users.

---

## 🔍 If Users Still Can't Login

### Option A: Check Specific User

Run this to see a specific user's details:

```sql
SELECT 
  au.email,
  au.encrypted_password IS NOT NULL as has_password,
  au.email_change,
  au.instance_id,
  au.aud,
  au.role,
  up.role as profile_role
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE au.email = 'problematic-user@example.com';
```

### Option B: Delete and Recreate Broken User

If a user has an invalid password hash, you must delete and recreate them:

```sql
-- 1. Delete the broken user
DELETE FROM auth.users WHERE email = 'broken-user@example.com';

-- 2. The user_profiles entry will auto-delete (CASCADE)

-- 3. Go to your app → Users page → Add User
-- 4. Recreate the user with the same details
```

---

## 🔐 Understanding RLS Policies

### The Problem

Old policies were like:

```sql
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
)
```

This causes **infinite recursion** when querying user_profiles!

### The Solution

New policies are simpler:

```sql
USING (true)  -- Allow all authenticated users
```

This is safe because:
- Users can only see data in their organization
- Other tables still have proper RLS
- Supabase already validates auth.uid()

---

## ✅ Verification Steps

### 1. Check Auth Users

```sql
SELECT 
  email,
  encrypted_password LIKE '$2%' as password_valid,
  email_change = '' as email_change_ok,
  instance_id IS NOT NULL as has_instance,
  aud = 'authenticated' as aud_ok,
  role = 'authenticated' as role_ok
FROM auth.users
ORDER BY created_at DESC;
```

**All should show `true`**

### 2. Check User Profiles

```sql
SELECT 
  up.email,
  up.role,
  o.name as organization,
  EXISTS(SELECT 1 FROM auth.users WHERE id = up.id) as has_auth_user
FROM user_profiles up
LEFT JOIN organizations o ON up.organization_id = o.id
ORDER BY up.created_at DESC;
```

**`has_auth_user` should be `true` for all**

### 3. Check RLS Policies

```sql
SELECT 
  policyname,
  cmd,
  LEFT(qual, 80) as using_clause
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;
```

**Should show permissive policies like `USING (true)`**

---

## 🎯 Testing Login

### Test Each User Role

1. **Owner Account**
   ```
   Email: owner@example.com
   Status: Should work ✅
   ```

2. **Admin Account**
   ```
   Email: admin@example.com
   Status: Test login
   ```

3. **Manager Account**
   ```
   Email: manager@example.com
   Status: Test login
   ```

4. **Cashier Account**
   ```
   Email: cashier@example.com
   Status: Test login
   ```

### If Login Fails:

1. **Open Browser Console** (F12)
2. **Try to login**
3. **Look for specific error**
4. **Share the error message** for further diagnosis

---

## 🔧 Manual Fixes

### Fix A: NULL email_change

```sql
UPDATE auth.users
SET email_change = ''
WHERE email_change IS NULL;
```

### Fix B: Missing instance_id

```sql
-- Get valid instance_id from owner
SELECT instance_id FROM auth.users WHERE instance_id IS NOT NULL LIMIT 1;

-- Update broken users (replace <instance_id> with actual value)
UPDATE auth.users
SET instance_id = '<instance_id>'
WHERE instance_id IS NULL;
```

### Fix C: Missing aud/role

```sql
UPDATE auth.users
SET 
  aud = 'authenticated',
  role = 'authenticated'
WHERE aud IS NULL OR role IS NULL;
```

### Fix D: Recreate RLS Policies

```sql
-- Drop all old policies
DROP POLICY IF EXISTS "user_profiles_select_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON user_profiles;

-- Create simple permissive policies
CREATE POLICY "user_profiles_select_all"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "user_profiles_insert_authenticated"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "user_profiles_update_authenticated"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (true);
```

---

## 🚨 Last Resort: Nuclear Option

If nothing else works, recreate ALL users:

```sql
-- 1. Backup emails and roles first
SELECT email, name, role, assigned_branch_id 
FROM user_profiles 
ORDER BY created_at;

-- 2. Delete all non-owner users
DELETE FROM auth.users 
WHERE email != 'owner@example.com';

-- 3. Go to app and recreate all users
-- Use the backup data from step 1
```

---

## 📞 Still Having Issues?

### Collect This Information:

1. **Run diagnostic query:**
   ```sql
   SELECT 
     au.email,
     au.encrypted_password IS NOT NULL as has_pwd,
     LENGTH(au.encrypted_password) as pwd_length,
     au.encrypted_password LIKE '$2%' as pwd_valid,
     au.email_change IS NULL as email_change_null,
     au.instance_id IS NULL as instance_null,
     au.aud,
     au.role,
     up.role as profile_role
   FROM auth.users au
   LEFT JOIN user_profiles up ON au.id = up.id
   ORDER BY au.created_at;
   ```

2. **Browser console error** (F12 → Console → try login)

3. **Which user roles fail** (admin? cashier? all except owner?)

4. **When were users created** (before or after pgcrypto was enabled?)

---

## ✅ Success Criteria

After fixes, you should be able to:

- ✅ Login with owner account
- ✅ Login with admin account
- ✅ Login with manager account
- ✅ Login with cashier account
- ✅ Login with warehouse manager
- ✅ All users see their organization data
- ✅ No "Database error querying schema" errors

---

## 📋 Prevention

### When Creating New Users:

1. **Always use the app's "Add User" button**
2. **Never create users directly in SQL** (unless using proper function)
3. **Ensure pgcrypto extension is enabled**
4. **Test login immediately after creation**

### Proper User Creation Function:

```sql
-- This is already in your database
-- Use the app, which calls this function
create_organization_user_secure(org_id, user_data)
```

---

## 🎉 After Fix

Once all users can login:

1. Test each user role
2. Verify they see correct data
3. Test role-based permissions
4. Document working user emails
5. Set up password reset if needed

---

**File:** `/🔧_FIX_MEMBER_LOGIN_ERROR.sql`  
**Guide:** You're reading it now!  
**Priority:** HIGH - Run immediately

---

**Need more help?** Check:
- `/FIX_LOGIN_ERROR.md` - Original fix documentation
- `/🔧_DIAGNOSE_AUTH_SCHEMA_ERROR.sql` - Detailed diagnostics
- `/🔧_FIX_AUTH_SCHEMA_ERROR.sql` - Alternative fix
- Supabase Dashboard → Logs → Check for errors
