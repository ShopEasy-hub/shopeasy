# 🚨 FIX: New Users Not Showing

## Your Problem

You created new users but they **don't appear** in the Users list.

---

## ⚡ QUICK FIX (3 Steps - 2 Minutes)

### Step 1: Diagnose the Problem

```bash
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Run: 🚨_DEBUG_NEW_USERS_NOT_SHOWING.sql
4. Read the output to see what's wrong
```

**Look for:**
- "🔴 PROBLEM FOUND: X users exist in auth but have NO profile"
- "❌ NO SELECT POLICY!"
- "⚠️ Found X orphaned auth.users"

---

### Step 2: Create Missing Profiles

**If diagnosis shows orphaned auth.users:**

```bash
1. Still in SQL Editor
2. Run: 🔧_CREATE_MISSING_PROFILES.sql
3. Wait for "🎉 SUCCESS!"
```

This will:
- ✅ Find auth.users without user_profiles
- ✅ Create the missing profiles
- ✅ Link them to your organization
- ✅ Set default role (cashier) and name

---

### Step 3: Fix RLS Policies

**Always run this to ensure proper permissions:**

```bash
1. Still in SQL Editor
2. Run: 🔧_FIX_USER_PROFILES_RLS.sql
3. Wait for "🎉 SUCCESS!"
```

This will:
- ✅ Remove old/conflicting policies
- ✅ Create proper SELECT policy
- ✅ Create proper INSERT policy
- ✅ Allow users to query the table

---

### Step 4: Refresh Your App

```bash
1. Go to your app
2. Hard refresh (Ctrl+Shift+R)
3. Navigate to Users page
4. Users should now appear! ✅
```

---

## 🔍 WHY THIS HAPPENS

### The Problem:

When you create a user, two things must happen:

```
1. Create entry in auth.users ✅
2. Create entry in user_profiles ❌ (THIS FAILED)
```

### Why Step 2 Fails:

1. **Edge Function Not Deployed**
   - User creation uses Edge Function
   - If not deployed, only auth.users is created
   - user_profiles creation fails silently

2. **RLS Policy Blocking**
   - INSERT policy too restrictive
   - Prevents profile creation
   - Auth user created, profile blocked

3. **Service Role Key Missing**
   - Direct auth.admin calls fail
   - Fallback to profile creation works
   - But user doesn't appear (no profile)

### The Result:

```
Database:
  auth.users: 5 records ✅
  user_profiles: 2 records ❌
  
  Missing: 3 profiles!

App Shows:
  Only 2 users (those with profiles)
  Missing: 3 users (orphaned in auth.users)
```

---

## 📊 DETAILED DIAGNOSTICS

### Run This First:

```sql
-- File: 🚨_DEBUG_NEW_USERS_NOT_SHOWING.sql
```

**What it shows:**

1. **All auth.users**
   - Who's in the auth table
   - When they were created
   - If they have passwords

2. **All user_profiles**
   - Who has a profile
   - Their roles and organizations

3. **Sync Status**
   - Which auth.users have no profile (orphaned)
   - Which profiles have no auth (orphaned)

4. **RLS Policies**
   - What policies exist
   - If SELECT/INSERT are allowed

5. **App Query Test**
   - Runs the exact query your app uses
   - Shows if it returns users

6. **Trigger Status**
   - Checks if auto-create trigger exists

**Expected Output:**

```
🔴 PROBLEM FOUND: 3 users exist in auth but have NO profile

  This is why new users do not appear!
  
  ROOT CAUSE: User creation is failing at profile creation step.
  
  SOLUTION: Run the fix script to create missing profiles.
  File: 🔧_CREATE_MISSING_PROFILES.sql
```

---

## 🔧 THE FIX

### Fix Script 1: Create Missing Profiles

```sql
-- File: 🔧_CREATE_MISSING_PROFILES.sql
```

**What it does:**

1. **Finds orphaned auth.users**
   ```sql
   SELECT * FROM auth.users au
   LEFT JOIN user_profiles up ON au.id = up.id
   WHERE up.id IS NULL
   ```

2. **Gets your organization**
   ```sql
   SELECT id FROM organizations LIMIT 1
   ```

3. **Creates missing profiles**
   ```sql
   INSERT INTO user_profiles (id, email, name, role, organization_id)
   VALUES (auth_user.id, auth_user.email, 'Name', 'cashier', org_id)
   ```

4. **Verifies sync**
   ```
   auth.users: 5
   user_profiles: 5
   Orphaned: 0 ✅
   ```

**Expected Output:**

```
✅ Created profile for: john@example.com (role: cashier)
✅ Created profile for: jane@example.com (role: cashier)
✅ Created profile for: bob@example.com (role: cashier)

✅ Created 3 user profiles!

🎉 SUCCESS! All users have profiles!
```

---

### Fix Script 2: Fix RLS Policies

```sql
-- File: 🔧_FIX_USER_PROFILES_RLS.sql
```

**What it does:**

1. **Drops old policies** (might be conflicting)
2. **Creates new permissive policies:**
   - SELECT: Users can read profiles in their org
   - INSERT: Owners/admins can create users
   - UPDATE: Users can update own profile
   - DELETE: Owners/admins can delete users

3. **Verifies RLS is enabled**
4. **Lists all active policies**

**Expected Output:**

```
✅ New policies created:
   • SELECT - Users can read profiles in their org
   • INSERT - Owners/admins can create users
   • UPDATE - Users can update own profile
   • DELETE - Owners/admins can delete users

🎉 SUCCESS! All required policies are in place!
```

---

## ✅ VERIFICATION

### After Running All Scripts:

**1. Check Database Sync:**

```sql
SELECT 
  (SELECT COUNT(*) FROM auth.users) as auth,
  (SELECT COUNT(*) FROM user_profiles) as profiles;
```

Should be equal! ✅

**2. Check No Orphans:**

```sql
-- Should return 0
SELECT COUNT(*) FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE up.id IS NULL;
```

**3. Test App Query:**

```sql
-- Replace with your org ID
SELECT * FROM user_profiles 
WHERE organization_id = '<your-org-id>'
ORDER BY created_at;
```

Should return all users! ✅

**4. Check RLS Policies:**

```sql
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY cmd;
```

Should show SELECT and INSERT policies! ✅

---

## 🎯 TESTING

### After Fix, Test This:

**1. Check Users List:**
```bash
1. Go to Users page
2. All users should now appear ✅
3. Count should match database
```

**2. Add New User:**
```bash
1. Click "Add User"
2. Fill form
3. Submit
4. User should appear immediately ✅
```

**3. Test Login:**
```bash
1. Logout
2. Login with new user
3. Should work ✅
```

**4. Check Console:**
```bash
1. Open F12 → Console
2. Go to Users page
3. Should see:
   📊 Users count: 5
   ✅ Transformed users: [...]
4. No errors ✅
```

---

## 🐛 TROUBLESHOOTING

### Problem: Still Don't See Users

**Check 1: Browser Console**
```bash
1. Press F12
2. Go to Console tab
3. Look for errors
```

**Possible errors:**

| Error | Cause | Fix |
|-------|-------|-----|
| "Row Level Security policy violation" | RLS blocking | Run RLS fix script |
| "organization_id is null" | appState not loaded | Hard refresh |
| "Failed to fetch" | Network error | Check connection |
| "users is undefined" | Query returned null | Run diagnostic |

**Check 2: Organization ID**
```javascript
// In browser console
console.log(appState.orgId);
// Should show a UUID
```

**Check 3: Network Tab**
```bash
1. F12 → Network tab
2. Reload Users page
3. Look for API calls
4. Check response
```

---

### Problem: Some Users Missing

**This means partial success. Check:**

```sql
-- See which users have profiles
SELECT 
  au.email as auth_email,
  up.email as profile_email,
  CASE 
    WHEN up.id IS NULL THEN '❌ Missing profile'
    WHEN au.id IS NULL THEN '❌ Missing auth'
    ELSE '✅ OK'
  END as status
FROM auth.users au
FULL OUTER JOIN user_profiles up ON au.id = up.id;
```

Re-run the create missing profiles script.

---

### Problem: Wrong Organization

**If users exist but with wrong organization_id:**

```sql
-- Find which org they're in
SELECT 
  organization_id,
  COUNT(*) as user_count,
  STRING_AGG(email, ', ') as users
FROM user_profiles
GROUP BY organization_id;

-- Update to correct org (replace IDs)
UPDATE user_profiles
SET organization_id = '<correct-org-id>'
WHERE organization_id = '<wrong-org-id>';
```

---

### Problem: Users Can't Login

**This means auth.users exists but something else is wrong:**

```sql
-- Check password is set
SELECT 
  email,
  encrypted_password IS NOT NULL as has_password,
  email_confirmed_at IS NOT NULL as email_confirmed
FROM auth.users;
```

If `has_password` is false, reset password in Supabase Dashboard.

---

## 📋 COMPLETE CHECKLIST

Run through this list:

- [ ] Run diagnostic script (`🚨_DEBUG_NEW_USERS_NOT_SHOWING.sql`)
- [ ] Read the diagnosis output
- [ ] Run create missing profiles (`🔧_CREATE_MISSING_PROFILES.sql`)
- [ ] Run RLS fix script (`🔧_FIX_USER_PROFILES_RLS.sql`)
- [ ] Verify: auth.users count = user_profiles count
- [ ] Verify: No orphaned records
- [ ] Verify: RLS policies exist
- [ ] Hard refresh app (Ctrl+Shift+R)
- [ ] Check Users page - all users appear
- [ ] Create test user - appears immediately
- [ ] Test login with new user - works
- [ ] Check browser console - no errors
- [ ] Delete test user - removed from list

---

## 🎯 PREVENTION

To prevent this in the future:

### 1. Always Check After Creating User

```bash
After creating user:
1. Refresh Users page immediately
2. Check if they appear
3. If not, run diagnostic
```

### 2. Monitor Database Sync

```sql
-- Run weekly to check sync
SELECT 
  (SELECT COUNT(*) FROM auth.users) as auth,
  (SELECT COUNT(*) FROM user_profiles) as profiles,
  (SELECT COUNT(*) FROM auth.users au
   LEFT JOIN user_profiles up ON au.id = up.id
   WHERE up.id IS NULL) as orphaned;
```

### 3. Deploy Edge Function (Recommended)

```bash
# This makes user creation more reliable
supabase functions deploy create-organization-user
```

---

## 📁 FILES TO USE

| Order | File | Purpose |
|-------|------|---------|
| **1** | `🚨_DEBUG_NEW_USERS_NOT_SHOWING.sql` | See what's wrong |
| **2** | `🔧_CREATE_MISSING_PROFILES.sql` | Create missing profiles |
| **3** | `🔧_FIX_USER_PROFILES_RLS.sql` | Fix permissions |
| **4** | Refresh app | See users appear |

---

## 🎉 SUCCESS LOOKS LIKE

### Database:
```
auth.users: 5 records
user_profiles: 5 records
Orphaned: 0
RLS policies: 4 (SELECT, INSERT, UPDATE, DELETE)
```

### App:
```
Users page shows all 5 users
Add user → Appears immediately
Test login → Works
Console → No errors
```

---

**Run the scripts in order and your users will appear!** ✅

---

## 🆘 STILL STUCK?

If users still don't show after running all scripts:

1. **Share diagnostic output** (from step 1)
2. **Share browser console errors** (F12 → Console)
3. **Share network errors** (F12 → Network)
4. **Confirm which scripts you ran**

The diagnostic will tell us exactly what's wrong!
