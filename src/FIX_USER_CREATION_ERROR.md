# 🔧 Fix: "function gen_salt(unknown) does not exist"

## Problem
When trying to create users in the app, you're getting this error:
```
Failed to create user: function gen_salt(unknown) does not exist
```

This happens because the `pgcrypto` extension is **not enabled** in your Supabase database. This extension is required for secure password hashing.

---

## Solution (2 minutes)

### Step 1: Go to Supabase SQL Editor
1. Open your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run the Fix SQL
1. Copy the entire contents of this file:
   ```
   🔧_ENABLE_PGCRYPTO_AND_FIX_USER_CREATION.sql
   ```

2. Paste it into the SQL Editor

3. Click **Run** (or press Ctrl+Enter / Cmd+Enter)

### Step 3: Verify the Fix
You should see output like this:
```
✅ PGCRYPTO EXTENSION ENABLED
✅ USER CREATION FUNCTION CREATED!
✅ ALL CHECKS PASSED!
```

If you see any errors, read them carefully and report back.

### Step 4: Refresh Your App
1. Go back to your app
2. Hard refresh: **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (Mac)
3. Try creating a user again

---

## What This Fix Does

1. **Enables pgcrypto extension**
   - Provides `gen_salt()` for password salt generation
   - Provides `crypt()` for secure password hashing
   - Provides `gen_random_uuid()` for generating user IDs

2. **Creates the user creation function**
   - Creates BOTH auth user (for login) AND user profile (for role/branch)
   - Properly hashes passwords using bcrypt
   - Validates all input data

3. **Verifies your setup**
   - Checks if extension is enabled
   - Lists current users
   - Shows any "orphan" users (profiles without auth access)

---

## What About Existing Users?

If you created users before running this fix, they exist in `user_profiles` but NOT in `auth.users`, which means **they cannot login**.

### Option 1: Delete and Recreate (Recommended)
1. Delete the problematic users from your Users page
2. Recreate them - they'll now have proper auth access

### Option 2: Fix Existing Users with SQL
The SQL file includes optional scripts (commented out) to:
- Create auth users for existing profiles with a default password
- Delete orphan profiles

**To use these:**
1. Open the SQL file
2. Find **STEP 6** or **STEP 7**
3. Uncomment the section you want to use
4. **⚠️  Read the warnings carefully!**
5. Run the script

---

## Testing

After running the fix, you can test it:

1. **Via the app:**
   - Refresh browser
   - Go to Users page
   - Click "Add User"
   - Fill in details
   - Submit

2. **Via SQL (optional):**
   - Open the SQL file
   - Find **STEP 4: TEST THE FUNCTION**
   - Replace `YOUR_ORG_ID` and `YOUR_BRANCH_ID` with real values
   - Uncomment and run

---

## Common Issues

### "Extension already enabled"
✅ This is fine! The script detects if it's already enabled.

### "Function already exists"
✅ This is fine! The script will drop and recreate it.

### "Orphan profiles found"
⚠️  Some users cannot login. See "What About Existing Users?" section above.

### Still getting errors?
1. Copy the **exact error message** from the SQL Editor
2. Copy the **console log** from your browser (F12 > Console tab)
3. Report both to get help

---

## Why Did This Happen?

Supabase requires the `pgcrypto` extension to be **manually enabled** for each project. It's not enabled by default. The previous SQL scripts assumed it was already enabled, which caused the `gen_salt()` function to not be found.

---

## Need Help?

If you're still having issues:
1. Check the browser console (F12) for errors
2. Check the Supabase SQL Editor output
3. Make sure you're running the SQL as shown above
4. Hard refresh your browser after running the SQL
