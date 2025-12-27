# 🔧 Fix: "Database error querying schema" Login Error

## Problem
When trying to login with cashier credentials, you get:
```
AuthApiError: Database error querying schema
```

## Root Cause
This happened because:
1. Users were created **before** the `pgcrypto` extension was enabled
2. This resulted in **invalid password hashes** in the auth.users table
3. When Supabase tries to verify login, it encounters the corrupted data and fails

---

## Solution (1 minute)

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase Dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run the Complete Fix
1. Copy **ALL contents** of this file:
   ```
   🔧_FIX_AUTH_SCHEMA_ERROR.sql
   ```

2. Paste into SQL Editor

3. Click **Run** (or Ctrl+Enter / Cmd+Enter)

### Step 3: Read the Output
You'll see output like:
```
✅ STEP 1: PGCRYPTO EXTENSION ENABLED
🗑️ Deleting broken auth user: shopeazy025@gmail.com
✅ STEP 3: USER CREATION FUNCTION CREATED
✅ FIX COMPLETE!
```

**Important:** Note which users were deleted - you'll need to recreate them!

### Step 4: Refresh & Recreate Users
1. **Hard refresh** your app: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Go to **Users** page
3. Click **"Add User"**
4. Recreate the users that were deleted (the SQL output listed them)
5. Try logging in - it will work now!

---

## What This Script Does

### ✅ Step 1: Enable pgcrypto
- Enables the required extension for password hashing

### 🗑️ Step 2: Delete Broken Users
- Finds auth users with invalid password hashes
- Deletes them (they can't login anyway)
- Lists which emails were deleted

### 🔧 Step 3: Create Proper Function
- Creates a working user creation function
- Uses proper bcrypt password hashing
- Validates all required fields

### 🧹 Step 4: Cleanup
- Removes orphan user profiles (profiles without auth)
- Ensures database consistency

### ✅ Step 5: Verify
- Confirms everything is set up correctly
- Shows current user counts

---

## Why This Happened

1. You ran the user creation SQL **before** pgcrypto was enabled
2. Without pgcrypto, the `crypt()` and `gen_salt()` functions don't exist
3. This caused users to be created with **invalid or missing password hashes**
4. When you try to login, Supabase can't verify the password → schema error

---

## After Running the Fix

### ✅ You Can Now:
- Create users via the app (Users page)
- Users will have proper password hashes
- Login will work correctly
- No more "Database error querying schema"

### ⚠️ You Need To:
- Recreate any users that were deleted
- Tell them their new passwords
- Test login with each user type (admin, warehouse manager, cashier)

---

## Testing After Fix

1. **Create a test cashier:**
   ```
   Name: Test Cashier
   Email: cashier@test.com
   Password: test123
   Role: Cashier
   Branch: [Select any branch]
   ```

2. **Try logging in:**
   - Logout from admin
   - Use email: cashier@test.com
   - Use password: test123
   - Should work! ✅

3. **If it still fails:**
   - Check browser console (F12)
   - Copy the exact error message
   - Check Supabase logs (Dashboard → Logs)

---

## Common Questions

### Q: Will I lose existing users?
**A:** Only broken users that couldn't login anyway. The script lists them so you can recreate them.

### Q: What about working admin users?
**A:** They won't be touched if their password hashes are valid.

### Q: Can I skip recreating users?
**A:** No - the deleted users had broken auth data and couldn't login. They need to be recreated properly.

### Q: How do I know which users to recreate?
**A:** The SQL script output lists every deleted user's email address.

---

## Still Having Issues?

If you still get login errors after running this:

1. **Check the SQL output** - did it say "FIX COMPLETE"?
2. **Hard refresh** your browser - don't skip this!
3. **Try creating a brand new user** - not recreating an old one
4. **Check browser console** - copy any error messages
5. **Check Supabase Dashboard** → Authentication → Users - verify the user exists there

---

## Prevention

To avoid this in the future:
- Always enable required extensions first
- Test user creation with one user before creating many
- Check that users appear in Supabase Dashboard → Authentication → Users
- Verify you can login immediately after creating a user
