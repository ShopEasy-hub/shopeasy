# 🔧 FIX: CamelCase to Snake_Case Mapping

## The Problem
You got this error:
```
Could not find the 'is_headquarters' column of 'branches' in the schema cache
```

This happened because:
- **JavaScript uses camelCase**: `isHeadquarters`
- **PostgreSQL uses snake_case**: `is_headquarters`

The app was sending `isHeadquarters: true` but the database column is named `is_headquarters`.

---

## ✅ The Fix

I've updated the `createBranch()` and `updateBranch()` functions in `/lib/api-supabase.ts` to automatically convert between camelCase and snake_case.

**Now the mapping works like this:**

| Frontend (camelCase) | Database (snake_case) |
|---------------------|----------------------|
| `isHeadquarters`    | `is_headquarters`    |
| `name`              | `name`               |
| `address`           | `address`            |
| `phone`             | `phone`              |

---

## 🚀 Test Now

1. **Refresh your app** (the code is already updated)
2. Try creating your branch again with:
   - Branch Name: "chrys" (or whatever you want)
   - Address: "notome" (or your actual address)
   - Phone: "09150501576"
3. Click **Complete Setup**
4. It should work now! 🎉

---

## 📝 No SQL Required

This fix was **entirely in the TypeScript code** - no database changes needed. Just refresh and try again!
