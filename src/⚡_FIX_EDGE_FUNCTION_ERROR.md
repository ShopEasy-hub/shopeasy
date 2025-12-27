# ⚡ FIX EDGE FUNCTION ERROR - DEPLOYED BUT NOT WORKING

## 🚨 THE SITUATION

✅ Edge Function **IS deployed**  
❌ But returns error: **"Edge Function returned a non-2xx status code"**

**This means:** The function is running but failing inside.

---

## 🎯 FIND THE REAL ERROR (3 Ways)

### **METHOD 1: Dashboard Logs (EASIEST) ⭐**

```
1. Supabase Dashboard → Your Project
2. Edge Functions → create-organization-user  
3. Click "Logs" tab
4. See the REAL error!
```

---

### **METHOD 2: Command Line**

```bash
# See recent logs
supabase functions logs create-organization-user --limit 20

# OR watch in real-time
supabase functions logs create-organization-user --follow
```

---

### **METHOD 3: Test Manually**

```bash
# Replace YOUR_ORG_ID and YOUR_BRANCH_ID with real IDs
supabase functions invoke create-organization-user --data '{
  "orgId": "YOUR_ORG_ID",
  "userData": {
    "name": "Test User",
    "email": "test@example.com",
    "password": "Test123!",
    "role": "cashier",
    "branchId": "YOUR_BRANCH_ID"
  }
}'
```

---

## 🔧 MOST LIKELY FIXES

### **FIX 1: Secrets Not Set (90% of cases)**

**Check if secrets exist:**
```bash
supabase secrets list
```

**Should show:**
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

**If missing, set them:**

```bash
# Get URL from: Dashboard → Settings → API → URL
supabase secrets set SUPABASE_URL=https://YOUR_REF.supabase.co

# Get KEY from: Dashboard → Settings → API → service_role (NOT anon!)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...YOUR_SERVICE_KEY
```

**Then REDEPLOY:**
```bash
supabase functions deploy create-organization-user
```

---

### **FIX 2: Wrong Key Used (Common!)**

**Make sure you're using the SERVICE ROLE key, NOT the anon key!**

**Where to find it:**
```
Dashboard → Settings → API
↓
Look for: "service_role" (secret)
↓
Copy the FULL key (starts with eyJ...)
↓
Paste it exactly:
```

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Then redeploy:**
```bash
supabase functions deploy create-organization-user
```

---

### **FIX 3: Wrong URL**

**Make sure URL matches your project:**

```bash
# Should be: https://YOUR_PROJECT_REF.supabase.co
# NOT: https://app.supabase.com
# NOT: http://localhost:54321

supabase secrets set SUPABASE_URL=https://YOUR_REF.supabase.co
```

**Then redeploy:**
```bash
supabase functions deploy create-organization-user
```

---

## 📋 COMPLETE FIX SEQUENCE

**Run these in order:**

```bash
# 1. Get your credentials
# Dashboard → Settings → General → Reference ID = YOUR_REF
# Dashboard → Settings → API → URL = https://YOUR_REF.supabase.co
# Dashboard → Settings → API → service_role = YOUR_SERVICE_KEY

# 2. Set secrets
supabase secrets set SUPABASE_URL=https://YOUR_REF.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_KEY

# 3. Verify secrets are set
supabase secrets list

# 4. Redeploy function
supabase functions deploy create-organization-user

# 5. Check deployment
supabase functions list

# 6. Test in app!
```

---

## 🔍 CHECK IF IT WORKED

### **In Browser Console:**

**Before fix:**
```
❌ Edge Function Error: Edge Function returned a non-2xx status code
```

**After fix:**
```
⚠️ RPC function failed, trying Edge Function...
✅ User created via Edge Function: {...}
```

### **In App:**
```
✅ User appears in Users list
✅ User can login immediately
```

---

## 🐛 OTHER POSSIBLE ERRORS

### **Error: "User already exists"**

**Fix:**
```
1. Dashboard → Authentication → Users
2. Find the user with that email
3. Delete it
4. Try again
```

---

### **Error: "Invalid JWT"**

**Fix:**
```bash
# You're using the wrong key!
# Get the SERVICE ROLE key (NOT anon key)
# Dashboard → Settings → API → service_role

supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_CORRECT_SERVICE_KEY
supabase functions deploy create-organization-user
```

---

### **Error: "SUPABASE_URL is not defined"**

**Fix:**
```bash
supabase secrets set SUPABASE_URL=https://YOUR_REF.supabase.co
supabase functions deploy create-organization-user
```

---

### **Error: "Missing required parameters"**

**Check:**
- Browser console - what's being sent?
- Are orgId and userData correct?

**Fix:**
- Make sure you're logged in
- Make sure you have an organization
- Try creating a branch first

---

## ✅ VERIFICATION CHECKLIST

- [ ] Secrets are set (`supabase secrets list`)
- [ ] SUPABASE_URL is correct (https://YOUR_REF.supabase.co)
- [ ] SERVICE_ROLE_KEY is correct (NOT anon key!)
- [ ] Function is deployed (`supabase functions list`)
- [ ] Logs show no errors (`supabase functions logs ...`)
- [ ] Can create user in app
- [ ] User appears in list
- [ ] User can login

---

## 🎯 QUICK TEST

**After applying fixes:**

```bash
# 1. Check secrets
supabase secrets list

# 2. Check logs for errors
supabase functions logs create-organization-user --limit 10

# 3. Test in app
# Users → Add User → Fill form → Submit

# 4. Check console
# Should show: "✅ User created via Edge Function"
```

---

## 📞 SUMMARY

**Most common issue:** Secrets not set or wrong key used

**Fix:**
```bash
supabase secrets set SUPABASE_URL=https://YOUR_REF.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
supabase functions deploy create-organization-user
```

**Then test in app!**

---

## 🚀 NEXT STEPS

1. **Run the fix sequence above** ⬆️
2. **Check logs** for the real error
3. **Apply the specific fix**
4. **Redeploy**
5. **Test in app**
6. **✅ Done!**

---

**Need detailed logs?** See: `🔍_CHECK_EDGE_FUNCTION_LOGS.md`

**Need debug commands?** See: `🛠️_DEBUG_COMMANDS.sh`

---

**The Edge Function IS deployed - it just needs the secrets! ✅**
