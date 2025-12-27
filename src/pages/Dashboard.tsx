import { useState, useEffect } from 'react';
import { AppState, Page } from '../App';
import { getBranches, getProducts, getSales, getTransfers, signOut, getUser } from '../lib/api';
import { Button } from '../components/ui/button';
import { KPICard } from '../components/KPICard';
import { Card } from '../components/ui/card';
import { BranchWarehouseSelector } from '../components/BranchWarehouseSelector';
import { canAccessPage, isAdminOrOwner, canAccessPageFull } from '../lib/permissions';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  ArrowLeftRight,
  BarChart3,
  Users,
  Settings,
  LogOut,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  AlertTriangle,
  UserCheck,
  Menu,
  X,
  RotateCcw,
  Warehouse,
  Truck,
  GitBranch,
  Building2,
  ChevronDown,
  Database,
  Shield,
  DollarSign,
  Star,
  FileText,
} from 'lucide-react';

interface DashboardProps {
  appState: AppState;
  onNavigate: (page: Page) => void;
  updateAppState: (updates: Partial<AppState>) => void;
}

interface NavItem {
  id: Page;
  label: string;
  icon: any;
}

const navItems: NavItem[] = [
  // { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }, // Removed - causes circular navigation
  { id: 'pos', label: 'POS Terminal', icon: ShoppingCart },
  { id: 'returns', label: 'Returns', icon: RotateCcw },
  { id: 'return-history', label: 'Return History', icon: FileText },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'short-dated', label: 'Short Dated', icon: AlertTriangle },
  { id: 'warehouses', label: 'Warehouses', icon: Warehouse },
  { id: 'suppliers', label: 'Suppliers', icon: Truck },
  { id: 'transfers', label: 'Transfers', icon: ArrowLeftRight },
  { id: 'expenses', label: 'Expenses', icon: TrendingUp },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'product-history', label: 'Product History', icon: FileText },
  // Removed diagnostic pages - no longer exist
  // { id: 'database-status', label: 'Database Status', icon: Database },
  // { id: 'stock-diagnostic', label: 'Stock Diagnostic', icon: Search },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// Admin-only navigation items
const adminNavItems: NavItem[] = [
  { id: 'admin', label: 'Admin Panel', icon: Shield },
];

export function Dashboard({ appState, onNavigate, updateAppState }: DashboardProps) {
  // Default sidebar open on desktop, closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
  const [branches, setBranches] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [supplyRecords, setSupplyRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showContextSelector, setShowContextSelector] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    if (appState.orgId && isInitialLoad) {
      loadData();
      loadUserInfo();
      loadWarehouses();
      setIsInitialLoad(false);
    }
  }, [appState.orgId, isInitialLoad]);

  async function loadUserInfo() {
    if (!appState.userId) return;
    
    try {
      const { user: userData } = await getUser(appState.userId);
      if (userData) {
        // Only update if different to prevent infinite loops
        if (appState.user?.name !== userData.name || appState.user?.email !== userData.email) {
          updateAppState({ user: { name: userData.name, email: userData.email } });
        }
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  }

  async function loadWarehouses() {
    if (!appState.orgId) return;
    
    try {
      const { getWarehouses } = await import('../lib/api');
      const warehousesData = await getWarehouses(appState.orgId);
      const warehousesList = Array.isArray(warehousesData) ? warehousesData : [];
      console.log('📦 Loaded warehouses:', warehousesList);
      setWarehouses(warehousesList);
    } catch (error) {
      console.error('Error loading warehouses:', error);
      setWarehouses([]);
    }
  }

  function handleContextSwitch(branchId: string, warehouseId: string | null) {
    console.log('🔄 Context switch requested:', { branchId, warehouseId });
    
    // Validate branch exists
    const branch = branches.find(b => b.id === branchId);
    if (!branch) {
      console.error('❌ Branch not found:', branchId);
      alert('Error: Selected branch not found. Please try again.');
      return;
    }
    
    // Validate warehouse if provided
    if (warehouseId) {
      const warehouse = warehouses.find(w => w.id === warehouseId);
      if (!warehouse) {
        console.error('❌ Warehouse not found:', warehouseId);
        alert('Error: Selected warehouse not found. Switching to branch only.');
        warehouseId = null; // Clear invalid warehouse
      }
    }
    
    console.log('✅ Switching to:', { 
      branch: branch.name, 
      warehouse: warehouseId ? warehouses.find(w => w.id === warehouseId)?.name : 'None' 
    });
    
    updateAppState({ 
      currentBranchId: branchId, 
      currentWarehouseId: warehouseId 
    });
    
    // Reload data for new context
    loadData();
  }

  async function loadData() {
    if (!appState.orgId) return;

    try {
      const [branchesRes, productsRes, salesRes, transfersRes] = await Promise.all([
        getBranches(appState.orgId),
        getProducts(appState.orgId),
        getSales(appState.orgId),
        getTransfers(appState.orgId),
      ]);

      setBranches(branchesRes.branches || []);
      setProducts(productsRes.products || []);
      setSales(salesRes.sales || []);
      setTransfers(transfersRes.transfers || []);

      // Load supply records from localStorage
      const storedSupplies = localStorage.getItem(`supply_records_${appState.orgId}`);
      if (storedSupplies) {
        setSupplyRecords(JSON.parse(storedSupplies));
      }

      // Update appState with branches
      updateAppState({ branches: branchesRes.branches || [] });

      // Set default branch if not set
      if (!appState.currentBranchId && branchesRes.branches?.length > 0) {
        updateAppState({ currentBranchId: branchesRes.branches[0].id });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await signOut();
      // Clear app state and force to login page without reload
      window.location.href = window.location.origin + '/?force-login=true';
    } catch (error) {
      console.error('Logout error:', error);
      // Force to login even if signout fails
      window.location.href = window.location.origin + '/?force-login=true';
    }
  }

  // Filter data by current branch
  const branchSales = sales.filter((sale) => sale.branchId === appState.currentBranchId);
  const branchTransfers = transfers.filter(
    (transfer) =>
      transfer.sourceBranchId === appState.currentBranchId ||
      transfer.destinationBranchId === appState.currentBranchId
  );

  // Calculate KPIs
  const todaySales = branchSales
    .filter((sale) => {
      const saleDate = new Date(sale.createdAt || sale.created_at).toDateString();
      return saleDate === new Date().toDateString();
    })
    .reduce((sum, sale) => sum + (sale.total || 0), 0);

  const inTransitTransfers = branchTransfers.filter((t) => t.status === 'in_transit');
  const inTransitValue = inTransitTransfers.reduce((sum, t) => {
    return sum + (t.items || []).reduce((itemSum: number, item: any) => itemSum + (item.unitCost || 0) * item.quantity, 0);
  }, 0);

  // Calculate supply KPIs
  const pendingSupplies = supplyRecords.filter((r: any) => r.status === 'pending').length;
  
  // For current warehouse context: count outgoing transfers to branches
  const warehouseToBranchTransfers = appState.currentWarehouseId
    ? transfers.filter((t) => t.sourceWarehouseId === appState.currentWarehouseId && t.status === 'in_transit').length
    : inTransitTransfers.length;

  const lowStockCount = 0; // Would need to calculate based on stock levels and reorder points

  const activeCashiers = new Set(
    branchSales
      .filter((sale) => {
        const saleDate = new Date(sale.createdAt || sale.created_at);
        const hoursSince = (Date.now() - saleDate.getTime()) / (1000 * 60 * 60);
        return hoursSince < 24;
      })
      .map((sale) => sale.processedBy || sale.processed_by)
      .filter(Boolean)
  ).size;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed lg:static inset-y-0 left-0 z-30 w-64 bg-card border-r transition-transform duration-300 flex flex-col lg:translate-x-0`}
      >
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-sm">shopeasy</h2>
              <p className="text-xs text-muted-foreground">Multi-Branch System</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems
            .filter((item) => canAccessPageFull(appState.userRole, item.id, appState.subscriptionPlan || null, appState.subscriptionStatus || null))
            .map((item) => {
              const Icon = item.icon;
              const isActive = item.id === 'dashboard';
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    // Close sidebar on mobile after navigation
                    if (window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent text-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          
          {/* Admin Panel - Only for owners and admins */}
          {isAdminOrOwner(appState.userRole) && (
            <>
              <div className="my-4 border-t"></div>
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      // Close sidebar on mobile after navigation
                      if (window.innerWidth < 1024) {
                        setSidebarOpen(false);
                      }
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20 border border-primary/20 text-foreground"
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </>
          )}
        </nav>

        <div className="p-4 border-t">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-card border-b px-3 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden flex-shrink-0"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hidden lg:flex flex-shrink-0"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="truncate">ShopEasy POS Dashboard</h1>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                  <Building2 className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">Company: {appState.companyName}</span>
                  <span className="hidden sm:inline mx-1">|</span>
                  <span className="truncate w-full sm:w-auto">
                    Branch: {branches.find((b) => b.id === appState.currentBranchId)?.name || 'Not selected'}
                  </span>
                  {appState.currentWarehouseId && (
                    <>
                      <span className="hidden sm:inline mx-1">|</span>
                      <Warehouse className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">
                        Warehouse: {warehouses.find((w) => w.id === appState.currentWarehouseId)?.name || 'N/A'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {(appState.userRole === 'owner' || appState.userRole === 'admin') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowContextSelector(true)}
                  className="hidden sm:flex"
                >
                  <GitBranch className="w-4 h-4 mr-2" />
                  Switch Context
                </Button>
              )}
              {(appState.userRole === 'owner' || appState.userRole === 'admin') && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowContextSelector(true)}
                  className="sm:hidden"
                >
                  <GitBranch className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {canAccessPage(appState.userRole, 'pos') && (
              <Button 
                size="lg"
                onClick={() => onNavigate('pos')}
                className="flex-1 min-w-[140px] sm:min-w-[180px]"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                <span className="hidden sm:inline">Record Sale</span>
                <span className="sm:hidden">Sale</span>
              </Button>
            )}
            {canAccessPage(appState.userRole, 'returns') && (
              <Button 
                size="lg"
                variant="outline"
                onClick={() => onNavigate('returns')}
                className="flex-1 min-w-[140px] sm:min-w-[180px]"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                <span className="hidden sm:inline">Process Return</span>
                <span className="sm:hidden">Return</span>
              </Button>
            )}
            {canAccessPage(appState.userRole, 'short-dated') && (
              <Button 
                size="lg"
                variant="outline"
                onClick={() => onNavigate('short-dated')}
                className="flex-1 min-w-[140px] sm:min-w-[180px] border-warning text-warning hover:bg-warning/10"
              >
                <AlertTriangle className="w-5 h-5 mr-2" />
                <span className="hidden sm:inline">Short Dated</span>
                <span className="sm:hidden">Expiring</span>
              </Button>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-3 sm:p-6">
          {/* Branch Info Banner for non-admin users */}
          {appState.userRole && !['owner', 'admin'].includes(appState.userRole) && (
            <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Branch Access</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    You are currently assigned to: <strong>{branches.find((b) => b.id === appState.currentBranchId)?.name || 'Loading...'}</strong>
                    {appState.userRole === 'manager' && ' · You can approve incoming transfers for this branch'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Need access to other branches? Contact your administrator.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Trial Banner */}
          {appState.subscriptionStatus === 'trial' && appState.trialStartDate && (
            <div className="mb-6 p-4 bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/20 rounded-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">🎉</span>
                  </div>
                  <div>
                    <p className="font-medium">
                      Free Trial Active - {Math.max(0, 7 - Math.floor((new Date().getTime() - new Date(appState.trialStartDate).getTime()) / (1000 * 60 * 60 * 24)))} days remaining
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Enjoying ShopEasy? Upgrade now to continue after your trial ends.
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex-shrink-0"
                  onClick={() => onNavigate('subscribe')}
                >
                  View Plans
                </Button>
              </div>
            </div>
          )}

          {/* KPI Cards - Changes based on warehouse context */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {appState.currentWarehouseId ? (
              <>
                <KPICard
                  title="Stock Flow Overview"
                  value={`₦${inTransitValue.toLocaleString()}`}
                  icon={TrendingUp}
                />
                <KPICard
                  title="Incoming Supplies"
                  value={pendingSupplies}
                  icon={TrendingDown}
                />
                <KPICard
                  title="Dispatched to Branches"
                  value={warehouseToBranchTransfers}
                  icon={ArrowLeftRight}
                />
                <KPICard
                  title="Total Inventory"
                  value={products.length}
                  icon={Package}
                />
              </>
            ) : (
              <>
                <KPICard
                  title="Today's Sales"
                  value={`₦${todaySales.toLocaleString()}`}
                  icon={TrendingUp}
                  trend={{ value: '12.5%', isPositive: true }}
                />
                <KPICard
                  title="In-Transit Value"
                  value={`₦${inTransitValue.toLocaleString()}`}
                  icon={ArrowLeftRight}
                />
                <KPICard
                  title="Low Stock Items"
                  value={lowStockCount}
                  icon={AlertTriangle}
                />
                <KPICard
                  title="Active Cashiers"
                  value={activeCashiers}
                  icon={UserCheck}
                />
              </>
            )}
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {canAccessPage(appState.userRole, 'pos') && (
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onNavigate('pos')}>
                  <ShoppingCart className="w-8 h-8 text-primary mb-3" />
                  <h3 className="mb-2">Open POS Terminal</h3>
                  <p className="text-sm text-muted-foreground">Start processing sales</p>
                </Card>
              )}

              {canAccessPage(appState.userRole, 'transfers') && (
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onNavigate('transfers')}>
                  <ArrowLeftRight className="w-8 h-8 text-primary mb-3" />
                  <h3 className="mb-2">New Transfer</h3>
                  <p className="text-sm text-muted-foreground">Move inventory between branches</p>
                </Card>
              )}

              {canAccessPage(appState.userRole, 'inventory') && (
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onNavigate('inventory')}>
                  <Package className="w-8 h-8 text-primary mb-3" />
                  <h3 className="mb-2">Manage Inventory</h3>
                  <p className="text-sm text-muted-foreground">View and update stock levels</p>
                </Card>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h2 className="mb-4">Recent Activity</h2>
            <Card className="p-6">
              {branchSales.length === 0 && branchTransfers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No recent activity</p>
                  <p className="text-sm">Sales and transfers will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {[...branchSales.slice(0, 5), ...branchTransfers.slice(0, 3)]
                    .sort((a, b) => {
                      const dateA = new Date(a.createdAt || a.created_at || 0).getTime();
                      const dateB = new Date(b.createdAt || b.created_at || 0).getTime();
                      return dateB - dateA;
                    })
                    .slice(0, 8)
                    .map((activity, index) => {
                      // Check if it's a sale (has items array) vs transfer (has sourceBranchId)
                      const isSale = 'items' in activity && !('sourceBranchId' in activity);
                      const activityDate = activity.createdAt || activity.created_at;
                      
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between py-3 border-b last:border-b-0"
                        >
                          <div className="flex items-center gap-3">
                            {isSale ? (
                              <ShoppingCart className="w-5 h-5 text-success" />
                            ) : (
                              <ArrowLeftRight className="w-5 h-5 text-primary" />
                            )}
                            <div>
                              <p className="text-sm">
                                {isSale ? 'Sale completed' : `Transfer ${activity.status}`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {activityDate ? new Date(activityDate).toLocaleString() : 'N/A'}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm">
                            ₦{(isSale ? activity.total : 0).toLocaleString()}
                          </p>
                        </div>
                      );
                    })}
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>

      {/* Branch/Warehouse Context Selector */}
      <BranchWarehouseSelector
        open={showContextSelector}
        onOpenChange={setShowContextSelector}
        branches={branches}
        warehouses={warehouses}
        currentBranchId={appState.currentBranchId}
        currentWarehouseId={appState.currentWarehouseId}
        companyName={appState.companyName}
        userRole={appState.userRole}
        onSwitch={handleContextSwitch}
      />
    </div>
  );
}