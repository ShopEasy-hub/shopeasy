# 🚀 Deployment Checklist - Plan Restrictions & Pricing Update

## 📋 Pre-Deployment Verification

### ✅ Code Changes Completed

- [x] **Pricing Updates**
  - [x] SubscriptionPlans.tsx - Display prices updated
  - [x] App.tsx - Payment pricing map updated
  - [x] All amounts in kobo (7500, 20000, 35000, 95000)

- [x] **Permission System**
  - [x] lib/permissions.ts - Added plan-based access control
  - [x] BRANCH_LIMITS constant defined
  - [x] WAREHOUSE_LIMITS constant defined
  - [x] canAccessPageFull() function created
  - [x] Helper functions for limit checking

- [x] **Navigation Filtering**
  - [x] Dashboard.tsx - Uses canAccessPageFull()
  - [x] Warehouse/Suppliers/Supply-chain hidden for Starter

- [x] **Branch Limits**
  - [x] Settings.tsx - Branch creation validation
  - [x] Limit messages display correctly
  - [x] Upgrade prompts shown

- [x] **Warehouse Limits**
  - [x] WarehousesUnified.tsx - Warehouse creation validation
  - [x] Limit messages display correctly
  - [x] Upgrade prompts shown
  - [x] Plan info banner added

- [x] **Documentation**
  - [x] SUBSCRIPTION_PLANS_UPDATE.md - Complete guide
  - [x] PLAN_RESTRICTIONS_SUMMARY.md - Quick reference
  - [x] DEPLOYMENT_CHECKLIST.md - This file

---

## 🧪 Testing Required

### Test Account Setup
Create test accounts for each plan:
- [ ] Starter plan test account
- [ ] Standard plan test account
- [ ] Growth plan test account
- [ ] Enterprise plan test account

### Starter Plan Testing
- [ ] Login to starter account
- [ ] Verify navigation:
  - [ ] ✅ Dashboard visible
  - [ ] ✅ POS visible
  - [ ] ✅ Inventory visible
  - [ ] ❌ Warehouses NOT visible
  - [ ] ❌ Suppliers NOT visible
  - [ ] ❌ Supply Chain NOT visible
- [ ] Go to Settings → Branches:
  - [ ] Can create 1 branch
  - [ ] "Add Branch" button disabled after 1
  - [ ] Limit message shows correctly
  - [ ] Upgrade button works
- [ ] Try direct URL to /warehouses:
  - [ ] Should not display or redirect

### Standard Plan Testing
- [ ] Login to standard account
- [ ] Verify navigation:
  - [ ] ✅ Warehouses visible
  - [ ] ✅ Suppliers visible
  - [ ] ✅ Supply Chain visible
- [ ] Go to Warehouses page:
  - [ ] Can create 1 warehouse
  - [ ] "Add Warehouse" button disabled after 1
  - [ ] Plan info banner shows "1 warehouse allowed"
  - [ ] Upgrade button works
- [ ] Go to Settings → Branches:
  - [ ] Can create up to 2 branches
  - [ ] Button disabled after 2

### Growth Plan Testing
- [ ] Login to growth account
- [ ] Go to Warehouses:
  - [ ] Can create up to 2 warehouses
  - [ ] Button disabled after 2
  - [ ] Message shows "2 warehouses allowed"
- [ ] Go to Settings → Branches:
  - [ ] Can create up to 4 branches
  - [ ] Button disabled after 4

### Enterprise Plan Testing
- [ ] Login to enterprise account
- [ ] Go to Warehouses:
  - [ ] Can create unlimited warehouses
  - [ ] Button never disabled
  - [ ] Message shows "unlimited"
- [ ] Go to Settings → Branches:
  - [ ] Can create unlimited branches
  - [ ] Button never disabled

### Subscription & Payment Testing
- [ ] Visit Subscription Plans page:
  - [ ] Starter shows ₦7,500/month
  - [ ] Standard shows ₦20,000/month
  - [ ] Growth shows ₦35,000/month
  - [ ] Enterprise shows ₦95,000/month
- [ ] Click "Choose Plan" on each:
  - [ ] Redirects to billing cycle page
  - [ ] Prices match (monthly & yearly)
- [ ] Test PayStack payment:
  - [ ] Use test mode
  - [ ] Amount charged is correct (NOT 100x higher)
  - [ ] Callback works correctly
  - [ ] Subscription updates in database
  - [ ] User gains access to new features immediately

### Upgrade Flow Testing
- [ ] Start with Starter plan account
- [ ] Try to add 2nd branch:
  - [ ] See upgrade prompt
  - [ ] Click upgrade link
  - [ ] Lands on subscription page
- [ ] Upgrade to Standard:
  - [ ] Complete payment
  - [ ] Refresh page
  - [ ] Warehouse menu now visible
  - [ ] Can create warehouse
- [ ] Create 1 warehouse
- [ ] Try to add 2nd warehouse:
  - [ ] See upgrade prompt for Growth plan

### Downgrade Flow Testing (Edge Case)
- [ ] User on Enterprise with 10 warehouses downgrades to Standard:
  - [ ] Existing 10 warehouses still accessible (read-only)
  - [ ] Cannot create new warehouse
  - [ ] Limit message shows they're over limit
  - [ ] Upgrade prompt suggests returning to higher plan

---

## 🔄 Database Migration

### Check Current State
- [ ] Run query to check existing organization plans:
```sql
SELECT 
  subscription_plan, 
  COUNT(*) as count 
FROM organizations 
GROUP BY subscription_plan;
```

### Verify Plan Names
- [ ] Ensure all plans use lowercase:
  - `starter`
  - `standard`
  - `growth`
  - `enterprise`

### Count Resources by Plan
- [ ] Check branch counts by plan:
```sql
SELECT 
  o.subscription_plan,
  o.name,
  COUNT(b.id) as branch_count
FROM organizations o
LEFT JOIN branches b ON b.organization_id = o.id
GROUP BY o.id, o.subscription_plan, o.name
ORDER BY branch_count DESC;
```

- [ ] Check warehouse counts by plan:
```sql
SELECT 
  o.subscription_plan,
  o.name,
  COUNT(w.id) as warehouse_count
FROM organizations o
LEFT JOIN warehouses w ON w.organization_id = o.id
GROUP BY o.id, o.subscription_plan, o.name
ORDER BY warehouse_count DESC;
```

### Handle Over-Limit Cases
- [ ] Identify orgs with more resources than plan allows
- [ ] Decision: Grandfather existing resources or force compliance?
- [ ] Document approach in customer communication

---

## 📧 Customer Communication

### Before Deployment
- [ ] Draft email to all customers
- [ ] Explain new pricing (effective date)
- [ ] Explain new warehouse restrictions
- [ ] Highlight added value in each tier
- [ ] Provide upgrade incentives
- [ ] Set grace period (e.g., 30 days)

### Email Template Points
```
Subject: Important Update: ShopEasy Plan Changes & New Features

Dear [Customer],

We're excited to announce improvements to ShopEasy's subscription plans:

✨ What's New:
- Enhanced warehouse management for Standard+ plans
- Better value at every tier
- Clearer feature separation

📊 Updated Pricing (Effective [DATE]):
- Starter: ₦7,500/mo (was ₦5,000)
- Standard: ₦20,000/mo (was ₦15,000) - Now includes warehouse!
- Growth: ₦35,000/mo (unchanged) - 2 warehouses, 4 branches
- Enterprise: ₦95,000/mo (was ₦70,000) - Unlimited everything

🎁 Current customers: 30-day grace period before changes take effect

Questions? Contact support@shopeasy.com
```

### After Deployment
- [ ] Send announcement email
- [ ] Update website pricing page
- [ ] Update help documentation
- [ ] Train support team on new limits
- [ ] Monitor support tickets for issues

---

## 🔧 Edge Function Deployment

### PayStack Edge Function
- [ ] Verify payments-simple edge function has fixes:
  - [ ] No double kobo conversion
  - [ ] Callback parameter detection working
  - [ ] Test mode payments redirect correctly
  
- [ ] Deploy to Supabase:
```bash
# In Supabase Dashboard → Edge Functions
# Deploy payments-simple function
# Verify environment variables set
# Test with PayStack test mode
```

- [ ] Test payment flow end-to-end:
  - [ ] Initiate payment
  - [ ] Complete in test mode
  - [ ] Verify callback
  - [ ] Check subscription updated

---

## 🎯 Success Criteria

### Functionality
- [ ] All plan limits enforced correctly
- [ ] Navigation filtering works
- [ ] No console errors
- [ ] Payment amounts correct
- [ ] Upgrade flow seamless

### Performance
- [ ] Page load times acceptable
- [ ] No performance regression
- [ ] Database queries optimized

### User Experience
- [ ] Error messages clear and helpful
- [ ] Upgrade prompts user-friendly
- [ ] No broken links
- [ ] Mobile responsive

### Business
- [ ] Pricing displays correctly everywhere
- [ ] Payment processor charging right amounts
- [ ] Analytics tracking plan changes
- [ ] Revenue reporting accurate

---

## 🚨 Rollback Plan

### If Critical Issues Found

1. **Revert Code Changes:**
```bash
git revert [commit-hash]
git push
```

2. **Restore Old Pricing:**
- Revert SubscriptionPlans.tsx
- Revert App.tsx pricing map

3. **Disable Plan Filtering:**
- Comment out plan checks in Dashboard.tsx
- Allow all users to access all pages temporarily

4. **Communication:**
- Notify affected customers
- Post status update
- ETA for fix

### Monitoring After Deployment
- [ ] Watch error logs for 24 hours
- [ ] Monitor payment success rate
- [ ] Check user complaints/support tickets
- [ ] Verify no subscription access issues
- [ ] Track upgrade conversion rate

---

## 📊 Post-Deployment Analytics

### Metrics to Track

#### Week 1:
- [ ] Number of upgrade conversions
- [ ] Support tickets related to plan limits
- [ ] Payment failure rate
- [ ] User churn rate

#### Week 2-4:
- [ ] Revenue change from new pricing
- [ ] Distribution of users across plans
- [ ] Feature usage by plan tier
- [ ] Upgrade requests per plan

#### Month 1:
- [ ] ROI of pricing changes
- [ ] Customer satisfaction scores
- [ ] Plan downgrades (if any)
- [ ] Enterprise plan signups

---

## ✅ Final Checks Before Going Live

- [ ] All code merged to main branch
- [ ] Database migrations tested
- [ ] Edge functions deployed
- [ ] Customer emails drafted
- [ ] Support team trained
- [ ] Documentation updated
- [ ] Rollback plan ready
- [ ] Monitoring dashboard set up
- [ ] Test accounts verified working
- [ ] Stakeholders notified

---

## 🎉 Go-Live Procedure

1. **Deploy Code** (Off-peak hours recommended)
   - [ ] Merge to production
   - [ ] Deploy frontend
   - [ ] Deploy edge functions
   - [ ] Verify deployment successful

2. **Verify Immediately**
   - [ ] Login to each test account
   - [ ] Check navigation
   - [ ] Test payment flow
   - [ ] Verify limits working

3. **Monitor Closely**
   - [ ] Watch error logs (first 2 hours)
   - [ ] Check payment transactions
   - [ ] Monitor user activity
   - [ ] Respond to support tickets

4. **Communicate**
   - [ ] Send customer emails
   - [ ] Post announcement
   - [ ] Update social media
   - [ ] Notify team of successful deployment

---

## 📞 Emergency Contacts

- **Development Team:** [contact info]
- **Support Team:** [contact info]
- **Payment Provider (PayStack):** [contact info]
- **Database Admin:** [contact info]
- **Product Manager:** [contact info]

---

**Deployment Date:** _____________  
**Deployed By:** _____________  
**Sign-off:** _____________  

**Status:** ⏳ Pending Deployment
