# Payment System Setup Instructions

## Overview
The ShopEasy payment system has been migrated from the deprecated KV store to proper PostgreSQL tables. This document explains how to set up payment gateways (PayStack and Flutterwave).

## What Was Fixed

### Previous Issue
- Edge function was trying to access the old `kv_store_088c2cd9` table
- Error: "Could not find the table 'public.kv_store_088c2cd9' in the schema cache"

### Solution Implemented
1. ✅ Removed KV store dependency from edge function
2. ✅ Created proper PostgreSQL tables: `payments` and `subscriptions`
3. ✅ Updated edge function to store payment records in PostgreSQL
4. ✅ Configured edge function to read API keys from environment variables

## Database Tables Created

### `payments` Table
Stores all payment transactions:
- `reference` - Unique payment reference
- `provider` - 'paystack' or 'flutterwave'
- `organization_id` - References organizations table
- `user_id` - User who initiated payment
- `plan_id` - Subscription plan ID
- `billing_cycle` - 'monthly' or 'yearly'
- `amount` - Payment amount
- `currency` - Payment currency (default: NGN)
- `status` - 'pending', 'completed', 'failed', 'cancelled'
- `transaction_id` - Gateway transaction ID
- `verified_at` - Timestamp of verification

### `subscriptions` Table
Stores active subscriptions:
- `organization_id` - References organizations table (unique)
- `plan_id` - Subscription plan ID
- `billing_cycle` - 'monthly' or 'yearly'
- `status` - 'active', 'cancelled', 'expired', 'trial'
- `start_date` - Subscription start date
- `end_date` - Subscription end date
- `amount` - Subscription amount
- `payment_reference` - References payments table
- `provider` - 'paystack' or 'flutterwave'
- `auto_renew` - Boolean for auto-renewal

## Setup Instructions

### Step 1: Run Database Migration

Execute the migration file to create the required tables:

```bash
# This migration is already in /supabase/migrations/ADD_PAYMENTS_TABLE.sql
# Deploy it to your Supabase project
```

Or run this SQL directly in your Supabase SQL Editor:

```sql
-- See /supabase/migrations/ADD_PAYMENTS_TABLE.sql for full migration
```

### Step 2: Set Up PayStack (Optional)

1. **Get PayStack API Keys:**
   - Sign up at https://paystack.com
   - Go to Settings > API Keys & Webhooks
   - Copy your "Secret Key" (starts with `sk_live_` or `sk_test_`)

2. **Add to Supabase:**
   - Go to your Supabase project dashboard
   - Navigate to: Settings > Edge Functions > Secrets
   - Add a new secret:
     - Name: `PAYSTACK_SECRET_KEY`
     - Value: Your PayStack secret key

### Step 3: Set Up Flutterwave (Optional)

1. **Get Flutterwave API Keys:**
   - Sign up at https://flutterwave.com
   - Go to Settings > API
   - Copy your "Secret Key" (starts with `FLWSECK-` or `FLWSECK_TEST-`)

2. **Add to Supabase:**
   - Go to your Supabase project dashboard
   - Navigate to: Settings > Edge Functions > Secrets
   - Add a new secret:
     - Name: `FLUTTERWAVE_SECRET_KEY`
     - Value: Your Flutterwave secret key

### Step 4: Set Frontend URL (Optional)

If your app is not running on `localhost:3000` in development:

1. **Add Frontend URL:**
   - Go to your Supabase project dashboard
   - Navigate to: Settings > Edge Functions > Secrets
   - Add a new secret:
     - Name: `FRONTEND_URL`
     - Value: Your app URL (e.g., `https://yourdomain.com`)

### Step 5: Deploy Edge Function

After adding the secrets, redeploy your edge function:

```bash
# The edge function will automatically pick up the new secrets
# No code changes needed on your end
```

## Testing the Payment System

### Test Mode (Development)

1. **PayStack Test Mode:**
   - Use test secret key (`sk_test_...`)
   - Test card: `4084 0840 8408 4081`
   - Any future expiry date and CVV

2. **Flutterwave Test Mode:**
   - Use test secret key (`FLWSECK_TEST-...`)
   - Test card: `5531 8866 5214 2950`
   - CVV: `564`, PIN: `3310`, OTP: `12345`

### Live Mode (Production)

1. **Switch to Live Keys:**
   - Update `PAYSTACK_SECRET_KEY` with live key (`sk_live_...`)
   - Update `FLUTTERWAVE_SECRET_KEY` with live key (`FLWSECK-...`)

2. **Test with Real Cards:**
   - Make a small test transaction
   - Verify payment appears in `payments` table
   - Verify subscription appears in `subscriptions` table

## How It Works

### Payment Flow

1. **User selects a plan** on the subscription page
2. **User chooses billing cycle** (monthly/yearly) and payment provider
3. **Client calls edge function** to initialize payment
   - Edge function creates record in `payments` table
   - Edge function returns payment gateway URL
4. **User redirected to payment gateway** (PayStack/Flutterwave)
5. **User completes payment** on gateway
6. **Gateway redirects back** to app with payment reference
7. **Client calls edge function** to verify payment
   - Edge function verifies with payment gateway
   - Edge function updates `payments` table
   - Edge function creates/updates `subscriptions` table

### Subscription Status

Organizations can check their subscription status by querying the `subscriptions` table:

```typescript
// Example: Get organization's subscription
const { data: subscription } = await supabase
  .from('subscriptions')
  .select('*')
  .eq('organization_id', orgId)
  .single();

if (subscription?.status === 'active') {
  // Organization has active subscription
}
```

## Troubleshooting

### "Payment gateway not configured" error

**Cause:** PayStack or Flutterwave secret key not set in Supabase.

**Solution:** 
1. Verify secret is added in Supabase dashboard
2. Secret name must be exact: `PAYSTACK_SECRET_KEY` or `FLUTTERWAVE_SECRET_KEY`
3. Redeploy edge function after adding secrets

### "Invalid JWT" error

**Cause:** Authentication token not being passed correctly.

**Solution:** This was fixed in `BillingCycle.tsx` by adding `await` to `getAccessToken()` call. Make sure you have the latest code.

### Payment record not created

**Cause:** Database table doesn't exist or RLS policies blocking access.

**Solution:**
1. Run the migration: `/supabase/migrations/ADD_PAYMENTS_TABLE.sql`
2. Verify tables exist in Supabase Table Editor
3. Check edge function logs for errors

### Subscription not created after payment

**Cause:** Payment verification endpoint not being called.

**Solution:**
1. Check browser console for errors
2. Verify payment callback URL is correct
3. Check edge function logs for verification errors

## Environment Variables Summary

| Variable | Required | Description |
|----------|----------|-------------|
| `PAYSTACK_SECRET_KEY` | Optional | PayStack API secret key (if using PayStack) |
| `FLUTTERWAVE_SECRET_KEY` | Optional | Flutterwave API secret key (if using Flutterwave) |
| `FRONTEND_URL` | Optional | Your app URL (defaults to http://localhost:3000) |

**Note:** At least one payment provider secret key must be configured for payments to work.

## Security Notes

1. **Never expose secret keys in client-side code** - They are only used in the edge function
2. **Keys are stored as Supabase secrets** - Not in environment variables or code
3. **Edge function uses service role** - Has elevated permissions to write to payments table
4. **RLS policies protect data** - Users can only see their organization's payments

## Support

If you encounter issues:

1. Check Supabase edge function logs
2. Check browser console for client-side errors
3. Verify database tables and RLS policies are created
4. Ensure environment variables are set correctly
5. Test with test API keys before going live

---

**Last Updated:** December 2025
**Migration File:** `/supabase/migrations/ADD_PAYMENTS_TABLE.sql`
**Edge Function:** `/supabase/functions/server/index.tsx`
