# ⚠️ CRITICAL: READ THIS BEFORE RUNNING ANY SQL

## You Have a Triple Deduction Bug

### The Problem
When you transfer 10 items, 30 are being deducted instead of 10.

### The Cause
**Multiple database triggers are firing on the same table**, causing inventory to be updated multiple times.

---

## 🚨 DO NOT RUN THESE FILES (They will make it worse):

- ❌ `FIX_TRANSFER_TRIGGER.sql` - Old file, creates duplicate triggers
- ❌ `FIX_TRANSFER_BUG_NOW.sql` - Old file, creates duplicate triggers  
- ❌ `FIX_TRANSFER_DUPLICATION_BUG.sql` - Incomplete fix, doesn't remove old triggers

These files were created at different times and each adds its own trigger. Running them creates MORE triggers, making the problem worse!

---

## ✅ RUN THIS FILE ONLY:

### `/FIX_TRIPLE_DEDUCTION_COMPLETE.sql`

This is the ONLY file you need to run. It:
1. Removes ALL old triggers (every possible version)
2. Removes ALL old functions
3. Creates ONE correct trigger for your new schema
4. Includes comprehensive logging and verification

---

## How to Apply

### Step 1: Open Supabase Dashboard
Go to: **Supabase Dashboard → SQL Editor**

### Step 2: Copy and Paste
Open `/FIX_TRIPLE_DEDUCTION_COMPLETE.sql` and copy ALL the contents

### Step 3: Run
Paste into SQL Editor and click "Run"

### Step 4: Verify
You should see success messages like:
```
✅ TRANSFER TRIGGER FIX APPLIED SUCCESSFULLY
📋 What was fixed:
  1. Removed all old/duplicate triggers
  2. Created ONE correct trigger for new schema
  ...
```

### Step 5: Test
Create a test transfer:
- Start: Warehouse has 50 units
- Transfer: 10 units to Branch
- After completing: 
  - Warehouse should have 40 (not 20!) ✅
  - Branch should have 10 ✅

---

## Why This Happened

Your system was migrated from:
- **OLD**: Single product per transfer (using `transfers.product_id` and `transfers.quantity`)
- **NEW**: Multi-product transfers (using `transfer_items` table)

But the OLD triggers were never removed, so:
- Old triggers fire → try to use columns that don't exist → undefined behavior
- New trigger fires → works correctly
- **Result**: Multiple inventory updates = triple deduction

---

## Quick Reference

| File | Status | Action |
|------|--------|--------|
| `/FIX_TRIPLE_DEDUCTION_COMPLETE.sql` | ✅ USE THIS | Run once in Supabase |
| `/TRIPLE_DEDUCTION_BUG_EXPLAINED.md` | 📖 READ THIS | Full explanation |
| `/DIAGNOSE_TRANSFER_TRIGGERS.sql` | 🔍 OPTIONAL | Check current state |
| `/FIX_TRANSFER_TRIGGER.sql` | ❌ DON'T USE | Creates duplicate triggers |
| `/FIX_TRANSFER_BUG_NOW.sql` | ❌ DON'T USE | Creates duplicate triggers |
| `/FIX_TRANSFER_DUPLICATION_BUG.sql` | ❌ DON'T USE | Incomplete fix |

---

## After Running the Fix

The transfer workflow will work correctly:

```
1. Create Transfer (status: pending)
   → No inventory changes

2. Approve (status: approved)  
   → No inventory changes

3. Mark In Transit (status: in_transit)
   → No inventory changes

4. Complete/Accept (status: completed)
   → ONE trigger fires
   → Deducts from source exactly once
   → Adds to destination exactly once
   → ✅ Correct amounts
```

---

## Need Help?

1. Read: `/TRIPLE_DEDUCTION_BUG_EXPLAINED.md` for full details
2. Check: Supabase logs for trigger messages
3. Verify: Only one trigger exists after running the fix
4. Test: Create a new transfer with known quantities

**The fix is complete and comprehensive. Just run the one SQL file and you're done!**
