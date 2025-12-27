import { useEffect, useState } from 'react';
import { AppState, Page } from '../App';
import { PaymentVerification } from './PaymentVerification';
import { Card } from '../components/ui/card';
import { Loader2 } from 'lucide-react';

interface PaymentCallbackProps {
  appState: AppState;
  onNavigate: (page: Page) => void;
  updateAppState: (updates: Partial<AppState>) => void;
}

export function PaymentCallback({
  appState,
  onNavigate,
  updateAppState,
}: PaymentCallbackProps) {
  const [loading, setLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  useEffect(() => {
    // Get payment details from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const reference = urlParams.get('reference') || urlParams.get('trxref') || urlParams.get('tx_ref');
    const status = urlParams.get('status');
    const transactionId = urlParams.get('transaction_id');

    console.log('🔄 Payment callback received:', {
      reference,
      status,
      transactionId,
      allParams: Object.fromEntries(urlParams.entries())
    });

    // Get pending payment from sessionStorage
    const pendingPaymentStr = sessionStorage.getItem('pendingPayment');
    console.log('📦 Pending payment from storage:', pendingPaymentStr);
    
    if (!reference && !transactionId) {
      console.warn('⚠️ No payment reference found in URL');
      // No payment reference found, redirect to dashboard
      setTimeout(() => {
        onNavigate('dashboard');
      }, 2000);
      return;
    }

    if (pendingPaymentStr) {
      const pendingPayment = JSON.parse(pendingPaymentStr);
      setPaymentDetails({
        reference: reference || transactionId || pendingPayment.reference,
        provider: pendingPayment.provider,
        planId: pendingPayment.planId,
        billingCycle: pendingPayment.billingCycle,
      });
      setLoading(false);
      
      // Clear sessionStorage
      sessionStorage.removeItem('pendingPayment');
    } else {
      // If no pending payment in storage, try to extract from URL
      setPaymentDetails({
        reference: reference || transactionId,
        provider: status ? 'flutterwave' : 'paystack', // Flutterwave includes status in callback
        planId: 'unknown',
        billingCycle: 'monthly',
      });
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <h2>Processing Payment</h2>
          <p className="text-muted-foreground">
            Please wait while we process your payment...
          </p>
        </Card>
      </div>
    );
  }

  if (!paymentDetails) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <h2>Payment Callback</h2>
          <p className="text-muted-foreground">
            No payment information found. Redirecting to dashboard...
          </p>
        </Card>
      </div>
    );
  }

  return (
    <PaymentVerification
      appState={appState}
      onNavigate={onNavigate}
      updateAppState={updateAppState}
      reference={paymentDetails.reference}
      provider={paymentDetails.provider}
      planId={paymentDetails.planId}
      billingCycle={paymentDetails.billingCycle}
    />
  );
}
