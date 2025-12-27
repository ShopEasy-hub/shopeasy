/**
 * =====================================================
 * SHOPEASY SUBSCRIPTION PRICING CONFIGURATION
 * =====================================================
 * 
 * PRODUCTION PRICING - December 2024
 * All prices in Nigerian Naira (NGN)
 * 
 * Last Updated: December 15, 2024
 * =====================================================
 */

export interface SubscriptionPlan {
  id: 'starter' | 'standard' | 'growth' | 'enterprise';
  name: string;
  monthlyPrice: number;
  displayPrice: string; // Formatted for display
  yearlyPrice: number; // 15% discount on annual billing
  description: string;
  color: string;
  popular: boolean;
  features: string[];
  limits: {
    users: number | 'unlimited';
    branches: number | 'unlimited';
    warehouses: number | 'unlimited';
    products: number | 'unlimited';
  };
}

/**
 * SUBSCRIPTION PLAN PRICING
 * These are the LIVE production prices
 */
export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  starter: {
    id: 'starter',
    name: 'Starter Plan',
    monthlyPrice: 7500,
    displayPrice: '₦7,500',
    yearlyPrice: Math.round(7500 * 12 * 0.85), // ₦76,500 (15% off)
    description: 'For individual stores or small outlets.',
    color: 'bg-blue-600',
    popular: false,
    features: [
      'Up to 2 users',
      '1 branch',
      'Basic inventory management',
      'POS system',
      'Sales reporting',
      'Email support',
    ],
    limits: {
      users: 2,
      branches: 1,
      warehouses: 0,
      products: 500,
    },
  },
  
  standard: {
    id: 'standard',
    name: 'Standard Plan',
    monthlyPrice: 50000,
    displayPrice: '₦50,000',
    yearlyPrice: Math.round(50000 * 12 * 0.85), // ₦510,000 (15% off)
    description: 'For growing businesses with multiple outlets.',
    color: 'bg-green-600',
    popular: true,
    features: [
      'Up to 5 users',
      'Up to 2 branches',
      'Inventory management',
      'Inter-branch transfers',
      'Advanced reporting',
      'Priority email support',
      'Staff management',
    ],
    limits: {
      users: 5,
      branches: 2,
      warehouses: 1,
      products: 2000,
    },
  },
  
  growth: {
    id: 'growth',
    name: 'Growth / Pro Plan',
    monthlyPrice: 95000,
    displayPrice: '₦95,000',
    yearlyPrice: Math.round(95000 * 12 * 0.85), // ₦969,000 (15% off)
    description: 'For scaling businesses managing stock, warehouses, and branches.',
    color: 'bg-orange-600',
    popular: false,
    features: [
      'Up to 8 users',
      'Up to 4 branches',
      'Multiple warehouses',
      'Advanced inventory tracking',
      'Audit logs & compliance',
      'API access',
      'Priority support',
      'Dedicated account manager',
    ],
    limits: {
      users: 8,
      branches: 4,
      warehouses: 4,
      products: 10000,
    },
  },
  
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise Plan',
    monthlyPrice: 250000,
    displayPrice: '₦250,000',
    yearlyPrice: Math.round(250000 * 12 * 0.85), // ₦2,550,000 (15% off)
    description: 'For large-scale enterprises requiring full customization.',
    color: 'bg-purple-600',
    popular: false,
    features: [
      'Unlimited users',
      'Unlimited branches',
      'Unlimited warehouses',
      'White-label customization',
      'Custom integrations',
      'Advanced analytics & BI',
      '24/7 premium support',
      'Dedicated infrastructure',
      'SLA guarantees',
      'Custom training sessions',
    ],
    limits: {
      users: 'unlimited',
      branches: 'unlimited',
      warehouses: 'unlimited',
      products: 'unlimited',
    },
  },
};

/**
 * Get plan by ID
 */
export function getPlanById(planId: string): SubscriptionPlan | null {
  return SUBSCRIPTION_PLANS[planId] || null;
}

/**
 * Get all plans as array
 */
export function getAllPlans(): SubscriptionPlan[] {
  return Object.values(SUBSCRIPTION_PLANS);
}

/**
 * Calculate total amount based on billing cycle
 */
export function calculateSubscriptionAmount(
  monthlyPrice: number,
  billingCycle: 'monthly' | 'yearly'
): number {
  if (billingCycle === 'monthly') {
    return monthlyPrice;
  }
  // Yearly: 15% discount
  return Math.round(monthlyPrice * 12 * 0.85);
}

/**
 * Get yearly savings
 */
export function getYearlySavings(monthlyPrice: number): number {
  const monthlyTotal = monthlyPrice * 12;
  const yearlyTotal = calculateSubscriptionAmount(monthlyPrice, 'yearly');
  return monthlyTotal - yearlyTotal;
}

/**
 * Format price for display
 */
export function formatPrice(amount: number): string {
  return `₦${amount.toLocaleString()}`;
}

/**
 * Get plan limits for validation
 */
export function getPlanLimits(planId: string | null) {
  const plan = getPlanById(planId || 'starter');
  return plan?.limits || SUBSCRIPTION_PLANS.starter.limits;
}

/**
 * Check if user can add more of a resource
 */
export function canAddResource(
  planId: string | null,
  resourceType: 'users' | 'branches' | 'warehouses' | 'products',
  currentCount: number
): boolean {
  const limits = getPlanLimits(planId);
  const limit = limits[resourceType];
  
  if (limit === 'unlimited') return true;
  return currentCount < limit;
}

/**
 * Get upgrade recommendation
 */
export function getUpgradeRecommendation(
  currentPlan: string | null,
  resourceType: 'users' | 'branches' | 'warehouses' | 'products'
): string | null {
  const plans = ['starter', 'standard', 'growth', 'enterprise'];
  const currentIndex = plans.indexOf(currentPlan || 'starter');
  
  // Already on highest plan
  if (currentIndex === plans.length - 1) return null;
  
  // Recommend next plan
  return plans[currentIndex + 1];
}

/**
 * PAYSTACK CONFIGURATION
 */
export const PAYSTACK_CONFIG = {
  // Public key - safe to use in frontend
  publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_default',
  
  // Currency
  currency: 'NGN',
  
  // Supported channels
  channels: ['card', 'bank', 'ussd', 'bank_transfer'],
  
  // Payment metadata
  metadata: {
    custom_fields: [
      {
        display_name: 'Plan',
        variable_name: 'plan_id',
        value: '',
      },
      {
        display_name: 'Billing Cycle',
        variable_name: 'billing_cycle',
        value: '',
      },
    ],
  },
};

/**
 * Check if using live or test API keys
 */
export function isLiveMode(): boolean {
  const publicKey = PAYSTACK_CONFIG.publicKey;
  return publicKey.startsWith('pk_live_');
}

/**
 * Get payment environment
 */
export function getPaymentEnvironment(): 'live' | 'test' | 'not-configured' {
  const publicKey = PAYSTACK_CONFIG.publicKey;
  
  if (publicKey.startsWith('pk_live_')) return 'live';
  if (publicKey.startsWith('pk_test_')) return 'test';
  return 'not-configured';
}
