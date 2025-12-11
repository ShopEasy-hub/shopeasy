# Stock Deletion Fix - Clear Instructions

## What You're Experiencing

When you transfer stock from warehouse to branch and accept it, the old branch stock disappears. For example:
- Branch had: 100 units
- Transfer: +50 units
- Result: Only 50 units (old 100 disappeared)

## What I Need You To Do

### Step 1: Run Diagnostic First

Please run this file in your Supabase SQL Editor:

```
/DIAGNOSE_STOCK_ISSUE_NOW.sql
```

**Then copy and paste the entire output here.** 

This will tell me:
- What the actual database state is
- Whether the constraint exists and is correct
- If there are duplicate records
- How the trigger is currently configured

### Step 2: After I See The Diagnostic

Once you share the diagnostic output, I'll know exactly what's wrong and can give you the precise fix.

## Why I'm Asking For This

You're right - I gave you multiple SQL files without understanding your actual database state. 

The diagnostic will show me:
1. Is the constraint properly configured?
2. Are there duplicate inventory records hiding the old stock?
3. Is the trigger using the old or new structure?
4. Does `transfer_items` table exist?

Different fixes are needed depending on what the diagnostic shows.

## If You Want To Try A Fix Now

If you want to try immediately without the diagnostic, run:

```
/FINAL_FIX_PLEASE_RUN_THIS.sql
```

This includes both diagnosis and automatic fix. It will:
1. Check what's wrong
2. Fix the constraint
3. Merge any duplicates
4. Update the trigger
5. Verify everything

**Look for the verification output at the end.**

## The Root Cause (Likely)

The problem is probably one of these:

**A) Missing `NULLS NOT DISTINCT`**
- The UNIQUE constraint doesn't work properly with NULL values
- Each transfer creates a NEW row instead of updating existing
- Old stock "disappears" because only newest row is shown

**B) Application Code Running**
- Maybe some code is still calling stock adjustment functions
- This would SET stock instead of ADD to it

**C) Trigger Not Firing**
- The trigger might not exist or might not be enabled
- Without it, transfers don't update inventory at all

## What To Look For In Your Transfer Flow

When you complete a transfer, check the browser console. You should see:

```
🔄 [TRANSFER] Completing transfer ID: xxx
📦 [TRANSFER] Processing 1 items
   → Product: yyy, Qty: 50
   ↓ Deducting from warehouse: zzz
   ↑ Adding to branch: aaa
✅ [TRANSFER] Completed successfully
```

If you DON'T see these logs, the trigger isn't firing.

## Next Steps

1. Run `/DIAGNOSE_STOCK_ISSUE_NOW.sql`
2. Share the complete output with me
3. I'll give you the exact fix for your specific situation

I apologize for the confusion earlier. Let's solve this methodically.
