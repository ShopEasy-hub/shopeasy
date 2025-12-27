# 🔧 FIX: isHeadquarters Column Error

## The Problem
You're getting this error when creating a branch:
```
Could not find the 'is/headquarters' column of 'branches' in the schema cache
```

This is because the frontend uses `isHeadquarters` (camelCase) but the database uses `is_headquarters` (snake_case).

---

## ✅ THE FIX - Already Applied!

I've updated the `createBranch`, `getBranches`, and `updateBranch` functions in `/lib/api-supabase.ts` to automatically convert between camelCase and snake_case.

**No SQL needed this time!** The code is already fixed.

---

## 🚀 Test Now

1. **Refresh your app** (hard refresh: Ctrl+Shift+R or Cmd+Shift+R)
2. Try creating your branch again
3. It should work now! 🎉

---

## 🔍 What Changed

**Before:**
```typescript
// Frontend sent: { isHeadquarters: true }
// Database expected: { is_headquarters: true }
// ❌ ERROR!
```

**After:**
```typescript
// Frontend sends: { isHeadquarters: true }
// API converts to: { is_headquarters: true }
// Database receives correct format
// ✅ SUCCESS!
```

---

## 📋 Changes Made

1. **`createBranch()`** - Now converts `isHeadquarters` → `is_headquarters` before inserting
2. **`getBranches()`** - Now converts `is_headquarters` → `isHeadquarters` when fetching
3. **`updateBranch()`** - Now converts field names when updating

The frontend can continue using camelCase (JavaScript convention) while the database uses snake_case (SQL convention).
