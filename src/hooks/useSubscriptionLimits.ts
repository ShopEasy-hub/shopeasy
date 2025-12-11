import { useState, useEffect } from 'react';
import { 
  getPlanLimits, 
  checkLimits, 
  canPerformAction,
  UsageStats,
  LimitStatus,
  SubscriptionPlan,
  SubscriptionStatus
} from '../lib/subscription-limits';
import { getBranches, getUsers, getWarehouses } from '../lib/api';
import { getProducts } from '../lib/api-supabase';

export function useSubscriptionLimits(
  orgId: string | null,
  plan: SubscriptionPlan,
  status: SubscriptionStatus
) {
  const [usage, setUsage] = useState<UsageStats>({
    branches: 0,
    warehouses: 0,
    users: 0,
    products: 0,
  });
  
  const [loading, setLoading] = useState(true);
  const [limitStatus, setLimitStatus] = useState<LimitStatus>({
    isOverLimit: false,
    overages: { branches: 0, warehouses: 0, users: 0, products: 0 },
    warnings: [],
    blockedActions: [],
  });

  const limits = getPlanLimits(plan, status);

  // Load usage stats
  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    loadUsage();
  }, [orgId]);

  // Recalculate limits when usage or plan changes
  useEffect(() => {
    const newLimitStatus = checkLimits(usage, plan, status);
    setLimitStatus(newLimitStatus);
  }, [usage, plan, status]);

  async function loadUsage() {
    if (!orgId) return;

    try {
      setLoading(true);

      // Load all entities in parallel
      const [branchesData, usersData, warehousesData, productsData] = await Promise.all([
        getBranches(orgId).catch(() => ({ branches: [] })),
        getUsers(orgId).catch(() => ({ users: [] })),
        getWarehouses(orgId).catch(() => ({ warehouses: [] })),
        getProducts(orgId).catch(() => ({ products: [] })),
      ]);

      setUsage({
        branches: branchesData.branches?.length || 0,
        warehouses: warehousesData.warehouses?.length || 0,
        users: usersData.users?.length || 0,
        products: productsData.products?.length || 0,
      });
    } catch (error) {
      console.error('Error loading usage stats:', error);
    } finally {
      setLoading(false);
    }
  }

  // Refresh usage stats
  function refreshUsage() {
    loadUsage();
  }

  // Check if a specific action is allowed
  function checkAction(action: string) {
    return canPerformAction(action, usage, plan, status);
  }

  // Check if at limit for a specific resource
  function isAtLimit(resource: 'branches' | 'warehouses' | 'users' | 'products'): boolean {
    return usage[resource] >= limits[resource];
  }

  // Get remaining quota for a resource
  function getRemainingQuota(resource: 'branches' | 'warehouses' | 'users' | 'products'): number {
    return Math.max(0, limits[resource] - usage[resource]);
  }

  // Get usage percentage for a resource
  function getUsagePercentage(resource: 'branches' | 'warehouses' | 'users' | 'products'): number {
    if (limits[resource] === 999 || limits[resource] === 999999) return 0; // Unlimited
    return Math.min(100, (usage[resource] / limits[resource]) * 100);
  }

  return {
    usage,
    limits,
    limitStatus,
    loading,
    refreshUsage,
    checkAction,
    isAtLimit,
    getRemainingQuota,
    getUsagePercentage,
  };
}
