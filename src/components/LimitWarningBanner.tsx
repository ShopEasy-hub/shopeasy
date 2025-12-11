import { AlertTriangle, ArrowUpCircle, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useState } from 'react';

interface LimitWarningBannerProps {
  warnings: string[];
  onUpgrade: () => void;
  onDismiss?: () => void;
  showUpgradeButton?: boolean;
}

export function LimitWarningBanner({ 
  warnings, 
  onUpgrade, 
  onDismiss,
  showUpgradeButton = true 
}: LimitWarningBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (warnings.length === 0 || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <Card className="border-amber-500/50 bg-amber-500/10 p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
            Plan Limit Reached
          </h3>
          
          <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-200">
            {warnings.map((warning, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-500 flex-shrink-0" />
                <span>{warning}</span>
              </li>
            ))}
          </ul>

          <div className="mt-3 p-3 bg-background/50 rounded-lg border border-amber-500/20">
            <p className="text-sm text-muted-foreground mb-2">
              <strong>What this means:</strong>
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Extra items are <strong>view-only</strong> (cannot be edited)</li>
              <li>• You cannot create new items beyond your limit</li>
              <li>• All your existing data is safe and accessible</li>
              <li>• Upgrade anytime to unlock full access</li>
            </ul>
          </div>
        </div>

        <div className="flex items-start gap-2 flex-shrink-0">
          {showUpgradeButton && (
            <Button 
              size="sm" 
              onClick={onUpgrade}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <ArrowUpCircle className="w-4 h-4 mr-2" />
              Upgrade Plan
            </Button>
          )}
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
