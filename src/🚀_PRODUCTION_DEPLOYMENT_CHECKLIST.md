# 🚀 PRODUCTION DEPLOYMENT CHECKLIST

## ShopEasy POS System - Go Live Guide

**Last Updated:** December 15, 2024  
**Version:** 2.0.0  
**New Pricing:** ✅ Updated

---

## 📋 PRE-LAUNCH CHECKLIST

### ✅ 1. PRICING UPDATE VERIFICATION

- [x] **Starter Plan:** ₦7,500/month (unchanged)
- [x] **Standard Plan:** ₦50,000/month (updated from ₦20,000)
- [x] **Growth Plan:** ₦95,000/month (updated from ₦35,000)
- [x] **Enterprise Plan:** ₦250,000/month (updated from ₦95,000)

**Files Updated:**
- ✅ `/config/pricing.ts` - Master pricing configuration
- ✅ `/App.tsx` - Plan selection pricing
- ✅ `/pages/SubscriptionPlans.tsx` - Plan display prices
- ✅ All documentation files

---

## 🔑 2. PAYSTACK CONFIGURATION

### A. Get Your Live API Keys

1. **Login to Paystack Dashboard**
   - Go to: https://dashboard.paystack.com/
   - Click on **Settings** → **API Keys & Webhooks**

2. **Copy Your Live Keys**
   ```
   Public Key:  pk_live_xxxxxxxxxxxxxxxxxxxxx
   Secret Key:  sk_live_xxxxxxxxxxxxxxxxxxxxx
   ```

3. **⚠️ SECURITY WARNING**
   - NEVER commit live keys to Git
   - NEVER share your secret key
   - Store in environment variables only

### B. Configure Environment Variables

#### Option 1: Vercel (Recommended)

```bash
# 1. Go to Vercel Dashboard
# 2. Select your project
# 3. Settings → Environment Variables
# 4. Add these variables:

VITE_PAYSTACK_PUBLIC_KEY=pk_live_your_actual_live_key
PAYSTACK_SECRET_KEY=sk_live_your_actual_secret_key
VITE_APP_ENV=production
```

#### Option 2: Netlify

```bash
# 1. Go to Netlify Dashboard
# 2. Site Settings → Environment Variables
# 3. Add the same variables as above
```

#### Option 3: Custom VPS/Server

```bash
# 1. Create .env.production file
# 2. Add your keys (see .env.production template)
# 3. Set file permissions:
chmod 600 .env.production

# 4. Never commit to Git:
echo ".env.production" >> .gitignore
```

### C. Set Up Paystack Webhook

1. **Go to Paystack Dashboard → Settings → Webhooks**

2. **Add Your Webhook URL**
   ```
   https://your-domain.com/api/webhooks/paystack
   ```

3. **Copy Webhook Secret**
   - Save this in your backend environment variables
   - Variable name: `PAYSTACK_WEBHOOK_SECRET`

4. **Select Events to Monitor**
   - ✅ `charge.success` - Payment successful
   - ✅ `subscription.create` - New subscription
   - ✅ `subscription.disable` - Subscription cancelled
   - ✅ `subscription.not_renew` - Subscription expiring

---

## 🗄️ 3. SUPABASE DATABASE SETUP

### A. Run Final Migration

```sql
-- Run this in Supabase SQL Editor to fix user roles
-- File: /🔧_RUN_THIS_IN_SUPABASE_SQL_EDITOR.sql

ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN (
  'owner', 
  'admin', 
  'manager', 
  'warehouse_manager', 
  'cashier', 
  'auditor'
));
```

### B. Verify Database Tables

Run this query to confirm all tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Expected Tables:**
- ✅ organizations
- ✅ branches
- ✅ warehouses
- ✅ products
- ✅ inventory
- ✅ transfers
- ✅ sales
- ✅ sale_items
- ✅ user_profiles
- ✅ expenses
- ✅ returns
- ✅ suppliers
- ✅ audit_logs

### C. Set Up Row Level Security (RLS)

```sql
-- Verify RLS is enabled on all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

All tables should show `rowsecurity = true`

---

## 🧪 4. TESTING PHASE

### A. Test with Paystack Test Cards (Before Going Live)

**Keep test keys active first!**

```
Test Card Number: 4084 0840 8408 4081
CVV: 408
Expiry: 12/25
PIN: 0000
```

**Test Scenarios:**
1. ✅ Select Starter Plan → Complete payment
2. ✅ Select Standard Plan → Complete payment
3. ✅ Select Growth Plan → Complete payment
4. ✅ Select Enterprise Plan → Complete payment
5. ✅ Test payment failure (use card 4084 0840 8408 4082)
6. ✅ Verify subscription activates after payment
7. ✅ Check trial expiry countdown
8. ✅ Test subscription expired overlay

### B. End-to-End User Flow Test

1. **New User Registration**
   - [ ] Sign up with test email
   - [ ] Verify email confirmation
   - [ ] Complete organization setup
   - [ ] Confirm 7-day trial starts

2. **POS Terminal Test**
   - [ ] Add products
   - [ ] Process test sale
   - [ ] Generate receipt
   - [ ] Check inventory deduction

3. **Multi-Branch Test**
   - [ ] Create multiple branches
   - [ ] Create warehouse
   - [ ] Transfer stock between locations
   - [ ] Verify no duplicate stock entries

4. **User Management Test**
   - [ ] Add admin user
   - [ ] Add warehouse manager
   - [ ] Add cashier
   - [ ] Test role-based access

5. **Subscription Test**
   - [ ] Complete payment with test card
   - [ ] Verify subscription activates
   - [ ] Check plan limits enforcement
   - [ ] Test downgrade scenario

### C. Mobile Responsiveness Test

Test on actual devices:
- [ ] iPhone/iOS Safari
- [ ] Android Chrome
- [ ] Tablet (iPad/Android)
- [ ] Mobile barcode scanner
- [ ] Mobile POS terminal

---

## 🔄 5. SWITCH TO LIVE KEYS

**⚠️ ONLY DO THIS AFTER ALL TESTS PASS!**

### Step-by-Step:

1. **Backup Test Configuration**
   ```bash
   # Save your test environment for future testing
   cp .env.production .env.test.backup
   ```

2. **Update to Live Keys**
   - Go to Paystack Dashboard
   - Copy your **LIVE** keys
   - Update environment variables in your hosting platform
   - **Double-check you're using `pk_live_` and `sk_live_`**

3. **Deploy Updated Configuration**
   ```bash
   # Vercel
   vercel --prod
   
   # Netlify
   netlify deploy --prod
   
   # Manual deployment
   npm run build
   # Upload dist folder to your server
   ```

4. **Verify Live Mode**
   - Open your production app
   - Open browser console (F12)
   - Check for: `Payment Environment: LIVE`
   - Verify no test keys are being used

5. **Test with Small Real Transaction**
   - Use actual credit/debit card
   - Subscribe to Starter Plan (₦7,500)
   - Complete real payment
   - Verify payment appears in Paystack dashboard
   - Confirm subscription activates
   - **Refund if this is just a test**

---

## 📊 6. MONITORING & ANALYTICS

### A. Set Up Monitoring

1. **Paystack Dashboard Monitoring**
   - Check daily transaction volume
   - Monitor failed payments
   - Track subscription renewals

2. **Supabase Monitoring**
   - Monitor database size
   - Check query performance
   - Watch for RLS policy issues

3. **Error Tracking** (Optional)
   - Set up Sentry.io
   - Configure error alerts
   - Monitor JavaScript errors

### B. Create Admin Alert System

Monitor these metrics daily:
- New sign-ups
- Payment failures
- Trial expirations
- Support tickets
- Database errors

---

## 🔐 7. SECURITY HARDENING

### A. Environment Security

```bash
# Verify .gitignore includes:
.env
.env.local
.env.production
.env.*.local
```

### B. Supabase Security

1. **Enable Email Confirmations**
   - Supabase Dashboard → Authentication → Email Templates
   - Enable "Confirm Email" template

2. **Set Password Requirements**
   - Minimum 8 characters
   - Require uppercase, lowercase, numbers

3. **Enable Rate Limiting**
   - Prevent brute force attacks
   - Limit API calls per IP

### C. Paystack Security

1. **Enable 3D Secure**
   - Paystack Dashboard → Settings → Preferences
   - Enable 3D Secure for all transactions

2. **Set Transaction Limits**
   - Configure maximum transaction amounts
   - Enable transaction notifications

---

## 📱 8. CUSTOMER COMMUNICATION

### A. Prepare Support Channels

Update contact information:
- **Email:** support@shopeasy.ng
- **Phone:** +234-800-SHOPEASY
- **WhatsApp:** +234-801-234-5678
- **Live Chat:** (Optional - Tawk.to, Intercom)

### B. Create Help Documentation

Prepare guides for:
- Getting Started Guide
- POS Terminal Tutorial
- Inventory Management
- Stock Transfer Guide
- User Management
- Subscription & Billing FAQ

### C. Announcement Plan

1. **Email Existing Beta Users**
   ```
   Subject: 🎉 ShopEasy is Now Live - New Pricing!
   
   We're excited to announce ShopEasy POS is now live
   with enhanced features and updated pricing...
   ```

2. **Social Media Posts**
   - LinkedIn, Twitter, Instagram, Facebook
   - Highlight key features
   - Share pricing
   - Offer launch discount (optional)

---

## 🎯 9. LAUNCH DAY CHECKLIST

### Morning of Launch (8:00 AM)

- [ ] Verify all services are online
- [ ] Test payment flow one last time
- [ ] Check Paystack dashboard is accessible
- [ ] Verify Supabase database is healthy
- [ ] Test login from multiple devices
- [ ] Have technical team on standby

### At Launch Time (12:00 PM)

- [ ] Switch DNS to production domain
- [ ] Send announcement emails
- [ ] Post on social media
- [ ] Monitor error logs in real-time
- [ ] Watch Paystack for incoming payments
- [ ] Be ready for customer support

### First 24 Hours

- [ ] Monitor new sign-ups
- [ ] Respond to support tickets quickly
- [ ] Track payment success rate
- [ ] Fix any critical bugs immediately
- [ ] Collect user feedback

---

## 🆘 10. EMERGENCY ROLLBACK PLAN

### If Critical Issues Occur:

1. **Immediate Actions**
   ```bash
   # Revert to previous deployment
   vercel rollback
   # OR restore previous Git commit
   git revert HEAD
   git push origin main --force
   ```

2. **Switch Back to Test Keys**
   - Temporarily use test Paystack keys
   - Prevent real money transactions
   - Fix issues in staging environment

3. **Communication**
   - Post status update on website
   - Email users about temporary maintenance
   - Provide ETA for fix

4. **Database Backup**
   ```bash
   # Emergency database backup
   supabase db dump > emergency_backup_$(date +%Y%m%d_%H%M%S).sql
   ```

---

## 📞 SUPPORT CONTACTS

### Technical Support Team

**Lead Developer:**
- Email: dev@shopeasy.ng
- Phone: +234-XXX-XXX-XXXX

**Database Admin:**
- Email: db@shopeasy.ng

**Paystack Support:**
- Email: support@paystack.com
- Phone: +234-01-888-3000

**Supabase Support:**
- Email: support@supabase.io
- Discord: https://discord.supabase.com

---

## ✅ FINAL PRE-LAUNCH VERIFICATION

Run through this checklist one final time:

### Pricing
- [x] Starter: ₦7,500 ✅
- [x] Standard: ₦50,000 ✅
- [x] Growth: ₦95,000 ✅
- [x] Enterprise: ₦250,000 ✅

### Paystack
- [ ] Live public key configured ⚠️
- [ ] Live secret key configured ⚠️
- [ ] Webhook URL set up ⚠️
- [ ] Test transaction successful ⚠️

### Database
- [ ] All migrations run ✅
- [ ] RLS policies enabled ✅
- [ ] Backup system active ⚠️

### Security
- [ ] .env.production not in Git ✅
- [ ] HTTPS enabled ⚠️
- [ ] Email confirmation enabled ⚠️
- [ ] Password requirements set ⚠️

### Testing
- [ ] End-to-end flow tested ⚠️
- [ ] Mobile responsiveness verified ⚠️
- [ ] Payment flow tested ⚠️
- [ ] Multi-user tested ⚠️

### Support
- [ ] Help documentation ready ⚠️
- [ ] Support channels active ⚠️
- [ ] Team briefed and ready ⚠️

---

## 🎉 POST-LAUNCH

### Week 1 Goals

- Monitor system performance 24/7
- Achieve first 10 paying customers
- Maintain 99.9% uptime
- Respond to all support tickets within 2 hours
- Collect user feedback for improvements

### Month 1 Goals

- 100+ active users
- Achieve break-even point
- Launch mobile app (if planned)
- Add requested features
- Expand marketing efforts

---

## 📈 SUCCESS METRICS

Track these KPIs:

- **User Growth:** Daily sign-ups
- **Conversion Rate:** Trial → Paid percentage
- **Revenue:** Monthly recurring revenue (MRR)
- **Churn Rate:** Subscription cancellations
- **Support Quality:** Response time, resolution rate
- **System Health:** Uptime, error rate, performance

---

**🚀 You're Ready to Launch!**

Good luck with your production deployment! 🎉

---

**Need Help?**
- 📧 Email: dev@shopeasy.ng
- 📞 Phone: +234-800-SHOPEASY
- 💬 WhatsApp: +234-801-234-5678

---

**Last Updated:** December 15, 2024  
**Prepared By:** ShopEasy Development Team  
**Version:** 2.0.0
