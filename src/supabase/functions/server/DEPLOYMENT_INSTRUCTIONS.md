# Edge Function Deployment Instructions

## The Problem
The edge function code was updated to remove KV store dependency, but the running version on Supabase still has the old code. You need to redeploy it.

## Quick Deploy (3 Steps)

### Step 1: Install Supabase CLI (if not installed)

**Windows:**
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**macOS:**
```bash
brew install supabase/tap/supabase
```

**Linux:**
```bash
brew install supabase/tap/supabase
```

Or download from: https://github.com/supabase/cli/releases

### Step 2: Login to Supabase

```bash
supabase login
```

This will open a browser for authentication.

### Step 3: Deploy the Function

```bash
# Navigate to your project directory
cd /path/to/your/project

# Link to your Supabase project (first time only)
supabase link --project-ref pkzpifdocmmzowvjopup

# Deploy the server function
supabase functions deploy server
```

## Alternative: Manual Deployment via Dashboard

If you can't use CLI:

### Step 1: Copy the Function Code

1. Open `/supabase/functions/server/index.tsx` in your code editor
2. Copy ALL the code (Ctrl+A, Ctrl+C)

### Step 2: Update in Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/pkzpifdocmmzowvjopup
2. Click **"Edge Functions"** in the left sidebar
3. Find the **"server"** function (or "make-server-088c2cd9")
4. Click on it
5. Look for **"Deploy new version"** or **"Edit"** button
6. Delete the old code
7. Paste the new code from Step 1
8. Click **"Deploy"** or **"Save"**

### Step 3: Set Environment Variables (if not already set)

In the same Supabase dashboard:

1. Go to **Settings → Edge Functions → Secrets**
2. Ensure these are set:
   - `PAYSTACK_SECRET_KEY` (your PayStack secret key)
   - OR `FLUTTERWAVE_SECRET_KEY` (your Flutterwave secret key)
   - `SUPABASE_URL` (auto-set, but verify: https://pkzpifdocmmzowvjopup.supabase.co)
   - `SUPABASE_SERVICE_ROLE_KEY` (auto-set)

## Verify Deployment

After deploying, test it:

1. Go back to your app
2. Try the payment flow again
3. Check browser console - the error should be gone
4. Check Supabase logs: Dashboard → Edge Functions → server → Logs

## Common Issues

### "Function not found"
**Fix:** Make sure you deployed to the correct project and function name matches.

### "Still getting KV store error"
**Fix:** Clear browser cache, then try again. The old response might be cached.

### "Unauthorized" error
**Fix:** Check that `SUPABASE_SERVICE_ROLE_KEY` is set in Edge Function secrets.

### "Payment gateway not configured"
**Fix:** Add `PAYSTACK_SECRET_KEY` or `FLUTTERWAVE_SECRET_KEY` to Edge Function secrets.

## Testing After Deployment

1. Open browser DevTools (F12)
2. Go to Network tab
3. Try making a payment
4. Look for request to: `pkzpifdocmmzowvjopup.supabase.co/functions/v1/make-server-088c2cd9/payments/paystack/initialize`
5. Check the response - should NOT mention kv_store anymore
6. If successful, you'll see a 200 response with `authorizationUrl`

## Need Help?

If deployment fails, copy the exact error message and check:
- Supabase CLI version: `supabase --version`
- Project link status: `supabase status`
- Function logs: Dashboard → Edge Functions → server → Logs
