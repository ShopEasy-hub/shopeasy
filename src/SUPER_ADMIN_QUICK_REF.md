# 🛡️ Super Admin Quick Reference

## Quick Access

**URL:** `http://localhost:5173/?super-admin=true`

**Required:** `is_super_admin = true` in user_profiles table

---

## Make Yourself Super Admin

```sql
-- Run in Supabase SQL Editor
UPDATE user_profiles 
SET is_super_admin = true,
    role = 'super_admin'
WHERE email = 'your-email@example.com';
```

---

## Super Admin Features

### **1. View All Organizations**
- See all tenant organizations across platform
- Monitor subscription status
- View user counts per org

### **2. Fix Duplicate Stock**
```sql
-- For specific organization
SELECT 
  product_id,
  branch_id,
  warehouse_id,
  COUNT(*) as duplicate_count
FROM inventory
WHERE organization_id = 'ORG_ID'
GROUP BY product_id, branch_id, warehouse_id
HAVING COUNT(*) > 1;
```

### **3. Export Organization Data**
- Click "Export" button for any organization
- Downloads JSON file with:
  - Organization details
  - All products
  - All inventory
  - Timestamp

### **4. Reset Organization**
⚠️ **DANGEROUS** - Deletes all data for organization
- Use only when requested by customer
- Creates clean slate
- Cannot be undone

### **5. View Support Tickets**
- See tickets from all organizations
- Filter by:
  - Priority (low, medium, high, critical)
  - Status (open, in_progress, resolved, closed)
  - Category (bug, feature, support, data_issue, performance)

### **6. Monitor System Logs**
- Real-time error tracking
- Severity levels:
  - Info (blue)
  - Warning (yellow)
  - Error (orange)
  - Critical (red)

---

## Common Support Tasks

### **Task 1: Customer Reports Duplicate Stock**

```sql
-- 1. Find duplicates
SELECT 
  p.name,
  p.sku,
  i.branch_id,
  i.warehouse_id,
  COUNT(*) as count
FROM inventory i
JOIN products p ON p.id = i.product_id
WHERE i.organization_id = 'ORG_ID'
GROUP BY p.name, p.sku, i.branch_id, i.warehouse_id
HAVING COUNT(*) > 1;

-- 2. Fix by keeping highest quantity
WITH ranked AS (
  SELECT 
    id,
    product_id,
    branch_id,
    warehouse_id,
    quantity,
    ROW_NUMBER() OVER (
      PARTITION BY product_id, branch_id, warehouse_id 
      ORDER BY quantity DESC, updated_at DESC
    ) as rn
  FROM inventory
  WHERE organization_id = 'ORG_ID'
)
DELETE FROM inventory
WHERE id IN (
  SELECT id FROM ranked WHERE rn > 1
);
```

### **Task 2: Customer Can't Switch Branches**

```sql
-- Check user role
SELECT id, name, email, role, assigned_branch_id
FROM user_profiles
WHERE organization_id = 'ORG_ID'
  AND email = 'user@example.com';

-- Update role to allow switching
UPDATE user_profiles
SET role = 'manager'  -- or 'owner'
WHERE email = 'user@example.com'
  AND organization_id = 'ORG_ID';
```

### **Task 3: Stock Reset to Zero**

```sql
-- Check if inventory exists
SELECT 
  p.name,
  p.sku,
  i.quantity,
  i.updated_at,
  i.updated_by
FROM inventory i
JOIN products p ON p.id = i.product_id
WHERE i.organization_id = 'ORG_ID'
ORDER BY i.updated_at DESC;

-- If missing, check recent sales
SELECT 
  s.id,
  s.created_at,
  si.product_id,
  si.quantity
FROM sales s
JOIN sale_items si ON si.sale_id = s.id
WHERE s.organization_id = 'ORG_ID'
  AND s.created_at > NOW() - INTERVAL '24 hours'
ORDER BY s.created_at DESC;

-- Restore stock if needed
INSERT INTO inventory (organization_id, branch_id, product_id, quantity)
VALUES ('ORG_ID', 'BRANCH_ID', 'PRODUCT_ID', 100)
ON CONFLICT ON CONSTRAINT unique_stock_per_location
DO UPDATE SET quantity = EXCLUDED.quantity;
```

### **Task 4: Transfer Not Updating Stock**

```sql
-- Check transfer status
SELECT 
  id,
  from_branch_id,
  to_branch_id,
  product_id,
  quantity,
  status,
  completed_at
FROM transfers
WHERE organization_id = 'ORG_ID'
ORDER BY created_at DESC
LIMIT 10;

-- Manually complete stuck transfer
UPDATE transfers
SET status = 'completed',
    completed_at = NOW()
WHERE id = 'TRANSFER_ID';

-- This will trigger automatic stock update
```

### **Task 5: POS Not Deducting Stock**

```sql
-- Check if trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'sale_items'
  AND trigger_name = 'handle_sale_inventory_deduction';

-- If missing, recreate trigger
CREATE TRIGGER handle_sale_inventory_deduction
  AFTER INSERT ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION deduct_sale_inventory();
```

---

## Database Health Checks

### **Check 1: Verify Unique Constraint**
```sql
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'inventory'::regclass
  AND conname = 'unique_stock_per_location';
```
**Expected:** 1 row returned

### **Check 2: Verify Triggers**
```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('inventory', 'transfers', 'sale_items', 'returns');
```
**Expected:** 4 rows (one for each table)

### **Check 3: Verify RLS Policies**
```sql
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```
**Expected:** Multiple rows for each table

### **Check 4: Check for Orphaned Records**
```sql
-- Products without organization
SELECT id, name, sku FROM products
WHERE organization_id NOT IN (SELECT id FROM organizations);

-- Inventory without product
SELECT id, product_id FROM inventory
WHERE product_id NOT IN (SELECT id FROM products);
```
**Expected:** 0 rows for both

---

## Create Support Ticket (for customer)

```sql
INSERT INTO support_tickets (
  organization_id,
  reporter_id,
  title,
  description,
  category,
  priority,
  status
) VALUES (
  'ORG_ID',
  'USER_ID',
  'Stock showing as zero after refresh',
  'Customer reports that stock levels reset to zero when they refresh the inventory page. This started happening after the last update.',
  'bug',
  'high',
  'open'
);
```

---

## Log System Event

```sql
INSERT INTO system_logs (
  organization_id,
  log_level,
  message,
  context
) VALUES (
  'ORG_ID',
  'error',
  'Stock deduction failed for sale',
  jsonb_build_object(
    'sale_id', 'SALE_ID',
    'error', 'Insufficient stock',
    'product_id', 'PRODUCT_ID'
  )
);
```

---

## Export Organization Data (SQL)

```sql
-- Full organization export
SELECT 
  json_build_object(
    'organization', (SELECT row_to_json(o) FROM organizations o WHERE id = 'ORG_ID'),
    'branches', (SELECT json_agg(b) FROM branches b WHERE organization_id = 'ORG_ID'),
    'warehouses', (SELECT json_agg(w) FROM warehouses w WHERE organization_id = 'ORG_ID'),
    'products', (SELECT json_agg(p) FROM products p WHERE organization_id = 'ORG_ID'),
    'inventory', (SELECT json_agg(i) FROM inventory i WHERE organization_id = 'ORG_ID')
  ) as export_data;
```

---

## RLS Bypass (Use Carefully!)

Super admins have automatic RLS bypass for all tables. But if you need to verify:

```sql
-- Check current user
SELECT current_user, auth.uid();

-- Verify super admin status
SELECT is_super_admin FROM user_profiles WHERE id = auth.uid();
```

---

## Performance Monitoring

### **Slow Queries**
```sql
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE query LIKE '%inventory%'
ORDER BY total_time DESC
LIMIT 10;
```

### **Table Sizes**
```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### **Index Usage**
```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as scans
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

---

## Emergency Actions

### **Lock Down Organization**
```sql
UPDATE organizations
SET subscription_status = 'suspended'
WHERE id = 'ORG_ID';
```

### **Disable User**
```sql
UPDATE user_profiles
SET status = 'suspended'
WHERE id = 'USER_ID';
```

### **Revert Last Change**
```sql
-- Check audit log
SELECT * FROM audit_logs
WHERE organization_id = 'ORG_ID'
ORDER BY created_at DESC
LIMIT 10;

-- Revert specific action (depends on what was changed)
```

---

## Quick Fixes

### **Fix 1: Reset User Password**
```sql
-- This needs to be done through Supabase Auth Dashboard
-- Go to: Authentication → Users → Select user → Reset password
```

### **Fix 2: Merge Duplicate Organizations**
```sql
-- WARNING: Complex operation, backup first!
-- 1. Update all foreign keys to point to kept org
UPDATE branches SET organization_id = 'KEEP_ORG_ID' 
WHERE organization_id = 'DELETE_ORG_ID';

UPDATE warehouses SET organization_id = 'KEEP_ORG_ID'
WHERE organization_id = 'DELETE_ORG_ID';

-- Continue for all tables...

-- 2. Delete duplicate org
DELETE FROM organizations WHERE id = 'DELETE_ORG_ID';
```

### **Fix 3: Recalculate Stock Totals**
```sql
-- Get current totals
SELECT 
  p.name,
  p.sku,
  SUM(i.quantity) as total_quantity
FROM products p
LEFT JOIN inventory i ON i.product_id = p.id
WHERE p.organization_id = 'ORG_ID'
GROUP BY p.id, p.name, p.sku
ORDER BY p.name;
```

---

## Useful Queries

### **Find Low Stock Products**
```sql
SELECT 
  p.name,
  p.sku,
  p.reorder_level,
  COALESCE(SUM(i.quantity), 0) as current_stock
FROM products p
LEFT JOIN inventory i ON i.product_id = p.id
WHERE p.organization_id = 'ORG_ID'
GROUP BY p.id, p.name, p.sku, p.reorder_level
HAVING COALESCE(SUM(i.quantity), 0) < p.reorder_level
ORDER BY current_stock ASC;
```

### **Top Selling Products**
```sql
SELECT 
  p.name,
  p.sku,
  COUNT(DISTINCT s.id) as sales_count,
  SUM(si.quantity) as units_sold,
  SUM(si.price * si.quantity) as revenue
FROM products p
JOIN sale_items si ON si.product_id = p.id
JOIN sales s ON s.id = si.sale_id
WHERE p.organization_id = 'ORG_ID'
  AND s.created_at > NOW() - INTERVAL '30 days'
GROUP BY p.id, p.name, p.sku
ORDER BY revenue DESC
LIMIT 10;
```

### **User Activity**
```sql
SELECT 
  up.name,
  up.email,
  up.role,
  COUNT(DISTINCT s.id) as sales_made,
  MAX(s.created_at) as last_sale
FROM user_profiles up
LEFT JOIN sales s ON s.cashier_id = up.id
WHERE up.organization_id = 'ORG_ID'
GROUP BY up.id, up.name, up.email, up.role
ORDER BY sales_made DESC;
```

---

## Keyboard Shortcuts (in Super Admin Panel)

- `Ctrl + R` - Refresh data
- `Ctrl + F` - Focus search
- `Ctrl + E` - Export current view
- `Esc` - Close dialogs

---

## Best Practices

✅ **Always backup before major changes**
✅ **Test fixes on staging first** (if available)
✅ **Document actions in support ticket**
✅ **Communicate with customer before/after**
✅ **Log all manual interventions**

❌ **Never delete data without backup**
❌ **Never bypass RLS for regular operations**
❌ **Never share super admin credentials**
❌ **Never make changes without ticket reference**

---

## Support Ticket Workflow

1. **Customer reports issue** → Create ticket
2. **Investigate** → Use queries above
3. **Apply fix** → Document in ticket
4. **Verify** → Test with customer
5. **Close ticket** → Mark as resolved
6. **Follow up** → Check after 24h

---

## Contact Escalation

**Level 1:** Support ticket + auto-fix tools
**Level 2:** SQL queries + manual intervention
**Level 3:** Database backup + restore
**Level 4:** Complete migration + data export

---

**This is your super admin toolkit. Use wisely!** 🛡️
