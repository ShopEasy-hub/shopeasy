import { useState } from 'react';
import { signIn, getUserProfile } from '../lib/api-supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Store } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-xl mb-4">
            <Store className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="mb-2">shopeasy</h1>
          <p className="text-muted-foreground">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
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

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            {"Don't have an account?"}{' '}
            <button
              onClick={onSignUp}
              className="text-primary hover:underline"
            >
              Create one
            </button>
          </p>
          <p className="text-sm text-muted-foreground">
            Forgot your password?{' '}
            <button
              onClick={onForgotPassword}
              className="text-primary hover:underline"
            >
              Reset password
            </button>
          </p>
        </div>
      </Card>
    </div>
  );
}