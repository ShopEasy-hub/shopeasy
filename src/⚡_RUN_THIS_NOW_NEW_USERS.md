# ⚡ NEW USERS NOT SHOWING - RUN THIS NOW

## Your Problem
✅ Users created successfully  
❌ But don't appear in Users list

---

## ⚡ THE FIX (2 Minutes)

### Step 1: See What's Wrong
```bash
Supabase Dashboard → SQL Editor
Run: 🚨_DEBUG_NEW_USERS_NOT_SHOWING.sql
```

**Look for:**
```
🔴 PROBLEM FOUND: 3 users exist in auth but have NO profile
```

---

### Step 2: Create Missing Profiles
```bash
Still in SQL Editor
Run: 🔧_CREATE_MISSING_PROFILES.sql
```

**Expected:**
```
✅ Created profile for: john@example.com
✅ Created profile for: jane@example.com
✅ Created profile for: bob@example.com

🎉 SUCCESS! All users have profiles!
```

---

### Step 3: Fix Permissions
```bash
Still in SQL Editor
Run: 🔧_FIX_USER_PROFILES_RLS.sql
```

**Expected:**
```
✅ New policies created
🎉 SUCCESS! All required policies are in place!
```

---

### Step 4: Refresh App
```bash
1. Go to your app
2. Hard refresh (Ctrl+Shift+R)
3. Check Users page
4. All users should appear! ✅
```

---

## ✅ VERIFY IT WORKED

### Quick Check:
```bash
1. Users page shows all users ✅
2. Count matches database ✅
3. No errors in console (F12) ✅
```

### Test Add User:
```bash
1. Click "Add User"
2. Create test user
3. User appears immediately ✅
4. Can login with test user ✅
```

---

## 🔍 WHAT THESE SCRIPTS DO

### 1. Diagnostic (🚨_DEBUG_NEW_USERS_NOT_SHOWING.sql)
- Shows all auth.users
- Shows all user_profiles
- Finds orphaned records (auth without profile)
- Checks RLS policies
- Tests your app's query

### 2. Create Profiles (🔧_CREATE_MISSING_PROFILES.sql)
- Finds auth.users without profiles
- Creates missing user_profiles
- Links to your organization
- Sets default role (cashier)

### 3. Fix RLS (🔧_FIX_USER_PROFILES_RLS.sql)
- Removes old/conflicting policies
- Creates proper SELECT policy (read users)
- Creates proper INSERT policy (create users)
- Enables RLS if disabled

---

## 🎯 WHY IT HAPPENS

### The Flow:
```
You click "Add User"
     ↓
Creates auth.users ✅
     ↓
Creates user_profiles ❌ FAILS HERE
     ↓
User exists but invisible
```

### Root Causes:
1. ❌ Edge Function not deployed
2. ❌ RLS policy blocking INSERT
3. ❌ Service role key missing
4. ❌ Profile creation failed silently

### The Fix:
```
Script finds orphaned auth.users
     ↓
Creates missing profiles manually
     ↓
Fixes RLS policies
     ↓
All users now visible ✅
```

---

## 📊 EXPECTED DATABASE STATE

### Before Fix:
```sql
auth.users:      5 records
user_profiles:   2 records
Orphaned:        3 ❌
```

### After Fix:
```sql
auth.users:      5 records
user_profiles:   5 records
Orphaned:        0 ✅
```

---

## 🐛 IF IT DOESN'T WORK

### Check Browser Console:
```bash
F12 → Console
Look for errors when loading Users page
```

### Check Database:
```sql
-- Should both be equal
SELECT 
  (SELECT COUNT(*) FROM auth.users),
  (SELECT COUNT(*) FROM user_profiles);
```

### Check RLS:
```sql
-- Should return at least 1 SELECT policy
SELECT COUNT(*) FROM pg_policies
WHERE tablename = 'user_profiles' AND cmd = 'SELECT';
```

### Still Stuck?
Read the full guide: `🚨_FIX_NEW_USERS_NOT_SHOWING.md`

---

## 📁 FILES IN ORDER

| # | File | What It Does |
|---|------|--------------|
| 1 | `🚨_DEBUG_NEW_USERS_NOT_SHOWING.sql` | Diagnose problem |
| 2 | `🔧_CREATE_MISSING_PROFILES.sql` | Create missing profiles |
| 3 | `🔧_FIX_USER_PROFILES_RLS.sql` | Fix permissions |
| 4 | `🚨_FIX_NEW_USERS_NOT_SHOWING.md` | Full guide (if needed) |

---

## ⏱️ TIME REQUIRED

- **Step 1 (Diagnostic):** 30 seconds
- **Step 2 (Create Profiles):** 30 seconds
- **Step 3 (Fix RLS):** 30 seconds  
- **Step 4 (Refresh):** 10 seconds

**Total:** ~2 minutes ⚡

---

## 🎉 AFTER SUCCESS

You'll be able to:
- ✅ See all users in Users list
- ✅ Add new users (appear instantly)
- ✅ Edit/delete users
- ✅ All users can login
- ✅ No orphaned records
- ✅ Clean database

---

**START HERE:** Run `🚨_DEBUG_NEW_USERS_NOT_SHOWING.sql` now!

---

**Priority:** HIGH  
**Status:** Production Issue  
**Time:** 2 minutes  
**Files:** 3 SQL scripts
