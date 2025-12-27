# ✅ User Role Selection Fixed

## 🔧 Issue Resolved

**Problem:** When adding users, only "cashier" role was visible or selectable.

**Root Cause:** The native HTML `<select>` element had rendering/styling issues that prevented all role options from displaying properly, especially on mobile devices.

**Solution:** Replaced native HTML select with the proper UI Select component for consistent cross-platform rendering.

---

## 👥 Available User Roles

Your ShopEasy POS system now correctly displays ALL available roles:

### 1. **Owner** 🏢
- Full system access
- All permissions
- Can manage everything
- Cannot be deleted

### 2. **Admin** 👨‍💼
- Manage branches
- Manage users
- View all reports
- Manage products
- Approve transfers
- High-level management

### 3. **Manager** 📊
- Manage products
- Approve transfers
- View reports
- Manage staff
- Branch-level management
- Requires branch assignment

### 4. **Warehouse Manager** 📦
- Manage warehouse inventory
- Send products to branches
- Manage supplier products
- View warehouse reports
- Warehouse-specific access

### 5. **Cashier** 💰
- Process sales
- View inventory
- Hold sales
- POS Terminal access
- Requires branch assignment

### 6. **Auditor** 🔍
- View reports
- View transactions
- Export data
- Read-only access
- Compliance & auditing

---

## 📋 How to Add Users with Different Roles

### Step-by-Step:

1. **Go to Settings → Users**
2. Click **"Add User"** button
3. Fill in user details:
   - Full Name
   - Email Address
   - Password (minimum 6 characters)
4. **Click the Role dropdown** - You'll now see ALL 6 roles!
5. **Select appropriate role:**
   - Choose based on their responsibilities
   - Consider their access needs
6. **Assign Branch (if required):**
   - Manager, Cashier, and Warehouse Manager need branch assignment
   - Owner, Admin, and Auditor have organization-wide access
7. Click **"Add User"**

---

## 🎯 Role Selection Guide

### Which Role Should I Choose?

| If they need to... | Choose Role |
|-------------------|-------------|
| Manage the entire business | **Owner** or **Admin** |
| Manage a specific branch | **Manager** |
| Handle warehouse operations | **Warehouse Manager** |
| Operate POS and process sales | **Cashier** |
| Review reports and audit data | **Auditor** |

### Branch Assignment Rules:

**✅ Requires Branch Assignment:**
- Manager
- Cashier
- Warehouse Manager

**❌ No Branch Assignment (Organization-wide):**
- Owner
- Admin
- Auditor

---

## 🔒 Security & Permissions

### Role Hierarchy:
```
Owner (Full Access)
  ↓
Admin (All management)
  ↓
Manager (Branch management)
  ↓
Warehouse Manager (Warehouse operations)
  ↓
Cashier (POS operations)
  ↓
Auditor (Read-only)
```

### What Each Role CAN Do:

**Owner:**
- ✅ Everything (unrestricted)

**Admin:**
- ✅ Create/edit branches
- ✅ Add/remove users
- ✅ View all reports
- ✅ Manage products
- ✅ Approve transfers
- ❌ Cannot delete owner

**Manager:**
- ✅ Manage products in their branch
- ✅ Approve transfers
- ✅ View branch reports
- ✅ Manage branch staff
- ❌ Cannot access other branches

**Warehouse Manager:**
- ✅ Manage warehouse inventory
- ✅ Send products to branches
- ✅ Manage suppliers
- ✅ View warehouse reports
- ❌ Cannot process sales

**Cashier:**
- ✅ Process sales at POS
- ✅ View inventory
- ✅ Hold/resume sales
- ✅ Print receipts
- ❌ Cannot edit products
- ❌ Cannot approve transfers

**Auditor:**
- ✅ View all reports
- ✅ View transactions
- ✅ Export data
- ❌ Cannot modify anything
- ❌ Read-only access

---

## 💡 Best Practices

### 1. **Start Small**
- Begin with essential roles (Owner, Cashier)
- Add more roles as your team grows

### 2. **Follow Principle of Least Privilege**
- Give users minimum access needed
- Upgrade roles as responsibilities increase

### 3. **Regular Audits**
- Review user roles quarterly
- Remove inactive users
- Update roles when responsibilities change

### 4. **Branch Assignment**
- Assign cashiers to their primary branch
- Managers should be assigned to their branch
- Warehouse managers to their warehouse location

### 5. **Password Security**
- Enforce minimum 6 characters
- Encourage strong passwords
- Change passwords regularly

---

## 📊 Subscription Limits

### User Limits by Plan:

| Plan | User Limit |
|------|-----------|
| **Trial** | Unlimited (7 days) |
| **Starter** | 2 users (Owner + 1 staff) |
| **Standard** | 5 users |
| **Growth** | 8 users |
| **Enterprise** | Unlimited |

**Note:** When at user limit, you cannot add more users until you:
1. Upgrade to a higher plan, OR
2. Deactivate existing users

---

## 🔄 Editing Existing Users

### To Change a User's Role:

1. Go to Users page
2. Find the user
3. Click **"Edit"** button
4. Change role from dropdown (all 6 roles available)
5. Update branch assignment if needed
6. Click **"Save Changes"**

### Role Change Examples:

**Promote Cashier to Manager:**
- Change role: Cashier → Manager
- Permissions upgrade automatically
- Keep same branch assignment

**Demote Manager to Cashier:**
- Change role: Manager → Cashier
- Permissions reduced automatically
- Verify branch assignment

---

## ✅ What Was Fixed

### Before:
- ❌ Only "cashier" visible in dropdown
- ❌ Native HTML select with rendering issues
- ❌ Mobile display problems

### After:
- ✅ All 6 roles display correctly
- ✅ Proper UI Select component
- ✅ Works on mobile and desktop
- ✅ Better user experience
- ✅ Clear role descriptions

---

## 🎉 You're All Set!

You can now add users with ANY role:
- ✅ Owner
- ✅ Admin
- ✅ Manager
- ✅ Warehouse Manager
- ✅ Cashier
- ✅ Auditor

The dropdown will show all options with proper formatting and descriptions!
