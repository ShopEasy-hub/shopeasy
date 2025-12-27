# 🔧 FIX: Branch Address Column Missing

## The Problem
You're getting this error when creating a branch:
```
Could not find the 'address' column of 'branches' in the schema cache
```

This is because the `branches` table has a `location` column but the app is trying to insert an `address` field.

---

## ⚡ THE FIX (Copy & Paste Into Supabase SQL Editor)

```sql
-- Add the 'address' column to branches table
ALTER TABLE branches 
ADD COLUMN IF NOT EXISTS address TEXT;

-- Migrate existing 'location' data to 'address' (if any)
UPDATE branches 
SET address = location 
WHERE address IS NULL AND location IS NOT NULL;
```

**Click RUN** ✅

---

## ✅ Verify It Worked

Run this to check:

```sql
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'branches' 
  AND column_name IN ('address', 'location', 'phone', 'name')
ORDER BY column_name;
```

You should now see BOTH `address` and `location` columns.

---

## 🚀 Test Again

1. Go back to your app
2. Try creating your branch again
3. It should work now! 🎉

---

## 📝 What Happened

The database migration had `location` field but the frontend was using `address`. Both fields will now exist:
- **`location`** - Legacy field (can be removed later if not needed)
- **`address`** - New field that the app uses

This is safe and won't break anything.
