import { AlertTriangle, RefreshCw, HelpCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface NetworkErrorFallbackProps {
  error?: string;
  onRetry?: () => void;
  showDiagnostics?: boolean;
}

export function NetworkErrorFallback({ 
  error = 'Network connection failed', 
  onRetry,
  showDiagnostics = true 
}: NetworkErrorFallbackProps) {
  
  const openDiagnostics = () => {
    window.location.href = window.location.pathname + '?diagnostic-network=true';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-2xl w-full p-6 sm:p-8">
        <div className="text-center">
          {/* Error Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-destructive/10 rounded-full mb-6">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>

          {/* Title */}
          <h1 className="mb-3 text-destructive">Connection Error</h1>
          
          {/* Error Message */}
          <p className="text-muted-foreground mb-6">
            {error}
          </p>

          {/* Common Causes */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
            <h3 className="mb-3">Common causes:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-muted-foreground">•</span>
                <span>No internet connection or unstable network</span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground">•</span>
                <span>Browser extension blocking requests (ad blocker, privacy tool)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground">•</span>
                <span>Corporate firewall or network restrictions</span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground">•</span>
                <span>Service temporarily unavailable</span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground">•</span>
                <span>Running in restricted iframe environment</span>
              </li>
            </ul>
          </div>

          {/* Quick Fixes */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 text-left">
            <h3 className="mb-3 text-blue-900 dark:text-blue-100">Quick fixes to try:</h3>
            <ol className="space-y-2 text-sm text-blue-800 dark:text-blue-200 list-decimal list-inside">
              <li>Check your internet connection is working</li>
              <li>Disable browser extensions temporarily</li>
              <li>Try in incognito/private browsing mode</li>
              <li>Clear browser cache and cookies</li>
              <li>Try a different browser or device</li>
              <li>Check browser console (F12) for details</li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {onRetry && (
              <Button onClick={onRetry} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Retry Connection
              </Button>
            )}
            
            {showDiagnostics && (
              <Button onClick={openDiagnostics} variant="outline" className="gap-2">
                <HelpCircle className="w-4 h-4" />
                Run Diagnostics
              </Button>
            )}
          </div>

          {/* Additional Help */}
          <div className="mt-6 pt-6 border-t text-sm text-muted-foreground">
            <p>Still having issues?</p>
            <p className="mt-2">
              Open browser console (F12) and look for red errors, then contact support with details.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
