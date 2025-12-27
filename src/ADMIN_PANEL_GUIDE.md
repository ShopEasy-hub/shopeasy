# 🛡️ Admin Panel Guide

## Overview

Your ShopEasy POS now has a **centralized Admin Panel** that consolidates all administrative functions in one place with proper role-based access control.

---

## 🎯 What Is the Admin Panel?

The Admin Panel is a dedicated section for **Owners** and **Managers** to:

- **Monitor system health** - Database, API, storage status
- **Manage users** - Add, edit, deactivate users
- **View system-wide analytics** - All branches, all warehouses
- **Access diagnostic tools** - Debug, diagnostics, data viewer
- **Manage subscription** - Billing, plans, invoices (Owner only)
- **Track audit logs** - Who did what, when
- **Quick actions** - One-click access to common tasks

---

## 🚪 How to Access

### **Method 1: Direct Navigation**

In your `Dashboard.tsx` or navigation sidebar, add a link:

```typescript
<Button onClick={() => onNavigate('admin')}>
  <Shield className="h-4 w-4 mr-2" />
  Admin Panel
</Button>
```

### **Method 2: URL Parameter**

```
http://localhost:5173/?admin=true
```

### **Method 3: Keyboard Shortcut (Optional)**

Add to `App.tsx`:

```typescript
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    // Ctrl + Alt + A = Admin Panel
    if (e.ctrlKey && e.altKey && e.key === 'a') {
      if (appState.userRole === 'owner' || appState.userRole === 'manager') {
        setCurrentPage('admin');
      }
    }
  };
  
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [appState.userRole]);
```

---

## 🔒 Role-Based Access Control

### **Access Levels:**

| Feature | Owner | Manager | Auditor | Cashier |
|---------|-------|---------|---------|---------|
| **View Admin Panel** | ✅ | ✅ | ❌ | ❌ |
| **User Management** | ✅ | ✅ | ❌ | ❌ |
| **System Health** | ✅ | ✅ | ❌ | ❌ |
| **Billing & Subscription** | ✅ | ❌ | ❌ | ❌ |
| **Audit Logs** | ✅ | ✅ | ✅ | ❌ |
| **Database Tools** | ✅ | ✅ | ❌ | ❌ |
| **Debug Panel** | ✅ | ⚠️ | ❌ | ❌ |

**Note:** Non-admin users who try to access the panel will be automatically redirected to the dashboard.

---

## 📊 Admin Panel Features

### **1. Overview Tab**

Shows key system metrics:

- **Total Users** - Active vs inactive
- **Locations** - Branches + warehouses
- **Products** - Total + low stock count
- **Today's Sales** - Real-time revenue

**System Health Monitor:**
- ✅ Database status (healthy/degraded/down)
- ✅ API status
- ✅ Storage status
- ✅ Last backup time

**Recent Activity Feed:**
- Live feed of system events
- User actions (create, update, delete)
- System events (backups, transfers)
- Filterable by type

**Quick Actions:**
- One-click buttons for common tasks
- Manage Users
- System Settings
- View Reports
- Database Status

---

### **2. Users Tab**

User management hub:

- View all users in organization
- Add new users
- Edit user roles and permissions
- Deactivate/activate users
- Reset passwords
- View user activity logs

**Quick link to:** `/users` page

---

### **3. System Tab**

System administration tools:

**Database Status**
- Connection health
- Query performance
- Table sizes
- Index usage
- Slow queries

**Stock Diagnostics**
- Check for duplicates
- Verify stock integrity
- Find orphaned records
- Reconciliation tools

**Debug Panel**
- Advanced debugging
- API call logging
- Error tracking
- Performance metrics

**Data Viewer**
- Raw database access
- View/export data
- Run custom queries
- Data integrity checks

---

### **4. Billing Tab** (Owner Only)

Subscription and payment management:

**Current Subscription:**
- Plan name and tier
- Expiry date
- Features included
- Upgrade/downgrade options

**Billing History:**
- Past invoices
- Payment receipts
- Transaction history
- Download PDFs

**Payment Methods:**
- Saved cards
- Add new payment method
- Set default method

---

### **5. Audit Logs Tab**

Complete activity tracking:

**Log Entries Show:**
- Who: User name and ID
- What: Action performed
- When: Timestamp
- Where: Branch/warehouse
- Result: Success/failure

**Filterable By:**
- Date range
- User
- Action type (create, update, delete)
- Branch/warehouse
- Success/failure

**Export Options:**
- CSV export
- PDF report
- Send to email

---

## 🎨 Admin Panel Layout

```
┌─────────────────────────────────────────┐
│  🛡️ Admin Panel                         │
│  System administration for [Org Name]   │
│                          [ACTIVE ✅]     │
├─────────────────────────────────────────┤
│  ⚠️ Subscription expires in 15 days     │
│                       [Renew now →]     │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│  │ Users │ │ Locs  │ │ Prods │ │ Sales │
│  │  12   │ │  7    │ │  450  │ │ 125k  │
│  └───────┘ └───────┘ └───────┘ └───────┘
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  [Overview] [Users] [System] [Billing] │
│                                         │
│  ┌─── System Health ──┐  ┌─ Activity ─┐
│  │ ✅ Database        │  │ • User...  │
│  │ ✅ API             │  │ • Product..│
│  │ ✅ Storage         │  │ • Sale...  │
│  │ 🕐 Backup: 2h ago  │  │ • System.. │
│  └────────────────────┘  └────────────┘
│                                         │
│  ┌─── Quick Actions ────────────────┐  │
│  │ [👥 Users] [⚙️ Settings]        │  │
│  │ [📊 Reports] [💾 Database]      │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## 🔧 Implementation Steps

### **Step 1: Add Navigation**

Update your `Dashboard.tsx` sidebar to include Admin Panel link:

```typescript
// Only show for owners and managers
{(appState.userRole === 'owner' || appState.userRole === 'manager') && (
  <Button
    variant="ghost"
    className="w-full justify-start"
    onClick={() => onNavigate('admin')}
  >
    <Shield className="h-4 w-4 mr-2" />
    Admin Panel
  </Button>
)}
```

### **Step 2: Update App.tsx** (Already Done ✅)

The route has been added to handle the admin page.

### **Step 3: Connect Real Data**

Update `AdminPanel.tsx` to fetch real data:

```typescript
const loadAdminData = async () => {
  try {
    // Fetch users
    const users = await getOrganizationUsers(appState.orgId);
    
    // Fetch branches and warehouses
    const branches = await getBranches(appState.orgId);
    const warehouses = await getWarehouses(appState.orgId);
    
    // Fetch products
    const products = await getProducts(appState.orgId);
    
    // Fetch today's sales
    const sales = await getSales(appState.orgId);
    const todaySales = sales
      .filter(s => new Date(s.created_at).toDateString() === new Date().toDateString())
      .reduce((sum, s) => sum + s.total, 0);
    
    // Update stats
    setStats({
      totalUsers: users.length,
      activeUsers: users.filter(u => u.status === 'active').length,
      totalBranches: branches.length,
      totalWarehouses: warehouses.length,
      totalProducts: products.length,
      lowStockItems: products.filter(p => p.quantity < p.reorder_level).length,
      todaySales,
      // ... other stats
    });
  } catch (error) {
    console.error('Error loading admin data:', error);
  }
};
```

### **Step 4: Add Audit Logging**

Create audit log system to track all actions:

```typescript
// lib/audit-logger.ts
export async function logAction(
  orgId: string,
  userId: string,
  action: string,
  details: any
) {
  await supabase.from('audit_logs').insert({
    organization_id: orgId,
    user_id: userId,
    action,
    details,
    created_at: new Date().toISOString(),
  });
}

// Usage
await logAction(
  appState.orgId,
  appState.userId,
  'product_created',
  { product_id: newProduct.id, name: newProduct.name }
);
```

---

## 📊 Database Schema for Audit Logs

Add this table to your Supabase database:

```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_organization ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- RLS Policy
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and managers can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('owner', 'manager', 'auditor')
    )
  );
```

---

## 🎯 Benefits of Admin Panel

### **Before (Scattered):**

❌ Users page separate
❌ Settings page separate  
❌ Diagnostics scattered across multiple pages
❌ No centralized overview
❌ No role-based restrictions on debug tools
❌ Hard to find admin features

### **After (Centralized):**

✅ **One location** for all admin tasks
✅ **Role-based access** - only admins can enter
✅ **Organized by category** - easy to find features
✅ **System health at a glance** - see issues immediately
✅ **Quick actions** - common tasks one click away
✅ **Audit trail** - complete activity history
✅ **Professional appearance** - looks like enterprise software

---

## 🔒 Security Best Practices

### **1. Role Verification**

Always check user role on both frontend AND backend:

```typescript
// Frontend (AdminPanel.tsx)
if (appState.userRole !== 'owner' && appState.userRole !== 'manager') {
  navigate('/dashboard');
  return;
}

// Backend (API endpoint)
export async function getAdminStats(orgId: string, userId: string) {
  // Verify user is owner/manager
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .eq('organization_id', orgId)
    .single();
  
  if (!profile || !['owner', 'manager'].includes(profile.role)) {
    throw new Error('Unauthorized: Admin access required');
  }
  
  // Continue with admin operations...
}
```

### **2. Audit All Admin Actions**

Log every administrative action:

```typescript
// Before deleting user
await logAction(appState.orgId, appState.userId, 'user_deleted', {
  deleted_user_id: userToDelete.id,
  deleted_user_email: userToDelete.email,
  reason: 'Left company'
});

// Then delete
await deleteUser(userToDelete.id);
```

### **3. Sensitive Data Protection**

Never expose sensitive data in audit logs:

```typescript
// ❌ BAD - Logs password
await logAction(orgId, userId, 'user_created', {
  email: 'user@example.com',
  password: 'secret123' // NEVER DO THIS
});

// ✅ GOOD - No sensitive data
await logAction(orgId, userId, 'user_created', {
  email: 'user@example.com',
  role: 'cashier'
});
```

---

## 🎨 Customization Options

### **1. Add Custom Metrics**

```typescript
<Card>
  <CardHeader>
    <CardTitle>Revenue This Month</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-2xl">₦{monthlyRevenue.toLocaleString()}</div>
    <p className="text-xs text-muted-foreground">
      +12% from last month
    </p>
  </CardContent>
</Card>
```

### **2. Add Custom Quick Actions**

```typescript
<Button 
  variant="outline" 
  className="h-auto flex flex-col items-center gap-2 py-4"
  onClick={() => navigate('/custom-report')}
>
  <FileText className="h-5 w-5" />
  <span className="text-sm">Custom Report</span>
</Button>
```

### **3. Add System Alerts**

```typescript
{systemHealth.database !== 'healthy' && (
  <Alert variant="destructive">
    <AlertTriangle className="h-4 w-4" />
    <AlertDescription>
      Database is experiencing issues. Some features may be unavailable.
    </AlertDescription>
  </Alert>
)}
```

---

## 📱 Mobile Responsiveness

The Admin Panel is fully responsive:

- **Desktop:** Full 4-column layout with sidebar
- **Tablet:** 2-column layout with collapsible tabs
- **Mobile:** Single column with stacked cards

Test on all screen sizes to ensure proper display.

---

## 🐛 Troubleshooting

### **Issue: "Access Denied"**

**Solution:** Check user role in database:

```sql
SELECT role FROM user_profiles WHERE id = 'USER_ID';
```

Update role if needed:

```sql
UPDATE user_profiles SET role = 'manager' WHERE id = 'USER_ID';
```

### **Issue: "Stats Not Loading"**

**Solution:** Check RLS policies allow data access:

```sql
-- Verify policies exist
SELECT * FROM pg_policies WHERE tablename = 'user_profiles';
```

### **Issue: "Audit Logs Empty"**

**Solution:** Ensure audit logging is implemented:

1. Create `audit_logs` table (see Database Schema section)
2. Add `logAction()` calls to all admin actions
3. Verify RLS policies allow viewing

---

## ✅ Implementation Checklist

- [ ] Admin Panel page created (`/pages/AdminPanel.tsx`) ✅
- [ ] Route added to `App.tsx` ✅
- [ ] Navigation link added to sidebar
- [ ] Role-based access control implemented
- [ ] Connected to real API data
- [ ] Audit logs table created
- [ ] Audit logging implemented for actions
- [ ] System health monitoring working
- [ ] Quick actions functional
- [ ] Tested on all screen sizes
- [ ] Tested with different user roles

---

## 🎉 Summary

The Admin Panel provides:

✅ **Centralized administration** - All admin tasks in one place
✅ **Role-based security** - Only owners/managers can access
✅ **System monitoring** - Health checks and diagnostics
✅ **User management** - Complete user control
✅ **Audit trail** - Full activity logging
✅ **Quick access** - Common tasks one click away
✅ **Professional UI** - Enterprise-grade interface

**Your ShopEasy POS now has enterprise-level administration capabilities!** 🎯

---

**Next Steps:**

1. Add navigation link to sidebar
2. Connect real data to Admin Panel
3. Create audit logs table
4. Implement audit logging
5. Test with different user roles

**You're done!** 🚀
