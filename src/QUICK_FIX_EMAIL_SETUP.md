# 🚀 QUICK FIX: Email Setup (5 Minutes)

## Your Two Issues - Fixed!

### ❌ Issue 1: Link Opens Localhost
**Status:** ✅ FIXED IN CODE

### ❌ Issue 2: Email Shows Supabase Branding  
**Status:** ⏳ YOU NEED TO DO THIS IN SUPABASE DASHBOARD

---

## 🔧 Step 1: Update Production URL (2 minutes)

### File: `/lib/config.ts`

**Line 9 - Change this:**
```typescript
const PRODUCTION_URL = 'https://your-production-domain.com';
```

**To your actual domain:**
```typescript
const PRODUCTION_URL = 'https://shopeasy.mydomain.com';
// OR whatever your actual deployed URL is
```

**Example:**
- If deployed on Vercel: `https://shopeasy-pos.vercel.app`
- If deployed on Netlify: `https://shopeasy-pos.netlify.app`
- If custom domain: `https://pos.yourbusiness.com`

**💡 Tip:** Don't know your production URL yet? Leave it for now, but update before deploying!

---

## 📧 Step 2: Customize Email in Supabase (3 minutes)

### A. Access Supabase Dashboard

1. Open: https://supabase.com/dashboard
2. Login
3. Select your ShopEasy project
4. Click: **Authentication** (left sidebar)
5. Click: **Email Templates** (top tabs)

### B. Edit "Reset Password" Template

1. Click on: **"Reset Password"** template
2. **Delete everything** in the template editor
3. **Copy the template** from `/EMAIL_CUSTOMIZATION_GUIDE.md` (lines 49-183)
4. **Paste** into Supabase template editor
5. Click **"Save"** at bottom

### C. Update Subject Line

At the top of the template editor:

**Subject field:** Change to:
```
Reset Your ShopEasy Password
```

Click **Save**

### D. Update Sender Name (Optional)

1. Go to: **Project Settings** → **Auth**
2. Find: **Email Settings** section
3. Change **Sender Name** to: `ShopEasy Support`
4. Click **Save**

---

## ✅ Done! Test It Now

1. Go to your app login page
2. Click "Reset password"
3. Enter your email
4. Check your inbox
5. Email should now:
   - ✅ Show "ShopEasy" branding (not Supabase)
   - ✅ Have green header with 🏪 icon
   - ✅ Link opens your production URL (not localhost in production)

---

## 🎯 Quick Reference

### What Gets Fixed:

| Issue | Before | After |
|-------|--------|-------|
| Email branding | Supabase | ShopEasy 🏪 |
| Email from name | Supabase Auth | ShopEasy Support |
| Reset link URL | localhost:3000 | your-domain.com ✅ |
| Email design | Plain text | Professional HTML ✨ |

---

## 🚨 Still Opens Localhost?

This means you're **testing in development mode**. The code will automatically use:
- **Development:** `http://localhost:5173` (when testing locally)
- **Production:** Your configured production URL (when deployed)

**To test the production URL:**
1. Deploy your app to production
2. Request password reset from the **deployed site**
3. Email link will now use production URL ✅

**OR** temporarily change this in `/lib/config.ts`:
```typescript
// Force production URL even in development (for testing)
const isDevelopment = false; // Changed from auto-detection
```

---

## 📋 Deployment Checklist

Before deploying to production:

- [ ] Updated `PRODUCTION_URL` in `/lib/config.ts`
- [ ] Customized Supabase email template
- [ ] Updated email subject line
- [ ] Changed sender name to "ShopEasy Support"
- [ ] Tested password reset flow
- [ ] Email shows ShopEasy branding ✅

---

## 💡 Pro Tip: Custom Email Domain

For a really professional setup, configure custom SMTP:

**Instead of:** `noreply@supabase.io`  
**Use:** `noreply@yourdomain.com`

**How:**
1. Sign up for SendGrid (free tier: 100 emails/day)
2. Verify your domain
3. Get SMTP credentials
4. Add to Supabase: Settings → Auth → SMTP Settings
5. Now all emails come from your domain! 🎉

See `/EMAIL_CUSTOMIZATION_GUIDE.md` for detailed SMTP setup instructions.

---

## Need More Help?

Full detailed guide: `/EMAIL_CUSTOMIZATION_GUIDE.md`

**Quick questions:**
- "Where's the template?" → It's in `/EMAIL_CUSTOMIZATION_GUIDE.md` (copy from there)
- "Still showing Supabase?" → Clear browser cache, check Supabase dashboard
- "Link broken?" → Check `PRODUCTION_URL` in `/lib/config.ts`

---

**Estimated time:** 5 minutes  
**Difficulty:** Easy ⭐  
**Result:** Professional branded emails! 🎉
