import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { getPaymentEnvironment } from '../lib/payment';

/**
 * Visual indicator showing current payment environment
 * Helps prevent accidental live transactions during testing
 */
export function PaymentModeIndicator() {
  const environment = getPaymentEnvironment();

  if (environment === 'not-configured') {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
        <AlertCircle className="w-5 h-5" />
        <div className="text-sm">
          <div className="font-semibold">Payment Not Configured</div>
          <div className="text-xs opacity-90">Add Paystack keys to .env</div>
        </div>
      </div>
    );
  }

  if (environment === 'live') {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
        <CheckCircle className="w-5 h-5" />
        <div className="text-sm">
          <div className="font-semibold">🔴 LIVE MODE</div>
          <div className="text-xs opacity-90">Real payments active</div>
        </div>
      </div>
    );
  }

  // Test mode
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-yellow-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
      <AlertTriangle className="w-5 h-5" />
      <div className="text-sm">
        <div className="font-semibold">🟡 TEST MODE</div>
        <div className="text-xs opacity-90">Use test cards only</div>
      </div>
    </div>
  );
}

/**
 * Compact payment mode badge for headers
 */
export function PaymentModeBadge() {
  const environment = getPaymentEnvironment();

  const styles = {
    'live': 'bg-green-600 text-white',
    'test': 'bg-yellow-600 text-white',
    'not-configured': 'bg-destructive text-destructive-foreground',
  };

  const labels = {
    'live': '🔴 LIVE',
    'test': '🟡 TEST',
    'not-configured': '⚠️ NOT SETUP',
  };

  return (
    <span className={`${styles[environment]} px-2 py-1 rounded text-xs font-semibold`}>
      {labels[environment]}
    </span>
  );
}
