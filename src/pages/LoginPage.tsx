import { useState } from 'react';
import { signIn, getUserProfile } from '../lib/api-supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Store, ShoppingCart, TrendingUp, Users, Shield, Zap } from 'lucide-react';

interface LoginPageProps {
  onSuccess: (userId: string, orgId: string, userRole: string, userEmail: string, userName: string, userBranchId: string | null) => void;
  onSignUp: () => void;
  onForgotPassword: () => void;
}

export function LoginPage({ onSuccess, onSignUp, onForgotPassword }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { session, user } = await signIn(email, password);
      
      if (user) {
        // Fetch user profile to get orgId, role, and branchId
        const userProfile = await getUserProfile(user.id);
        onSuccess(
          user.id, 
          userProfile.organization_id, 
          userProfile.role,
          user.email || email,
          userProfile.name || 'User',
          userProfile.branch_id || null
        );
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex flex-col lg:flex-row">
      {/* Left side - Branding and Features (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary/80 p-12 flex-col justify-between text-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Store className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl">ShopEasy</h1>
              <p className="text-white/80 text-sm">Point of Sale System</p>
            </div>
          </div>
          
          <div className="max-w-md">
            <h2 className="text-4xl mb-4">Manage Your Business with Ease</h2>
            <p className="text-white/90 text-lg">
              Complete cloud-based POS solution for multi-branch supermarkets and pharmacies
            </p>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="grid gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="mb-1">Real-Time Inventory</h3>
                <p className="text-white/80 text-sm">Track stock across all branches in real-time with automatic sync</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="mb-1">Smart Analytics</h3>
                <p className="text-white/80 text-sm">Get insights with detailed reports and analytics dashboard</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="mb-1">Multi-Branch Management</h3>
                <p className="text-white/80 text-sm">Manage multiple locations with role-based access control</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="mb-1">Secure & Reliable</h3>
                <p className="text-white/80 text-sm">Enterprise-grade security with automatic backups</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
              <Store className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl mb-1">ShopEasy</h1>
            <p className="text-muted-foreground">Point of Sale System</p>
          </div>

          <Card className="p-8 shadow-lg">
            <div className="mb-6">
              <h2 className="text-2xl mb-2">Welcome Back</h2>
              <p className="text-muted-foreground">Sign in to access your dashboard</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1.5"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={onForgotPassword}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{' '}
                <button
                  onClick={onSignUp}
                  className="text-primary hover:underline"
                >
                  Create one for free
                </button>
              </p>
            </div>
          </Card>

          {/* Features preview for mobile */}
          <div className="lg:hidden mt-8 grid grid-cols-2 gap-3 text-center">
            <div className="p-3 bg-card rounded-lg border">
              <Zap className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xs text-muted-foreground">Fast & Easy</p>
            </div>
            <div className="p-3 bg-card rounded-lg border">
              <Shield className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xs text-muted-foreground">Secure</p>
            </div>
            <div className="p-3 bg-card rounded-lg border">
              <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xs text-muted-foreground">Multi-Branch</p>
            </div>
            <div className="p-3 bg-card rounded-lg border">
              <TrendingUp className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xs text-muted-foreground">Analytics</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}