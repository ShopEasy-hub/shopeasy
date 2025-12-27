# 🔴 LIVE DEPLOYMENT - Supabase Edge Functions

## ⚠️ PRODUCTION DEPLOYMENT GUIDE

This guide is for deploying ShopEasy to **LIVE PRODUCTION** with real Paystack payments.

---

## 📋 Prerequisites

Before deploying:

- [ ] Paystack account approved for LIVE transactions
- [ ] LIVE API keys obtained from Paystack Dashboard
- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] Access to Supabase project dashboard

---

## 🔐 Step 1: Set Supabase Secrets

### A. Navigate to Supabase Dashboard

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project: **pkzpifdocmmzowvjopup**
3. Click **Settings** (left sidebar)
4. Click **Edge Functions**
5. Click **Secrets** tab

### B. Add/Update These Secrets

| Secret Name | Value | Where to Get It |
|------------|-------|-----------------|
| `PAYSTACK_SECRET_KEY` | `sk_live_xxxxxxxxxxxxx` | Paystack Dashboard → Settings → API Keys |
| `SUPABASE_URL` | `https://pkzpifdocmmzowvjopup.supabase.co` | Auto-set (verify it's correct) |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-set by Supabase | Settings → API → service_role key |

### C. Verify Secrets Are Set

```bash
# Login to Supabase CLI
supabase login

# Link to your project
supabase link --project-ref pkzpifdocmmzowvjopup

# List all secrets
supabase secrets list

# Expected output:
# PAYSTACK_SECRET_KEY=sk_live_***
# SUPABASE_URL=https://***
# SUPABASE_SERVICE_ROLE_KEY=***
```

---

## 🚀 Step 2: Deploy Edge Functions

### A. Deploy Main Server Function

```bash
# From project root
cd supabase/functions

# Deploy the main server function
supabase functions deploy make-server-088c2cd9

# Wait for deployment to complete
```

**Expected Output:**
```
Deploying Function make-server-088c2cd9...
✓ Function deployed successfully
URL: https://pkzpifdocmmzowvjopup.supabase.co/functions/v1/make-server-088c2cd9
```

### B. Verify Deployment

```bash
# Check function status
supabase functions list

# Check logs
supabase functions logs make-server-088c2cd9

# Test the endpoint (should return 404 for GET request, which is fine)
curl https://pkzpifdocmmzowvjopup.supabase.co/functions/v1/make-server-088c2cd9/health
```

---

## 🎯 Step 3: Configure Paystack Webhook

### A. Get Webhook URL

Your webhook URL is:
```
https://pkzpifdocmmzowvjopup.supabase.co/functions/v1/make-server-088c2cd9/payments/paystack/webhook
```

### B. Add to Paystack Dashboard

1. Go to [Paystack Dashboard](https://dashboard.paystack.com)
2. Navigate to **Settings → API Keys & Webhooks**
3. Scroll to **Webhook Settings**
4. Click **"Add Webhook URL"**
5. Paste the URL above
6. Click **"Save"**

### C. Test Webhook (Optional)

Paystack provides a webhook testing tool:
1. Still in Webhook Settings
2. Click **"Test Webhook"**
3. Send a test payment event
4. Check Supabase logs for received webhook

---

## 🔍 Step 4: Testing in Production

### A. Test Payment Flow

1. Open your production app
2. Navigate to **Settings → Subscription Plans**
3. Select a plan (use Starter for testing - ₦7,500)
4. Use Paystack test card:

```
Card Number:  5060 6666 6666 6666 666
CVV:          123
Expiry:       12/25 (any future date)
PIN:          1234
OTP:          123456
```

5. Verify:
   - Payment popup appears
   - Payment processes successfully
   - Subscription activates in app
   - Payment record appears in Supabase `payments` table

### B. Monitor Logs

```bash
# Watch logs in real-time
supabase functions logs make-server-088c2cd9 --follow

# You should see:
# - Payment initialization requests
# - Payment verification
# - Subscription updates
```

---

## 📊 Step 5: Database Verification

### A. Check Payment Records

1. Go to Supabase Dashboard → **Table Editor**
2. Open `payments` table
3. Verify test payment appears with:
   - Correct amount
   - Status: 'success'
   - Provider: 'paystack'

### B. Check Subscription Updates

1. Open `subscriptions` table
2. Verify subscription was created/updated
3. Check `organizations` table for updated subscription_status

---

## ⚡ Quick Deployment Commands

### Full Deployment Sequence

```bash
# 1. Login
supabase login

# 2. Link project
supabase link --project-ref pkzpifdocmmzowvjopup

# 3. Set secrets (interactive)
supabase secrets set PAYSTACK_SECRET_KEY=sk_live_YOUR_KEY

# 4. Deploy function
supabase functions deploy make-server-088c2cd9

# 5. Verify
supabase functions list
supabase secrets list

# 6. Monitor
supabase functions logs make-server-088c2cd9 --follow
```

---

## 🆘 Troubleshooting

### Error: "Missing PAYSTACK_SECRET_KEY"

**Solution:**
```bash
# Set the secret
supabase secrets set PAYSTACK_SECRET_KEY=sk_live_YOUR_ACTUAL_KEY

# Redeploy function
supabase functions deploy make-server-088c2cd9
```

### Error: "Failed to deploy function"

**Solution:**
```bash
# Check Supabase CLI is logged in
supabase login

# Make sure you're linked to the right project
supabase link --project-ref pkzpifdocmmzowvjopup

# Try deploying again
supabase functions deploy make-server-088c2cd9
```

### Webhook not receiving events

**Solution:**
1. Verify webhook URL is correct in Paystack Dashboard
2. Check Paystack webhook logs for delivery attempts
3. Check Supabase function logs for received requests
4. Ensure webhook URL is publicly accessible (HTTPS required)

### Payments stuck in "pending" status

**Solution:**
1. Check that webhook is configured
2. Verify PAYSTACK_SECRET_KEY is correct (LIVE key for production)
3. Check Supabase function logs for errors
4. Manually trigger webhook test from Paystack Dashboard

---

## 🔐 Security Best Practices

### Protect Your Secrets

- [ ] Never commit secrets to Git
- [ ] Use Supabase secrets manager (not environment variables in code)
- [ ] Rotate API keys periodically
- [ ] Monitor for unauthorized access

### Webhook Security

The Edge Function verifies webhook signatures automatically. Ensure:
- Webhook URL uses HTTPS
- Signature verification is enabled
- Requests are logged for audit

---

## 📈 Monitoring in Production

### Daily Checks

1. **Supabase Dashboard**
   - Check function invocations
   - Monitor error rates
   - Review payment records

2. **Paystack Dashboard**
   - Check transaction success rate
   - Monitor failed payments
   - Review dispute/chargebacks

3. **Application Logs**
   ```bash
   # Check last 100 logs
   supabase functions logs make-server-088c2cd9 --limit 100
   
   # Filter errors only
   supabase functions logs make-server-088c2cd9 | grep ERROR
   ```

### Set Up Alerts

Consider setting up alerts for:
- High error rates (>5%)
- Webhook delivery failures
- Payment processing delays
- Database connection issues

---

## 📞 Support Channels

### Paystack Issues
- Dashboard: https://dashboard.paystack.com
- Support: support@paystack.com
- Docs: https://paystack.com/docs

### Supabase Issues
- Dashboard: https://supabase.com/dashboard
- Docs: https://supabase.com/docs
- Support: support@supabase.io

---

## ✅ Production Deployment Checklist

Before marking deployment as complete:

### Configuration
- [ ] LIVE Paystack secret key set in Supabase
- [ ] Supabase Edge Function deployed
- [ ] Webhook URL configured in Paystack
- [ ] All environment variables verified

### Testing
- [ ] Test payment completed successfully
- [ ] Subscription activated after payment
- [ ] Webhook received payment confirmation
- [ ] Database records created correctly

### Monitoring
- [ ] Function logs accessible
- [ ] Error tracking configured
- [ ] Payment monitoring dashboard set up
- [ ] Support team notified

### Security
- [ ] No secrets in Git repository
- [ ] Webhook signature verification enabled
- [ ] HTTPS enforced
- [ ] RLS policies active on database

### Documentation
- [ ] Team trained on monitoring
- [ ] Troubleshooting guide shared
- [ ] Support contacts documented
- [ ] Rollback plan prepared

---

## 🎉 Deployment Complete!

Once all checks pass, your ShopEasy POS system is **LIVE** and ready to accept real payments!

**Last Deployed:** [Add date/time]  
**Deployed By:** [Your name]  
**Environment:** Production  
**Payment Gateway:** Paystack (LIVE)

---

## 📝 Version History

| Date | Version | Changes | Deployed By |
|------|---------|---------|-------------|
| Dec 15, 2024 | 2.0.0 | Production pricing, Live Paystack | - |
| - | - | - | - |
