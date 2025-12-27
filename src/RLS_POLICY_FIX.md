# 🔒 RLS Policy Infinite Recursion Fix

## Problem
You're getting the error: **"infinite recursion detected in policy for relation 'user_profiles'"**

This happens because the Row Level Security (RLS) policies are checking `user_profiles` while trying to access `user_profiles`, creating a circular dependency.

## Solution

### Step 1: Run the Fix Migration

Go to your Supabase dashboard:
1. Click on **SQL Editor** in the left sidebar
2. Click **New Query**
3. Copy and paste the contents of `/supabase/migrations/FIX_RLS_POLICIES.sql`
4. Click **Run**

### Step 2: Verify the Fix

After running the migration, test by:
1. Refresh your app
2. Try logging in with: `grzzmari21@gmail.com`
3. You should now be able to log in without the infinite recursion error

## What Was Fixed?

### Before (Broken):
```sql
-- ❌ This causes infinite recursion!
CREATE POLICY "Users can view profiles in their organization"
  ON user_profiles FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    -- ↑ Trying to read user_profiles while checking access to user_profiles!
  ));
```

### After (Fixed):
```sql
-- ✅ Uses a SECURITY DEFINER function to break the recursion
CREATE FUNCTION get_user_organization_id(user_id UUID)
RETURNS UUID AS $$
  SELECT organization_id FROM user_profiles WHERE id = user_id LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE POLICY "Users can view profiles in their organization"
  ON user_profiles FOR SELECT
  USING (organization_id = get_user_organization_id(auth.uid()));
```

The `SECURITY DEFINER` function runs with elevated privileges, bypassing RLS during the lookup, which breaks the circular dependency.

## Why This Happens

When RLS is enabled on a table, every query to that table must pass the policy check. If the policy itself queries the same table, it creates an infinite loop:

1. User tries to read `user_profiles`
2. RLS policy checks: "Is user in this organization?"
3. To check, policy queries `user_profiles` for user's org
4. This triggers RLS policy again → "Is user in this organization?"
5. Go to step 3 → **INFINITE LOOP!**

## Prevention

Always use one of these patterns for RLS policies:

### ✅ Good Patterns:
- Direct column comparison: `id = auth.uid()`
- SECURITY DEFINER functions (used in the fix)
- Separate lookup tables that don't have circular dependencies

### ❌ Bad Patterns:
- Subqueries to the same table: `organization_id IN (SELECT organization_id FROM user_profiles ...)`
- Joins back to the same table

## Need Help?

If you still get errors after running the fix:
1. Check the Supabase SQL Editor for error messages
2. Verify all policies were recreated successfully
3. Try disabling RLS temporarily: `ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;`
4. Contact support with the error message
