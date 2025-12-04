import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('🔥 ErrorBoundary caught an error:', error);
    console.error('📋 Error info:', errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Log to a service in production
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    // Optionally reload the page
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-2xl w-full">
            <div className="bg-destructive/10 border-2 border-destructive rounded-lg p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-destructive/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <h1 className="text-destructive">Application Error</h1>
                  <p className="text-sm text-muted-foreground">
                    Something went wrong and the app crashed
                  </p>
                </div>
              </div>

              {this.state.error && (
                <div className="bg-background rounded-lg p-4 mb-6 border border-border">
                  <p className="text-sm mb-2">
                    <strong>Error:</strong> {this.state.error.toString()}
                  </p>
                  {this.state.error.stack && (
                    <details className="mt-2">
                      <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                        Show technical details
                      </summary>
                      <pre className="text-xs mt-2 p-3 bg-muted rounded overflow-auto max-h-96">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <Button
                  onClick={this.handleReset}
                  className="w-full"
                  size="lg"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload Application
                </Button>

                <div className="bg-muted/50 rounded-lg p-4">
                  <h3 className="text-sm mb-2">Troubleshooting Steps:</h3>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Check your internet connection</li>
                    <li>Clear browser cache and reload</li>
                    <li>Check if Supabase connection is configured</li>
                    <li>Try logging out and logging in again</li>
                    <li>Contact support if the issue persists</li>
                  </ul>
                </div>

                <p className="text-xs text-center text-muted-foreground mt-4">
                  Error ID: {Date.now().toString(36)}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
