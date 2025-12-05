import { Button } from './ui/button';
import { AlertTriangle } from 'lucide-react';

interface SubscriptionExpiredOverlayProps {
  onSubscribeClick: () => void;
  onContactSupport: () => void;
}

export function SubscriptionExpiredOverlay({ 
  onSubscribeClick, 
  onContactSupport 
}: SubscriptionExpiredOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl">Subscription Required</h1>
          <p className="text-muted-foreground">
            Your trial has ended. Subscribe now to continue using ShopEasy and access all your data.
          </p>
        </div>

        <div className="space-y-3">
          <Button 
            size="lg" 
            className="w-full h-12"
            onClick={onSubscribeClick}
          >
            Subscribe Now
          </Button>
          
          <button
            onClick={onContactSupport}
            className="text-sm text-primary hover:underline"
          >
            Contact Support
          </button>
        </div>

        <div className="pt-6 border-t">
          <p className="text-xs text-muted-foreground">
            Need help? Our support team is here to assist you with renewals and billing questions.
          </p>
        </div>
      </div>
    </div>
  );
}