import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  Warehouse, 
  Settings, 
  CreditCard, 
  Activity,
  BarChart3,
  Shield,
  Bell,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';

interface AdminPanelProps {
  appState: {
    userId: string | null;
    orgId: string | null;
    userRole: string;
    organizationName?: string;
    subscriptionStatus?: 'trial' | 'active' | 'expired';
    subscriptionEndDate?: string;
    trialStartDate?: string;
  };
  onNavigate?: (page: string) => void;
}

export default function AdminPanel({ appState, onNavigate }: AdminPanelProps) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalBranches: 0,
    totalWarehouses: 0,
    totalProducts: 0,
    lowStockItems: 0,
    pendingTransfers: 0,
    todaySales: 0,
    subscriptionStatus: 'active',
    daysUntilExpiry: 30,
  });

  const [systemHealth, setSystemHealth] = useState({
    database: 'healthy',
    api: 'healthy',
    storage: 'healthy',
    lastBackup: '2 hours ago',
  });

  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  // Check if user has admin access
  const isAdmin = appState.userRole === 'owner' || appState.userRole === 'manager';
  const isOwner = appState.userRole === 'owner';

  useEffect(() => {
    if (!isAdmin && onNavigate) {
      onNavigate('dashboard');
      return;
    }

    loadAdminData();
  }, [isAdmin, onNavigate]);

  const loadAdminData = async () => {
    if (!appState.orgId) return;

    try {
      // Load real data from APIs
      const { getUsers, getBranches, getWarehouses, getProducts, getSales, getTransfers, getInventory, getOrganization } = await import('../lib/api');
      
      // Fetch all data in parallel
      const [
        usersData,
        branchesData,
        warehousesData,
        productsData,
        salesData,
        transfersData,
        inventoryData,
        orgData
      ] = await Promise.all([
        getUsers(appState.orgId).catch(() => ({ users: [] })),
        getBranches(appState.orgId).catch(() => ({ branches: [] })),
        getWarehouses(appState.orgId).catch(() => []),
        getProducts(appState.orgId).catch(() => ({ products: [] })),
        getSales(appState.orgId).catch(() => ({ sales: [] })),
        getTransfers(appState.orgId).catch(() => ({ transfers: [] })),
        getInventory(appState.orgId).catch(() => []),
        getOrganization(appState.orgId).catch(() => null)
      ]);

      const users = usersData.users || [];
      const branches = branchesData.branches || [];
      const warehouses = Array.isArray(warehousesData) ? warehousesData : [];
      const products = productsData.products || [];
      const sales = salesData.sales || [];
      const transfers = transfersData.transfers || [];
      const inventory = Array.isArray(inventoryData) ? inventoryData : [];

      // Calculate today's sales
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaySales = sales
        .filter(sale => new Date(sale.created_at) >= today)
        .reduce((sum, sale) => sum + (sale.total || 0), 0);

      // Calculate active users
      const activeUsers = users.filter(u => u.status === 'active').length;

      // Calculate low stock items (less than 10)
      const lowStockItems = inventory.filter(inv => inv.quantity < 10).length;

      // Calculate pending transfers
      const pendingTransfers = transfers.filter(t => t.status === 'pending').length;

      // Calculate subscription status and days until expiry from appState or orgData
      let subscriptionStatus: 'trial' | 'active' | 'expired' = 'active';
      let daysUntilExpiry = 30;

      // Prefer appState (already loaded), fallback to orgData
      const subStatus = appState.subscriptionStatus || orgData?.subscription_status;
      const subEndDate = appState.subscriptionEndDate || orgData?.subscription_end_date;
      const trialStart = appState.trialStartDate || orgData?.trial_start_date;

      if (subStatus === 'expired') {
        subscriptionStatus = 'expired';
        daysUntilExpiry = 0;
      } else if (subStatus === 'trial') {
        subscriptionStatus = 'trial';
        // Calculate days remaining in trial (30 day trial)
        if (trialStart) {
          const trialStartDate = new Date(trialStart);
          const trialEndDate = new Date(trialStartDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
          const now = new Date();
          const daysLeft = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          daysUntilExpiry = Math.max(0, daysLeft);
        }
      } else if (subEndDate) {
        // Active subscription - calculate days until end
        subscriptionStatus = 'active';
        const endDate = new Date(subEndDate);
        const now = new Date();
        const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        daysUntilExpiry = Math.max(0, daysLeft);
        
        // If past expiry, mark as expired
        if (daysLeft <= 0) {
          subscriptionStatus = 'expired';
        }
      }

      // Set stats with real data
      setStats({
        totalUsers: users.length,
        activeUsers,
        totalBranches: branches.length,
        totalWarehouses: warehouses.length,
        totalProducts: products.length,
        lowStockItems,
        pendingTransfers,
        todaySales,
        subscriptionStatus,
        daysUntilExpiry,
      });

      // Build recent activity from sales and transfers
      const recentActivity: any[] = [];
      
      // Add recent sales
      sales.slice(0, 3).forEach((sale, index) => {
        recentActivity.push({
          id: `sale-${index}`,
          user: sale.customer_name || 'Customer',
          action: `Sale completed: ₦${sale.total?.toLocaleString()}`,
          time: formatTimeAgo(sale.created_at),
          type: 'create'
        });
      });

      // Add recent transfers
      transfers.slice(0, 2).forEach((transfer, index) => {
        recentActivity.push({
          id: `transfer-${index}`,
          user: 'System',
          action: `Transfer ${transfer.status}: ${transfer.quantity} units`,
          time: formatTimeAgo(transfer.created_at),
          type: transfer.status === 'completed' ? 'update' : 'approve'
        });
      });

      setRecentActivity(recentActivity.slice(0, 5));

    } catch (error) {
      console.error('Error loading admin data:', error);
      // Keep placeholder data on error
    }
  };

  // Helper function to format time ago
  function formatTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => onNavigate?.('dashboard')}
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl mb-2">Admin Panel</h1>
            <p className="text-muted-foreground">
              System administration for {appState.organizationName}
            </p>
          </div>
        </div>
        <Badge variant={stats.subscriptionStatus === 'active' ? 'default' : 'destructive'}>
          {stats.subscriptionStatus.toUpperCase()}
        </Badge>
      </div>

      {/* Subscription Warning */}
      {stats.daysUntilExpiry <= 30 && (
        <Alert variant={stats.daysUntilExpiry <= 7 ? 'destructive' : 'default'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your subscription expires in {stats.daysUntilExpiry} days. 
            <Button 
              variant="link" 
              className="px-2"
              onClick={() => onNavigate?.('subscribe')}
            >
              Renew now
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeUsers} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Locations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats.totalBranches + stats.totalWarehouses}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalBranches} branches, {stats.totalWarehouses} warehouses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Products</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              {stats.lowStockItems} low stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">{"Today's Sales"}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">₦{stats.todaySales.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingTransfers} pending transfers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          {isOwner && <TabsTrigger value="billing">Billing</TabsTrigger>}
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Current system status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    <span>API</span>
                  </div>
                  <Badge variant={systemHealth.api === 'healthy' ? 'default' : 'destructive'}>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {systemHealth.api}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Warehouse className="h-4 w-4" />
                    <span>Storage</span>
                  </div>
                  <Badge variant={systemHealth.storage === 'healthy' ? 'default' : 'destructive'}>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {systemHealth.storage}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Last Backup</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {systemHealth.lastBackup}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest system events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                      <div className={`h-2 w-2 rounded-full mt-2 ${
                        activity.type === 'create' ? 'bg-green-500' :
                        activity.type === 'update' ? 'bg-blue-500' :
                        activity.type === 'approve' ? 'bg-yellow-500' :
                        'bg-gray-500'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">
                          by {activity.user} • {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Button 
                  variant="outline" 
                  className="h-auto flex flex-col items-center gap-2 py-4"
                  onClick={() => onNavigate?.('users')}
                >
                  <Users className="h-5 w-5" />
                  <span className="text-sm">Manage Users</span>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-auto flex flex-col items-center gap-2 py-4"
                  onClick={() => onNavigate?.('settings')}
                >
                  <Settings className="h-5 w-5" />
                  <span className="text-sm">Settings</span>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-auto flex flex-col items-center gap-2 py-4"
                  onClick={() => onNavigate?.('reports')}
                >
                  <FileText className="h-5 w-5" />
                  <span className="text-sm">Reports</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage user accounts and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button onClick={() => onNavigate?.('users')}>
                  Go to User Management
                </Button>
                <p className="text-sm text-muted-foreground">
                  View and manage all users, assign roles, and control access permissions.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab (Owner Only) */}
        {isOwner && (
          <TabsContent value="billing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Management</CardTitle>
                <CardDescription>Manage your subscription and billing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p>Current Plan: <strong>Professional</strong></p>
                    <p className="text-sm text-muted-foreground">
                      Expires in {stats.daysUntilExpiry} days
                    </p>
                  </div>
                  <Button onClick={() => onNavigate?.('subscribe')}>
                    Manage Subscription
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p>Billing Cycle</p>
                    <p className="text-sm text-muted-foreground">
                      View payment history and invoices
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => onNavigate?.('billing-cycle')}
                  >
                    View History
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Audit Logs Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>Track all system activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={
                        activity.type === 'create' ? 'default' :
                        activity.type === 'update' ? 'secondary' :
                        activity.type === 'approve' ? 'outline' :
                        'destructive'
                      }>
                        {activity.type}
                      </Badge>
                      <div>
                        <p className="text-sm">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.user} • {activity.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full">
                  Load More
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}