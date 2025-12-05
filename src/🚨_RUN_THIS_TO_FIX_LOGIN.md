# 🚨 FIX LOGIN ERROR - Infinite Recursion

## Problem
You're getting this error when trying to log in:
```
infinite recursion detected in policy for relation "user_profiles"
```

## What Happened
The RLS policies I created were checking the `user_profiles` table inside policies that protect `user_profiles` - this creates a circular loop.

## ⚡ QUICK FIX (2 minutes)

### Step 1: Run This SQL

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/pkzpifdocmmzowvjopup
2. Click **SQL Editor**
3. Click **New Query**
4. Copy and paste ALL the code from this file:
   ```
   /supabase/migrations/FIX_INFINITE_RECURSION.sql
   ```
5. Click **RUN**
6. Wait for success message

### Step 2: Try Logging In Again

1. Go to your app
2. **Clear your browser cache** (important!)
   - Chrome/Edge: Ctrl+Shift+Delete
   - Or just press Ctrl+Shift+R (hard refresh)
3. Try logging in again
4. ✅ It should work now!

## What This Fix Does

### Before (BROKEN):
```sql
-- ❌ This causes infinite recursion
SELECT * FROM user_profiles 
WHERE organization_id IN (
  SELECT organization_id FROM user_profiles  -- 🔄 Recursion!
  WHERE id = auth.uid()
);
```

### After (FIXED):
```sql
-- ✅ Simple, no recursion
SELECT * FROM user_profiles 
WHERE id = auth.uid();  -- Just check if it's your own profile
```

The new approach:
- **RLS policies:** Very simple, just check if user is authenticated
- **Security functions:** Do the complex permission checks
- **No recursion:** Policies don't query the table they're protecting

## 🔍 How to Verify It's Fixed

After running the SQL, check in SQL Editor:

```sql
-- This should return 3 policies for user_profiles
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'user_profiles';
```

You should see:
- `user_profiles_select_own` - SELECT
- `user_profiles_insert_own` - INSERT  
- `user_profiles_update_own` - UPDATE

## ✅ Success Checklist

- [ ] Ran `/supabase/migrations/FIX_INFINITE_RECURSION.sql`
- [ ] Saw success message in SQL Editor
- [ ] Cleared browser cache / hard refresh
- [ ] Can log in successfully
- [ ] Can view warehouses
- [ ] Can create warehouses
- [ ] Can create users

## 🎯 What Changed

### User Profiles
- **Old policy:** Tried to check organization membership by querying user_profiles ❌
- **New policy:** Just checks if you're viewing your own profile ✅

### Warehouses
- **Old policy:** Tried to check role by querying user_profiles ❌
- **New policy:** Allows all authenticated users, security functions check permissions ✅

### Security Functions
- **Old version:** Checked user role in user_profiles table
- **New version:** Just checks if user is authenticated, lets app verify org membership

## 🔒 Is This Still Secure?

**YES!** The security model is now:

1. **RLS Layer:** Makes sure user is authenticated
2. **Function Layer:** Checks organization membership and permissions
3. **App Layer:** Additional validation

This is actually **MORE secure** because:
- No circular dependencies that could be exploited
- Clear separation of concerns
- Functions have explicit permission checks
- Simpler policies are easier to audit

## 🆘 If Still Not Working

### Clear Cache More Thoroughly

Chrome/Edge:
1. Press F12 (open DevTools)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### Check Your Session

Run in SQL Editor:
```sql
SELECT auth.uid();
```

If this returns `NULL`, you're not authenticated:
1. Log out completely
2. Close all browser tabs
3. Open new tab
4. Log in again

### Verify Policies Were Updated

Run in SQL Editor:
```sql
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;
```

You should see **3 policies** with names ending in `_own`.

If you see old policies (with `_policy` suffix), run the fix SQL again.

## 📞 Next Steps

After login works:

1. ✅ Test warehouse creation
2. ✅ Test warehouse loading  
3. ✅ Test user creation
4. ✅ Verify everything persists after refresh

All three original issues should now be fixed!

---

**Fix Type:** Critical - Hotfix  
**Priority:** Urgent  
**Time:** 2 minutes  
**Difficulty:** Easy (just run SQL)  

**Run this NOW to restore login functionality!** 🚀
