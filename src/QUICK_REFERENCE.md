# 🚀 QUICK REFERENCE - 2-Minute Fix

## The Problem
Stock showing zero • Delete errors • POS broken • Transfers broken

## The Solution

### 1️⃣ Delete Stock (30 sec)
```
Login → Database Status (sidebar) → Delete All Stock → Confirm
```

### 2️⃣ Fix Database (30 sec)
```
Open: supabase.com/.../sql/new
Copy: CRITICAL_FIX_RUN_THIS_SQL.sql
Paste → RUN
```

### 3️⃣ Test (1 min)
```
Inventory → Add Product → Initial Stock: 100 → Verify shows 100 ✅
```

## Quick Links

- **Database Status Page:** Click sidebar or add `?database-status=true` to URL
- **Supabase SQL Editor:** https://supabase.com/dashboard/project/pkzpifdocmmzowvjopup/sql/new
- **Full Guide:** `START_HERE.md`
- **Detailed Steps:** `FINAL_CHECKLIST.md`

## Files You Need

1. ✅ `START_HERE.md` - Read this first
2. ✅ `CRITICAL_FIX_RUN_THIS_SQL.sql` - Run this in Supabase
3. ✅ `FINAL_CHECKLIST.md` - Step-by-step with checkboxes

## Console Commands

Check browser console (F12) for these messages:

**After delete:**
```
🎉 ALL STOCK DATA DELETED!
```

**After SQL fix:**
```
🎉 ALL SYSTEMS OPERATIONAL!
```

## Status Indicators

- ✅ Green = Working
- ⚠️ Yellow = Empty but working
- ❌ Red = Broken (needs SQL fix)

## Common Issues

| Issue | Fix |
|-------|-----|
| Stock zero | Delete stock + SQL fix |
| Delete 404 | SQL fix |
| POS no stock | Delete stock + SQL fix |
| Transfers broken | Delete stock + SQL fix |
| Expenses missing | Different browser? (uses localStorage) |

## One-Line Summary

**Delete stock → Run SQL → Test = Fixed! ✅**

---

Need help? → `START_HERE.md`
