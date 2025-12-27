# ⚡ EDGE FUNCTION - QUICK START

## 🚀 5 COMMANDS TO FIX IT

### **1. Install CLI**
```bash
npm install -g supabase
```

### **2. Login**
```bash
supabase login
```

### **3. Link Project**
```bash
# Get REF_ID from: Dashboard → Settings → General → Reference ID
supabase link --project-ref YOUR_REF_ID
```

### **4. Deploy Function**
```bash
# Navigate to your project first: cd /path/to/project
supabase functions deploy create-organization-user
```

### **5. Set Secrets**
```bash
# Get URL: https://YOUR_REF.supabase.co
supabase secrets set SUPABASE_URL=https://YOUR_REF.supabase.co

# Get KEY: Dashboard → Settings → API → service_role (NOT anon!)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

---

## ✅ VERIFY
```bash
supabase functions list
# Should show: create-organization-user    Yes
```

---

## 🧪 TEST
```
App → Users → Add User → Fill form → Submit
✅ Should work!
```

---

## 📋 WHAT YOU NEED

| What | Where | Example |
|------|-------|---------|
| **Project Ref ID** | Dashboard → Settings → General | `abcdefghijklmnop` |
| **Supabase URL** | Dashboard → Settings → API | `https://abcdef.supabase.co` |
| **Service Role Key** | Dashboard → Settings → API → service_role | `eyJhbGc...` |

---

## 🎯 RESULT

**Before:**
```
❌ Error: gen_salt does not exist
```

**After:**
```
✅ User created via Edge Function
✅ User can login immediately!
```

---

## 🐛 COMMON ISSUES

**"Not logged in"** → `supabase login`  
**"Not linked"** → `supabase link --project-ref YOUR_REF`  
**"Edge function error"** → Check secrets are set correctly  
**"gen_salt error"** → Normal! Edge Function handles it as fallback  

---

## ⏱️ TIME: 5 MINUTES

Then automatic user creation works! ✅
