# 🔧 Supabase Configuration Required for Account Creation

## ⚠️ IMPORTANT: Email Confirmation Settings

The account creation error you're seeing is most likely due to **Email Confirmation** being enabled in Supabase.

## Quick Fix (Recommended for Development)

### Option 1: Disable Email Confirmation

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**
3. **Navigate to**: `Authentication` → `Providers` → `Email`
4. **Find**: "Confirm email" toggle
5. **Turn OFF** the "Confirm email" option
6. **Click**: Save

**Why this fixes it:**
- When email confirmation is ON, `auth.signUp()` creates the user but doesn't establish a session
- Without a session, the user can't insert into `organizations` or `user_profiles` tables
- The RLS policies require an authenticated user (`auth.uid()`)

### Option 2: Keep Email Confirmation (Production Setup)

If you want to keep email confirmation enabled:

1. **Set up email templates** in Supabase
2. **Configure SMTP** settings
3. **Update the signup flow** to handle unconfirmed users:

```typescript
// In SetupPage.tsx, handle the "Check your email" state
if (authData.user && !authData.session) {
  setMessage('Please check your email to confirm your account');
  return;
}
```

## Verify RLS Policies Are Correct

Run this SQL in **Supabase SQL Editor** to verify:

```sql
-- 1. Check if user_profiles table allows INSERT for authenticated users
SELECT policyname, cmd, with_check 
FROM pg_policies 
WHERE tablename = 'user_profiles' 
AND cmd = 'INSERT';

-- Expected result:
-- policyname: "Users can create their own profile"
-- cmd: INSERT
-- with_check: (id = auth.uid())
```

```sql
-- 2. Check if organizations table allows INSERT
SELECT policyname, cmd, with_check 
FROM pg_policies 
WHERE tablename = 'organizations' 
AND cmd = 'INSERT';

-- Expected result:
-- policyname: "Anyone can create an organization"
-- cmd: INSERT  
-- with_check: (owner_id = auth.uid())
```

```sql
-- 3. Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('organizations', 'user_profiles', 'branches');

-- All should show rowsecurity = 't' (true)
```

## Test the Migration SQL

Make sure you ran the correct migration file:

### Run This SQL (If Not Already Done)

**File**: `/supabase/migrations/000_CLEAN_REBUILD_2025.sql`

1. **Go to**: Supabase Dashboard → SQL Editor
2. **Create New Query**
3. **Copy and paste** the entire contents of `000_CLEAN_REBUILD_2025.sql`
4. **Run** the query
5. **Wait** for completion (~30 seconds)

### Verify Migration Success

```sql
-- Check if all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Should include:
-- - audit_logs
-- - branches
-- - expenses
-- - inventory
-- - organizations
-- - products
-- - returns
-- - sale_items
-- - sales
-- - suppliers
-- - support_tickets
-- - system_logs
-- - transfers
-- - transfer_items
-- - user_profiles
-- - warehouses
```

## Debug Account Creation

### Enable Console Logging

The updated `/lib/api-supabase.ts` now includes detailed logging:

```typescript
✅ User created: [user-id]
✅ Session established
✅ Organization created: [org-id]
✅ User profile created
```

### Check Browser Console

1. **Open DevTools** (F12)
2. **Go to Console tab**
3. **Try creating an account**
4. **Look for**:
   - ✅ Success messages
   - ❌ Error messages with details

### Common Error Messages

#### "User already registered"
**Cause**: Email already exists in `auth.users`  
**Fix**: Use a different email or delete the user from Supabase Dashboard

#### "Failed to create organization: duplicate key value"
**Cause**: Organization with same name exists (unlikely)  
**Fix**: Use a different organization name

#### "Failed to create user profile: new row violates row-level security policy"
**Cause**: RLS policy is blocking the INSERT  
**Fix**: 
1. Disable email confirmation (see above)
2. Or verify RLS policies are correct

#### "JWT expired" or "invalid claim: missing sub claim"
**Cause**: Session is not properly established  
**Fix**: The updated code now handles this automatically

## Quick Test

After fixing email confirmation, test account creation:

### Test Credentials
```
Organization Name: Test Pharmacy
Your Name: John Doe
Email: test@example.com
Password: test123456
```

### Expected Flow
1. Click "Create Account"
2. See in console:
   ```
   ✅ User created: abc-123-def
   ✅ Session established
   ✅ Organization created: org-456-xyz
   ✅ User profile created
   ```
3. Redirect to Dashboard
4. See organization name in header

### If It Still Fails

**Check Supabase Logs:**

1. Go to **Supabase Dashboard**
2. Navigate to **Logs** → **Postgres Logs**
3. Look for:
   - `policy violation` errors
   - `permission denied` errors
4. Share the error message for further debugging

## Summary of Changes Made

### ✅ Fixed Files
1. `/lib/api.ts` - Now re-exports from `api-supabase.ts`
2. `/lib/api-supabase.ts` - Enhanced signup with session handling
3. All 16 page components now use correct API

### ⚙️ Configuration Needed (Your Turn)
1. **Disable email confirmation** in Supabase Dashboard
2. **Verify migration** was run successfully  
3. **Test account creation**

## Need Help?

If account creation still fails after:
- ✅ Disabling email confirmation
- ✅ Verifying RLS policies
- ✅ Confirming migration ran

**Provide this info:**
1. Screenshot of browser console errors
2. Screenshot of Supabase Postgres Logs
3. Result of this SQL query:
   ```sql
   SELECT policyname FROM pg_policies 
   WHERE tablename IN ('organizations', 'user_profiles');
   ```

---

**The code is fixed!** Now you just need to configure Supabase settings. 🚀
