import { useState, useEffect } from 'react';
import { AppState, Page } from '../App';
import { getOrganization, updateOrganization, getBranches, createBranch } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { ArrowLeft, Building2, Plus, CreditCard, Printer, Settings as SettingsIcon } from 'lucide-react';
import { useSubscriptionLimits } from '../hooks/useSubscriptionLimits';
import { LimitWarningBanner } from '../components/LimitWarningBanner';

interface SettingsProps {
  appState: AppState;
  onNavigate: (page: Page) => void;
}

export function Settings({ appState, onNavigate }: SettingsProps) {
  const [org, setOrg] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [newBranch, setNewBranch] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
  });

  // Use subscription limits hook
  const {
    limitStatus,
    checkAction,
    isAtLimit,
    getRemainingQuota,
    refreshUsage,
  } = useSubscriptionLimits(
    appState.orgId,
    appState.subscriptionPlan,
    appState.subscriptionStatus
  );

  useEffect(() => {
    if (appState.orgId) {
      loadData();
    }
  }, [appState.orgId]);

  async function loadData() {
    if (!appState.orgId) return;

    try {
      const [orgRes, branchesRes] = await Promise.all([
        getOrganization(appState.orgId),
        getBranches(appState.orgId),
      ]);

      setOrg(orgRes.org);
      setBranches(branchesRes.branches || []);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddBranch(e: React.FormEvent) {
    e.preventDefault();
    if (!appState.orgId) return;

    try {
      await createBranch(appState.orgId, newBranch);
      setShowAddBranch(false);
      setNewBranch({ name: '', address: '', phone: '', email: '' });
      loadData();
    } catch (error) {
      console.error('Error creating branch:', error);
      alert('Failed to create branch');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => onNavigate('dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1>Settings</h1>
              <p className="text-sm text-muted-foreground">
                Manage organization and system settings
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => onNavigate('dashboard')}
            className="hidden md:flex"
          >
            Back to Dashboard
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Subscription Card */}
          <Card 
            className="p-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => onNavigate('subscribe')}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <h2 className="mb-2">Subscription & Billing</h2>
                  <p className="text-sm text-muted-foreground mb-3">
                    Manage your subscription plan and billing information
                  </p>
                  {appState.subscriptionStatus === 'trial' && appState.trialStartDate && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-700 rounded-lg">
                      <span className="text-sm">
                        🎉 Free trial active - {7 - Math.floor((new Date().getTime() - new Date(appState.trialStartDate).getTime()) / (1000 * 60 * 60 * 24))} days remaining
                      </span>
                    </div>
                  )}
                  {appState.subscriptionStatus === 'active' && appState.subscriptionPlan && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-700 rounded-lg">
                      <span className="text-sm">
                        ✓ Active - {appState.subscriptionPlan.charAt(0).toUpperCase() + appState.subscriptionPlan.slice(1)} Plan
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <Button variant="outline">Manage Plan</Button>
            </div>
          </Card>

          {/* Organization Settings */}
          <Card className="p-6">
            <h2 className="mb-6 flex items-center gap-2">
              <SettingsIcon className="w-5 h-5" />
              Organization Settings
            </h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  value={org?.name || ''}
                  onChange={(e) => setOrg({ ...org, name: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="orgLogo">Logo URL</Label>
                <Input
                  id="orgLogo"
                  placeholder="https://example.com/logo.png"
                  value={org?.logo || ''}
                  onChange={(e) => setOrg({ ...org, logo: e.target.value })}
                />
              </div>

              <Button onClick={() => updateOrganization(appState.orgId!, { name: org.name, logo: org.logo })}>
                Save Changes
              </Button>
            </div>
          </Card>

          {/* Branches */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Branches
              </h2>
              <Button 
                onClick={() => {
                  const actionCheck = checkAction('create_branch');
                  if (actionCheck.allowed) {
                    setShowAddBranch(true);
                  } else {
                    alert(actionCheck.reason || 'Cannot add branch');
                  }
                }}
                size="sm"
                disabled={isAtLimit('branches')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Branch
              </Button>
            </div>

            {/* Show limit warning banner if over limit */}
            {limitStatus.isOverLimit && limitStatus.warnings.length > 0 && (
              <LimitWarningBanner
                warnings={limitStatus.warnings}
                onUpgrade={() => onNavigate('subscribe')}
                showUpgradeButton={true}
              />
            )}

            {/* Plan limit info */}
            <div className="mb-4 text-sm text-muted-foreground">
              Using {branches.length} of {getRemainingQuota('branches') + branches.length} branches
              {isAtLimit('branches') && (
                <Button
                  variant="link"
                  size="sm"
                  className="ml-2 h-auto p-0"
                  onClick={() => onNavigate('subscribe')}
                >
                  Upgrade Plan
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {branches.map((branch) => (
                <Card key={branch.id} className="p-4 bg-accent/50">
                  <div className="flex items-start justify-between mb-2">
                    <h3>{branch.name}</h3>
                    {branch.isHeadquarters && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        HQ
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{branch.address}</p>
                  <p className="text-sm text-muted-foreground">{branch.phone}</p>
                </Card>
              ))}
            </div>
          </Card>

          {/* Payment Integration */}
          <Card className="p-6">
            <h2 className="mb-6 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Integration
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p>Paystack</p>
                    <p className="text-sm text-muted-foreground">Accept card payments</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Connect</Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <p>Flutterwave</p>
                    <p className="text-sm text-muted-foreground">Payment gateway</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Connect</Button>
              </div>
            </div>
          </Card>

          {/* Printer Settings */}
          <Card className="p-6">
            <h2 className="mb-6 flex items-center gap-2">
              <Printer className="w-5 h-5" />
              Printer Settings
            </h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="printerType">Receipt Printer Type</Label>
                <select
                  id="printerType"
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                >
                  <option>Thermal Printer (80mm)</option>
                  <option>Thermal Printer (58mm)</option>
                  <option>Standard Printer</option>
                </select>
              </div>

              <div>
                <Label htmlFor="printerIp">Printer Network Address</Label>
                <Input
                  id="printerIp"
                  placeholder="192.168.1.100"
                />
              </div>

              <Button variant="outline">Test Print</Button>
            </div>
          </Card>

          {/* Tax Settings */}
          <Card className="p-6">
            <h2 className="mb-6">Tax Configuration</h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="defaultTax">Default Tax Rate (%)</Label>
                <Input
                  id="defaultTax"
                  type="number"
                  step="0.01"
                  placeholder="7.5"
                />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="taxInclusive" className="w-4 h-4" />
                <Label htmlFor="taxInclusive" className="cursor-pointer">
                  Prices include tax
                </Label>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Add Branch Dialog */}
      <Dialog open={showAddBranch} onOpenChange={setShowAddBranch}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Branch</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddBranch} className="space-y-4 py-4">
            <div>
              <Label htmlFor="branchName">Branch Name *</Label>
              <Input
                id="branchName"
                placeholder="e.g., Lagos - Lekki Branch"
                value={newBranch.name}
                onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="branchAddress">Address *</Label>
              <Input
                id="branchAddress"
                placeholder="123 Main Street, City"
                value={newBranch.address}
                onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="branchPhone">Phone Number *</Label>
              <Input
                id="branchPhone"
                type="tel"
                placeholder="+234 800 000 0000"
                value={newBranch.phone}
                onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="branchEmail">Email</Label>
              <Input
                id="branchEmail"
                type="email"
                placeholder="branch@example.com"
                value={newBranch.email}
                onChange={(e) => setNewBranch({ ...newBranch, email: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddBranch(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Branch</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}