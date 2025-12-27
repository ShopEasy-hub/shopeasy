# 🚀 TRANSFER BUG - QUICK FIX GUIDE

## Problem
Transferring 10 items deducts 30 instead (50 → 20 instead of 50 → 40)

## Solution
Run ONE SQL file in Supabase

---

## 3 Simple Steps

### Step 1: Open Supabase
Go to: **Supabase Dashboard → SQL Editor**

### Step 2: Run This SQL
Copy and paste this file:
```
/FIX_TRIPLE_DEDUCTION_COMPLETE.sql
```

Click **"Run"**

### Step 3: Test
Create a transfer and verify quantities are correct

---

## That's It!

✅ All old triggers removed
✅ One correct trigger created  
✅ Inventory updates exactly once
✅ Mobile popups now responsive

---

## Expected Result

Transfer 10 items:
- Before: Warehouse = 50, Branch = 0
- After: Warehouse = 40 (✅ correct), Branch = 10 (✅ correct)

NOT: Warehouse = 20 (❌ was the bug)

---

## Need More Details?

Read these in order:

1. **Quick Overview**: `/⚠️_IMPORTANT_READ_THIS_FIRST.md`
2. **Full Explanation**: `/TRIPLE_DEDUCTION_BUG_EXPLAINED.md`
3. **Visual Guide**: `/TRANSFER_BUG_VISUAL_GUIDE.md`
4. **Complete Summary**: `/ALL_TRANSFER_FIXES_COMPLETE.md`

---

## Troubleshooting

**Still having issues?**
1. Check only 1 trigger exists:
   ```sql
   SELECT COUNT(*) FROM information_schema.triggers
   WHERE event_object_table = 'transfers';
   ```
   Should return: `1`

2. Check Supabase logs for duplicate messages

3. Test with a NEW transfer (not old data)

---

## Summary

**File to Run**: `/FIX_TRIPLE_DEDUCTION_COMPLETE.sql`
**Where**: Supabase SQL Editor
**When**: Right now
**Result**: Transfers fixed ✅
