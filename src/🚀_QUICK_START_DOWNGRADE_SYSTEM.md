# 🚀 Quick Start: Subscription Downgrade System

## ⚡ 3-Step Setup

### Step 1: Run Database Migration
```bash
# In Supabase Dashboard → SQL Editor
# Copy and run: /MIGRATION_ADD_ENTITY_STATUS.sql
```

**What it does:**
- ✅ Adds `is_active` and `is_over_limit` columns to branches/warehouses
- ✅ Adds `deactivation_reason` to user_profiles
- ✅ Creates automatic trigger to enforce limits on plan changes
- ✅ Creates manual `mark_over_limit_entities()` function

### Step 2: Fix User Creation (if needed)
```bash
# In Supabase Dashboard → SQL Editor  
# Copy and run: /FIX_GEN_SALT_SCHEMA_QUALIFIED.sql
```

**What it does:**
- ✅ Fixes `gen_salt` error by schema-qualifying pgcrypto calls
- ✅ Users can now be created automatically without manual Supabase steps

### Step 3: Test the System
1. **Create a test organization on trial**
2. **Add 5 branches, 3 warehouses, 10 users** (trial allows unlimited)
3. **Simulate subscription change:**
   ```sql
   -- In Supabase SQL Editor
   UPDATE organizations 
   SET 
     subscription_plan = 'starter',
     subscription_status = 'active'
   WHERE id = 'YOUR_ORG_ID';
   ```
4. **Check results:**
   - Refresh app
   - See limit warnings
   - "Add Branch" button should be disabled
   - Over-limit entities should show

---

## 🎯 How Users Will Experience It

### During Free Trial
```
✅ All features unlocked
✅ Create unlimited branches, warehouses, users
✅ Full Enterprise access for 7 days
```

### After Downgrade to Starter
```
⚠️ Plan Limit Warning Banner shows:
"You have 4 extra branches. Upgrade to manage all."

📊 Usage Display:
"Using 5 of 1 branches"

🔒 Actions Blocked:
- Cannot create new branches
- Cannot edit over-limit branches
- Cannot create new warehouses (Starter = 0)

👁️ View Access Maintained:
- Can view all 5 branches (read-only)
- Can see all warehouse inventory
- All data is preserved and accessible

🚀 Upgrade Prompts:
"Upgrade to Business Plan" button everywhere
```

---

## 📋 What Happens to Each Entity

### Branches (Starter: 1, Business: 5, Enterprise: Unlimited)
**Downgrade from Trial (5 branches) → Starter (1 branch):**
- ✅ Oldest branch stays active (full access)
- 👁️ 4 newest branches become view-only
- ❌ Cannot create new branches
- 📊 Banner: "You have 4 extra branches"

### Warehouses (Starter: 0, Business: 1, Enterprise: Unlimited)
**Downgrade from Trial (3 warehouses) → Starter (0 warehouses):**
- 🚫 All warehouses become view-only
- ❌ Cannot create transfers
- ❌ Cannot modify warehouse inventory
- 📊 Banner: "Warehouse management requires Business plan"

### Users (Starter: 3, Business: 10, Enterprise: Unlimited)
**Downgrade from Trial (10 users) → Starter (3 users):**
- ✅ Owner + 2 oldest users stay active
- ⏸️ 7 users marked as "over_limit" (cannot login)
- ❌ Cannot create new users
- 📊 Banner: "You have 7 extra users"

---

## 🔄 Reactivation Flow

### When User Upgrades: Starter → Business

1. **Auto-reactivation:**
   ```sql
   -- Trigger automatically runs
   UPDATE organizations 
   SET subscription_plan = 'business'
   WHERE id = 'ORG_ID';
   
   -- Trigger marks entities within new limits as active
   ```

2. **Result:**
   - ✅ 5 branches become active (Business allows 5)
   - ✅ 1 warehouse becomes active
   - ✅ 10 users become active
   - 🎉 Full access restored automatically

---

## 🧪 Testing Checklist

### Test 1: Trial → Starter Downgrade
- [ ] Create org on trial
- [ ] Add 5 branches
- [ ] Add 3 warehouses
- [ ] Add 10 users
- [ ] Change plan to Starter via SQL
- [ ] Verify: Only 1 branch active
- [ ] Verify: All warehouses over-limit
- [ ] Verify: Only 3 users active
- [ ] Verify: Warning banners show
- [ ] Verify: "Add" buttons disabled

### Test 2: Starter → Business Upgrade
- [ ] Start with Starter (over-limit state)
- [ ] Change plan to Business via SQL
- [ ] Verify: 5 branches become active
- [ ] Verify: 1 warehouse becomes active
- [ ] Verify: 10 users become active
- [ ] Verify: Warning banners disappear
- [ ] Verify: "Add" buttons enabled

### Test 3: User Experience
- [ ] Login as over-limit user → Should see "Upgrade to reactivate"
- [ ] Try to create branch when at limit → Should show error
- [ ] Try to edit over-limit branch → Should be read-only
- [ ] Click "Upgrade Plan" → Should navigate to subscription page

---

## 🎨 UI States

### Normal State (Within Limits)
```
Branches: Using 1 of 1 branches ✅
[Add Branch] button enabled
No warnings shown
```

### Over Limit State
```
⚠️ You have 4 extra branches. Upgrade to manage all.
Branches: Using 5 of 1 branches 🔴
[Add Branch] button disabled
[Upgrade Plan] button prominent
```

### At Limit State (Not Over, But Full)
```
Branches: Using 1 of 1 branches ⚠️
[Add Branch] button disabled
Message: "Branch limit reached. Upgrade for more."
[Upgrade Plan] button shown
```

---

## 🛠️ Manual Commands (For Debugging)

### Check Current Limits
```sql
-- See plan limits for an org
SELECT 
  id,
  name,
  subscription_plan,
  subscription_status,
  trial_start_date,
  (SELECT COUNT(*) FROM branches WHERE organization_id = organizations.id) as branch_count,
  (SELECT COUNT(*) FROM warehouses WHERE organization_id = organizations.id) as warehouse_count,
  (SELECT COUNT(*) FROM user_profiles WHERE organization_id = organizations.id) as user_count
FROM organizations
WHERE id = 'YOUR_ORG_ID';
```

### Manually Mark Over-Limit Entities
```sql
-- Mark branches over limit
SELECT mark_over_limit_entities('YOUR_ORG_ID'::uuid, 'branches', 1);

-- Mark warehouses over limit
SELECT mark_over_limit_entities('YOUR_ORG_ID'::uuid, 'warehouses', 0);

-- Mark users over limit
SELECT mark_over_limit_entities('YOUR_ORG_ID'::uuid, 'users', 3);
```

### Reset All to Active (For Testing)
```sql
-- Reset all branches to active
UPDATE branches 
SET is_active = true, is_over_limit = false
WHERE organization_id = 'YOUR_ORG_ID';

-- Reset all warehouses to active
UPDATE warehouses 
SET is_active = true, is_over_limit = false
WHERE organization_id = 'YOUR_ORG_ID';

-- Reset all users to active
UPDATE user_profiles 
SET status = 'active', deactivation_reason = NULL
WHERE organization_id = 'YOUR_ORG_ID';
```

---

## 📊 Expected Results

### In Database After Downgrade:
```sql
-- Branches
id  | name                | is_active | is_over_limit | created_at
----|--------------------|-----------|---------------|------------
001 | Main Branch (HQ)    | true      | false         | 2024-01-01
002 | Lekki Branch        | false     | true          | 2024-01-15
003 | VI Branch           | false     | true          | 2024-01-20
004 | Ikeja Branch        | false     | true          | 2024-01-25
005 | Surulere Branch     | false     | true          | 2024-01-30

-- Warehouses
id  | name                | is_active | is_over_limit
----|--------------------|-----------|--------------
001 | Main Warehouse      | false     | true
002 | Lagos Warehouse     | false     | true
003 | Abuja Warehouse     | false     | true

-- Users
id  | name       | role    | status      | deactivation_reason
----|------------|---------|-------------|--------------------
001 | John Doe   | owner   | active      | NULL
002 | Jane Smith | admin   | active      | NULL
003 | Bob Jones  | cashier | active      | NULL
004 | Alice Lee  | cashier | over_limit  | Plan limit exceeded...
005 | Charlie    | manager | over_limit  | Plan limit exceeded...
```

### In Frontend:
- ⚠️ Warning banner at top of Settings page
- 📊 "Using 5 of 1 branches" display
- 🔒 "Add Branch" button grayed out
- 👁️ Over-limit branches shown with "View Only" badge
- 🚀 "Upgrade Plan" button highlighted

---

## ✅ Success Criteria

The system is working correctly when:
- [x] Trial users see unlimited access
- [x] Downgraded users see warning banners
- [x] Over-limit entities are view-only
- [x] "Add" buttons are disabled when at/over limit
- [x] Upgrade buttons are prominently displayed
- [x] No data is lost during downgrade
- [x] Reactivation works automatically on upgrade
- [x] Owner always stays active
- [x] Database trigger fires on plan changes
- [x] Frontend limits hook loads correct usage

---

## 🆘 Troubleshooting

### Issue: Limits not enforcing after plan change
**Fix:** Run manual mark function
```sql
SELECT mark_over_limit_entities('ORG_ID'::uuid, 'branches', 1);
```

### Issue: Warning banner not showing
**Check:** Frontend hook is loading
```javascript
console.log(limitStatus); // Should show overages
```

### Issue: All entities still active after downgrade
**Check:** Trigger is firing
```sql
SELECT * FROM pg_trigger WHERE tgname = 'trigger_enforce_plan_limits';
```

---

## 📚 Related Documentation

- **Full Technical Docs:** `/📘_SUBSCRIPTION_DOWNGRADE_HANDLING.md`
- **Database Migration:** `/MIGRATION_ADD_ENTITY_STATUS.sql`
- **User Creation Fix:** `/FIX_GEN_SALT_SCHEMA_QUALIFIED.sql`
- **Latest Fixes Guide:** `/START_HERE_LATEST_FIX.md`

---

**Ready to go! Run Step 1 & 2, then test with Step 3.** 🚀