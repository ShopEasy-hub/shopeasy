# 🚨 URGENT: Run This SQL NOW

## The Error You're Seeing

```
Failed to load resource: the server responded with a status of 400 ()
Error receiving transfer
```

This is because the database doesn't allow `in_transit` or `completed` status yet!

## ✅ THE FIX (30 seconds)

### Step 1: Open Supabase
1. Go to https://supabase.com/dashboard
2. Select your project: **pkzpifdocmmzowvjopup**
3. Click "SQL Editor" in the left sidebar
4. Click "New Query"

### Step 2: Copy & Paste This SQL

```sql
-- Add in_transit status to transfers table
ALTER TABLE transfers 
DROP CONSTRAINT IF EXISTS transfers_status_check;

ALTER TABLE transfers 
ADD CONSTRAINT transfers_status_check 
CHECK (status IN ('pending', 'approved', 'in_transit', 'rejected', 'completed'));

-- Verify it worked
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'transfers_status_check';
```

### Step 3: Click "RUN" ▶️

You should see output showing the constraint was updated.

### Step 4: Hard Refresh Browser
Press `Ctrl + Shift + R` (or `Cmd + Shift + R` on Mac)

### Step 5: Try Again
Click "Accept Transfer" again - it should work now!

## Why This Fixes It

The database was only allowing these statuses:
- ❌ `pending, approved, rejected, completed`

Now it allows:
- ✅ `pending, approved, in_transit, rejected, completed`

So the "Accept" button (which sets status to `completed`) will now work!

---

**After running the SQL above, transfers will work perfectly!** 🎉
