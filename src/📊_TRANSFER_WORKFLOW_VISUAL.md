# 📊 Transfer Workflow Visual Guide

## Complete Transfer Journey

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         SHOPEASY TRANSFER WORKFLOW                            │
└──────────────────────────────────────────────────────────────────────────────┘

╔═══════════════════════════════════════════════════════════════════════════╗
║  STATUS: PENDING                                                           ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  📋 Transfer Created                                                       ║
║  👤 Created by: Branch Manager / Admin                                     ║
║  📦 Source Stock: UNCHANGED (still available)                              ║
║  📦 Destination Stock: UNCHANGED                                           ║
║                                                                            ║
║  🔽 AVAILABLE ACTION:                                                      ║
║  ┌───────────────────────────────────────┐                                ║
║  │  [Approve] Button                     │                                ║
║  │  Visible to: Destination Manager,     │                                ║
║  │              Admin, Owner              │                                ║
║  └───────────────────────────────────────┘                                ║
╚═══════════════════════════════════════════════════════════════════════════╝
                                    │
                                    │ Click "Approve"
                                    ↓
╔═══════════════════════════════════════════════════════════════════════════╗
║  STATUS: APPROVED                                                          ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  ✅ Transfer Approved                                                      ║
║  👤 Approved by: Manager / Admin                                           ║
║  📤 Source Stock: DECREASED (-quantity) ← INVENTORY CHANGED!               ║
║  📦 Destination Stock: UNCHANGED (not yet received)                        ║
║                                                                            ║
║  💡 Stock is now "in limbo" - deducted but not yet received                ║
║                                                                            ║
║  🔽 AVAILABLE ACTION:                                                      ║
║  ┌───────────────────────────────────────┐                                ║
║  │  [In Transit] Button                  │                                ║
║  │  Visible to: Admin, Owner             │                                ║
║  └───────────────────────────────────────┘                                ║
╚═══════════════════════════════════════════════════════════════════════════╝
                                    │
                                    │ Click "In Transit"
                                    ↓
╔═══════════════════════════════════════════════════════════════════════════╗
║  STATUS: IN_TRANSIT                                                        ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  🚚 Transfer Being Transported                                             ║
║  👤 Marked by: Admin / Owner                                               ║
║  📦 Source Stock: DECREASED (already deducted)                             ║
║  📦 Destination Stock: UNCHANGED (awaiting delivery)                       ║
║                                                                            ║
║  💡 Goods are physically being moved between locations                     ║
║                                                                            ║
║  🔽 AVAILABLE ACTION:                                                      ║
║  ┌───────────────────────────────────────┐                                ║
║  │  [Accept Transfer] Button             │                                ║
║  │  Visible to: Destination Manager,     │                                ║
║  │              Admin, Owner              │                                ║
║  │  Badge: Green "Ready to Receive"      │                                ║
║  └───────────────────────────────────────┘                                ║
╚═══════════════════════════════════════════════════════════════════════════╝
                                    │
                                    │ Click "Accept Transfer"
                                    ↓
╔═══════════════════════════════════════════════════════════════════════════╗
║  STATUS: COMPLETED ✅                                                      ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  🎉 Transfer Completed Successfully                                        ║
║  👤 Received by: Destination Manager                                       ║
║  📦 Source Stock: DECREASED (remains reduced)                              ║
║  📥 Destination Stock: INCREASED (+quantity) ← INVENTORY CHANGED!          ║
║  📅 Completed at: [timestamp]                                              ║
║                                                                            ║
║  💡 Stock successfully moved from source to destination                    ║
║  💡 Transfer appears in "Completed" section                                ║
║  💡 Visible in Recent Activities dashboard                                 ║
║                                                                            ║
║  ✨ NO FURTHER ACTIONS AVAILABLE                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

## Inventory Changes Summary

| Status      | Source Branch | Destination Branch | Total System Stock |
|-------------|---------------|--------------------|--------------------|
| PENDING     | 100           | 50                 | 150                |
| APPROVED    | 90 ⬇️ (-10)   | 50                 | 140 ⚠️ (in transit)|
| IN_TRANSIT  | 90            | 50                 | 140 (in transit)   |
| COMPLETED   | 90            | 60 ⬆️ (+10)        | 150 ✅             |

⚠️ **Important**: During APPROVED and IN_TRANSIT stages, the total system stock appears reduced because the stock is "in limbo" between locations.

## User Permissions

### Create Transfer
- ✅ Owner
- ✅ Admin
- ❌ Manager (can't create)
- ❌ Cashier (can't create)

### Approve Transfer (Pending → Approved)
- ✅ Owner
- ✅ Admin
- ✅ Destination Branch Manager
- ❌ Source Branch Manager (can't approve their own transfer)

### Mark In Transit (Approved → In Transit)
- ✅ Owner
- ✅ Admin
- ❌ Manager (admin only)

### Accept Transfer (In Transit → Completed)
- ✅ Owner
- ✅ Admin
- ✅ Destination Branch Manager
- ❌ Source Branch Manager

## Button Visibility Matrix

| Transfer Status | Approve | In Transit | Accept |
|----------------|---------|------------|--------|
| PENDING        | ✅ Yes  | ❌ No      | ❌ No  |
| APPROVED       | ❌ No   | ✅ Yes     | ❌ No  |
| IN_TRANSIT     | ❌ No   | ❌ No      | ✅ Yes |
| COMPLETED      | ❌ No   | ❌ No      | ❌ No  |
| REJECTED       | ❌ No   | ❌ No      | ❌ No  |

## Status Badge Colors

- 🟡 **PENDING** - Yellow/Warning
- 🟣 **APPROVED** - Purple
- 🔵 **IN_TRANSIT** - Blue/Info  
- 🟢 **COMPLETED** - Green/Success
- 🔴 **REJECTED** - Red/Destructive

## Common Scenarios

### Scenario 1: Standard Transfer (All Steps)
```
Branch A has excess stock → Create transfer → Manager approves
→ Admin marks in transit → Branch B receives → ✅ Complete
```

### Scenario 2: Express Transfer (Skip In Transit)
```
Same-building branches → Create transfer → Approve
→ Immediately accept (skip in transit) → ✅ Complete
```
Note: System handles this! If you go from APPROVED → COMPLETED, 
it automatically adds to destination.

### Scenario 3: Rejected Transfer
```
Create transfer → Manager reviews → Determines unnecessary
→ Reject transfer → ❌ No inventory changes
```

## Database Status Constraint

After running the fix, your database allows these statuses:
```sql
CHECK (status IN (
  'pending',      -- Initial state
  'approved',     -- Approved, source deducted
  'in_transit',   -- Being transported  ← NEWLY ADDED
  'rejected',     -- Cancelled
  'completed'     -- Finished, destination increased
))
```

## Debugging Tips

### Check Transfer Status
```sql
SELECT id, status, quantity, created_at, completed_at
FROM transfers
WHERE organization_id = 'your-org-id'
ORDER BY created_at DESC
LIMIT 10;
```

### Check Inventory Changes
```sql
SELECT 
  i.product_id,
  p.name,
  b.name as branch_name,
  i.quantity,
  i.updated_at
FROM inventory i
JOIN products p ON i.product_id = p.id
JOIN branches b ON i.branch_id = b.id
WHERE i.organization_id = 'your-org-id'
ORDER BY i.updated_at DESC
LIMIT 20;
```

### Console Logs to Look For
```
🔄 Updating transfer status: ...
📤 [APPROVED] Deducting from source branch: ...
📥 [COMPLETED] Adding to destination branch: ...
✅ Branch stock adjusted successfully
```
