# 🚀 ShopEasy Production Launch Guide

## 🎉 Welcome to Production!

This guide will walk you through deploying ShopEasy with **LIVE PAYSTACK API KEYS** and updated pricing.

**Last Updated:** December 15, 2024  
**Status:** Ready for Production Launch

---

## 📋 Pre-Launch Checklist

### ✅ 1. Pricing Updates (COMPLETED)

All subscription prices have been updated to production values:

| Plan | Old Price | **NEW PRICE** | Features |
|------|-----------|---------------|----------|
| **Starter** | ₦7,500 | **₦7,500** (unchanged) | 2 users, 1 branch |
| **Standard** | ₦20,000 | **₦50,000** | 5 users, 2 branches |
| **Growth** | ₦35,000 | **₦95,000** | 8 users, 4 branches |
| **Enterprise** | ₦95,000 | **₦250,000** | Unlimited everything |

**Annual Billing:** 15% discount on all plans

---

## 🔐 Step 1: Get Your Paystack LIVE API Keys

### A. Login to Paystack Dashboard

1. Go to [https://dashboard.paystack.com](https://dashboard.paystack.com)
2. Login with your Paystack account
3. Click **Settings** → **API Keys & Webhooks**

### B. Copy Your LIVE Keys

You'll see two sets of keys:

```
🧪 TEST KEYS (DON'T USE THESE IN PRODUCTION!)
├── Public Key:  pk_test_xxxxxxxxxx
└── Secret Key:  sk_test_xxxxxxxxxx

🔴 LIVE KEYS (USE THESE FOR PRODUCTION!)
├── Public Key:  pk_live_xxxxxxxxxx
└── Secret Key:  sk_live_xxxxxxxxxx
```

**Copy both LIVE keys.** You'll need them next.

---

## 🔧 Step 2: Configure Environment Variables

### A. Frontend Environment Variables

1. In your project root, create or update `.env`:

```bash
# Paystack LIVE Public Key (Frontend - safe to expose)
VITE_PAYSTACK_PUBLIC_KEY=pk_live_YOUR_ACTUAL_KEY_HERE

# Supabase Configuration (Already configured)
VITE_SUPABASE_URL=https://pkzpifdocmmzowvjopup.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

2. **Important:** Replace `pk_live_YOUR_ACTUAL_KEY_HERE` with your **actual live public key**

### B. Backend Environment Variables (Supabase Edge Functions)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Open your project
3. Navigate to **Settings → Edge Functions → Secrets**
4. Add/Update these secrets:

```bash
# Paystack LIVE Secret Key (Backend - KEEP SECRET!)
PAYSTACK_SECRET_KEY=sk_live_YOUR_ACTUAL_SECRET_KEY_HERE
```

**⚠️ CRITICAL:** Never commit secret keys to Git!

---

## 🏗️ Step 3: Deploy to Production

### A. Deploy Frontend (Figma/Hosting)

If you're using custom hosting:

```bash
# Build for production
npm run build

# Deploy to your hosting provider
# (Instructions vary by provider)
```

### B. Deploy Supabase Edge Functions

```bash
# Login to Supabase CLI
supabase login

# Link to your project
supabase link --project-ref pkzpifdocmmzowvjopup

# Deploy the server function
supabase functions deploy make-server-088c2cd9

# Verify deployment
supabase functions list
```

---

## 🔍 Step 4: Verify Production Setup

### A. Check Payment Environment

1. Open your app in the browser
2. Open Developer Console (F12)
3. Run this command:

```javascript
// This will tell you if you're using LIVE or TEST keys
console.log(import.meta.env.VITE_PAYSTACK_PUBLIC_KEY);
```

**Expected output:**
```
pk_live_xxxxxxxxxxxxx  ✅ LIVE MODE (Production)
```

**NOT this:**
```
pk_test_xxxxxxxxxxxxx  ⚠️ TEST MODE (Still in development)
```

### B. Test Payment Flow

1. Navigate to **Settings → Subscription Plans**
2. Select any plan
3. Choose billing cycle
4. Click **"Proceed to Payment"**
5. You should see:
   - Paystack payment popup
   - **LIVE mode indicator** (if visible in Paystack UI)
   - Real bank options (not test banks)

**⚠️ Important:** Use a test card FIRST to verify everything works:

```
Test Card (Paystack):
Card Number:  5060 6666 6666 6666 666
CVV:          123
Expiry:       Any future date
PIN:          1234
OTP:          123456
```

---

## 💳 Step 5: Configure Paystack Webhook (CRITICAL!)

Webhooks notify your system when payments are successful.

### A. Setup Webhook URL

1. Go to Paystack Dashboard → **Settings → API Keys & Webhooks**
2. Scroll to **Webhook Settings**
3. Add your webhook URL:

```
https://pkzpifdocmmzowvjopup.supabase.co/functions/v1/make-server-088c2cd9/payments/paystack/webhook
```

4. Click **"Save"**

### B. Test Webhook (Optional but Recommended)

Paystack provides a webhook testing tool in the dashboard.

---

## 📊 Step 6: Monitor Payments

### A. Check Supabase Dashboard

1. Go to Supabase → **Table Editor** → `payments` table
2. After successful payments, you'll see records here

### B. Check Paystack Dashboard

1. Go to Paystack → **Transactions**
2. You'll see all successful payments listed

---

## 🔐 Security Checklist

Before launching to real customers:

- [ ] **LIVE API keys are set** (not test keys)
- [ ] **Secret keys are in Supabase secrets** (not in code)
- [ ] **`.env` is in `.gitignore`** (never commit API keys)
- [ ] **Webhook is configured** (to receive payment confirmations)
- [ ] **SSL/HTTPS is enabled** (required by Paystack)
- [ ] **Test a real payment** (use test card first)

---

## 🎯 Step 7: Marketing & Launch

### A. Update Pricing on Your Website

Make sure your marketing materials reflect the new prices:
- Starter: ₦7,500/month
- Standard: ₦50,000/month
- Growth: ₦95,000/month
- Enterprise: ₦250,000/month

### B. Announce Launch

Prepare your launch announcement:
- Social media posts
- Email campaigns
- Press releases

---

## 🆘 Troubleshooting

### "Payment gateway not configured" error

**Solution:** Check that `PAYSTACK_SECRET_KEY` is set in Supabase Edge Function secrets.

```bash
# Verify secrets are set
supabase secrets list
```

### Payments work but don't update subscription

**Solution:** Check webhook is configured correctly and receiving events.

1. Test webhook in Paystack Dashboard
2. Check Supabase Edge Function logs:
   ```bash
   supabase functions logs make-server-088c2cd9
   ```

### Still seeing test mode in Paystack

**Solution:** Make sure frontend `.env` has LIVE public key:

```bash
# Check your .env file
cat .env | grep PAYSTACK

# Should show:
VITE_PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
```

### Customers can't see payment popup

**Solution:** 
1. Check browser console for CORS errors
2. Verify Paystack public key is valid
3. Ensure HTTPS is enabled (Paystack requires SSL)

---

## 📞 Support Contacts

### Paystack Support
- Email: support@paystack.com
- Phone: +234 1 888 7378
- Docs: https://paystack.com/docs

### Supabase Support
- Docs: https://supabase.com/docs
- Community: https://github.com/supabase/supabase/discussions

### ShopEasy Internal
- Developer: [Your contact]
- Support: support@yourdomain.com

---

## 📚 Additional Resources

### API Documentation
- Paystack API: https://paystack.com/docs/api
- Supabase Docs: https://supabase.com/docs

### Configuration Files
- Pricing Config: `/config/pricing.ts`
- Environment Setup: `/.env`
- Migration Files: `/supabase/migrations/`

---

## ✅ Production Launch Checklist

Go through this checklist before officially launching:

### Environment Setup
- [ ] Live Paystack Public Key set in `.env`
- [ ] Live Paystack Secret Key set in Supabase secrets
- [ ] Supabase Edge Functions deployed
- [ ] Webhook URL configured in Paystack

### Pricing Verification
- [ ] All plan prices updated (₦7,500 / ₦50,000 / ₦95,000 / ₦250,000)
- [ ] Annual discount working (15% off)
- [ ] Payment amounts are correct in Paystack

### Testing
- [ ] Test payment with test card successful
- [ ] Subscription activates after payment
- [ ] Webhook receives payment confirmations
- [ ] Email notifications working (if configured)

### Security
- [ ] No API keys in Git repository
- [ ] HTTPS enabled
- [ ] Webhook signature verification enabled
- [ ] Database RLS policies active

### Monitoring
- [ ] Paystack dashboard access confirmed
- [ ] Supabase monitoring setup
- [ ] Error tracking configured
- [ ] Customer support process documented

### Legal & Compliance
- [ ] Terms of Service updated
- [ ] Privacy Policy updated
- [ ] Refund policy documented
- [ ] Customer data handling compliant

---

## 🎉 You're Ready to Launch!

Once all checkboxes are ticked, you're ready to accept real payments and onboard real customers!

**Good luck with your launch! 🚀**

---

## 📝 Change Log

**December 15, 2024**
- Updated pricing to production values
- Added Paystack LIVE API key setup
- Created comprehensive launch guide
- Added security and monitoring checklists
