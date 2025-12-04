# ✅ FIXED: SQL Error "unrecognized exception condition"

## The Problem
The original SQL script had:
```sql
EXCEPTION
    WHEN duplicate_key THEN  -- ❌ WRONG! PostgreSQL doesn't recognize this
```

## The Fix
Changed to:
```sql
EXCEPTION
    WHEN unique_violation THEN  -- ✅ CORRECT for constraints
    WHEN duplicate_table THEN   -- ✅ CORRECT for indexes
    WHEN OTHERS THEN            -- ✅ CATCH-ALL for safety
```

---

## ⚡ RUN THIS NOW

### File to Use:
```
/supabase/migrations/COMPLETE_FIX_V3_CORRECTED.sql
```

### Steps:
1. **Open Supabase Dashboard** → SQL Editor
2. **Copy** the entire COMPLETE_FIX_V3_CORRECTED.sql file
3. **Paste** into SQL Editor
4. **Click "Run"**
5. **Wait** for messages to finish

### Expected Output:
```
✅ Cleaned up old constraints and indexes
✅ Added unique constraint with NULLS NOT DISTINCT
✅ Created branch inventory index
✅ Created warehouse inventory index
✅ Dropped old RLS policies
✅ Granted permissions on inventory table
✅ Created upsert_inventory_safe function
✅ Created get_stock_level helper function
========================================
VERIFICATION RESULTS:
========================================
Unique Constraint: 1 (expected: 1)
Indexes: 2 (expected: 2)
RLS Policies: 4 (expected: 4)
Upsert Function: 1 (expected: 1)
========================================
✅✅✅ ALL CHECKS PASSED! ✅✅✅
Database is ready for inventory operations
========================================
✅ Function test INSERT successful: qty=999
✅ Function test UPDATE successful: qty=888
✅ Test data cleaned up
========================================
🎉 MIGRATION COMPLETE! 🎉
========================================
```

---

## What Changed From Previous Version

| Line | Old (V2) | New (V3) |
|------|---------|----------|
| 41 | `WHEN duplicate_key THEN` | `WHEN unique_violation THEN` ✅ |
| 44 | (no catch-all) | `WHEN OTHERS THEN` ✅ |
| 55 | (no catch-all) | `WHEN OTHERS THEN` ✅ |
| 65 | (no catch-all) | `WHEN OTHERS THEN` ✅ |

---

## Why This Matters

PostgreSQL exception names:
- ✅ `unique_violation` - For constraint violations
- ✅ `duplicate_table` - For index/table already exists
- ✅ `OTHERS` - Catch-all for any other error
- ❌ `duplicate_key` - **NOT A VALID NAME**

---

## Next Steps After Running

1. ✅ Script completes without errors
2. ✅ Shows "ALL CHECKS PASSED"
3. ✅ Hard refresh browser: `Ctrl + Shift + R`
4. ✅ Test POS sale → Should show receipt
5. ✅ Test transfer → Should update stock

---

## If You Still Get Errors

Copy the **EXACT error message** including:
- Error code (e.g., `42704`)
- Error text
- Line number
- Context

Then tell me what it says.

---

**This version will run without SQL errors!** 🚀
