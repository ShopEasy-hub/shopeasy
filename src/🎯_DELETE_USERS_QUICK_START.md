# 🎯 Delete Users - Quick Start

## ⚡ 2-Minute Setup

### Step 1: Enable Cascade Delete
```bash
1. Open Supabase Dashboard → SQL Editor
2. Run: /supabase/migrations/1000_ADD_USER_DELETE_CASCADE.sql
3. Wait for: "✅ CASCADE DELETE ENABLED"
```

### Step 2: Refresh Your App
```bash
1. Hard refresh browser (Ctrl+Shift+R)
2. Login as owner or admin
3. Go to Users page
```

### Step 3: Delete Users
```bash
1. Click red "Delete" button next to user
2. Confirm deletion
3. User removed instantly ✅
```

---

## 🎯 Quick Reference

### What It Does:
- ✅ Deletes user from database (both auth.users and user_profiles)
- ✅ User can no longer login
- ✅ Removed from users list immediately
- ✅ Confirmation dialog prevents accidents

### Who Can Delete:
- ✅ Owner (except themselves)
- ✅ Admin (except owner)
- ❌ Everyone else

### UI Location:
```
Dashboard → Settings → Users → Delete button (trash icon)
```

---

## 🔧 Files Changed

**Backend:**
- `/lib/api-supabase.ts` - `deleteOrganizationUser()` function
- `/lib/api.ts` - `deleteUser()` wrapper

**Frontend:**
- `/pages/Users.tsx` - Delete button + handler

**Database:**
- `/supabase/migrations/1000_ADD_USER_DELETE_CASCADE.sql` - CASCADE setup

**Documentation:**
- `/✅_USER_DELETE_FEATURE_COMPLETE.md` - Full guide
- `/🎯_DELETE_USERS_QUICK_START.md` - This file

---

## ✅ Testing

### Quick Test:
```bash
1. Create a test user (e.g., test@example.com, cashier role)
2. Click Delete button next to that user
3. Confirm deletion
4. User should disappear from list
5. Try logging in with test@example.com → Should fail ✅
```

---

## 🐛 If It's Not Working

### Delete button not showing?
```bash
- Hard refresh (Ctrl+Shift+R)
- Check you're logged in as owner/admin
- Clear browser cache
```

### Delete fails?
```bash
- Run migration: 1000_ADD_USER_DELETE_CASCADE.sql
- Check browser console (F12) for errors
- Check Supabase logs
```

### User still in list after delete?
```bash
- Refresh the page
- Run cleanup script: 🔧_FIX_USERS_NOT_SHOWING.sql
```

---

## 📊 What Gets Deleted

### Deleted:
- ✅ auth.users record
- ✅ user_profiles record
- ✅ User session (auto logout)

### Preserved (for audit):
- ✅ Sales they processed
- ✅ Transfers they initiated
- ✅ Historical data

---

## 🎉 You're Done!

The delete feature is ready to use. Run the migration and start managing your users!

---

**Priority:** Run `/supabase/migrations/1000_ADD_USER_DELETE_CASCADE.sql` now
**Time:** 30 seconds
**Status:** Production Ready ✅
