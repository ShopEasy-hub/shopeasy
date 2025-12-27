import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { CheckCircle2, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import { AppState, Page } from '../App';
import { verifyPayment, PaymentProvider } from '../lib/payment';
import { getAccessToken } from '../lib/api-supabase';

interface PaymentVerificationProps {
  appState: AppState;
  onNavigate: (page: Page) => void;
  updateAppState: (updates: Partial<AppState>) => void;
  reference: string;
  provider: PaymentProvider;
  planId: string;
  billingCycle: 'monthly' | 'yearly';
}

export function PaymentVerification({
  appState,
  onNavigate,
  updateAppState,
  reference,
  provider,
  planId,
  billingCycle,
}: PaymentVerificationProps) {
  const [verifying, setVerifying] = useState(true);
  const [status, setStatus] = useState<'success' | 'failed' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    verifyPaymentStatus();
  }, []);

  async function verifyPaymentStatus() {
    setVerifying(true);
    setError(null);

    try {
      const accessToken = getAccessToken();
      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      // Wait a bit for payment to process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const result = await verifyPayment(provider, reference, accessToken);

      if (result.success && result.status === 'success') {
        setStatus('success');
        
        // Update subscription status
        updateAppState({
          subscriptionStatus: 'active',
          subscriptionPlan: planId as any,
        });

        // In production, backend would handle this
        console.log('Payment verified successfully:', result);
      } else {
        setStatus('failed');
        setError(result.error || 'Payment verification failed');
      }
    } catch (err: any) {
      console.error('Payment verification error:', err);
      setStatus('failed');
      setError(err.message || 'An error occurred while verifying payment');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-8">
        {verifying && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <h2>Verifying Payment</h2>
            <p className="text-muted-foreground">
              Please wait while we verify your payment...
            </p>
            <p className="text-sm text-muted-foreground">
              Reference: {reference}
            </p>
          </div>
        )}

        {!verifying && status === 'success' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2>Payment Successful!</h2>
            <p className="text-muted-foreground">
              Your subscription has been activated successfully.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reference:</span>
                <span className="font-medium">{reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan:</span>
                <span className="font-medium capitalize">{planId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Billing:</span>
                <span className="font-medium capitalize">{billingCycle}</span>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => onNavigate('dashboard')}
            >
              Go to Dashboard
            </Button>
          </div>
        )}

        {!verifying && status === 'failed' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2>Payment Failed</h2>
            <p className="text-muted-foreground">
              {error || 'We could not verify your payment. Please try again.'}
            </p>
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-left">
              <p className="text-muted-foreground mb-2">If you believe this is an error:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Check your email for payment confirmation</li>
                <li>Contact your bank to verify the transaction</li>
                <li>Contact our support team with reference: {reference}</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onNavigate('subscribe')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Plans
              </Button>
              <Button
                className="flex-1"
                onClick={verifyPaymentStatus}
              >
                Retry Verification
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
