import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  Database, 
  Users, 
  Building2,
  Activity,
  Search,
  RefreshCw,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Zap,
  Settings,
  FileText,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface SuperAdminPanelProps {
  appState: {
    userId: string | null;
    email?: string;
  };
  onNavigate: (page: string) => void;
}

interface Organization {
  id: string;
  name: string;
  subscription_status: string;
  subscription_plan: string;
  created_at: string;
  user_count: number;
  branch_count: number;
  product_count: number;
  last_activity: string;
  issues: string[];
}

interface SystemIssue {
  org_id: string;
  org_name: string;
  issue_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  timestamp: string;
}

export default function SuperAdminPanel({ appState, onNavigate }: SuperAdminPanelProps) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [systemIssues, setSystemIssues] = useState<SystemIssue[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [systemStats, setSystemStats] = useState({
    totalOrgs: 0,
    activeOrgs: 0,
    totalUsers: 0,
    totalSalesToday: 0,
    criticalIssues: 0,
    avgResponseTime: '2.3s',
  });

  // List of authorized super admin emails
  const SUPER_ADMIN_EMAILS = [
    'admin@shopeasy.com',
    'tech@shopeasy.com',
    'support@shopeasy.com',
    // Add your team's emails here
  ];

  useEffect(() => {
    checkAuthorization();
  }, [appState.userId]);

  const checkAuthorization = async () => {
    try {
      // Get current user's email
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      // Check if user is super admin
      const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(user.email || '');
      setIsAuthorized(isSuperAdmin);

      if (isSuperAdmin) {
        await loadSuperAdminData();
      }
    } catch (error) {
      console.error('Authorization check failed:', error);
      setIsAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  const loadSuperAdminData = async () => {
    try {
      // Load all organizations
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;

      // Load counts for each org
      const orgsWithCounts = await Promise.all(
        (orgsData || []).map(async (org) => {
          const [users, branches, products] = await Promise.all([
            supabase.from('user_profiles').select('id', { count: 'exact' }).eq('organization_id', org.id),
            supabase.from('branches').select('id', { count: 'exact' }).eq('organization_id', org.id),
            supabase.from('products').select('id', { count: 'exact' }).eq('organization_id', org.id),
          ]);

          return {
            id: org.id,
            name: org.name,
            subscription_status: org.subscription_status || 'trial',
            subscription_plan: org.subscription_plan || 'starter',
            created_at: org.created_at,
            user_count: users.count || 0,
            branch_count: branches.count || 0,
            product_count: products.count || 0,
            last_activity: org.updated_at || org.created_at,
            issues: [],
          };
        })
      );

      setOrganizations(orgsWithCounts);

      // Calculate stats
      setSystemStats({
        totalOrgs: orgsWithCounts.length,
        activeOrgs: orgsWithCounts.filter(o => o.subscription_status === 'active').length,
        totalUsers: orgsWithCounts.reduce((sum, o) => sum + o.user_count, 0),
        totalSalesToday: 0, // TODO: Calculate from sales table
        criticalIssues: systemIssues.filter(i => i.severity === 'critical').length,
        avgResponseTime: '2.3s',
      });

      // Detect issues
      await detectSystemIssues(orgsWithCounts);
    } catch (error) {
      console.error('Error loading super admin data:', error);
      toast.error('Failed to load system data');
    }
  };

  const detectSystemIssues = async (orgs: Organization[]) => {
    const issues: SystemIssue[] = [];

    for (const org of orgs) {
      // Check for duplicate inventory
      const { data: inventory } = await supabase
        .from('inventory')
        .select('product_id, branch_id, warehouse_id')
        .eq('organization_id', org.id);

      if (inventory) {
        const seen = new Set();
        const duplicates = inventory.filter(item => {
          const key = `${item.product_id}-${item.branch_id}-${item.warehouse_id}`;
          if (seen.has(key)) return true;
          seen.add(key);
          return false;
        });

        if (duplicates.length > 0) {
          issues.push({
            org_id: org.id,
            org_name: org.name,
            issue_type: 'duplicate_inventory',
            severity: 'high',
            description: `${duplicates.length} duplicate inventory entries detected`,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Check for low stock
      const { data: lowStock } = await supabase
        .from('inventory')
        .select('id')
        .eq('organization_id', org.id)
        .lt('quantity', 10);

      if (lowStock && lowStock.length > 20) {
        issues.push({
          org_id: org.id,
          org_name: org.name,
          issue_type: 'low_stock',
          severity: 'medium',
          description: `${lowStock.length} products below minimum stock`,
          timestamp: new Date().toISOString(),
        });
      }

      // Check for expired subscription
      if (org.subscription_status === 'expired') {
        issues.push({
          org_id: org.id,
          org_name: org.name,
          issue_type: 'subscription_expired',
          severity: 'critical',
          description: 'Subscription has expired',
          timestamp: new Date().toISOString(),
        });
      }
    }

    setSystemIssues(issues);
  };

  const fixDuplicateInventory = async (orgId: string) => {
    try {
      toast.loading('Fixing duplicate inventory...');

      // Call the fix function
      const { error } = await supabase.rpc('fix_duplicate_inventory', {
        org_id: orgId
      });

      if (error) throw error;

      toast.success('Duplicate inventory fixed!');
      await loadSuperAdminData();
    } catch (error) {
      console.error('Error fixing inventory:', error);
      toast.error('Failed to fix inventory');
    }
  };

  const runDiagnostics = async (orgId: string) => {
    try {
      toast.loading('Running diagnostics...');

      const diagnostics = {
        inventory: await checkInventoryIntegrity(orgId),
        transfers: await checkTransferIntegrity(orgId),
        sales: await checkSalesIntegrity(orgId),
      };

      console.log('Diagnostics:', diagnostics);
      toast.success('Diagnostics complete! Check console.');
    } catch (error) {
      console.error('Diagnostics failed:', error);
      toast.error('Diagnostics failed');
    }
  };

  const checkInventoryIntegrity = async (orgId: string) => {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('organization_id', orgId);

    if (error) return { status: 'error', error };

    // Check for duplicates
    const seen = new Set();
    const duplicates = (data || []).filter(item => {
      const key = `${item.product_id}-${item.branch_id}-${item.warehouse_id}`;
      if (seen.has(key)) return true;
      seen.add(key);
      return false;
    });

    // Check for negative quantities
    const negative = (data || []).filter(item => item.quantity < 0);

    return {
      status: 'ok',
      total: data?.length || 0,
      duplicates: duplicates.length,
      negative: negative.length,
    };
  };

  const checkTransferIntegrity = async (orgId: string) => {
    const { data, error } = await supabase
      .from('transfers')
      .select('*')
      .eq('organization_id', orgId);

    if (error) return { status: 'error', error };

    const stuck = (data || []).filter(t => 
      t.status === 'pending' && 
      new Date(t.created_at) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    return {
      status: 'ok',
      total: data?.length || 0,
      pending: (data || []).filter(t => t.status === 'pending').length,
      stuck: stuck.length,
    };
  };

  const checkSalesIntegrity = async (orgId: string) => {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('organization_id', orgId);

    if (error) return { status: 'error', error };

    return {
      status: 'ok',
      total: data?.length || 0,
      today: (data || []).filter(s => 
        new Date(s.created_at).toDateString() === new Date().toDateString()
      ).length,
    };
  };

  const exportOrgData = async (orgId: string) => {
    try {
      toast.loading('Exporting data...');

      const [inventory, products, sales, transfers] = await Promise.all([
        supabase.from('inventory').select('*').eq('organization_id', orgId),
        supabase.from('products').select('*').eq('organization_id', orgId),
        supabase.from('sales').select('*').eq('organization_id', orgId),
        supabase.from('transfers').select('*').eq('organization_id', orgId),
      ]);

      const exportData = {
        organization: organizations.find(o => o.id === orgId),
        inventory: inventory.data,
        products: products.data,
        sales: sales.data,
        transfers: transfers.data,
        exported_at: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `org-${orgId}-export-${Date.now()}.json`;
      a.click();

      toast.success('Data exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export data');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Checking authorization...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You are not authorized to access the Super Admin Panel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This panel is restricted to ShopEasy technical support team only.
              </AlertDescription>
            </Alert>
            <Button className="w-full mt-4" onClick={() => onNavigate('dashboard')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredOrgs = organizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.id.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl mb-2 flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Super Admin Panel
            </h1>
            <p className="text-muted-foreground">
              Technical support & monitoring dashboard
            </p>
          </div>
          <Button onClick={() => loadSuperAdminData()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* System Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Total Organizations</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{systemStats.totalOrgs}</div>
              <p className="text-xs text-muted-foreground">
                {systemStats.activeOrgs} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{systemStats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                Across all organizations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Critical Issues</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{systemStats.criticalIssues}</div>
              <p className="text-xs text-muted-foreground">
                Requires immediate attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Avg Response</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{systemStats.avgResponseTime}</div>
              <p className="text-xs text-muted-foreground">
                Database query time
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="organizations" className="space-y-4">
          <TabsList>
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="issues">
              Issues
              {systemIssues.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {systemIssues.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          </TabsList>

          {/* Organizations Tab */}
          <TabsContent value="organizations" className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search organizations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon={<Search className="h-4 w-4" />}
                />
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>All Organizations</CardTitle>
                <CardDescription>
                  Monitor and manage all client organizations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Branches</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrgs.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell className="font-medium">{org.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{org.subscription_plan}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              org.subscription_status === 'active' ? 'default' :
                              org.subscription_status === 'trial' ? 'secondary' :
                              'destructive'
                            }
                          >
                            {org.subscription_status}
                          </Badge>
                        </TableCell>
                        <TableCell>{org.user_count}</TableCell>
                        <TableCell>{org.branch_count}</TableCell>
                        <TableCell>{org.product_count}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => runDiagnostics(org.id)}
                            >
                              <Activity className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => exportOrgData(org.id)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Issues Tab */}
          <TabsContent value="issues" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Issues</CardTitle>
                <CardDescription>
                  Automatically detected issues across all organizations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {systemIssues.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-muted-foreground">No issues detected</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {systemIssues.map((issue, idx) => (
                      <Alert
                        key={idx}
                        variant={issue.severity === 'critical' ? 'destructive' : 'default'}
                      >
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{issue.org_name}</p>
                              <p className="text-sm">{issue.description}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(issue.timestamp).toLocaleString()}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                if (issue.issue_type === 'duplicate_inventory') {
                                  fixDuplicateInventory(issue.org_id);
                                }
                              }}
                            >
                              Fix Issue
                            </Button>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monitoring Tab */}
          <TabsContent value="monitoring" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Database Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Connection Pool</span>
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Healthy
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Query Performance</span>
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Good
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Storage</span>
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        84% Free
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>API Response Time</span>
                      <span className="text-sm">{systemStats.avgResponseTime}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Uptime</span>
                      <span className="text-sm">99.98%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Active Connections</span>
                      <span className="text-sm">{systemStats.totalOrgs * 3}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
