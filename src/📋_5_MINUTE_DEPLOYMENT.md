# 📋 5-MINUTE EDGE FUNCTION DEPLOYMENT

## 🎯 GOAL
Make user creation work automatically in preview by deploying the Edge Function.

---

## ⚡ STEP-BY-STEP (Copy & Paste Each Command)

### **STEP 1: Install Supabase CLI** (1 minute)

**Open your terminal and run:**

```bash
npm install -g supabase
```

**Verify it worked:**
```bash
supabase --version
```

**Should show:** `supabase version 1.x.x`

✅ **Done? Move to Step 2**

---

### **STEP 2: Login to Supabase** (1 minute)

**Run this:**

```bash
supabase login
```

**What happens:**
- Browser opens automatically
- Login with your Supabase account
- Terminal shows "Logged in successfully"

✅ **Done? Move to Step 3**

---

### **STEP 3: Get Your Project Reference ID** (30 seconds)

**Go to Supabase Dashboard:**
1. Open https://supabase.com/dashboard
2. Click your project
3. Settings → General
4. Find "Reference ID"
5. Copy it (looks like: `abcdefghijklmnop`)

**Keep this handy - you'll need it next!**

✅ **Got it? Move to Step 4**

---

### **STEP 4: Link Your Project** (30 seconds)

**In terminal, run:**

```bash
supabase link --project-ref YOUR_REFERENCE_ID_HERE
```

**Replace `YOUR_REFERENCE_ID_HERE` with the ID from Step 3.**

**Example:**
```bash
supabase link --project-ref abcdefghijklmnop
```

**Should show:** `Linked to project: YOUR_PROJECT_NAME`

✅ **Done? Move to Step 5**

---

### **STEP 5: Navigate to Project Directory** (10 seconds)

**Go to your ShopEasy project folder:**

```bash
cd /path/to/your/shopeasy/project
```

**Example:**
```bash
cd ~/Desktop/shopeasy
# or
cd C:\Users\YourName\Projects\shopeasy
```

✅ **In the right folder? Move to Step 6**

---

### **STEP 6: Deploy the Edge Function** (1 minute)

**Run this:**

```bash
supabase functions deploy create-organization-user
```

**What happens:**
- Uploads the function to Supabase
- Compiles and deploys
- Shows "Deployed successfully"

**Should show:**
```
Deploying function create-organization-user...
Function deployed successfully!
```

✅ **Deployed? Move to Step 7**

---

### **STEP 7: Get Your Service Role Key** (30 seconds)

**Go to Supabase Dashboard:**
1. Settings → API
2. Scroll to "Project API keys"
3. Find **"service_role"** key
4. Click "Copy" (the one that says "secret")
5. ⚠️ **NOT the "anon" key!** Use the **"service_role"** key!

**Keep this handy - you'll need it next!**

✅ **Got it? Move to Step 8**

---

### **STEP 8: Set Environment Secrets** (1 minute)

**Run these TWO commands:**

**Command 1: Set Supabase URL**
```bash
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
```

**Replace `YOUR_PROJECT_REF` with your Project Reference ID from Step 3.**

**Example:**
```bash
supabase secrets set SUPABASE_URL=https://abcdefghijklmnop.supabase.co
```

---

**Command 2: Set Service Role Key**
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE
```

**Replace `YOUR_SERVICE_ROLE_KEY_HERE` with the key from Step 7.**

**Example:**
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjM...
```

**Should show:**
```
Secret set successfully
Secret set successfully
```

✅ **Both secrets set? Move to Step 9**

---

### **STEP 9: Verify Deployment** (10 seconds)

**Run this:**

```bash
supabase functions list
```

**Should show:**
```
NAME                        DEPLOYED
create-organization-user    Yes
```

✅ **Shows "Yes"? Move to Step 10**

---

### **STEP 10: Test in Your App!** (30 seconds)

**Now go to your app:**

1. **Users → Add User**
2. Fill in:
   - Name: Test User
   - Email: test@example.com
   - Password: Test123!
   - Role: cashier
   - Branch: (select one)
3. **Submit**
4. ✅ **Should work!**

**Console should show:**
```
⚠️ RPC function failed, trying Edge Function...
✅ User created via Edge Function: {...}
```

**User should:**
- ✅ Appear in the Users list
- ✅ Be able to login immediately!

---

## 🎉 SUCCESS!

**You now have:**
- ✅ Edge Function deployed
- ✅ Automatic user creation working
- ✅ Users can login immediately
- ✅ NO manual steps needed
- ✅ **READY TO LAUNCH!**

---

## 🐛 TROUBLESHOOTING

### **"command not found: supabase"**

**Fix:**
```bash
npm install -g supabase
```

If that doesn't work, try:
```bash
sudo npm install -g supabase
```

---

### **"Failed to send a request to the Edge Function"**

**Fix:** Secrets not set correctly.

**Rerun Step 8:**
```bash
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

---

### **"gen_salt error" still showing**

**This is normal!** The RPC tries first, fails, then Edge Function takes over.

**Look for this in console:**
```
⚠️ RPC function failed, trying Edge Function...
✅ User created via Edge Function
```

This means **it's working!**

---

### **"Not logged in"**

**Fix:**
```bash
supabase login
```

---

### **"Project not linked"**

**Fix:**
```bash
supabase link --project-ref YOUR_REF_ID
```

---

## ✅ QUICK VERIFICATION

**Run these to verify everything:**

```bash
# Check if logged in
supabase projects list

# Check if function deployed
supabase functions list

# Check if secrets set
supabase secrets list
```

**All should show success!**

---

## 📋 COMMAND SUMMARY

Here are ALL the commands in order:

```bash
# 1. Install CLI
npm install -g supabase

# 2. Login
supabase login

# 3. Link (replace YOUR_REF_ID)
supabase link --project-ref YOUR_REF_ID

# 4. Navigate to project
cd /path/to/your/project

# 5. Deploy function
supabase functions deploy create-organization-user

# 6. Set URL secret (replace YOUR_REF_ID)
supabase secrets set SUPABASE_URL=https://YOUR_REF_ID.supabase.co

# 7. Set service role secret (replace YOUR_KEY)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_KEY

# 8. Verify
supabase functions list

# 9. Test in app!
```

---

## 🎯 WHAT YOU'LL SEE

**Before deployment:**
```
❌ Error: gen_salt does not exist
❌ User creation failed
```

**After deployment:**
```
⚠️ RPC function failed, trying Edge Function...
✅ User created via Edge Function
✅ User appears in list
✅ User can login!
```

---

## 📞 TOTAL TIME

- **Install CLI:** 1 min
- **Login:** 1 min
- **Get credentials:** 1 min
- **Link & Deploy:** 1 min
- **Set secrets:** 1 min
- **Total:** **5 minutes!**

---

**START NOW - IT'S ONLY 5 MINUTES!**

Then your app will work automatically in preview! ✅
