import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Calendar,
  User,
  Package,
  TrendingDown,
  TrendingUp,
  Filter,
  Download,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Building2,
  Clock,
  DollarSign,
  ShoppingCart,
  ArrowLeft,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner@2.0.3';
import { format } from 'date-fns';

interface ProductHistoryProps {
  appState: {
    orgId: string | null;
    userId: string | null;
    currentBranchId: string | null;
    userRole: string | null;
  };
  onNavigate?: (page: string) => void;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  category: string | null;
  price: number;
}

interface SaleHistory {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  price: number;
  discount: number;
  sale_date: string;
  cashier_name: string;
  cashier_email: string;
  branch_name: string;
  branch_id: string;
  payment_method: string;
  sale_total: number;
  customer_name: string;
}

interface ProductStats {
  total_sales: number;
  total_quantity: number;
  total_revenue: number;
  avg_sale_price: number;
  first_sale: string | null;
  last_sale: string | null;
  unique_customers: number;
  top_branch: string | null;
  top_cashier: string | null;
}

export default function ProductHistory({ appState, onNavigate }: ProductHistoryProps) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [saleHistory, setSaleHistory] = useState<SaleHistory[]>([]);
  const [productStats, setProductStats] = useState<ProductStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('all'); // all, today, week, month, year
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterCashier, setFilterCashier] = useState('all');
  const [branches, setBranches] = useState<any[]>([]);
  const [cashiers, setCashiers] = useState<any[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'quantity' | 'revenue'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Check authorization
  const isAuthorized = ['owner', 'admin', 'auditor'].includes(appState.userRole || '');

  useEffect(() => {
    if (isAuthorized && appState.orgId) {
      loadProducts();
      loadBranches();
      loadCashiers();
    }
  }, [appState.orgId, isAuthorized]);

  useEffect(() => {
    if (selectedProduct) {
      loadProductHistory();
    }
  }, [selectedProduct, dateRange, filterBranch, filterCashier, sortBy, sortOrder]);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, barcode, category, price')
        .eq('organization_id', appState.orgId)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    }
  };

  const loadBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .eq('organization_id', appState.orgId)
        .order('name');

      if (error) throw error;
      setBranches(data || []);
    } catch (error: any) {
      console.error('Error loading branches:', error);
    }
  };

  const loadCashiers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, name, email')
        .eq('organization_id', appState.orgId)
        .order('name');

      if (error) throw error;
      setCashiers(data || []);
    } catch (error: any) {
      console.error('Error loading cashiers:', error);
    }
  };

  const loadProductHistory = async () => {
    if (!selectedProduct) return;

    setLoading(true);
    try {
      // Build date filter
      let dateFilter = '';
      const now = new Date();
      switch (dateRange) {
        case 'today':
          dateFilter = format(now, 'yyyy-MM-dd');
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateFilter = format(weekAgo, 'yyyy-MM-dd');
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          dateFilter = format(monthAgo, 'yyyy-MM-dd');
          break;
        case 'year':
          const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          dateFilter = format(yearAgo, 'yyyy-MM-dd');
          break;
      }

      // Query sale items with sale details
      let query = supabase
        .from('sale_items')
        .select(`
          id,
          sale_id,
          product_id,
          name,
          sku,
          quantity,
          price,
          discount,
          created_at,
          sales!inner(
            id,
            branch_id,
            organization_id,
            customer_name,
            payment_method,
            total,
            created_at,
            cashier_id,
            processed_by,
            branches!inner(id, name)
          )
        `)
        .eq('product_id', selectedProduct.id)
        .eq('sales.organization_id', appState.orgId); // CRITICAL: Filter by organization

      if (dateRange !== 'all' && dateFilter) {
        query = query.gte('sales.created_at', dateFilter);
      }

      if (filterBranch !== 'all') {
        query = query.eq('sales.branch_id', filterBranch);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get cashier details for all sales
      const cashierIds = [...new Set((data || []).map((item: any) => item.sales.processed_by || item.sales.cashier_id).filter(Boolean))];
      const cashierMap = new Map();
      
      if (cashierIds.length > 0) {
        const { data: cashierData } = await supabase
          .from('user_profiles')
          .select('id, name, email')
          .in('id', cashierIds);
        
        (cashierData || []).forEach(cashier => {
          cashierMap.set(cashier.id, cashier);
        });
      }

      // Transform data
      const history: SaleHistory[] = (data || []).map((item: any) => {
        const cashierId = item.sales.processed_by || item.sales.cashier_id;
        const cashier = cashierMap.get(cashierId);
        
        return {
          id: item.id,
          sale_id: item.sale_id,
          product_id: item.product_id,
          product_name: item.name || selectedProduct.name,
          product_sku: item.sku || selectedProduct.sku,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount || 0,
          sale_date: item.sales.created_at,
          cashier_name: cashier?.name || 'Unknown',
          cashier_email: cashier?.email || '',
          branch_name: item.sales.branches?.name || 'Unknown',
          branch_id: item.sales.branch_id,
          payment_method: item.sales.payment_method,
          sale_total: item.sales.total,
          customer_name: item.sales.customer_name || 'Walk-in Customer',
        };
      });

      // Apply cashier filter
      let filteredHistory = history;
      if (filterCashier !== 'all') {
        filteredHistory = history.filter((h: any) => {
          const cashier = cashiers.find(c => c.name === h.cashier_name);
          return cashier?.id === filterCashier;
        });
      }

      // Sort
      filteredHistory.sort((a, b) => {
        let aVal, bVal;
        switch (sortBy) {
          case 'date':
            aVal = new Date(a.sale_date).getTime();
            bVal = new Date(b.sale_date).getTime();
            break;
          case 'quantity':
            aVal = a.quantity;
            bVal = b.quantity;
            break;
          case 'revenue':
            aVal = a.quantity * a.price;
            bVal = b.quantity * b.price;
            break;
          default:
            aVal = 0;
            bVal = 0;
        }
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      });

      setSaleHistory(filteredHistory);
      calculateStats(filteredHistory);
    } catch (error: any) {
      console.error('Error loading product history:', error);
      toast.error('Failed to load product history');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (history: SaleHistory[]) => {
    if (history.length === 0) {
      setProductStats(null);
      return;
    }

    const totalSales = history.length;
    const totalQuantity = history.reduce((sum, h) => sum + h.quantity, 0);
    const totalRevenue = history.reduce((sum, h) => sum + (h.quantity * h.price * (1 - h.discount / 100)), 0);
    const avgSalePrice = totalRevenue / totalSales;
    
    const dates = history.map(h => new Date(h.sale_date));
    const firstSale = dates.length > 0 ? format(new Date(Math.min(...dates.map(d => d.getTime()))), 'MMM dd, yyyy') : null;
    const lastSale = dates.length > 0 ? format(new Date(Math.max(...dates.map(d => d.getTime()))), 'MMM dd, yyyy') : null;

    const uniqueCustomers = new Set(history.map(h => h.customer_name)).size;

    // Find top branch
    const branchSales: { [key: string]: number } = {};
    history.forEach(h => {
      branchSales[h.branch_name] = (branchSales[h.branch_name] || 0) + h.quantity;
    });
    const topBranch = Object.keys(branchSales).length > 0 
      ? Object.keys(branchSales).reduce((a, b) => branchSales[a] > branchSales[b] ? a : b, '')
      : null;

    // Find top cashier
    const cashierSales: { [key: string]: number } = {};
    history.forEach(h => {
      cashierSales[h.cashier_name] = (cashierSales[h.cashier_name] || 0) + h.quantity;
    });
    const topCashier = Object.keys(cashierSales).length > 0
      ? Object.keys(cashierSales).reduce((a, b) => cashierSales[a] > cashierSales[b] ? a : b, '')
      : null;

    setProductStats({
      total_sales: totalSales,
      total_quantity: totalQuantity,
      total_revenue: totalRevenue,
      avg_sale_price: avgSalePrice,
      first_sale: firstSale,
      last_sale: lastSale,
      unique_customers: uniqueCustomers,
      top_branch: topBranch,
      top_cashier: topCashier,
    });
  };

  const exportToCSV = () => {
    if (!selectedProduct || saleHistory.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = [
      'Date',
      'Time',
      'Product',
      'SKU',
      'Quantity',
      'Price',
      'Discount %',
      'Subtotal',
      'Cashier',
      'Branch',
      'Payment Method',
      'Customer',
      'Sale Total'
    ];

    const rows = saleHistory.map(h => [
      format(new Date(h.sale_date), 'yyyy-MM-dd'),
      format(new Date(h.sale_date), 'HH:mm:ss'),
      h.product_name,
      h.product_sku,
      h.quantity,
      h.price.toFixed(2),
      h.discount,
      (h.quantity * h.price * (1 - h.discount / 100)).toFixed(2),
      h.cashier_name,
      h.branch_name,
      h.payment_method,
      h.customer_name,
      h.sale_total.toFixed(2)
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(c => `\"${c}\"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `product_history_${selectedProduct.sku}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Export successful');
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Alert className="max-w-2xl mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Access Denied. Only Owners, Admins, and Auditors can view product history.
            <br />
            Your role: <strong>{appState.userRole || 'Unknown'}</strong>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onNavigate && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onNavigate('dashboard')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div>
              <h1 className="flex items-center gap-3">
                <History className="h-8 w-8 text-blue-600" />
                Product History Audit
              </h1>
              <p className="text-gray-600 mt-1">
                Track product sales history and audit trail
              </p>
            </div>
          </div>
          {selectedProduct && (
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>

        {/* Product Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Select Product to Audit
            </CardTitle>
            <CardDescription>
              Search and select a product to view its complete sales history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by product name, SKU, or barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Product List */}
              {searchTerm && (
                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  {filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No products found
                    </div>
                  ) : (
                    filteredProducts.map(product => (
                      <div
                        key={product.id}
                        onClick={() => {
                          setSelectedProduct(product);
                          setSearchTerm('');
                        }}
                        className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedProduct?.id === product.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-gray-600">
                              SKU: {product.sku}
                              {product.barcode && ` • Barcode: ${product.barcode}`}
                              {product.category && ` • ${product.category}`}
                            </p>
                          </div>
                          <p className="font-medium text-green-600">
                            ${product.price.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Selected Product */}
              {selectedProduct && !searchTerm && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-blue-900">
                        {selectedProduct.name}
                      </p>
                      <p className="text-sm text-blue-700">
                        SKU: {selectedProduct.sku}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedProduct(null)}
                    >
                      Change Product
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* History and Stats with Tabs */}
        {selectedProduct && (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">
                <BarChart3 className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="transactions">
                <FileText className="h-4 w-4 mr-2" />
                Transactions
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <TrendingUp className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Statistics Cards */}
              {productStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Sales</p>
                          <p className="text-2xl">{productStats.total_sales}</p>
                        </div>
                        <ShoppingCart className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Units Sold</p>
                          <p className="text-2xl">{productStats.total_quantity}</p>
                        </div>
                        <TrendingDown className="h-8 w-8 text-orange-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Revenue</p>
                          <p className="text-2xl">
                            ${productStats.total_revenue.toFixed(2)}
                          </p>
                        </div>
                        <DollarSign className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Avg Sale Value</p>
                          <p className="text-2xl">
                            ${productStats.avg_sale_price.toFixed(2)}
                          </p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-purple-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Product Insights */}
              {productStats && (
                <Card>
                  <CardHeader>
                    <CardTitle>Product Insights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">First Sale</p>
                        <p className="font-medium flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {productStats.first_sale || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Last Sale</p>
                        <p className="font-medium flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          {productStats.last_sale || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Unique Customers</p>
                        <p className="font-medium flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          {productStats.unique_customers}
                        </p>
                      </div>
                      {productStats.top_branch && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Top Selling Branch</p>
                          <p className="font-medium flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            {productStats.top_branch}
                          </p>
                        </div>
                      )}
                      {productStats.top_cashier && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Top Cashier</p>
                          <p className="font-medium flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            {productStats.top_cashier}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {!productStats && (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center text-gray-500">
                      <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No sales data available for this product</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value="transactions" className="space-y-6">
              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filters & Sort
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm mb-2 block">
                        Date Range
                      </label>
                      <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Time</SelectItem>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="week">Last 7 Days</SelectItem>
                          <SelectItem value="month">Last 30 Days</SelectItem>
                          <SelectItem value="year">Last Year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm mb-2 block">
                        Branch
                      </label>
                      <Select value={filterBranch} onValueChange={setFilterBranch}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Branches</SelectItem>
                          {branches.map(branch => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm mb-2 block">
                        Sort By
                      </label>
                      <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="quantity">Quantity</SelectItem>
                          <SelectItem value="revenue">Revenue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm mb-2 block">
                        Sort Order
                      </label>
                      <Select value={sortOrder} onValueChange={(v: any) => setSortOrder(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="desc">Newest First</SelectItem>
                          <SelectItem value="asc">Oldest First</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sales History Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Sales History
                  </CardTitle>
                  <CardDescription>
                    {saleHistory.length} transaction{saleHistory.length !== 1 ? 's' : ''} found
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-4 text-gray-600">Loading history...</p>
                    </div>
                  ) : saleHistory.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No sales history found for this product</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date & Time</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Discount</TableHead>
                            <TableHead>Subtotal</TableHead>
                            <TableHead>Cashier</TableHead>
                            <TableHead>Branch</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Payment</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {saleHistory.map((sale) => {
                            const subtotal = sale.quantity * sale.price * (1 - sale.discount / 100);
                            const isExpanded = expandedRow === sale.id;

                            return (
                              <React.Fragment key={sale.id}>
                                <TableRow className={isExpanded ? 'bg-gray-50' : ''}>
                                  <TableCell>
                                    <div>
                                      <p className="font-medium">
                                        {format(new Date(sale.sale_date), 'MMM dd, yyyy')}
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        {format(new Date(sale.sale_date), 'HH:mm:ss')}
                                      </p>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">
                                      {sale.quantity} units
                                    </Badge>
                                  </TableCell>
                                  <TableCell>${sale.price.toFixed(2)}</TableCell>
                                  <TableCell>
                                    {sale.discount > 0 ? (
                                      <Badge variant="secondary">{sale.discount}%</Badge>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="font-medium text-green-600">
                                    ${subtotal.toFixed(2)}
                                  </TableCell>
                                  <TableCell>
                                    <div>
                                      <p className="font-medium">{sale.cashier_name}</p>
                                      <p className="text-xs text-gray-600">{sale.cashier_email}</p>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{sale.branch_name}</Badge>
                                  </TableCell>
                                  <TableCell>{sale.customer_name}</TableCell>
                                  <TableCell>
                                    <Badge>
                                      {sale.payment_method}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setExpandedRow(isExpanded ? null : sale.id)}
                                    >
                                      {isExpanded ? (
                                        <ChevronUp className="h-4 w-4" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                                {isExpanded && (
                                  <TableRow className="bg-gray-50">
                                    <TableCell colSpan={10}>
                                      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                          <p className="text-sm text-gray-600">Sale ID</p>
                                          <p className="text-sm font-mono">{sale.sale_id.slice(0, 8)}...</p>
                                        </div>
                                        <div>
                                          <p className="text-sm text-gray-600">Product SKU</p>
                                          <p className="text-sm">{sale.product_sku}</p>
                                        </div>
                                        <div>
                                          <p className="text-sm text-gray-600">Sale Total</p>
                                          <p className="text-sm font-medium text-green-600">
                                            ${sale.sale_total.toFixed(2)}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-sm text-gray-600">Payment Method</p>
                                          <p className="text-sm capitalize">{sale.payment_method}</p>
                                        </div>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              {productStats ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Sales Performance</CardTitle>
                        <CardDescription>Key performance metrics</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-sm text-gray-600">Total Transactions</span>
                          <span className="font-medium">{productStats.total_sales}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-sm text-gray-600">Total Units Sold</span>
                          <span className="font-medium">{productStats.total_quantity}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-sm text-gray-600">Total Revenue</span>
                          <span className="font-medium text-green-600">
                            ${productStats.total_revenue.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-gray-600">Average Sale Value</span>
                          <span className="font-medium">
                            ${productStats.avg_sale_price.toFixed(2)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Sales Timeline</CardTitle>
                        <CardDescription>First and last sale dates</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-sm text-gray-600">First Sale Date</span>
                          <span className="font-medium">{productStats.first_sale || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-sm text-gray-600">Last Sale Date</span>
                          <span className="font-medium">{productStats.last_sale || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-sm text-gray-600">Unique Customers</span>
                          <span className="font-medium">{productStats.unique_customers}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-gray-600">Average per Customer</span>
                          <span className="font-medium">
                            {productStats.unique_customers > 0 
                              ? (productStats.total_quantity / productStats.unique_customers).toFixed(1)
                              : '0'} units
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Top Performers</CardTitle>
                      <CardDescription>Best performing branch and cashier</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
                          <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Top Selling Branch</p>
                            <p className="font-medium">{productStats.top_branch || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg">
                          <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            <User className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Top Performing Cashier</p>
                            <p className="font-medium">{productStats.top_cashier || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center text-gray-500">
                      <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No analytics data available</p>
                      <p className="text-sm mt-2">Select a product with sales history to view analytics</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}