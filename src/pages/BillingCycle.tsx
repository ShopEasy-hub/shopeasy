import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Check, Sparkles, Calendar, CreditCard, Loader2 } from 'lucide-react';
import { AppState, Page } from '../App';
import { 
  initializePayment, 
  generatePaymentReference, 
  calculateSubscriptionAmount,
  formatAmountToKobo,
  PaymentProvider,
  getPaymentEnvironment 
} from '../lib/payment';
import { getAccessToken } from '../lib/api';
import { PaymentModeBadge } from '../components/PaymentModeIndicator';

interface BillingCycleProps {
  appState: AppState;
  onNavigate: (page: Page) => void;
  selectedPlan: {
    id: string;
    name: string;
    monthlyPrice: number;
  };
}

export function BillingCycle({ appState, onNavigate, selectedPlan }: BillingCycleProps) {
  const [selectedCycle, setSelectedCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>('paystack');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthlyPrice = selectedPlan.monthlyPrice;
  const yearlyPrice = monthlyPrice * 12 * 0.85; // 15% discount
  const yearlyMonthlyEquivalent = yearlyPrice / 12;
  const savings = (monthlyPrice * 12) - yearlyPrice;

  async function handleConfirm() {
    if (!appState.userId || !appState.orgId) {
      setError('User session not found. Please log in again.');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('Not authenticated. Please log in again.');
      }

      // Get user data for email
      const userEmail = appState.user?.email || 'user@example.com';

      // Calculate total amount
      const totalAmount = calculateSubscriptionAmount(
        selectedPlan.monthlyPrice,
        selectedCycle
      );

      // Generate payment reference
      const reference = generatePaymentReference('SUB');

      // Get the current URL origin for callback
      const callbackUrl = `${window.location.origin}/?payment-callback=true`;

      console.log('Initializing payment:', {
        provider: selectedProvider,
        amount: totalAmount,
        email: userEmail,
        reference,
      });

      // Initialize payment
      const result = await initializePayment(
        selectedProvider,
        {
          email: userEmail,
          amount: formatAmountToKobo(totalAmount),
          currency: 'NGN',
          reference,
          metadata: {
            orgId: appState.orgId,
            userId: appState.userId,
            planId: selectedPlan.id,
            billingCycle: selectedCycle,
            planName: selectedPlan.name,
            callbackUrl, // Include callback URL in metadata
          },
        },
        accessToken
      );

      console.log('Payment initialization result:', result);

      if (!result.success) {
        throw new Error(result.error || 'Failed to initialize payment');
      }

      if (!result.authorizationUrl) {
        throw new Error('Payment gateway did not return an authorization URL. Please try again or contact support.');
      }

      // Store payment details in sessionStorage for verification
      sessionStorage.setItem('pendingPayment', JSON.stringify({
        reference,
        provider: selectedProvider,
        planId: selectedPlan.id,
        billingCycle: selectedCycle,
      }));

      console.log('Redirecting to:', result.authorizationUrl);
      console.log('💡 Test Mode Note: After clicking "I have paid" in PayStack test mode, you may need to manually close the popup and click "Verify Payment" below.');

      // Redirect to payment gateway
      window.location.href = result.authorizationUrl;
    } catch (err: any) {
      console.error('Payment initialization error:', err);
      const errorMessage = err.message || 'Failed to initialize payment. Please try again.';
      
      // Check for specific error types
      if (errorMessage.includes('not configured')) {
        setError('Payment gateway is not configured. Please try a different payment method or contact support.');
      } else if (errorMessage.includes('Unauthorized')) {
        setError('Your session has expired. Please log out and log in again.');
      } else {
        setError(errorMessage);
      }
      
      setProcessing(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onNavigate('subscribe')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1>Choose Billing Cycle</h1>
            <p className="text-sm text-muted-foreground">
              {selectedPlan.name} - Select how you'd like to pay
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-6 max-w-4xl mx-auto">
        {/* Savings Banner */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/30 rounded-full mb-4">
            <Sparkles className="w-5 h-5 text-amber-600" />
            <span className="font-medium text-amber-900 dark:text-amber-100">
              Save ₦{savings.toLocaleString()} per year with yearly billing!
            </span>
          </div>
          <p className="text-muted-foreground">
            Get 15% off when you pay annually
          </p>
        </div>

        {/* Billing Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Yearly Billing */}
          <Card
            className={`relative cursor-pointer transition-all ${
              selectedCycle === 'yearly'
                ? 'border-primary ring-2 ring-primary/20 shadow-lg'
                : 'hover:border-primary/50'
            }`}
            onClick={() => setSelectedCycle('yearly')}
          >
            {selectedCycle === 'yearly' && (
              <div className="absolute top-4 right-4">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              </div>
            )}

            <div className="absolute top-4 left-4">
              <Badge className="bg-amber-500 text-white">
                Save 15%
              </Badge>
            </div>

            <div className="p-8 pt-14">
              <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="w-7 h-7 text-primary" />
              </div>

              <h2 className="mb-2">Yearly Billing</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Pay once, save more
              </p>

              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl text-primary">
                    ₦{yearlyPrice.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground">/year</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  ₦{Math.round(yearlyMonthlyEquivalent).toLocaleString()}/month equivalent
                </p>
              </div>

              <div className="space-y-3 pt-6 border-t">
                <div className="flex items-center gap-3 text-sm">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>15% discount applied</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Save ₦{savings.toLocaleString()} annually</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Best value for money</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Lock in current pricing</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Monthly Billing */}
          <Card
            className={`relative cursor-pointer transition-all ${
              selectedCycle === 'monthly'
                ? 'border-primary ring-2 ring-primary/20 shadow-lg'
                : 'hover:border-primary/50'
            }`}
            onClick={() => setSelectedCycle('monthly')}
          >
            {selectedCycle === 'monthly' && (
              <div className="absolute top-4 right-4">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              </div>
            )}

            <div className="p-8 pt-14">
              <div className="w-14 h-14 bg-accent/50 rounded-lg flex items-center justify-center mb-4">
                <CreditCard className="w-7 h-7 text-foreground" />
              </div>

              <h2 className="mb-2">Monthly Billing</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Pay as you go
              </p>

              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl">
                    ₦{monthlyPrice.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Billed monthly
                </p>
              </div>

              <div className="space-y-3 pt-6 border-t">
                <div className="flex items-center gap-3 text-sm">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Lower upfront cost</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Cancel anytime</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Flexible commitment</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Good for testing</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Comparison Table */}
        <Card className="p-6 mb-8">
          <h3 className="mb-4">Quick Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2"></th>
                  <th className="text-center py-3 px-2">Monthly</th>
                  <th className="text-center py-3 px-2">Yearly</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-3 px-2">Monthly cost</td>
                  <td className="text-center py-3 px-2">₦{monthlyPrice.toLocaleString()}</td>
                  <td className="text-center py-3 px-2 text-primary">
                    ₦{Math.round(yearlyMonthlyEquivalent).toLocaleString()}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-2">Annual cost</td>
                  <td className="text-center py-3 px-2">₦{(monthlyPrice * 12).toLocaleString()}</td>
                  <td className="text-center py-3 px-2 text-primary">
                    ₦{yearlyPrice.toLocaleString()}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-2">Yearly savings</td>
                  <td className="text-center py-3 px-2">-</td>
                  <td className="text-center py-3 px-2 text-green-600">
                    ₦{savings.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-2">Discount</td>
                  <td className="text-center py-3 px-2">0%</td>
                  <td className="text-center py-3 px-2 text-amber-600">15%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Payment Gateway Selection */}
        <Card className="p-6 mb-8">
          <h3 className="mb-4">Select Payment Method</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              className={`p-4 cursor-pointer transition-all ${
                selectedProvider === 'paystack'
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => setSelectedProvider('paystack')}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedProvider === 'paystack' ? 'border-primary' : 'border-muted-foreground'
                }`}>
                  {selectedProvider === 'paystack' && (
                    <div className="w-3 h-3 rounded-full bg-primary" />
                  )}
                </div>
                <div>
                  <p className="font-medium">PayStack</p>
                  <p className="text-xs text-muted-foreground">
                    Card, Bank Transfer, USSD
                  </p>
                </div>
              </div>
            </Card>

            <Card
              className={`p-4 cursor-pointer transition-all ${
                selectedProvider === 'flutterwave'
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => setSelectedProvider('flutterwave')}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedProvider === 'flutterwave' ? 'border-primary' : 'border-muted-foreground'
                }`}>
                  {selectedProvider === 'flutterwave' && (
                    <div className="w-3 h-3 rounded-full bg-primary" />
                  )}
                </div>
                <div>
                  <p className="font-medium">Flutterwave</p>
                  <p className="text-xs text-muted-foreground">
                    Card, Bank Transfer, Mobile Money
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </Card>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Confirm Button */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => onNavigate('subscribe')}
            disabled={processing}
          >
            Back to Plans
          </Button>
          
          <Button
            size="lg"
            className="px-8"
            onClick={handleConfirm}
            disabled={processing}
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Continue to Payment
                {selectedCycle === 'yearly' && (
                  <Badge className="ml-2 bg-amber-500 hover:bg-amber-600">
                    Save 15%
                  </Badge>
                )}
              </>
            )}
          </Button>
        </div>

        {/* Test Mode Instructions */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
            💡 PayStack Test Mode Instructions
          </h3>
          <ol className="list-decimal list-inside space-y-1 text-xs text-blue-800 dark:text-blue-200">
            <li>Click "Continue to Payment" above</li>
            <li>In the PayStack popup, select your preferred test card</li>
            <li>Click "I have paid" button</li>
            <li>The popup will show a success message</li>
            <li>Close the popup window (or it may auto-redirect)</li>
            <li>{"You'll be redirected back to verify your payment"}</li>
          </ol>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-2 italic">
            {"If the popup doesn't auto-close, manually close it and refresh this page."}
          </p>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            You can change your billing cycle anytime from Settings. All plans include a 7-day money-back guarantee.
          </p>
          <p className="text-xs text-muted-foreground">
            Secure payment powered by {selectedProvider === 'paystack' ? 'PayStack' : 'Flutterwave'}
          </p>
        </div>
      </div>
    </div>
  );
}