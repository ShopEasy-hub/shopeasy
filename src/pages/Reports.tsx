import { useState, useEffect } from 'react';
import { AppState, Page } from '../App';
import { getSales, getProducts } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  ArrowLeft, 
  Download, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Package,
  TrendingDown,
  Wallet,
  CreditCard,
  ArrowUpRight,
  Calendar,
  Search,
  Filter,
  Users,
  Phone,
  ArrowRightLeft,
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';

interface ReportsProps {
  appState: AppState;
  onNavigate: (page: Page) => void;
}

type DateRange = 'today' | 'week' | 'month' | 'year';

export function Reports({ appState, onNavigate }: ReportsProps) {
  const [sales, setSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('week');
  const [specificDate, setSpecificDate] = useState('');
  const [useSpecificDate, setUseSpecificDate] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  useEffect(() => {
    if (appState.orgId) {
      loadData();
    }
  }, [appState.orgId]);

  async function loadData() {
    if (!appState.orgId) return;

    try {
      const [{ sales: salesData }, { products: productsData }] = await Promise.all([
        getSales(appState.orgId),
        getProducts(appState.orgId)
      ]);
      setSales(salesData || []);
      setProducts(productsData || []);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  }

  // Filter sales by date range
  const getFilteredSalesByDate = () => {
    const now = new Date();
    const filtered = sales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      
      // Check if using specific date
      if (useSpecificDate && specificDate) {
        const selectedDate = new Date(specificDate);
        return saleDate.toDateString() === selectedDate.toDateString();
      }
      
      switch (dateRange) {
        case 'today':
          return saleDate.toDateString() === now.toDateString();
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return saleDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          return saleDate >= monthAgo;
        case 'year':
          const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          return saleDate >= yearAgo;
        default:
          return true;
      }
    });
    return filtered;
  };

  // Apply all filters
  const getFilteredSales = () => {
    let filtered = getFilteredSalesByDate();

    // Payment method filter
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(sale => 
        (sale.paymentMethod || 'cash') === paymentFilter
      );
    }

    // Amount range filter
    if (minAmount) {
      filtered = filtered.filter(sale => 
        (sale.total || 0) >= parseFloat(minAmount)
      );
    }
    if (maxAmount) {
      filtered = filtered.filter(sale => 
        (sale.total || 0) <= parseFloat(maxAmount)
      );
    }

    // Search filter (customer name, phone, or sale ID)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(sale => 
        sale.id.toLowerCase().includes(query) ||
        (sale.customer && sale.customer.toLowerCase().includes(query)) ||
        (sale.customerPhone && sale.customerPhone.toLowerCase().includes(query))
      );
    }

    return filtered;
  };

  const filteredSales = getFilteredSales();

  // Calculate metrics
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
  const totalOrders = filteredSales.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Calculate profit/loss
  const calculateProfitLoss = () => {
    let totalCost = 0;
    let totalSales = 0;

    filteredSales.forEach(sale => {
      sale.items?.forEach((item: any) => {
        const productId = item.product_id || item.productId;
        const product = products.find(p => p.id === productId);
        if (product) {
          const unitCost = product.unit_cost || product.unitCost || 0;
          const quantity = item.quantity || 0;
          const sellingPrice = item.price || 0;
          
          const itemCost = unitCost * quantity;
          const itemRevenue = sellingPrice * quantity;
          totalCost += itemCost;
          totalSales += itemRevenue;
        }
      });
    });

    return {
      cost: totalCost,
      sales: totalSales,
      profit: totalSales - totalCost,
      margin: totalSales > 0 ? ((totalSales - totalCost) / totalSales) * 100 : 0
    };
  };

  const profitLoss = calculateProfitLoss();

  // Payment method breakdown
  const paymentMethodBreakdown = filteredSales.reduce((acc: any, sale) => {
    const method = sale.paymentMethod || 'cash';
    if (!acc[method]) {
      acc[method] = { count: 0, amount: 0 };
    }
    acc[method].count += 1;
    acc[method].amount += sale.total || 0;
    return acc;
  }, {});

  const paymentChartData = Object.entries(paymentMethodBreakdown).map(([method, data]: [string, any]) => ({
    name: method.charAt(0).toUpperCase() + method.slice(1),
    value: data.amount,
    count: data.count
  }));

  const COLORS = {
    cash: '#10b981',
    transfer: '#0d7c8d',
    pos: '#f59e0b'
  };

  // Group sales by date for charts
  const getSalesGroupedByPeriod = () => {
    const grouped: any = {};
    
    filteredSales.forEach(sale => {
      const date = new Date(sale.createdAt);
      let key = '';

      switch (dateRange) {
        case 'today':
          key = date.getHours() + ':00';
          break;
        case 'week':
          key = date.toLocaleDateString('en-US', { weekday: 'short' });
          break;
        case 'month':
          key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          break;
        case 'year':
          key = date.toLocaleDateString('en-US', { month: 'short' });
          break;
      }

      if (!grouped[key]) {
        grouped[key] = { 
          date: key, 
          sales: 0, 
          revenue: 0, 
          cost: 0,
          profit: 0,
          orders: 0
        };
      }
      
      grouped[key].orders += 1;
      grouped[key].revenue += sale.total || 0;

      // Calculate cost and profit
      sale.items?.forEach((item: any) => {
        const productId = item.product_id || item.productId;
        const product = products.find(p => p.id === productId);
        if (product) {
          const unitCost = product.unit_cost || product.unitCost || 0;
          const quantity = item.quantity || 0;
          const sellingPrice = item.price || 0;
          
          const itemCost = unitCost * quantity;
          const itemRevenue = sellingPrice * quantity;
          grouped[key].cost += itemCost;
          grouped[key].profit += itemRevenue - itemCost;
        }
      });
    });

    return Object.values(grouped);
  };

  const chartData = getSalesGroupedByPeriod();

  // Top customers
  const getTopCustomers = () => {
    const customerStats: any = {};

    filteredSales.forEach(sale => {
      const customer = sale.customerName || sale.customer_name || sale.customer || 'Walk-in Customer';
      const phone = sale.customerPhone || sale.customer_phone || '';
      const key = `${customer}|${phone}`;

      if (!customerStats[key]) {
        customerStats[key] = {
          name: customer,
          phone: phone,
          purchases: 0,
          totalSpent: 0,
          avgOrder: 0
        };
      }

      customerStats[key].purchases += 1;
      customerStats[key].totalSpent += sale.total || 0;
    });

    return Object.values(customerStats)
      .map((c: any) => ({
        ...c,
        avgOrder: c.totalSpent / c.purchases
      }))
      .filter((c: any) => c.name !== 'Walk-in Customer')
      .sort((a: any, b: any) => b.totalSpent - a.totalSpent)
      .slice(0, 10);
  };

  const topCustomers = getTopCustomers();

  // Top products by revenue
  const getTopProducts = () => {
    const productSales: any = {};

    filteredSales.forEach(sale => {
      sale.items?.forEach((item: any) => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            id: item.productId,
            name: item.name,
            quantity: 0,
            revenue: 0,
            cost: 0
          };
        }
        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].revenue += item.price * item.quantity;

        const product = products.find(p => p.id === item.productId);
        if (product) {
          productSales[item.productId].cost += (product.unitCost || 0) * item.quantity;
        }
      });
    });

    return Object.values(productSales)
      .map((p: any) => ({ ...p, profit: p.revenue - p.cost }))
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 10);
  };

  const topProducts = getTopProducts();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card border-b px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => onNavigate('dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1>Reports & Analytics</h1>
              <p className="text-sm text-muted-foreground">
                Sales analysis, profit tracking, and performance insights
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Specific Date Picker */}
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={specificDate}
                onChange={(e) => {
                  setSpecificDate(e.target.value);
                  setUseSpecificDate(!!e.target.value);
                }}
                className="w-[160px]"
                placeholder="Select date"
              />
              {specificDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSpecificDate('');
                    setUseSpecificDate(false);
                  }}
                >
                  Clear
                </Button>
              )}
            </div>

            <div className="h-6 w-px bg-border" />

            <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
              <Button
                variant={!useSpecificDate && dateRange === 'today' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setDateRange('today');
                  setUseSpecificDate(false);
                  setSpecificDate('');
                }}
                disabled={useSpecificDate}
              >
                <Calendar className="w-4 h-4 mr-1" />
                Today
              </Button>
              <Button
                variant={!useSpecificDate && dateRange === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setDateRange('week');
                  setUseSpecificDate(false);
                  setSpecificDate('');
                }}
                disabled={useSpecificDate}
              >
                Week
              </Button>
              <Button
                variant={!useSpecificDate && dateRange === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setDateRange('month');
                  setUseSpecificDate(false);
                  setSpecificDate('');
                }}
                disabled={useSpecificDate}
              >
                Month
              </Button>
              <Button
                variant={!useSpecificDate && dateRange === 'year' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setDateRange('year');
                  setUseSpecificDate(false);
                  setSpecificDate('');
                }}
                disabled={useSpecificDate}
              >
                Year
              </Button>
            </div>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search customer, phone, or sale ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="pos">POS</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="number"
            placeholder="Min amount"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            className="w-[120px]"
          />

          <Input
            type="number"
            placeholder="Max amount"
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
            className="w-[120px]"
          />

          {(searchQuery || paymentFilter !== 'all' || minAmount || maxAmount) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setPaymentFilter('all');
                setMinAmount('');
                setMaxAmount('');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
            <p className="text-2xl">₦{totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredSales.length} of {sales.length} sales
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div className={`flex items-center gap-1 text-sm ${profitLoss.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {profitLoss.profit >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span>{profitLoss.margin.toFixed(1)}%</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Gross Profit</p>
            <p className={`text-2xl ${profitLoss.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₦{profitLoss.profit.toLocaleString()}
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-accent" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Total Orders</p>
            <p className="text-2xl">{totalOrders}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Avg Order Value</p>
            <p className="text-2xl">₦{avgOrderValue.toFixed(0)}</p>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="payment">Payment Methods</TabsTrigger>
            <TabsTrigger value="customers">Top Customers</TabsTrigger>
            <TabsTrigger value="products">Top Products</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue & Profit Trend */}
              <Card className="p-6">
                <h2 className="mb-6">Revenue & Profit Trend</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d7c8d" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#0d7c8d" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any) => `₦${value.toLocaleString()}`}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#0d7c8d" 
                      fillOpacity={1} 
                      fill="url(#colorRevenue)"
                      name="Revenue (₦)"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="profit" 
                      stroke="#10b981" 
                      fillOpacity={1} 
                      fill="url(#colorProfit)"
                      name="Profit (₦)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              {/* Daily Orders */}
              <Card className="p-6">
                <h2 className="mb-6">Orders Volume</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="orders" fill="#0d7c8d" name="Orders" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Cost vs Revenue */}
              <Card className="p-6">
                <h2 className="mb-6">Cost vs Revenue Analysis</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any) => `₦${value.toLocaleString()}`}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#0d7c8d" 
                      strokeWidth={2}
                      name="Revenue (₦)"
                      dot={{ r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cost" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      name="Cost (₦)"
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              {/* Profit Margin Breakdown */}
              <Card className="p-6">
                <h2 className="mb-6">Financial Summary</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Revenue</p>
                        <p className="text-lg">₦{profitLoss.sales.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Cost</p>
                        <p className="text-lg text-red-600">₦{profitLoss.cost.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-green-500/10 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Gross Profit</p>
                        <p className="text-lg text-green-600">₦{profitLoss.profit.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Margin</p>
                      <p className="text-lg text-green-600">{profitLoss.margin.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Payment Methods Tab */}
          <TabsContent value="payment" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h2 className="mb-6">Payment Method Distribution</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={paymentChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS] || '#94a3b8'} 
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => `₦${value.toLocaleString()}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6">
                <h2 className="mb-6">Payment Method Breakdown</h2>
                <div className="space-y-4">
                  {paymentChartData.map((method, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ 
                            backgroundColor: `${COLORS[method.name.toLowerCase() as keyof typeof COLORS] || '#94a3b8'}20` 
                          }}
                        >
                          {method.name.toLowerCase() === 'cash' && <Wallet className="w-5 h-5" style={{ color: COLORS.cash }} />}
                          {method.name.toLowerCase() === 'pos' && <CreditCard className="w-5 h-5" style={{ color: COLORS.pos }} />}
                          {method.name.toLowerCase() === 'transfer' && <ArrowRightLeft className="w-5 h-5" style={{ color: COLORS.transfer }} />}
                        </div>
                        <div>
                          <p className="font-medium">{method.name}</p>
                          <p className="text-sm text-muted-foreground">{method.count} transactions</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg">₦{method.value.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">
                          {((method.value / totalRevenue) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}

                  {paymentChartData.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>No payment data available</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Top Customers Tab */}
          <TabsContent value="customers" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2>Top Customers</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{topCustomers.length} customers</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left p-3 text-sm">#</th>
                      <th className="text-left p-3 text-sm">Customer</th>
                      <th className="text-left p-3 text-sm">Phone</th>
                      <th className="text-right p-3 text-sm">Purchases</th>
                      <th className="text-right p-3 text-sm">Total Spent</th>
                      <th className="text-right p-3 text-sm">Avg Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCustomers.map((customer: any, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="p-3 text-sm">{index + 1}</td>
                        <td className="p-3 text-sm font-medium">{customer.name}</td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {customer.phone || '-'}
                        </td>
                        <td className="p-3 text-sm text-right">{customer.purchases}</td>
                        <td className="p-3 text-sm text-right text-primary font-medium">
                          ₦{customer.totalSpent.toLocaleString()}
                        </td>
                        <td className="p-3 text-sm text-right">
                          ₦{customer.avgOrder.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {topCustomers.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No customer data available</p>
                    <p className="text-sm mt-2">Add customer names during sales to track top buyers</p>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Top Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <Card className="p-6">
              <h2 className="mb-6">Top Performing Products</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left p-3 text-sm">#</th>
                      <th className="text-left p-3 text-sm">Product</th>
                      <th className="text-right p-3 text-sm">Qty Sold</th>
                      <th className="text-right p-3 text-sm">Revenue</th>
                      <th className="text-right p-3 text-sm">Cost</th>
                      <th className="text-right p-3 text-sm">Profit</th>
                      <th className="text-right p-3 text-sm">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((product: any, index) => {
                      const margin = product.revenue > 0 ? ((product.profit / product.revenue) * 100) : 0;
                      return (
                        <tr key={product.id} className="border-b hover:bg-muted/50">
                          <td className="p-3 text-sm">{index + 1}</td>
                          <td className="p-3 text-sm font-medium">{product.name}</td>
                          <td className="p-3 text-sm text-right">{product.quantity}</td>
                          <td className="p-3 text-sm text-right">₦{product.revenue.toLocaleString()}</td>
                          <td className="p-3 text-sm text-right text-red-600">₦{product.cost.toLocaleString()}</td>
                          <td className={`p-3 text-sm text-right ${product.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ₦{product.profit.toLocaleString()}
                          </td>
                          <td className={`p-3 text-sm text-right ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {margin.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {topProducts.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No product data available</p>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <Card className="p-6">
              <h2 className="mb-4">Sales History</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left p-3 text-sm">Sale ID</th>
                      <th className="text-left p-3 text-sm">Date & Time</th>
                      <th className="text-left p-3 text-sm">Customer</th>
                      <th className="text-left p-3 text-sm">Phone</th>
                      <th className="text-left p-3 text-sm">Items</th>
                      <th className="text-right p-3 text-sm">Total</th>
                      <th className="text-right p-3 text-sm">Profit</th>
                      <th className="text-left p-3 text-sm">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map((sale) => {
                      let saleCost = 0;
                      let saleRevenue = 0;
                      sale.items?.forEach((item: any) => {
                        const productId = item.product_id || item.productId;
                        const product = products.find(p => p.id === productId);
                        if (product) {
                          const unitCost = product.unit_cost || product.unitCost || 0;
                          const quantity = item.quantity || 0;
                          const sellingPrice = item.price || 0;
                          
                          saleCost += unitCost * quantity;
                          saleRevenue += sellingPrice * quantity;
                        }
                      });
                      const saleProfit = saleRevenue - saleCost;

                      return (
                        <tr key={sale.id} className="border-b hover:bg-muted/50">
                          <td className="p-3 text-sm font-mono">
                            {sale.id.substring(0, 12)}...
                          </td>
                          <td className="p-3 text-sm">
                            {new Date(sale.createdAt).toLocaleString()}
                          </td>
                          <td className="p-3 text-sm">{sale.customer || 'Walk-in'}</td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {sale.customerPhone || '-'}
                          </td>
                          <td className="p-3 text-sm">{sale.items?.length || 0}</td>
                          <td className="p-3 text-sm text-right font-medium">
                            ₦{(sale.total || 0).toLocaleString()}
                          </td>
                          <td className={`p-3 text-sm text-right ${saleProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ₦{saleProfit.toLocaleString()}
                          </td>
                          <td className="p-3 text-sm">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs capitalize" 
                              style={{
                                backgroundColor: `${COLORS[(sale.paymentMethod || 'cash') as keyof typeof COLORS] || '#94a3b8'}20`,
                                color: COLORS[(sale.paymentMethod || 'cash') as keyof typeof COLORS] || '#64748b'
                              }}
                            >
                              {sale.paymentMethod || 'cash'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {filteredSales.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No transactions match your filters</p>
                    <p className="text-sm mt-2">Try adjusting the search or filter criteria</p>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}