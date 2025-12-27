/**
 * Subscription Plan Limits
 * Handles plan-based feature limits and over-limit scenarios
 */

export type SubscriptionPlan = 'starter' | 'standard' | 'growth' | 'enterprise' | null;
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'canceled';

// Plan limits configuration - MATCHES SubscriptionPlans.tsx
export const PLAN_LIMITS = {
  trial: {
    // Trial gets FULL Enterprise access for 7 days
    branches: 999,
    warehouses: 999,
    users: 999,
    products: 999999,
    features: ['all'],
    label: 'Trial (Full Access)',
    price: 'Free for 7 days',
  },
  starter: {
    branches: 1,       // 1 branch access
    warehouses: 0,     // No warehouse access
    users: 2,          // 2 users only (owner + 1 staff)
    products: 500,     // Limited product catalog
    features: ['pos', 'inventory', 'reports', 'sales'],
    label: 'Starter Plan',
    price: '₦7,500/month',
  },
  standard: {
    branches: 2,       // 2 branch access
    warehouses: 1,     // 1 warehouse access
    users: 5,          // 5 users maximum
    products: 2000,    // Expanded product catalog
    features: ['pos', 'inventory', 'warehouses', 'transfers', 'reports', 'sales', 'staff'],
    label: 'Standard Plan',
    price: '₦20,000/month',
  },
  growth: {
    branches: 4,       // 4 branch access
    warehouses: 2,     // 2 warehouse access
    users: 8,          // 8 users maximum
    products: 5000,    // Large product catalog
    features: ['pos', 'inventory', 'warehouses', 'transfers', 'reports', 'sales', 'staff', 'analytics', 'expenses'],
    label: 'Growth Plan',
    price: '₦35,000/month',
  },
  enterprise: {
    branches: 999,     // Unlimited branches
    warehouses: 999,   // Unlimited warehouses
    users: 999,        // Unlimited users
    products: 999999,  // Unlimited products
    features: ['all'], // All features
    label: 'Enterprise Plan',
    price: '₦95,000/month',
  },
} as const;

// Get limits for current plan
export function getPlanLimits(plan: SubscriptionPlan, status: SubscriptionStatus) {
  // Trial users get full Enterprise access
  if (status === 'trial') {
    return PLAN_LIMITS.trial;
  }

  // Expired users get no access
  if (status === 'expired' || status === 'canceled') {
    return {
      branches: 0,
      warehouses: 0,
      users: 0,
      products: 0,
      features: [],
      label: 'Expired',
    };
  }

  // Active paid plans
  if (plan === 'starter') return PLAN_LIMITS.starter;
  if (plan === 'standard') return PLAN_LIMITS.standard;
  if (plan === 'growth') return PLAN_LIMITS.growth;
  if (plan === 'enterprise') return PLAN_LIMITS.enterprise;

  // Default to starter if no plan
  return PLAN_LIMITS.starter;
}

// Check if usage is within limits
export interface UsageStats {
  branches: number;
  warehouses: number;
  users: number;
  products: number;
}

export interface LimitStatus {
  isOverLimit: boolean;
  overages: {
    branches: number;
    warehouses: number;
    users: number;
    products: number;
  };
  warnings: string[];
  blockedActions: string[];
}

export function checkLimits(
  usage: UsageStats,
  plan: SubscriptionPlan,
  status: SubscriptionStatus
): LimitStatus {
  const limits = getPlanLimits(plan, status);
  
  const overages = {
    branches: Math.max(0, usage.branches - limits.branches),
    warehouses: Math.max(0, usage.warehouses - limits.warehouses),
    users: Math.max(0, usage.users - limits.users),
    products: Math.max(0, usage.products - limits.products),
  };

  const isOverLimit = Object.values(overages).some(overage => overage > 0);
  
  const warnings: string[] = [];
  const blockedActions: string[] = [];

  if (overages.branches > 0) {
    warnings.push(`You have ${overages.branches} extra branch(es). Upgrade to manage all branches.`);
    blockedActions.push('create_branch');
    blockedActions.push('edit_extra_branches');
  }

  if (overages.warehouses > 0) {
    warnings.push(`You have ${overages.warehouses} extra warehouse(s). Upgrade to manage all warehouses.`);
    blockedActions.push('create_warehouse');
    blockedActions.push('edit_extra_warehouses');
    blockedActions.push('create_transfer');
  }

  if (overages.users > 0) {
    warnings.push(`You have ${overages.users} extra user(s). Some users may be deactivated.`);
    blockedActions.push('create_user');
  }

  if (overages.products > 0) {
    warnings.push(`You have ${overages.products} extra product(s). Upgrade to add more products.`);
    blockedActions.push('create_product');
  }

  return {
    isOverLimit,
    overages,
    warnings,
    blockedActions,
  };
}

// Check if a specific action is allowed
export function canPerformAction(
  action: string,
  usage: UsageStats,
  plan: SubscriptionPlan,
  status: SubscriptionStatus
): { allowed: boolean; reason?: string } {
  const limitStatus = checkLimits(usage, plan, status);
  
  if (limitStatus.blockedActions.includes(action)) {
    if (action === 'create_branch') {
      return {
        allowed: false,
        reason: `Your ${getPlanLimits(plan, status).label} allows ${getPlanLimits(plan, status).branches} branch(es). Upgrade to add more.`,
      };
    }
    if (action === 'create_warehouse') {
      return {
        allowed: false,
        reason: `Your ${getPlanLimits(plan, status).label} ${getPlanLimits(plan, status).warehouses === 0 ? 'does not include warehouse management' : `allows ${getPlanLimits(plan, status).warehouses} warehouse(s)`}. Upgrade to add more.`,
      };
    }
    if (action === 'create_user') {
      return {
        allowed: false,
        reason: `Your ${getPlanLimits(plan, status).label} allows ${getPlanLimits(plan, status).users} user(s). Upgrade to add more.`,
      };
    }
    if (action === 'create_product') {
      return {
        allowed: false,
        reason: `Your ${getPlanLimits(plan, status).label} allows ${getPlanLimits(plan, status).products} product(s). Upgrade to add more.`,
      };
    }
    return {
      allowed: false,
      reason: 'This action is not available on your current plan.',
    };
  }

  return { allowed: true };
}

// Get entities that should be marked as "over limit"
export function getOverLimitEntities<T extends { id: string; createdAt: string }>(
  entities: T[],
  limit: number
): { active: T[]; overLimit: T[] } {
  if (entities.length <= limit) {
    return { active: entities, overLimit: [] };
  }

  // Sort by creation date (oldest first - they get to keep their earliest entities)
  const sorted = [...entities].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return {
    active: sorted.slice(0, limit),
    overLimit: sorted.slice(limit),
  };
}

// Helper to format limit warnings for UI
export function formatLimitWarning(
  overageType: 'branches' | 'warehouses' | 'users' | 'products',
  overage: number,
  plan: SubscriptionPlan
): string {
  const entityName = overageType.slice(0, -1); // Remove 's'
  
  return (
    `⚠️ Over Limit\n\n` +
    `You have ${overage} extra ${overageType}.\n` +
    `Your ${plan} plan limit has been reached.\n\n` +
    `What happens now:\n` +
    `• Extra ${overageType} are VIEW-ONLY\n` +
    `• You cannot create new ${overageType}\n` +
    `• Existing data is safe\n\n` +
    `Options:\n` +
    `1. Upgrade to a higher plan\n` +
    `2. Delete extra ${overageType}\n` +
    `3. Keep view-only access`
  );
}

// Downgrade strategy options
export type DowngradeStrategy = 'keep_oldest' | 'keep_newest' | 'manual_select' | 'mark_inactive';

export function applyDowngradeStrategy<T extends { id: string; createdAt: string }>(
  entities: T[],
  limit: number,
  strategy: DowngradeStrategy = 'keep_oldest'
): { keep: T[]; deactivate: T[] } {
  if (entities.length <= limit) {
    return { keep: entities, deactivate: [] };
  }

  let sorted: T[];

  switch (strategy) {
    case 'keep_oldest':
      // Keep the entities they created first (fair approach)
      sorted = [...entities].sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      break;

    case 'keep_newest':
      // Keep the most recent entities
      sorted = [...entities].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      break;

    case 'manual_select':
    case 'mark_inactive':
    default:
      // For manual, just sort by oldest (admin will choose)
      sorted = [...entities].sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      break;
  }

  return {
    keep: sorted.slice(0, limit),
    deactivate: sorted.slice(limit),
  };
}