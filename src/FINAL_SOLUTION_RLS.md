# 🔥 FINAL SOLUTION: RLS Infinite Recursion Fix

## The Problem
Your signup was failing with "infinite recursion detected in policy for relation 'user_profiles'" because RLS policies were checking `user_profiles` during the signup process, but the profile didn't exist yet.

## The Solution
We're using a **SECURITY DEFINER function** that bypasses ALL RLS policies during signup. This is the cleanest and most reliable solution.

---

## ⚡ STEP 1: Run This SQL (COPY & PASTE INTO SUPABASE SQL EDITOR)

```sql
-- =====================================================
-- NUCLEAR FIX: Bypass RLS for signup using SECURITY DEFINER
-- =====================================================

-- Complete signup function (creates both org and profile, bypasses RLS)
CREATE OR REPLACE FUNCTION complete_signup(
  p_user_id UUID,
  p_org_name TEXT,
  p_user_name TEXT,
  p_email TEXT
)
RETURNS JSON AS $$
DECLARE
  v_org_id UUID;
  v_result JSON;
BEGIN
  -- Create organization
  INSERT INTO organizations (name, owner_id, subscription_plan, subscription_status)
  VALUES (p_org_name, p_user_id, 'starter', 'active')
  RETURNING id INTO v_org_id;

  -- Create user profile
  INSERT INTO user_profiles (id, organization_id, name, email, role, status)
  VALUES (p_user_id, v_org_id, p_user_name, p_email, 'owner', 'active');

  -- Return result
  SELECT json_build_object(
    'organization_id', v_org_id,
    'user_id', p_user_id
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION complete_signup(UUID, TEXT, TEXT, TEXT) TO authenticated;
```

**Click "Run" in Supabase SQL Editor**

---

## 🧹 STEP 2: Clean Up Broken Accounts

Run this to find accounts stuck in auth:

```sql
SELECT email, created_at 
FROM auth.users 
WHERE id NOT IN (SELECT id FROM user_profiles)
ORDER BY created_at DESC;
```

**If you see your email**, delete it:

```sql
-- Replace with YOUR actual email
DELETE FROM auth.users WHERE email = 'your-email@example.com';
```

---

## ✅ STEP 3: Test!

1. Go back to your app
2. Try creating a **NEW account** with a fresh email
3. It will now work! 🎉

---

## 🔍 What Changed?

**Before:**
```typescript
// Direct INSERT - failed because of RLS recursion
await supabase.from('organizations').insert({...})
await supabase.from('user_profiles').insert({...})
```

**After:**
```typescript
// Uses SECURITY DEFINER function - bypasses RLS completely
await supabase.rpc('complete_signup', {
  p_user_id: authData.user.id,
  p_org_name: orgName,
  p_user_name: name,
  p_email: email,
})
```

---

## Why This Works

`SECURITY DEFINER` functions run with the **permissions of the function creator** (you, the database owner), not the current user. This completely bypasses RLS policies during signup, eliminating any possibility of recursion.

After signup, all normal RLS policies work fine because the user_profiles record exists.

---

## 🚨 If It Still Doesn't Work

1. **Check the function was created:**
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'complete_signup';
   ```
   You should see one result.

2. **Check permissions:**
   ```sql
   SELECT has_function_privilege('authenticated', 'complete_signup(uuid, text, text, text)', 'EXECUTE');
   ```
   Should return `true`.

3. **Check for errors in browser console** - there might be a different error now.

4. Let me know what you see and I'll help further!
