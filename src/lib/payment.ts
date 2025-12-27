/**
 * Payment Integration Service
 * Supports PayStack and Flutterwave payment gateways
 * Production-ready with live/test mode detection
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';

// Use the dedicated payments edge function (no KV store dependencies)
const API_BASE = `https://${projectId}.supabase.co/functions/v1/payments-simple`;

export type PaymentProvider = 'paystack' | 'flutterwave';

/**
 * Check if system is in live payment mode
 */
export function isLivePaymentMode(): boolean {
  const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';
  return publicKey.startsWith('pk_live_');
}

/**
 * Get payment environment
 */
export function getPaymentEnvironment(): 'live' | 'test' | 'not-configured' {
  const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';
  
  if (publicKey.startsWith('pk_live_')) return 'live';
  if (publicKey.startsWith('pk_test_')) return 'test';
  return 'not-configured';
}

/**
 * Get Paystack public key (test or live)
 */
export function getPaystackPublicKey(): string {
  const key = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
  
  if (!key) {
    console.warn('⚠️ PAYSTACK_PUBLIC_KEY not configured - using fallback test key');
    return 'pk_test_fallback';
  }
  
  const env = getPaymentEnvironment();
  console.log(`💳 Payment Environment: ${env.toUpperCase()}`);
  
  if (env === 'live') {
    console.log('🔴 LIVE MODE - Real payments will be processed!');
  } else if (env === 'test') {
    console.log('🟡 TEST MODE - Using test cards only');
  }
  
  return key;
}

export interface PaymentRequest {
  email: string;
  amount: number;
  currency: string;
  reference: string;
  metadata: {
    orgId: string;
    userId: string;
    planId: string;
    billingCycle: 'monthly' | 'yearly';
    planName: string;
  };
}

export interface PaymentInitResponse {
  success: boolean;
  authorizationUrl?: string;
  reference?: string;
  error?: string;
}

export interface PaymentVerifyResponse {
  success: boolean;
  status?: 'success' | 'failed' | 'pending';
  amount?: number;
  reference?: string;
  paidAt?: string;
  error?: string;
}

/**
 * Generate a unique payment reference
 */
export function generatePaymentReference(prefix: string = 'SUB'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9).toUpperCase();
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Initialize payment with PayStack
 */
export async function initializePaystackPayment(
  request: PaymentRequest,
  accessToken: string
): Promise<PaymentInitResponse> {
  try {
    const response = await fetch(`${API_BASE}/paystack/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to initialize PayStack payment');
    }

    return data;
  } catch (error: any) {
    console.error('PayStack initialization error:', error);
    return {
      success: false,
      error: error.message || 'Failed to initialize payment',
    };
  }
}

/**
 * Initialize payment with Flutterwave
 */
export async function initializeFlutterwavePayment(
  request: PaymentRequest,
  accessToken: string
): Promise<PaymentInitResponse> {
  try {
    console.log('🔵 Flutterwave: Initializing payment request', {
      email: request.email,
      amount: request.amount,
      currency: request.currency,
      reference: request.reference,
    });

    const response = await fetch(`${API_BASE}/flutterwave/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(request),
    });

    console.log('🔵 Flutterwave: Response status', response.status);

    const data = await response.json();
    console.log('🔵 Flutterwave: Response data', data);

    if (!response.ok) {
      const errorMsg = data.error || data.message || 'Failed to initialize Flutterwave payment';
      console.error('🔴 Flutterwave: Error response', errorMsg);
      throw new Error(errorMsg);
    }

    if (!data.success) {
      console.error('🔴 Flutterwave: Unsuccessful response', data);
      throw new Error(data.error || 'Payment initialization was not successful');
    }

    console.log('✅ Flutterwave: Payment initialized successfully');
    return data;
  } catch (error: any) {
    console.error('🔴 Flutterwave initialization error:', error);
    return {
      success: false,
      error: error.message || 'Failed to initialize payment',
    };
  }
}

/**
 * Verify PayStack payment
 */
export async function verifyPaystackPayment(
  reference: string,
  accessToken: string
): Promise<PaymentVerifyResponse> {
  try {
    const response = await fetch(
      `${API_BASE}/paystack/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to verify payment');
    }

    return data;
  } catch (error: any) {
    console.error('PayStack verification error:', error);
    return {
      success: false,
      error: error.message || 'Failed to verify payment',
    };
  }
}

/**
 * Verify Flutterwave payment
 */
export async function verifyFlutterwavePayment(
  transactionId: string,
  accessToken: string
): Promise<PaymentVerifyResponse> {
  try {
    const response = await fetch(
      `${API_BASE}/flutterwave/verify/${transactionId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to verify payment');
    }

    return data;
  } catch (error: any) {
    console.error('Flutterwave verification error:', error);
    return {
      success: false,
      error: error.message || 'Failed to verify payment',
    };
  }
}

/**
 * Initialize payment based on selected provider
 */
export async function initializePayment(
  provider: PaymentProvider,
  request: PaymentRequest,
  accessToken: string
): Promise<PaymentInitResponse> {
  if (provider === 'paystack') {
    return initializePaystackPayment(request, accessToken);
  } else {
    return initializeFlutterwavePayment(request, accessToken);
  }
}

/**
 * Verify payment based on provider
 */
export async function verifyPayment(
  provider: PaymentProvider,
  reference: string,
  accessToken: string
): Promise<PaymentVerifyResponse> {
  if (provider === 'paystack') {
    return verifyPaystackPayment(reference, accessToken);
  } else {
    return verifyFlutterwavePayment(reference, accessToken);
  }
}

/**
 * Calculate subscription amount based on plan and billing cycle
 */
export function calculateSubscriptionAmount(
  monthlyPrice: number,
  billingCycle: 'monthly' | 'yearly'
): number {
  if (billingCycle === 'yearly') {
    // 15% discount for yearly billing
    return Math.round(monthlyPrice * 12 * 0.85);
  }
  return monthlyPrice;
}

/**
 * Format amount to kobo/smallest currency unit (required by payment gateways)
 */
export function formatAmountToKobo(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Format amount from kobo to naira
 */
export function formatAmountFromKobo(amount: number): number {
  return amount / 100;
}