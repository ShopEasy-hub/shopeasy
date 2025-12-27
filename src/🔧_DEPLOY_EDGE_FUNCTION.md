# 🔧 DEPLOY EDGE FUNCTION (Alternative Method)

## 📋 OPTION 2: Edge Function Deployment

If the SQL method doesn't work, use this Edge Function approach.

---

## ⚡ PREREQUISITES

1. **Supabase CLI installed**

```bash
# Install Supabase CLI
npm install -g supabase

# Or with Homebrew (Mac)
brew install supabase/tap/supabase
```

2. **Login to Supabase**

```bash
supabase login
```

3. **Link to your project**

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

**Find PROJECT_REF:**
- Supabase Dashboard → Settings → General
- Look for "Reference ID"

---

## 🚀 DEPLOY THE FUNCTION

### **The function is already created at:**
`/supabase/functions/create-organization-user/index.ts`

### **Deploy it:**

```bash
# Navigate to your project directory
cd /path/to/your/project

# Deploy the function
supabase functions deploy create-organization-user

# Set secrets (required!)
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

**Find SERVICE_ROLE_KEY:**
- Supabase Dashboard → Settings → API
- Look for "service_role" key (NOT anon key!)
- ⚠️ Keep this secret!

---

## ✅ VERIFY DEPLOYMENT

```bash
# List deployed functions
supabase functions list

# Should show:
# create-organization-user
```

**Test in Dashboard:**
- Functions → create-organization-user
- Should show "Deployed"

---

## 🧪 TEST THE FUNCTION

**In Supabase Dashboard:**

```
Functions → create-organization-user → Invoke

Body:
{
  "orgId": "YOUR_ORG_ID",
  "userData": {
    "name": "Test User",
    "email": "test@example.com",
    "password": "Test123!",
    "role": "cashier",
    "branchId": "YOUR_BRANCH_ID"
  }
}

Invoke → Should return success
```

**In your app:**

```
Users → Add User → Fill form → Submit
✅ Should work automatically!
```

---

## 🔧 TROUBLESHOOTING

### **Error: "not logged in"**

```bash
supabase login
```

### **Error: "project not linked"**

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### **Error: "CORS"**

Function already has CORS headers. If still failing:

```typescript
// In index.ts, corsHeaders should be:
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

### **Error: "service role key"**

```bash
# Set the correct service role key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...YOUR_KEY
```

---

## 📊 COMPARISON

### **SQL Method (Recommended):**
- ✅ No deployment needed
- ✅ Works immediately
- ✅ No CLI required
- ✅ Easier to setup

### **Edge Function Method:**
- ✅ More maintainable
- ✅ Better error handling
- ✅ Production-ready
- ❌ Requires CLI
- ❌ Requires deployment

---

## 🎯 WHICH TO USE?

**For Launch NOW:**
→ Use SQL method (`🚀_AUTOMATIC_AUTH_CREATION.sql`)

**For Production (later):**
→ Deploy Edge Function (this guide)

---

## ✅ SUCCESS CHECKLIST

- [ ] Supabase CLI installed
- [ ] Logged in: `supabase login`
- [ ] Project linked
- [ ] Function deployed
- [ ] Secrets set (URL + Service Role Key)
- [ ] Tested in Dashboard
- [ ] Tested in app
- [ ] ✅ Works automatically!

---

## 📞 QUICK COMMANDS

```bash
# Install CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy
supabase functions deploy create-organization-user

# Set secrets
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_KEY

# Verify
supabase functions list
```

---

**For now, use the SQL method for immediate launch!**

**File:** `🚀_AUTOMATIC_AUTH_CREATION.sql`

**Later, deploy Edge Function for production stability.**
