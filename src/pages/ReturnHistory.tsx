import { useState, useEffect } from 'react';
import { AppState, Page } from '../App';
import { getReturns, getBranchStock } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import {
  ArrowLeft,
  Search,
  RotateCcw,
  Calendar,
  Package,
  DollarSign,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react';

interface ReturnHistoryProps {
  appState: AppState;
  onNavigate: (page: Page) => void;
}

interface Return {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  reason: string;
  refund_amount: number;
  status: string;
  created_at: string;
  branch?: {
    name: string;
  };
  product?: {
    name: string;
    sku: string;
  };
  processed_by?: string;
}

export function ReturnHistory({ appState, onNavigate }: ReturnHistoryProps) {
  const [returns, setReturns] = useState<Return[]>([]);
  const [filteredReturns, setFilteredReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [expandedReturn, setExpandedReturn] = useState<string | null>(null);

  useEffect(() => {
    loadReturns();
  }, [appState.orgId, appState.currentBranchId]);

  useEffect(() => {
    filterReturns();
  }, [returns, searchQuery, statusFilter, dateFilter]);

  async function loadReturns() {
    if (!appState.orgId) return;

    setLoading(true);
    try {
      const data = await getReturns(appState.orgId, appState.currentBranchId);
      console.log('📊 Returns loaded:', data);
      setReturns(data);
      setFilteredReturns(data);
    } catch (error) {
      console.error('Error loading returns:', error);
      alert('Failed to load returns: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function fixOldReturnsStatus() {
    if (!confirm('This will update all pending returns to completed status.\n\nStock was already added back when returns were processed, so this is safe.\n\nContinue?')) {
      return;
    }

    setLoading(true);
    try {
      const { supabase } = await import('../lib/supabase');
      
      // Update all pending returns to completed
      const { data, error } = await supabase
        .from('returns')
        .update({ status: 'completed' })
        .eq('organization_id', appState.orgId)
        .eq('status', 'pending')
        .select();

      if (error) throw error;

      console.log('✅ Updated returns:', data);
      
      // Reload returns
      await loadReturns();
      
      alert(`✅ Success!\n\nUpdated ${data?.length || 0} returns from pending to completed.`);
    } catch (error: any) {
      console.error('Error fixing returns:', error);
      alert('Failed to update returns: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  function filterReturns() {
    let filtered = [...returns];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.product?.name?.toLowerCase().includes(query) ||
        r.product?.sku?.toLowerCase().includes(query) ||
        r.reason?.toLowerCase().includes(query) ||
        r.sale_id?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(r => new Date(r.created_at) >= filterDate);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(r => new Date(r.created_at) >= filterDate);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(r => new Date(r.created_at) >= filterDate);
          break;
      }
    }

    setFilteredReturns(filtered);
  }

  function exportToCSV() {
    if (filteredReturns.length === 0) {
      alert('No returns to export');
      return;
    }

    const headers = ['Date', 'Product', 'SKU', 'Quantity', 'Refund Amount', 'Reason', 'Status', 'Branch'];
    const rows = filteredReturns.map(r => [
      new Date(r.created_at).toLocaleDateString(),
      r.product?.name || 'N/A',
      r.product?.sku || 'N/A',
      r.quantity,
      r.refund_amount,
      r.reason || 'N/A',
      r.status,
      r.branch?.name || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `returns-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  const totalRefunds = filteredReturns.reduce((sum, r) => sum + parseFloat(r.refund_amount.toString()), 0);
  const totalItems = filteredReturns.reduce((sum, r) => sum + r.quantity, 0);
  const pendingCount = returns.filter(r => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => onNavigate('dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl">Return History</h1>
              <p className="text-sm text-muted-foreground">View and manage product returns</p>
            </div>
          </div>
          <div className="flex gap-2">
            {pendingCount > 0 && (
              <Button onClick={fixOldReturnsStatus} variant="outline" size="sm" className="bg-yellow-500/10 border-yellow-500/20 text-yellow-700 hover:bg-yellow-500/20">
                <RotateCcw className="w-4 h-4 mr-2" />
                Fix {pendingCount} Pending
              </Button>
            )}
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-7xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Returns</p>
                <p className="text-2xl font-bold">{filteredReturns.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Items Returned</p>
                <p className="text-2xl font-bold">{totalItems}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Refunds</p>
                <p className="text-2xl font-bold">₦{totalRefunds.toLocaleString()}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by product, SKU, reason, or sale ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-background"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-background"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <Button variant="outline" onClick={loadReturns}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </Card>

        {/* Returns List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-muted-foreground">Loading returns...</p>
          </div>
        ) : filteredReturns.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <RotateCcw className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="mb-2">No returns found</p>
            <p className="text-sm">
              {searchQuery || statusFilter !== 'all' || dateFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Returns will appear here when customers return products'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReturns.map((returnItem) => (
              <Card key={returnItem.id} className="overflow-hidden">
                <div
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedReturn(expandedReturn === returnItem.id ? null : returnItem.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Package className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">{returnItem.product?.name || 'Unknown Product'}</h3>
                          <p className="text-sm text-muted-foreground">SKU: {returnItem.product?.sku || 'N/A'}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Quantity</p>
                          <p className="font-medium">{returnItem.quantity} units</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Refund</p>
                          <p className="font-medium text-red-600">₦{parseFloat(returnItem.refund_amount.toString()).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Date</p>
                          <p className="font-medium">{new Date(returnItem.created_at).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Status</p>
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                            returnItem.status === 'completed' ? 'bg-green-500/10 text-green-600' :
                            returnItem.status === 'pending' ? 'bg-yellow-500/10 text-yellow-600' :
                            'bg-red-500/10 text-red-600'
                          }`}>
                            {returnItem.status || 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button variant="ghost" size="icon">
                      {expandedReturn === returnItem.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {expandedReturn === returnItem.id && (
                  <div className="border-t bg-muted/30 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Return Details</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Return ID:</span>
                            <span className="font-mono">{returnItem.id.slice(0, 8)}...</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Sale ID:</span>
                            <span className="font-mono">{returnItem.sale_id?.slice(0, 8) || 'N/A'}...</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Branch:</span>
                            <span>{returnItem.branch?.name || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Time:</span>
                            <span>{new Date(returnItem.created_at).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Return Reason</h4>
                        <div className="bg-background rounded-lg p-3 text-sm">
                          {returnItem.reason || 'No reason provided'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}