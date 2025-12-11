// Role-based permission system for ShopEasy POS

export type UserRole = 'owner' | 'admin' | 'manager' | 'warehouse_manager' | 'auditor' | 'cashier';
export type SubscriptionPlan = 'starter' | 'standard' | 'growth' | 'enterprise';

export interface Permission {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

// Define which pages each role can access
export const PAGE_ACCESS: Record<UserRole, string[]> = {
  owner: [
    'dashboard',
    'pos',
    'returns',
    'return-history',
    'inventory',
    'short-dated',
    'warehouses',
    'suppliers',
    'transfers',
    'expenses',
    'reports',
    'users',
    'settings',
    'database-status',
    'stock-diagnostic',
    'admin',
    'product-history',
  ],
  admin: [
    'dashboard',
    'pos',
    'returns',
    'return-history',
    'inventory',
    'short-dated',
    'warehouses',
    'suppliers',
    'transfers',
    'expenses',
    'reports',
    'users',
    'settings',
    'database-status',
    'stock-diagnostic',
    'admin',
    'product-history',
  ],
  manager: [
    'dashboard',
    'pos',
    'returns',
    'return-history',
    'inventory',
    'short-dated',
    'transfers',
    'expenses',
    'reports',
    'product-history',
  ],
  warehouse_manager: [
    'dashboard',
    'warehouses',
    'suppliers',
  ],
  auditor: [
    'dashboard',
    'reports',
    'product-history',
    'inventory',
  ],
  cashier: [
    'dashboard',
    'pos',
    'returns',
    'return-history',
  ],
};

// Check if a user can access a specific page
export function canAccessPage(userRole: string | null, pageId: string): boolean {
  if (!userRole) return false;
  
  const role = userRole.toLowerCase() as UserRole;
  const allowedPages = PAGE_ACCESS[role] || [];
  
  return allowedPages.includes(pageId);
}

// Get permissions for specific features within a page
export function getFeaturePermissions(userRole: string | null, feature: string): Permission {
  if (!userRole) {
    return { canView: false, canCreate: false, canEdit: false, canDelete: false };
  }

  const role = userRole.toLowerCase() as UserRole;

  const noPermission: Permission = { canView: false, canCreate: false, canEdit: false, canDelete: false };
  const viewOnly: Permission = { canView: true, canCreate: false, canEdit: false, canDelete: false };
  const fullAccess: Permission = { canView: true, canCreate: true, canEdit: true, canDelete: true };
  const createEdit: Permission = { canView: true, canCreate: true, canEdit: true, canDelete: false };

  const permissions: Record<string, Record<UserRole, Permission>> = {
    inventory: {
      owner: fullAccess,
      admin: fullAccess,
      manager: fullAccess,
      warehouse_manager: noPermission,
      auditor: viewOnly,
      cashier: noPermission,
    },
    product_delete: {
      owner: fullAccess,
      admin: fullAccess,
      manager: fullAccess,
      warehouse_manager: noPermission,
      auditor: noPermission,
      cashier: noPermission,
    },
    transfers: {
      owner: fullAccess,
      admin: fullAccess,
      manager: createEdit,
      warehouse_manager: noPermission,
      auditor: noPermission,
      cashier: noPermission,
    },
    suppliers: {
      owner: fullAccess,
      admin: fullAccess,
      manager: noPermission,
      warehouse_manager: fullAccess,
      auditor: noPermission,
      cashier: noPermission,
    },
    warehouses: {
      owner: fullAccess,
      admin: fullAccess,
      manager: noPermission,
      warehouse_manager: fullAccess,
      auditor: noPermission,
      cashier: noPermission,
    },
    reports: {
      owner: fullAccess,
      admin: fullAccess,
      manager: viewOnly,
      warehouse_manager: noPermission,
      auditor: viewOnly,
      cashier: noPermission,
    },
    users: {
      owner: fullAccess,
      admin: fullAccess,
      manager: noPermission,
      warehouse_manager: noPermission,
      auditor: noPermission,
      cashier: noPermission,
    },
    settings: {
      owner: fullAccess,
      admin: fullAccess,
      manager: noPermission,
      warehouse_manager: noPermission,
      auditor: noPermission,
      cashier: viewOnly,
    },
    expenses: {
      owner: fullAccess,
      admin: fullAccess,
      manager: fullAccess,
      warehouse_manager: noPermission,
      auditor: noPermission,
      cashier: noPermission,
    },
    product_history: {
      owner: fullAccess,
      admin: fullAccess,
      manager: viewOnly,
      warehouse_manager: noPermission,
      auditor: viewOnly,
      cashier: noPermission,
    },
    sales: {
      owner: fullAccess,
      admin: fullAccess,
      manager: fullAccess,
      warehouse_manager: noPermission,
      auditor: viewOnly,
      cashier: createEdit,
    },
    returns: {
      owner: fullAccess,
      admin: fullAccess,
      manager: fullAccess,
      warehouse_manager: noPermission,
      auditor: noPermission,
      cashier: createEdit,
    },
    admin_panel: {
      owner: fullAccess,
      admin: fullAccess,
      manager: noPermission,
      warehouse_manager: noPermission,
      auditor: noPermission,
      cashier: noPermission,
    },
  };

  return permissions[feature]?.[role] || noPermission;
}

export function canViewFeature(userRole: string | null, feature: string): boolean {
  return getFeaturePermissions(userRole, feature).canView;
}

export function canCreateFeature(userRole: string | null, feature: string): boolean {
  return getFeaturePermissions(userRole, feature).canCreate;
}

export function canEditFeature(userRole: string | null, feature: string): boolean {
  return getFeaturePermissions(userRole, feature).canEdit;
}

export function canDeleteFeature(userRole: string | null, feature: string): boolean {
  return getFeaturePermissions(userRole, feature).canDelete;
}

export function isAdminOrOwner(userRole: string | null): boolean {
  if (!userRole) return false;
  const role = userRole.toLowerCase();
  return role === 'owner' || role === 'admin';
}

export function canSwitchContext(userRole: string | null): boolean {
  if (!userRole) return false;
  const role = userRole.toLowerCase();
  return role === 'owner' || role === 'admin';
}

export function getAccessiblePages(userRole: string | null): string[] {
  if (!userRole) return [];
  
  const role = userRole.toLowerCase() as UserRole;
  return PAGE_ACCESS[role] || [];
}

// ============================================
// SUBSCRIPTION PLAN-BASED ACCESS CONTROL
// ============================================

// Pages that are restricted based on subscription plan
const PLAN_RESTRICTED_PAGES = ['warehouses', 'suppliers'];

// Define which plans can access which pages
const PLAN_PAGE_ACCESS: Record<SubscriptionPlan, string[]> = {
  starter: [], // Starter plan has NO access to warehouses/suppliers
  standard: ['warehouses', 'suppliers'],
  growth: ['warehouses', 'suppliers'],
  enterprise: ['warehouses', 'suppliers'],
};

// Warehouse limits by plan
export const WAREHOUSE_LIMITS: Record<SubscriptionPlan, number> = {
  starter: 0, // No warehouse access
  standard: 1,
  growth: 2,
  enterprise: 999, // Unlimited
};

// Branch limits by plan
export const BRANCH_LIMITS: Record<SubscriptionPlan, number> = {
  starter: 1,
  standard: 2,
  growth: 4,
  enterprise: 999, // Unlimited
};

// Check if a subscription plan allows access to a specific page
export function canAccessPageByPlan(subscriptionPlan: string | null, pageId: string, subscriptionStatus?: string | null): boolean {
  // 🎁 TRIAL USERS GET FULL ACCESS - Check this FIRST before anything else
  if (subscriptionStatus === 'trial') {
    return true; // Trial users bypass ALL restrictions
  }
  
  // 🚫 EXPIRED SUBSCRIPTION - BLOCK ALL ACCESS
  // After trial or paid subscription expires, user must renew to access ANYTHING
  if (subscriptionStatus === 'expired') {
    return false; // Block all pages until they pay
  }
  
  // Now check if plan exists (for paid subscriptions)
  if (!subscriptionPlan) return false;
  
  // If page is not plan-restricted, allow access
  if (!PLAN_RESTRICTED_PAGES.includes(pageId)) {
    return true;
  }
  
  const plan = subscriptionPlan.toLowerCase() as SubscriptionPlan;
  const allowedPages = PLAN_PAGE_ACCESS[plan] || [];
  
  return allowedPages.includes(pageId);
}

// Combined check: both role and plan must allow access
export function canAccessPageFull(
  userRole: string | null, 
  pageId: string, 
  subscriptionPlan: string | null,
  subscriptionStatus?: string | null
): boolean {
  // First check role-based access
  const hasRoleAccess = canAccessPage(userRole, pageId);
  if (!hasRoleAccess) return false;
  
  // Then check plan-based access (with trial bypass)
  const hasPlanAccess = canAccessPageByPlan(subscriptionPlan, pageId, subscriptionStatus);
  return hasPlanAccess;
}

// Check if user can add more warehouses based on plan
export function canAddWarehouse(
  subscriptionPlan: string | null,
  currentWarehouseCount: number
): boolean {
  if (!subscriptionPlan) return false;
  
  const plan = subscriptionPlan.toLowerCase() as SubscriptionPlan;
  const limit = WAREHOUSE_LIMITS[plan] || 0;
  
  return currentWarehouseCount < limit;
}

// Check if user can add more branches based on plan
export function canAddBranch(
  subscriptionPlan: string | null,
  currentBranchCount: number
): boolean {
  if (!subscriptionPlan) return false;
  
  const plan = subscriptionPlan.toLowerCase() as SubscriptionPlan;
  const limit = BRANCH_LIMITS[plan] || 1;
  
  return currentBranchCount < limit;
}

// Get warehouse limit message
export function getWarehouseLimitMessage(
  subscriptionPlan: string | null,
  currentCount: number
): string {
  if (!subscriptionPlan) return '';
  
  const plan = subscriptionPlan.toLowerCase() as SubscriptionPlan;
  const limit = WAREHOUSE_LIMITS[plan] || 0;
  
  if (limit === 0) {
    return `Warehouse access is not available on the ${plan} plan. Upgrade to Standard or higher to access warehouses.`;
  }
  
  return `Your ${plan} plan allows ${limit === 999 ? 'unlimited' : limit} warehouse${limit !== 1 ? 's' : ''}. You currently have ${currentCount}.`;
}

// Get branch limit message
export function getBranchLimitMessage(
  subscriptionPlan: string | null,
  currentCount: number
): string {
  if (!subscriptionPlan) return '';
  
  const plan = subscriptionPlan.toLowerCase() as SubscriptionPlan;
  const limit = BRANCH_LIMITS[plan] || 1;
  
  return `Your ${plan} plan allows ${limit === 999 ? 'unlimited' : limit} branch${limit !== 1 ? 'es' : ''}. You currently have ${currentCount}.`;
}