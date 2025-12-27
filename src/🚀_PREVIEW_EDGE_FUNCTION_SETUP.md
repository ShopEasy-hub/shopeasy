# 🚀 EDGE FUNCTION - PREVIEW SETUP

## ⚡ DEPLOY NOW (5 Minutes)

The Edge Function is already created at:
`/supabase/functions/create-organization-user/index.ts`

Now let's deploy it to make it work in preview!

---

## 📋 STEP-BY-STEP DEPLOYMENT

### **STEP 1: Install Supabase CLI**

**Mac/Linux:**
```bash
npm install -g supabase
```

**Or with Homebrew (Mac):**
```bash
brew install supabase/tap/supabase
```

**Windows:**
```bash
npm install -g supabase
```

**Verify installation:**
```bash
supabase --version
```

---

### **STEP 2: Login to Supabase**

```bash
supabase login
```

This will open a browser window. Login with your Supabase account.

---

### **STEP 3: Link Your Project**

**First, get your Project Reference ID:**

1. Go to Supabase Dashboard
2. Settings → General
3. Copy "Reference ID" (looks like: `abcdefghijklmnop`)

**Then link:**

```bash
# Navigate to your project directory
cd /path/to/your/shopeasy/project

# Link to Supabase
supabase link --project-ref YOUR_REFERENCE_ID
```

**Example:**
```bash
supabase link --project-ref abcdefghijklmnop
```

---

### **STEP 4: Deploy the Edge Function**

```bash
supabase functions deploy create-organization-user
```

**You should see:**
```
Deploying function create-organization-user...
Function deployed successfully!
```

---

### **STEP 5: Set Environment Secrets**

**Get your Service Role Key:**
1. Supabase Dashboard → Settings → API
2. Look for "service_role" key (NOT the anon key!)
3. Copy it (starts with `eyJhbG...`)

**Set the secrets:**

```bash
# Set Supabase URL
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co

# Set Service Role Key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

**Example:**
```bash
supabase secrets set SUPABASE_URL=https://abcdefghijklmnop.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### **STEP 6: Verify Deployment**

```bash
supabase functions list
```

**Should show:**
```
NAME                        DEPLOYED
create-organization-user    Yes
```

---

## ✅ TEST IN PREVIEW

**Now in your app:**

```
1. Users → Add User
2. Name: Test User
3. Email: test@example.com
4. Password: Test123!
5. Role: cashier
6. Branch: Select one
7. Submit
8. ✅ Should work now!
```

**Check logs:**
```
Console should show:
⚠️ RPC function failed, trying Edge Function...
✅ User created via Edge Function: {...}
```

---

## 🐛 TROUBLESHOOTING

### **Error: "command not found: supabase"**

**Fix:**
```bash
npm install -g supabase

# Or
brew install supabase/tap/supabase
```

---

### **Error: "not logged in"**

**Fix:**
```bash
supabase login
```

---

### **Error: "project not linked"**

**Fix:**
```bash
supabase link --project-ref YOUR_REF_ID
```

Get REF_ID from: Dashboard → Settings → General → Reference ID

---

### **Error: "Failed to send a request to the Edge Function"**

**Means:** Function not deployed yet or secrets not set.

**Fix:**
```bash
# Redeploy
supabase functions deploy create-organization-user

# Set secrets again
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_KEY
```

---

### **Error: "CORS"**

**Fix:** Function already has CORS headers. If still failing:

```bash
# Redeploy
supabase functions deploy create-organization-user
```

---

### **Error: "service role key invalid"**

**Fix:**
1. Dashboard → Settings → API
2. Copy the **service_role** key (NOT anon!)
3. Set it again:
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbG...YOUR_KEY
```

---

## 📊 VERIFY IT'S WORKING

### **Check in Dashboard:**

1. Functions → create-organization-user
2. Should show "Deployed"
3. Click "Invoke" to test manually

**Test body:**
```json
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
```

**Should return:**
```json
{
  "success": true,
  "user": {...},
  "message": "User created successfully..."
}
```

---

## ✅ SUCCESS CHECKLIST

- [ ] Supabase CLI installed
- [ ] Logged in: `supabase login`
- [ ] Project linked: `supabase link --project-ref YOUR_REF`
- [ ] Function deployed: `supabase functions deploy create-organization-user`
- [ ] URL secret set
- [ ] Service role key secret set
- [ ] Verified: `supabase functions list`
- [ ] Tested in Dashboard (Functions → Invoke)
- [ ] Tested in app (Add User)
- [ ] ✅ User created successfully!
- [ ] ✅ User can login!
- [ ] **WORKING IN PREVIEW!**

---

## 🎯 QUICK REFERENCE

```bash
# 1. Install
npm install -g supabase

# 2. Login
supabase login

# 3. Link (get REF from Dashboard → Settings → General)
supabase link --project-ref YOUR_REF_ID

# 4. Deploy
supabase functions deploy create-organization-user

# 5. Set secrets (get from Dashboard → Settings → API)
supabase secrets set SUPABASE_URL=https://YOUR_REF.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbG...YOUR_KEY

# 6. Verify
supabase functions list

# 7. Test in app!
```

---

## 🎉 AFTER SUCCESS

**Your app will:**
- ✅ Try RPC first (will fail with gen_salt error)
- ✅ Fallback to Edge Function automatically
- ✅ Create auth.users + profile
- ✅ User can login immediately
- ✅ NO manual steps
- ✅ Works in preview!
- ✅ Ready to launch!

---

## 📞 NEED HELP?

**If stuck, run:**
```bash
# Check if logged in
supabase projects list

# Check if linked
cat .git/config | grep supabase

# Check functions
supabase functions list

# Check secrets
supabase secrets list
```

---

**START NOW - IT'S ONLY 5 MINUTES!**

1. Install CLI
2. Login
3. Link project
4. Deploy function
5. Set secrets
6. Test
7. ✅ Done!
