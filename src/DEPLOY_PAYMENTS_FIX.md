# Deploy Payments Fix - IMMEDIATE ACTION REQUIRED

## What I Did

I've created a **NEW dedicated payments edge function** that has NO KV store dependencies whatsoever. The client code now points to this new function instead of the old `make-server-088c2cd9` function.

### Files Created/Updated:

1. ✅ **NEW**: `/supabase/functions/payments/index.tsx` - Clean payment-only edge function
2. ✅ **UPDATED**: `/lib/payment.ts` - Now points to the new payments function
3. ✅ **CREATED**: `/supabase/migrations/ADD_PAYMENTS_TABLE.sql` - Database migration
4. ✅ **UPDATED**: `/supabase/functions/server/index.tsx` - Fixed but you may not need it now

## Deploy Steps (Choose ONE method)

---

### ⚡ METHOD 1: Supabase CLI (FASTEST - Recommended)

**Step 1:** Install Supabase CLI if you don't have it

```bash
# macOS/Linux
brew install supabase/tap/supabase

# Windows (using Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Or download from: https://github.com/supabase/cli/releases
```

**Step 2:** Login and deploy

```bash
# Login to Supabase (opens browser)
supabase login

# Navigate to your project root
cd /path/to/your/shopeasy/project

# Link your Supabase project (first time only)
supabase link --project-ref pkzpifdocmmzowvjopup

# Deploy ONLY the new payments function
supabase functions deploy payments

# That's it! Function is now live.
```

**Step 3:** Set environment variables in Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/pkzpifdocmmzowvjopup/settings/functions
2. Click "**Edge Functions Secrets**"
3. Add these secrets:
   - **Name**: `PAYSTACK_SECRET_KEY` | **Value**: Your PayStack secret key
   - OR **Name**: `FLUTTERWAVE_SECRET_KEY` | **Value**: Your Flutterwave secret key

**Step 4:** Test it!

- Go back to your app
- Try upgrading a plan
- No more errors! 🎉

---

### 📋 METHOD 2: Manual Deploy via Supabase Dashboard

**Step 1:** Copy the function code

1. Open file: `/supabase/functions/payments/index.tsx`
2. Select all and copy (Ctrl+A, Ctrl+C)

**Step 2:** Create the function in Supabase

1. Go to: https://supabase.com/dashboard/project/pkzpifdocmmzowvjopup
2. Click **"Edge Functions"** in left sidebar
3. Click **"Create a new function"**
4. Name it: `payments`
5. Paste the code you copied
6. Click **"Deploy function"**

**Step 3:** Set environment variables

1. Stay in Edge Functions page
2. Click **"Settings"** or **"Secrets"**
3. Add these secrets:
   - **Name**: `PAYSTACK_SECRET_KEY` | **Value**: Your PayStack secret key
   - OR **Name**: `FLUTTERWAVE_SECRET_KEY` | **Value**: Your Flutterwave secret key

**Step 4:** Test it!

- Go back to your app
- Try upgrading a plan
- Should work now! 🎉

---

## Required Environment Variables

Set these in Supabase Dashboard → Edge Functions → Secrets:

| Variable Name | Required? | Where to Get It |
|---------------|-----------|-----------------|
| `PAYSTACK_SECRET_KEY` | ONE required | https://dashboard.paystack.com/#/settings/developers |
| `FLUTTERWAVE_SECRET_KEY` | ONE required | https://dashboard.flutterwave.com/settings/apis |
| `SUPABASE_URL` | Auto-set | (Already configured) |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-set | (Already configured) |
| `FRONTEND_URL` | Optional | Your app URL (defaults to localhost:3000) |

**Note:** You need AT LEAST one payment provider (PayStack OR Flutterwave).

---

## Verify It's Working

### 1. Check Function Deployment

Visit this URL in your browser:
```
https://pkzpifdocmmzowvjopup.supabase.co/functions/v1/payments
```

You should see:
```json
{
  "status": "ok",
  "service": "ShopEasy Payment Service",
  "version": "2.0.0",
  "message": "Payments API is running. No KV store dependencies."
}
```

### 2. Test Payment Flow

1. Open your ShopEasy app
2. Click "Upgrade Plan"
3. Select a plan and billing cycle
4. Click "Continue to Payment"
5. Choose PayStack or Flutterwave
6. You should be redirected to payment gateway (no errors!)

### 3. Check Browser Console

Open DevTools (F12) → Console tab:

- ❌ **Before fix**: `Could not find the table 'public.kv_store_088c2cd9'`
- ✅ **After fix**: No errors, successful payment initialization

### 4. Check Supabase Logs

Go to: Dashboard → Edge Functions → payments → Logs

Look for successful requests:
```
POST /payments/paystack/initialize - 200 OK
GET /payments/paystack/verify/:reference - 200 OK
```

---

## Why This Solution Works

### The Problem:
- Old edge function (`make-server-088c2cd9`) was using KV store
- KV store table was deleted during PostgreSQL migration
- Edge function code wasn't redeployed after I fixed it

### The Solution:
- Created a **brand new** edge function with NO KV store imports
- Updated client code to use the new function endpoint
- New function uses PostgreSQL `payments` and `subscriptions` tables

### Benefits:
- ✅ No KV store dependencies at all
- ✅ Clean, dedicated payment function
- ✅ Easier to maintain and debug
- ✅ Uses proper PostgreSQL tables with RLS policies

---

## Troubleshooting

### Error: "Payment gateway not configured"

**Cause:** API key not set in Supabase secrets.

**Fix:**
1. Go to Dashboard → Settings → Edge Functions → Secrets
2. Add `PAYSTACK_SECRET_KEY` or `FLUTTERWAVE_SECRET_KEY`
3. Make sure the key is correct (test vs live)

### Error: "Function not found" or 404

**Cause:** Function not deployed yet.

**Fix:**
- Follow deployment steps above
- Make sure function name is exactly `payments` (no typos)

### Error: "Unauthorized"

**Cause:** Not logged in or token expired.

**Fix:**
- Logout and login again
- Clear browser cache
- Check if `SUPABASE_SERVICE_ROLE_KEY` is set in Edge Functions secrets

### Still getting "kv_store" error

**Cause:** Browser cached the old API endpoint.

**Fix:**
1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Clear browser cache completely
3. Close and reopen browser
4. Verify you deployed the new `payments` function

### Payment records not saving

**Cause:** Migration not run.

**Fix:**
1. Go to Supabase SQL Editor
2. Open `/supabase/migrations/ADD_PAYMENTS_TABLE.sql`
3. Copy all SQL
4. Paste and run in SQL Editor

---

## Test Payment Credentials

### PayStack Test Mode

**Test Secret Key:** Get from https://dashboard.paystack.com/#/settings/developers

**Test Cards:**
- Success: `4084 0840 8408 4081`
- Decline: `4084 0840 8408 4093`
- Any future expiry, any CVV

### Flutterwave Test Mode

**Test Secret Key:** Get from https://dashboard.flutterwave.com/settings/apis

**Test Card:**
- Number: `5531 8866 5214 2950`
- CVV: `564`
- Expiry: Any future date
- PIN: `3310`
- OTP: `12345`

---

## Quick Reference

### File Locations

- **New payments function**: `/supabase/functions/payments/index.tsx`
- **Client payment library**: `/lib/payment.ts`
- **Database migration**: `/supabase/migrations/ADD_PAYMENTS_TABLE.sql`
- **Old function (ignore)**: `/supabase/functions/server/index.tsx`

### API Endpoints

**Old (don't use):**
```
https://pkzpifdocmmzowvjopup.supabase.co/functions/v1/make-server-088c2cd9/payments/...
```

**New (now using):**
```
https://pkzpifdocmmzowvjopup.supabase.co/functions/v1/payments/payments/...
```

### Deployment Commands

```bash
# Deploy just payments function
supabase functions deploy payments

# Check deployment status
supabase functions list

# View logs
supabase functions logs payments
```

---

## Next Steps After Deployment

1. ✅ Deploy the `payments` edge function
2. ✅ Add API keys to Supabase secrets
3. ✅ Run database migration (if not already done)
4. ✅ Test payment flow
5. ✅ Verify payments appear in `payments` table
6. ✅ Verify subscriptions appear in `subscriptions` table
7. 🎉 You're done!

---

## Need Help?

If you're still stuck:

1. **Check edge function logs**: Dashboard → Edge Functions → payments → Logs
2. **Check browser console**: F12 → Console tab
3. **Verify API keys**: Dashboard → Settings → Edge Functions → Secrets
4. **Test function health**: Visit `https://pkzpifdocmmzowvjopup.supabase.co/functions/v1/payments`

---

**Last Updated:** December 2025  
**Priority:** 🔴 HIGH - Deploy immediately to fix payments
