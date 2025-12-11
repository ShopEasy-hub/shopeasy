# 🔧 Stock Management Troubleshooting Guide

## Issue Description
You're experiencing issues where:
1. ✗ Stock adjustments show different numbers than expected
2. ✗ Stock disappears when you leave the inventory page
3. ✗ POS doesn't show inventory correctly
4. ✗ You can complete sales even with no stock

## Root Cause Analysis

Based on the code review, the issue is likely ONE of these:

### 1. **RLS Policies Not Set (Most Likely)**
The kv_store table needs Row Level Security policies to allow the backend to save data.

**Solution:** Run the SQL file you already have
- File: `CRITICAL_FIX_RUN_THIS_SQL.sql`
- Location: Project root
- Instructions: Already provided in the file

### 2. **Data Not Persisting to Database**
Stock updates might be failing silently at the database level.

**How to Check:**
1. Open browser console (F12)
2. Go to Inventory page
3. Adjust stock for any product
4. Look for detailed logs starting with 🔧
5. Check if you see ✅ or ❌ icons in the logs

### 3. **JWT Token Expired**
If your authentication token is expired, API calls will fail.

**Solution:**
- Refresh the page (F5)
- Or logout and login again

## Step-by-Step Troubleshooting

### Step 1: Run SQL Fix (IMPORTANT)

1. Go to: https://supabase.com/dashboard/project/pkzpifdocmmzowvjopup/sql/new
2. Open the file `CRITICAL_FIX_RUN_THIS_SQL.sql` from your project
3. Copy ALL the contents
4. Paste into Supabase SQL Editor
5. Click **RUN**
6. Wait for "Success" message

**What this does:**
- Creates RLS (Row Level Security) policies
- Allows your backend to read/write to kv_store table
- Allows authenticated users to access their data

### Step 2: Use Stock Diagnostic Tool

I've created a new diagnostic page for you:

1. In your app, click **"Stock Diagnostic"** in the sidebar
2. Click **"Run Full Diagnostics"**
3. Review the results to see what's working

**Or access directly:**
- Add `?stock-diagnostic=true` to your URL
- Example: `http://localhost:8000/?stock-diagnostic=true`

### Step 3: Test Stock Update

1. Go to **Inventory** page
2. Find ANY product
3. Open browser console (F12)
4. Look for a log like: `Product ID: product_xxxxx`
5. Copy that product ID

6. Go to **Stock Diagnostic** page
7. Paste the Product ID
8. Enter a quantity (e.g., 10)
9. Click **"Run Stock Update Test"**
10. Check the result

### Step 4: Check Browser Console Logs

When you adjust stock now, you'll see detailed logs like:

```
🔧 === STOCK ADJUSTMENT START ===
📍 Branch ID: branch_12345
📦 Product ID: product_67890
📝 Product Name: Paracetamol 500mg
🔢 Adjustment: 10
⚙️ Operation: add
📊 Current Stock (from UI): 5
🚀 Calling updateStock API...
✅ API Response: { success: true, stock: { quantity: 15 } }
📦 New quantity from API: 15
🔍 Verifying stock update...
✅ Stock verified successfully in database
🔧 === STOCK ADJUSTMENT END ===
```

**If you see ❌ errors:** Something is wrong with the API call
**If you see ✅ but stock disappears:** Database might not be saving

## Common Issues and Solutions

### Issue: "Stock shows 0 after adjustment"

**Possible Causes:**
1. RLS policies not set → Run SQL fix
2. API returning success but not saving → Check Supabase logs
3. State not updating → Clear browser cache

**Solution:**
```bash
# Step 1: Run the SQL fix in Supabase
# Step 2: Clear browser cache
# Step 3: Logout and login again
# Step 4: Try adjusting stock again
```

### Issue: "Stock disappears when I navigate away"

This suggests the stock is being saved to local state but not to the database.

**Solution:**
1. Run the SQL fix
2. Check if the verification log shows ✅ or ❌
3. If ❌, check Supabase dashboard → Logs for errors

### Issue: "Different number shows than what I adjusted"

**Example:** You add +10 but it shows +20 or shows 10 instead of adding to existing.

**Possible Cause:** 
- Operation type confusion (set vs add)
- Double-triggering of the update

**Check:**
- Look at the console log for "Operation:" 
- Should be "add" for positive, "subtract" for negative
- Check "Absolute Quantity:" matches what you entered

### Issue: "POS doesn't show stock / Can sell with no stock"

This means stock data isn't being loaded or is returning empty.

**Solution:**
1. Make sure you ran the SQL fix
2. Go to POS Terminal
3. Open browser console
4. Look for logs starting with 🛒 POS:
5. Check if "DEDUPLICATED STOCK:" shows any data

## Verification Checklist

After running the SQL fix, verify everything works:

- [ ] Can add a new product with initial stock
- [ ] Stock shows correct number in Inventory page
- [ ] Can adjust stock (add/subtract)
- [ ] Stock persists after navigating away and back
- [ ] POS Terminal shows correct stock levels
- [ ] Can't add more to cart than available stock
- [ ] Transfers show stock correctly

## Advanced Debugging

### Check Supabase Directly

1. Go to Supabase Dashboard
2. Navigate to Table Editor
3. Find table `kv_store_088c2cd9`
4. Look for keys starting with `stock:`
5. Check if your stock entries exist

**Example stock entry:**
```
Key: stock:branch_abc:product_xyz
Value: {
  "branchId": "branch_abc",
  "productId": "product_xyz",
  "quantity": 10,
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### Check Supabase Logs

1. Go to Supabase Dashboard
2. Navigate to Logs → API Logs
3. Filter by: `functions/v1/make-server-088c2cd9`
4. Look for PUT requests to `/stock/`
5. Check for any errors

## Still Having Issues?

If you've tried everything above and it's still not working:

### 1. Export Diagnostic Info

Run this in browser console:
```javascript
// Get current context
console.log('=== DIAGNOSTIC INFO ===');
console.log('Org ID:', localStorage.getItem('orgId'));
console.log('Branch ID:', localStorage.getItem('currentBranchId'));
console.log('User ID:', localStorage.getItem('userId'));

// Check if products exist
fetch('https://pkzpifdocmmzowvjopup.supabase.co/functions/v1/make-server-088c2cd9/org/YOUR_ORG_ID/products', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
})
.then(r => r.json())
.then(d => console.log('Products:', d));
```

### 2. Check Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Adjust stock
4. Look for request to `/stock/`
5. Check:
   - Request payload
   - Response status (should be 200)
   - Response body (should have `success: true`)

### 3. Nuclear Option: Reset Stock Data

**WARNING: This deletes all stock data!**

1. Go to Database Status page
2. Click "Delete All Stock"
3. Confirm
4. Add products again with initial stock

## Contact Support

If nothing works, you may have a unique edge case. Prepare this info:

1. Screenshots of browser console errors
2. Screenshots of Supabase logs
3. Description of exact steps that reproduce the issue
4. Your Supabase project ID (already visible in code)

---

## Quick Reference

**SQL Fix File:** `CRITICAL_FIX_RUN_THIS_SQL.sql`  
**Supabase SQL Editor:** https://supabase.com/dashboard/project/pkzpifdocmmzowvjopup/sql/new  
**Stock Diagnostic Page:** Add `?stock-diagnostic=true` to URL  
**Database Status Page:** Click "Database Status" in sidebar  

---

Last Updated: ${new Date().toISOString()}
