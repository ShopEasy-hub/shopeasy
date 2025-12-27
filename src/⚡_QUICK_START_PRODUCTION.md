# ⚡ QUICK START - PRODUCTION DEPLOYMENT

## Get Live in 10 Minutes! 🚀

**Last Updated:** December 15, 2024

---

## ✅ NEW PRICING (CONFIRMED)

```
Starter:     ₦7,500/month  (unchanged)
Standard:    ₦50,000/month (NEW!)
Growth:      ₦95,000/month (NEW!)
Enterprise:  ₦250,000/month (NEW!)

Yearly: Save 15% on all plans!
```

---

## 🔥 FASTEST PATH TO PRODUCTION

### Step 1: Get Paystack Keys (2 min)

1. Go to: https://dashboard.paystack.com/
2. Settings → API Keys & Webhooks
3. Copy:
   - `pk_live_xxxxxxxxxxxxx` (Public)
   - `sk_live_xxxxxxxxxxxxx` (Secret)

---

### Step 2: Add to Vercel (2 min)

```bash
# Dashboard → Project → Settings → Environment Variables
# Add these 3 variables:

VITE_PAYSTACK_PUBLIC_KEY=pk_live_your_key_here
PAYSTACK_SECRET_KEY=sk_live_your_secret_here
VITE_APP_ENV=production
```

Click SAVE → Redeploy

---

### Step 3: Fix Database (1 min)

Go to Supabase → SQL Editor → Run this:

```sql
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN (
  'owner', 'admin', 'manager', 
  'warehouse_manager', 'cashier', 'auditor'
));
```

---

### Step 4: Deploy (1 min)

```bash
vercel --prod
```

---

### Step 5: Verify (2 min)

1. Open your live site
2. Check browser console (F12)
3. Look for: **"🔴 LIVE MODE"**
4. Try subscription flow

---

### Step 6: Test (2 min)

1. Subscribe to Starter (₦7,500)
2. Use your REAL card
3. Complete payment
4. Verify subscription activates
5. Refund if needed

---

## ✅ YOU'RE LIVE!

Your production system is now accepting real payments! 🎉

---

## 📊 QUICK REFERENCE

### Pricing
- Starter: ₦7,500
- Standard: ₦50,000
- Growth: ₦95,000
- Enterprise: ₦250,000

### Yearly Discount
- 15% off (multiply monthly × 12 × 0.85)

### Support
- Paystack: +234-01-888-3000
- Email: support@paystack.com

---

## 🆘 TROUBLESHOOTING

### Still showing TEST mode?
```bash
# Verify keys start with pk_live_ not pk_test_
# Redeploy: vercel --prod
# Hard refresh: Ctrl+Shift+R
```

### Payment fails?
```bash
# Check Paystack dashboard for errors
# Verify 3D Secure is enabled
# Test with different card
```

### Can't add users?
```bash
# Run the database SQL fix (Step 3 above)
# This fixes the role constraint error
```

---

## 📚 DETAILED GUIDES

Need more details? See:

- **Full Guide:** `/🚀_PRODUCTION_DEPLOYMENT_CHECKLIST.md`
- **API Keys:** `/🔐_LIVE_API_KEYS_SETUP.md`
- **Pricing:** `/📊_PRICING_UPDATE_SUMMARY.md`
- **Launch:** `/📋_FINAL_LAUNCH_CHECKLIST.md`

---

## 🎯 NEXT STEPS

1. Monitor Paystack dashboard
2. Track user sign-ups
3. Watch for errors
4. Support customers
5. Celebrate! 🎉

---

**Questions?** Email: dev@shopeasy.ng  
**Emergency?** Call Paystack: +234-01-888-3000

---

**Status:** ✅ READY FOR PRODUCTION  
**Version:** 2.0.0  
**Date:** December 15, 2024
