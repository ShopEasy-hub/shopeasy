# 🌐 Production URL Setup

## What is This?

When users click "Reset Password" in their email, they need to be redirected to **your actual website**, not `localhost`.

This file tells the system where to send them.

---

## 🎯 Quick Setup (30 seconds)

### Step 1: Find Your Production URL

**Where is your ShopEasy app deployed?**

| Platform | Example URL |
|----------|-------------|
| **Vercel** | `https://shopeasy-pos.vercel.app` |
| **Netlify** | `https://shopeasy-pos.netlify.app` |
| **Custom Domain** | `https://pos.yourbusiness.com` |
| **Heroku** | `https://shopeasy-pos.herokuapp.com` |
| **AWS** | `https://shopeasy.yourdomain.com` |
| **Other** | Whatever your deployed URL is |

**Don't know yet?** That's okay! You can update this later before deploying.

---

### Step 2: Update the Config File

**Open:** `/lib/config.ts`

**Find line 25:**
```typescript
const PRODUCTION_URL = 'https://your-production-domain.com';
```

**Replace with your actual URL:**
```typescript
const PRODUCTION_URL = 'https://shopeasy-pos.vercel.app';
```

**Save the file.** Done! ✅

---

## ✅ Examples

### Example 1: Vercel Deployment

```typescript
// If deployed to Vercel
const PRODUCTION_URL = 'https://shopeasy-pos.vercel.app';
```

### Example 2: Custom Domain

```typescript
// If you have a custom domain
const PRODUCTION_URL = 'https://pos.mybusiness.com';
```

### Example 3: Netlify

```typescript
// If deployed to Netlify
const PRODUCTION_URL = 'https://shopeasy-pos.netlify.app';
```

---

## 🧪 How to Test

### In Development (localhost):
1. Request password reset
2. Email link will use: `http://localhost:5173`
3. **This is normal!** The code auto-detects development mode

### In Production:
1. Deploy your app
2. Request password reset **from the deployed site**
3. Email link will use: Your configured `PRODUCTION_URL`
4. Click link → Should open your production site ✅

---

## ❓ FAQ

### Q: I'm testing locally, why does it still use localhost?

**A:** That's correct! The system automatically uses:
- **Development:** `localhost` (when running locally)
- **Production:** `PRODUCTION_URL` (when deployed)

You can't fully test the production URL until you deploy.

---

### Q: What if I don't have a production URL yet?

**A:** No problem! You can:
1. Leave it as is for now
2. Test locally (will use localhost)
3. Update it before deploying to production

---

### Q: My URL keeps changing during development

**A:** Use the final production URL you plan to deploy to. The development environment will ignore this and use localhost automatically.

---

### Q: Can I use HTTP instead of HTTPS?

**A:** No! You must use HTTPS for security:
- ❌ `http://mydomain.com` - Will not work
- ✅ `https://mydomain.com` - Correct

---

## 🚨 Common Mistakes

### ❌ Wrong:
```typescript
const PRODUCTION_URL = 'http://mydomain.com';           // Missing 's' in https
const PRODUCTION_URL = 'https://mydomain.com/';         // Trailing slash
const PRODUCTION_URL = 'https://localhost:5173';        // Don't use localhost
const PRODUCTION_URL = 'mydomain.com';                  // Missing https://
const PRODUCTION_URL = 'www.mydomain.com';              // Missing https://
```

### ✅ Correct:
```typescript
const PRODUCTION_URL = 'https://mydomain.com';
const PRODUCTION_URL = 'https://pos.mydomain.com';
const PRODUCTION_URL = 'https://shopeasy-pos.vercel.app';
```

---

## 🔍 How It Works

### File: `/lib/config.ts`

```typescript
// Your production URL
const PRODUCTION_URL = 'https://shopeasy-pos.vercel.app';

// Auto-detect environment
const isDevelopment = window.location.hostname === 'localhost';

// Use appropriate URL
export const SITE_URL = isDevelopment 
  ? 'http://localhost:5173'        // Development
  : PRODUCTION_URL;                 // Production

// Password reset redirect
export const APP_CONFIG = {
  passwordReset: {
    redirectUrl: `${SITE_URL}?reset-password=true`,
  },
};
```

**When user requests password reset:**
1. System calls `resetPassword(email)`
2. Supabase sends email with link
3. Link uses `APP_CONFIG.passwordReset.redirectUrl`
4. If in development → uses localhost
5. If in production → uses your `PRODUCTION_URL`

---

## 📋 Deployment Checklist

Before deploying:

- [ ] Opened `/lib/config.ts`
- [ ] Updated `PRODUCTION_URL` with your actual deployed URL
- [ ] Removed any trailing slash
- [ ] Used `https://` (not `http://`)
- [ ] Saved the file
- [ ] Committed and pushed changes
- [ ] Deployed to production
- [ ] Tested password reset from deployed site
- [ ] Email link opens production site ✅

---

## 🎯 Summary

**What this does:**
- Controls where password reset emails redirect users
- Auto-detects development vs production
- Prevents "localhost" links in production emails

**What you need to do:**
1. Find your production URL
2. Update line 25 in `/lib/config.ts`
3. Save and deploy

**Time required:** 30 seconds

**Difficulty:** Very easy ⭐

---

**That's it!** Your password reset emails will now redirect to the correct URL. 🎉
