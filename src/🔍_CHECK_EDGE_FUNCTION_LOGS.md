# 🔍 CHECK EDGE FUNCTION LOGS - FIND THE REAL ERROR

## 🚨 THE ISSUE

Edge Function is deployed but returning error: **"Edge Function returned a non-2xx status code"**

This means the Edge Function IS running, but it's FAILING inside the function.

---

## 📋 HOW TO SEE THE REAL ERROR

### **METHOD 1: Supabase Dashboard (EASIEST)**

1. **Go to Supabase Dashboard**
   - https://supabase.com/dashboard

2. **Navigate to your project**

3. **Edge Functions → create-organization-user**

4. **Click "Logs" tab**

5. **Look for recent errors** (last few minutes)

6. **You'll see the REAL error message**, like:
   - "Invalid JWT"
   - "Missing environment variable"
   - "Row level security policy"
   - etc.

**Copy the error and share it!**

---

### **METHOD 2: Command Line (REAL-TIME)**

```bash
# Watch logs in real-time
supabase functions logs create-organization-user --follow
```

**Then:**
1. Leave this terminal open
2. Try creating a user in your app
3. Watch the logs appear in real-time
4. **Copy the error message**

---

### **METHOD 3: Invoke Function Manually**

Test the function directly to see the error:

```bash
# Create test data
cat > test-user.json << 'EOF'
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
EOF

# Invoke the function
supabase functions invoke create-organization-user \
  --data @test-user.json
```

**Replace:**
- `YOUR_ORG_ID` - Get from app console or database
- `YOUR_BRANCH_ID` - Get from app console or database

**This will show the EXACT error!**

---

## 🔍 COMMON ERRORS & SOLUTIONS

### **Error: "Invalid JWT" or "jwt required"**

**Cause:** Service role key not set or incorrect

**Fix:**
```bash
# Get your service role key from Dashboard → Settings → API
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_KEY
```

---

### **Error: "SUPABASE_URL is not defined"**

**Cause:** URL secret not set

**Fix:**
```bash
supabase secrets set SUPABASE_URL=https://YOUR_REF.supabase.co
```

---

### **Error: "Missing required parameters"**

**Cause:** orgId or userData not being sent correctly

**Check:**
- Console logs in browser
- Make sure frontend is sending correct data

---

### **Error: "Row level security policy"**

**Cause:** Service role key not bypassing RLS

**Fix:**
```bash
# Make sure you're using the SERVICE ROLE key, not ANON key!
# Dashboard → Settings → API → service_role (secret)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...YOUR_SERVICE_KEY
```

---

### **Error: "A user with email X already exists"**

**Cause:** User already exists in auth.users

**Fix:**
1. Dashboard → Authentication → Users
2. Find and delete the user
3. Try again

OR use a different email for testing

---

## 📊 VERIFY SECRETS ARE SET

```bash
# List all secrets
supabase secrets list
```

**Should show:**
```
┌──────────────────────────────────┬─────────────────────┐
│ NAME                             │ UPDATED AT          │
├──────────────────────────────────┼─────────────────────┤
│ SUPABASE_URL                     │ 2024-12-24 10:31    │
│ SUPABASE_SERVICE_ROLE_KEY        │ 2024-12-24 10:31    │
└──────────────────────────────────┴─────────────────────┘
```

**If missing:**
```bash
supabase secrets set SUPABASE_URL=https://YOUR_REF.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_KEY
```

---

## 🔧 REDEPLOY AFTER SETTING SECRETS

**After setting secrets, ALWAYS redeploy:**

```bash
supabase functions deploy create-organization-user
```

This ensures the function uses the new secrets.

---

## 📋 QUICK CHECKLIST

- [ ] Check Dashboard → Functions → Logs
- [ ] Copy the REAL error message
- [ ] Verify secrets with `supabase secrets list`
- [ ] Check service role key is correct (NOT anon key!)
- [ ] Redeploy function after setting secrets
- [ ] Test again

---

## 🎯 NEXT STEPS

**Once you see the real error:**

1. Copy the complete error message
2. Share it (or check solutions above)
3. Apply the fix
4. Redeploy if needed
5. Test again

---

## 💡 TIP: Enable Verbose Logging

The Edge Function now has better error logging.

**After redeploying**, you'll see:
- Detailed error messages
- Stack traces
- Error types

**This makes debugging MUCH easier!**

---

## 🚀 REDEPLOY NOW

The Edge Function code has been updated with better error logging.

**Redeploy it:**

```bash
supabase functions deploy create-organization-user
```

**Then try creating a user and check logs!**

---

## 📞 WHAT TO CHECK

1. **Dashboard Logs** (easiest)
2. **Secrets are set** (`supabase secrets list`)
3. **Service role key is correct** (from API settings)
4. **Function is redeployed** (after setting secrets)
5. **Try creating user** (check logs for real error)

---

**Start with Dashboard → Functions → create-organization-user → Logs**

That will show you the REAL error! ✅
