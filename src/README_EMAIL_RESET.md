# 📧 Password Reset Email - Setup Guide

## 🚨 You Reported Two Issues:

1. **"Reset link opened localhost instead of my production site"**
2. **"Email shows Supabase branding instead of ShopEasy"**

## ✅ Both Are Now Fixed! Here's What to Do:

---

## 🎯 5-Minute Fix (Do This Now)

### Step 1: Update Production URL (1 minute)

```bash
# Open this file:
/lib/config.ts

# Find line 25:
const PRODUCTION_URL = 'https://your-production-domain.com';

# Change to YOUR actual URL:
const PRODUCTION_URL = 'https://your-actual-site.com';
```

**Examples:**
- Vercel: `'https://shopeasy-pos.vercel.app'`
- Netlify: `'https://shopeasy-pos.netlify.app'`
- Custom: `'https://pos.yourbusiness.com'`

---

### Step 2: Customize Supabase Email (4 minutes)

**A. Go to Supabase:**
1. Open: https://supabase.com/dashboard
2. Login → Select your project
3. Click: **Authentication** → **Email Templates**
4. Select: **"Reset Password"**

**B. Paste ShopEasy Template:**
1. Open file: `/EMAIL_CUSTOMIZATION_GUIDE.md`
2. Copy lines 49-183 (the full HTML template)
3. Paste into Supabase template editor
4. Update Subject to: `Reset Your ShopEasy Password`
5. Click **Save**

**C. Update Sender Name (Optional):**
1. Go to: **Project Settings** → **Auth**
2. Change **Sender Name** to: `ShopEasy Support`
3. Save

✅ **Done!**

---

## 🧪 Test It

1. Go to login page
2. Click "Reset password"
3. Enter your email
4. Check inbox

**You should see:**
- ✅ Professional ShopEasy-branded email
- ✅ Green header with 🏪 icon
- ✅ Link opens your production site (not localhost when deployed)

---

## 📚 Need More Help?

| If you need... | Read this file... |
|----------------|-------------------|
| **Quick 5-min guide** | `/QUICK_FIX_EMAIL_SETUP.md` |
| **Complete customization** | `/EMAIL_CUSTOMIZATION_GUIDE.md` |
| **URL setup help** | `/SETUP_PRODUCTION_URL.md` |
| **Summary of fixes** | `/EMAIL_ISSUES_FIXED.md` |

---

## 🎨 What the Email Will Look Like

```
┌────────────────────────────────┐
│         🏪                     │
│    ShopEasy POS                │
│  (Green gradient header)       │
├────────────────────────────────┤
│                                │
│  Hello,                        │
│                                │
│  We received a request to      │
│  reset your ShopEasy password. │
│                                │
│  ┌──────────────────────┐     │
│  │ Reset My Password    │     │
│  │  (Green button)      │     │
│  └──────────────────────┘     │
│                                │
│  ⏰ Link expires in 1 hour     │
│                                │
│  ⚠️ Didn't request this?       │
│  Ignore this email safely.     │
│                                │
├────────────────────────────────┤
│  ShopEasy - Cloud POS System  │
│  support@shopeasy.com          │
│  © 2024 ShopEasy               │
└────────────────────────────────┘
```

---

## 🔄 How It Works Now

### Development (localhost):
```
Request reset → Email sent → Link uses localhost ✅
(This is correct for local testing!)
```

### Production (deployed site):
```
Request reset → Email sent → Link uses your production URL ✅
(No more localhost links!)
```

The code **automatically detects** which environment you're in!

---

## ✅ Checklist

**Code Changes:**
- [ ] Updated `/lib/config.ts` with production URL
- [ ] Deployed to production

**Supabase Changes:**
- [ ] Customized email template
- [ ] Updated subject line
- [ ] Changed sender name

**Testing:**
- [ ] Tested reset flow
- [ ] Email looks professional
- [ ] Link works correctly

---

## 🚀 Result

**Before:**
```
From: Supabase Auth
Link: http://localhost:3000 ❌
Design: Plain text ❌
```

**After:**
```
From: ShopEasy Support ✅
Link: https://your-domain.com ✅
Design: Professional HTML ✅
```

---

## 💡 Quick Tips

1. **Testing locally?** Link will use localhost - that's normal!
2. **Want custom email domain?** Set up SMTP (see full guide)
3. **Email goes to spam?** Configure custom SMTP with verified domain
4. **Change colors?** Edit the template (search for `#10b981`)

---

## 🆘 Common Issues

**Q: Link still opens localhost in production**  
A: Check you updated `/lib/config.ts` and deployed the changes

**Q: Email still shows Supabase**  
A: Template not saved in Supabase Dashboard - redo Step 2

**Q: Email not received**  
A: Check spam folder, wait 2-3 minutes, verify email address

**Q: Link says "Invalid or expired"**  
A: Links expire after 1 hour - request a new reset

---

**Start here:** 👉 **`/QUICK_FIX_EMAIL_SETUP.md`**

That's the fastest way to fix both issues! 🚀
