# 📊 Product History Audit - Quick Reference

## 🚀 1-Minute Setup

```sql
-- Copy/paste this in Supabase Dashboard → SQL Editor
-- File: /supabase/migrations/ADD_PRODUCT_HISTORY_AUDIT.sql
```

**OR** just run the updated HYBRID_MIGRATION.sql (already includes it)

---

## 🎯 Access

**Navigation:**  
Dashboard → Sidebar → **📊 Product History**

**Who can access:**
- ✅ Owner
- ✅ Admin  
- ✅ Auditor
- ❌ Manager (blocked)
- ❌ Cashier (blocked)

---

## 🔍 How to Use

1. **Search** product by name/SKU/barcode
2. **Click** product from dropdown
3. **View** complete sales history
4. **Filter** by date/branch as needed
5. **Export** to CSV for analysis

---

## 📊 What You See

**Statistics Cards:**
- Total sales count
- Units sold
- Revenue generated
- Average sale value

**Sales History Table:**
- Date & time
- Quantity sold
- Price & discount
- Cashier (name & email)
- Branch location
- Customer info
- Payment method

**Filters:**
- Date: All Time, Today, Week, Month, Year
- Branch: All or specific
- Sort: Date, Quantity, Revenue
- Order: Newest/Oldest first

---

## 🗄️ Database

**New Table:** `audit_logs`
- 9 columns
- 5 indexes (fast queries)
- RLS enabled (secure)
- 2 policies (admin read, system write)

**Tables Used:**
- sale_items (products in sales)
- sales (transaction details)
- products (product info)
- branches (location data)
- user_profiles (cashier data)

---

## 💡 Quick Examples

**Audit iPhone sales:**
```
Search: "iPhone" → Select → View all sales
```

**Check stock discrepancy:**
```
Search by SKU → Last 30 Days → Count units sold
```

**Branch performance:**
```
Select product → View "Top Branch" statistic
```

**Export for Excel:**
```
Select product → Click "Export CSV" → Open in Excel
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't see link | Check role (must be owner/admin/auditor) |
| Access Denied | Contact organization owner |
| No sales | Product has no sales or date filter too narrow |
| Slow loading | Apply date range filter, verify indexes |
| Missing cashiers | Old sales might not have cashier_id |

---

## 📁 Documentation

- **`PRODUCT_HISTORY_GUIDE.md`** - Full detailed guide
- **`🎯_PRODUCT_HISTORY_SETUP.md`** - Step-by-step setup
- **`✅_PRODUCT_HISTORY_COMPLETE.md`** - Complete summary
- **`PRODUCT_HISTORY_QUICK_REF.md`** - This file

---

## ✅ SQL Verification

```sql
-- Check table exists
SELECT COUNT(*) FROM audit_logs;

-- Check indexes (should return 5)
SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'audit_logs';

-- Check policies (should return 2)
SELECT COUNT(*) FROM pg_policies WHERE tablename = 'audit_logs';

-- Test query
SELECT si.name, si.quantity, s.created_at, up.name AS cashier
FROM sale_items si
JOIN sales s ON si.sale_id = s.id
LEFT JOIN user_profiles up ON s.cashier_id = up.id
LIMIT 5;
```

---

## 📞 Quick Links

**Setup:**
1. Run SQL → Supabase Dashboard
2. Login as Owner/Admin/Auditor
3. Dashboard → 📊 Product History
4. Start auditing!

**Support:**
- Check console for errors
- Verify user role in database
- Read troubleshooting section
- Review full documentation

---

**Status:** ✅ Ready to use  
**Effort:** 2 minutes (SQL only)  
**Docs:** ✅ Complete  

*Last Updated: November 1, 2025*
