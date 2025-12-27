# Debug Console Errors

## How to Get Console Errors

1. Open your browser (Chrome/Edge/Firefox)
2. Press **F12** (or Right Click > Inspect)
3. Click on the **Console** tab
4. Click **Clear console** button (🚫 icon)
5. Click on **Warehouses** in your app
6. Look for RED error messages

## What to Send Me

Copy and paste **ALL RED ERRORS** you see. They look like this:

```
❌ Error: function get_warehouses_secure does not exist
```

or

```
Uncaught TypeError: Cannot read property 'map' of undefined
    at WarehousesUnified.tsx:123
```

or

```
Error: relation "warehouses" does not exist
```

## I Added Console Logs

When you click Warehouses, you should see these in the console:

```
🔧 WarehousesUnified mounted
📦 Loading initial data, orgId: xxx-xxx-xxx
🔍 Fetching warehouses and branches...
✅ Warehouses loaded: [...]
✅ Branches loaded: [...]
```

If you see ❌ anywhere, that's the error. Copy the FULL message.

## Common Errors and What They Mean

### Error: "function get_warehouses_secure does not exist"
**Cause:** SQL not run or failed
**Fix:** Run `/FINAL_CLEAN_FIX.sql` again

### Error: "Cannot read property 'map' of undefined"
**Cause:** API returned null instead of array
**Fix:** Need to see full error

### Error: "relation warehouses does not exist"
**Cause:** Table not created
**Fix:** Need to check your database schema

### Error: "infinite recursion detected in policy"
**Cause:** RLS policy issue
**Fix:** Run `/FINAL_CLEAN_FIX.sql` which fixes this

## Send Me This Info

1. **Console errors** (all red text)
2. **Console logs** (the 🔧📦🔍✅ messages)
3. **What you see on screen** (blank? error message? stuck loading?)

Then I can fix it in 2 minutes instead of guessing.
