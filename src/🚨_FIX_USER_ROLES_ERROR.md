# 🚨 FIX: User Roles Error (Admin & Warehouse Manager)

## The Problem

When trying to add users with **"admin"** or **"warehouse_manager"** roles, you get this error:

```
new row for relation "user_profiles" violates check constraint "user_profiles_role_check"
```

## Why This Happens

Your Supabase database has a **CHECK constraint** that only allows certain roles:
- ✅ owner
- ✅ manager  
- ✅ cashier
- ✅ auditor
- ❌ **admin** (MISSING!)
- ❌ **warehouse_manager** (MISSING!)

The database is **rejecting** these two roles because they're not in the allowed list.

---

## ⚡ QUICK FIX (2 minutes)

### Step 1: Open Supabase Dashboard
1. Go to [supabase.com](https://supabase.com)
2. Open your project
3. Click **"SQL Editor"** in the left sidebar

### Step 2: Run This SQL Command

Copy and paste this into the SQL Editor:

```sql
-- Drop the old constraint
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Add new constraint with ALL 6 roles
ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN (
  'owner', 
  'admin', 
  'manager', 
  'warehouse_manager', 
  'cashier', 
  'auditor'
));
```

### Step 3: Click "RUN" Button

You'll see a success message!

### Step 4: Try Adding Users Again

Now you can add users with **ANY** of these roles:
- ✅ Owner
- ✅ **Admin** (NOW WORKS!)
- ✅ Manager
- ✅ **Warehouse Manager** (NOW WORKS!)
- ✅ Cashier
- ✅ Auditor

---

## 📋 Alternative: Use The Quick Fix File

I've created a ready-to-use SQL file for you:

**File:** `🔧_RUN_THIS_IN_SUPABASE_SQL_EDITOR.sql`

1. Open Supabase SQL Editor
2. Copy the entire contents of that file
3. Paste into SQL Editor
4. Click **RUN**
5. Done! ✅

---

## 🔍 How to Verify It Worked

After running the SQL, check the constraint:

```sql
SELECT 
  constraint_name, 
  check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'user_profiles_role_check';
```

You should see all 6 roles listed!

---

## 📊 Test Your Fix

### Test Admin Role:
1. Go to Settings → Users
2. Click "Add User"
3. Fill in details
4. **Select "Admin" from role dropdown**
5. Click "Add User"
6. ✅ Should succeed!

### Test Warehouse Manager Role:
1. Go to Settings → Users
2. Click "Add User"
3. Fill in details
4. **Select "Warehouse Manager" from role dropdown**
5. **Assign a warehouse/branch**
6. Click "Add User"
7. ✅ Should succeed!

---

## 🎯 What Each Role Can Do

| Role | Access Level | Permissions |
|------|-------------|-------------|
| **Owner** | Full System | Everything |
| **Admin** | Management | Manage branches, users, reports, products, transfers |
| **Manager** | Branch Level | Manage products, approve transfers, view reports |
| **Warehouse Manager** | Warehouse | Manage warehouse inventory, send to branches |
| **Cashier** | POS Terminal | Process sales, view inventory |
| **Auditor** | Read-Only | View reports, transactions, export data |

---

## ⚠️ Important Notes

### Branch Assignment Rules:

**Roles that DON'T need a branch:**
- Owner ✅
- Admin ✅
- Auditor ✅

**Roles that NEED a branch:**
- Manager ⚠️ (You must select a branch!)
- Warehouse Manager ⚠️ (You must select a warehouse!)
- Cashier ⚠️ (You must select a branch!)

If you try to add a Manager/Warehouse Manager/Cashier **without** selecting a branch, you'll get a validation error.

---

## 🔧 Troubleshooting

### "Still getting the error after running SQL"
1. Refresh your browser (hard refresh: Ctrl+Shift+R)
2. Make sure the SQL ran successfully (check for green checkmark)
3. Try logging out and back in
4. Clear your browser cache

### "Can't find SQL Editor in Supabase"
1. Go to your Supabase project dashboard
2. Look in the left sidebar
3. Click the **"SQL Editor"** icon (looks like </> code)
4. Click **"New Query"**

### "SQL Editor says permission denied"
- Make sure you're logged into Supabase as the project owner
- You need admin access to run schema changes

### "Constraint already exists error"
This is fine! It means the constraint was already updated. Just run the second part:

```sql
ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN (
  'owner', 
  'admin', 
  'manager', 
  'warehouse_manager', 
  'cashier', 
  'auditor'
));
```

---

## 📚 For Developers

### The Root Cause

The database schema was created with a limited CHECK constraint:

```sql
-- OLD (Limited):
role TEXT CHECK (role IN ('owner', 'manager', 'auditor', 'cashier'))

-- NEW (Complete):
role TEXT CHECK (role IN ('owner', 'admin', 'manager', 'warehouse_manager', 'cashier', 'auditor'))
```

### Migration Files Updated

I've updated these migration files with the fix:
1. `/supabase/migrations/000_CLEAN_REBUILD_2025.sql`
2. `/supabase/migrations/FIX_USER_ROLES_CONSTRAINT.sql` (new)

If you rebuild your database from scratch, the fix will be included automatically.

---

## ✅ Summary

**Problem:** Database constraint blocking 'admin' and 'warehouse_manager' roles

**Solution:** Run SQL command to update the constraint

**Time Required:** 2 minutes

**Difficulty:** Easy (copy/paste SQL)

**Result:** All 6 user roles now work perfectly!

---

## 🎉 After the Fix

Once you run the SQL, you'll be able to:

✅ Add Admin users (for overall management)  
✅ Add Warehouse Managers (for warehouse operations)  
✅ Add Managers (for branch operations)  
✅ Add Cashiers (for POS terminals)  
✅ Add Auditors (for compliance/reporting)  
✅ Full team management capability!

Your ShopEasy POS system will have complete role-based access control! 🚀
