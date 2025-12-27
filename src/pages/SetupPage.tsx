import { useState } from 'react';
import { signUp, createBranch } from '../lib/api-supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Store, Building2, User, Mail, Lock } from 'lucide-react';

interface SetupPageProps {
  onComplete: (userId: string, orgId: string, userEmail: string, userName: string) => void;
  onLogin: () => void;
}

export function SetupPage({ onComplete, onLogin }: SetupPageProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Organization & Owner Details
  const [orgName, setOrgName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Step 2: First Branch
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPhone, setBranchPhone] = useState('');

  // Temp storage
  const [userId, setUserId] = useState('');
  const [orgId, setOrgId] = useState('');

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Starting signup process...');
      const result = await signUp(email, password, ownerName, orgName);
      console.log('Signup result:', result);
      
      if (!result.user || !result.organization) {
        throw new Error('Signup failed: Invalid response from server');
      }
      
      setUserId(result.user.id);
      setOrgId(result.organization.id);
      setStep(2);
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to create account. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  }

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Creating branch...');
      const result = await createBranch(orgId, {
        name: branchName,
        address: branchAddress,
        phone: branchPhone,
        isHeadquarters: true,
      });
      console.log('Branch created:', result);

      onComplete(userId, orgId, email, ownerName);
    } catch (err: any) {
      console.error('Branch creation error:', err);
      setError(err.message || 'Failed to create branch');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-xl mb-4">
            <Store className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="mb-2">Welcome to shopeasy</h1>
          <p className="text-muted-foreground">
            Let's set up your organization in just a few steps
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center mb-8 gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            1
          </div>
          <div className={`w-16 h-1 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            2
          </div>
        </div>

        {step === 1 && (
          <form onSubmit={handleStep1} className="space-y-6">
            <div>
              <h3 className="mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Organization Details
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    placeholder="e.g., ABC Retail Group"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Owner Account
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="ownerName">Full Name</Label>
                  <Input
                    id="ownerName"
                    placeholder="John Doe"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
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
                    minLength={6}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    At least 6 characters
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating Account...' : 'Continue'}
            </Button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={onLogin}
                  className="text-primary hover:underline"
                >
                  Sign in
                </button>
              </p>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleStep2} className="space-y-6">
            <div>
              <h3 className="mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Create Your First Branch
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="branchName">Branch Name</Label>
                  <Input
                    id="branchName"
                    placeholder="e.g., HQ Warehouse or Lagos - Lekki Branch"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="branchAddress">Address</Label>
                  <Input
                    id="branchAddress"
                    placeholder="123 Main Street, City"
                    value={branchAddress}
                    onChange={(e) => setBranchAddress(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="branchPhone">Phone Number</Label>
                  <Input
                    id="branchPhone"
                    type="tel"
                    placeholder="+234 800 000 0000"
                    value={branchPhone}
                    onChange={(e) => setBranchPhone(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Setting Up...' : 'Complete Setup'}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}