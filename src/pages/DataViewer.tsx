import { useState } from 'react';
import { AppState, Page } from '../App';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ArrowLeft, Search, Database, Eye, RefreshCw } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { getAccessToken } from '../lib/api';

interface DataViewerProps {
  appState: AppState;
  onNavigate: (page: Page) => void;
}

export function DataViewer({ appState, onNavigate }: DataViewerProps) {
  const [loading, setLoading] = useState(false);
  const [searchKey, setSearchKey] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function searchData() {
    if (!searchKey.trim()) {
      alert('Please enter a search key or prefix');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const token = getAccessToken();
      const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-088c2cd9`;
      
      // Try to get data by prefix
      let searchPattern = searchKey;
      
      // If searching for stock, add current branch context
      if (searchKey.startsWith('stock') && appState.currentBranchId && !searchKey.includes(':')) {
        searchPattern = `stock:${appState.currentBranchId}`;
      }
      
      // If searching for products, add org context
      if (searchKey.startsWith('product') && appState.orgId && !searchKey.includes(':')) {
        searchPattern = `product:`;
      }

      console.log('🔍 Searching for:', searchPattern);

      // Fetch using a simple query endpoint (if it exists)
      // Note: This is a mock - you'll need to implement this endpoint in your backend
      const response = await fetch(`${baseUrl}/debug/search?key=${encodeURIComponent(searchPattern)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // If debug endpoint doesn't exist, try direct queries for common patterns
        if (searchPattern.startsWith('stock:')) {
          const { getBranchStock } = await import('../lib/api');
          const branchId = searchPattern.split(':')[1] || appState.currentBranchId;
          const { stock } = await getBranchStock(branchId);
          setResults(stock.map((s: any) => ({
            key: `stock:${s.branchId}:${s.productId}`,
            value: s
          })));
          return;
        } else if (searchPattern.startsWith('product:')) {
          const { getProducts } = await import('../lib/api');
          const { products } = await getProducts(appState.orgId!);
          setResults(products.map((p: any) => ({
            key: `product:${p.id}`,
            value: p
          })));
          return;
        } else {
          throw new Error(`Debug endpoint not available. Try:\n- stock: (for stock data)\n- product: (for product data)`);
        }
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Failed to search data');
    } finally {
      setLoading(false);
    }
  }

  async function quickSearch(pattern: string) {
    setSearchKey(pattern);
    // Delay slightly to allow state to update
    setTimeout(() => searchData(), 100);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => onNavigate('dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1>Database Data Viewer</h1>
            <p className="text-sm text-muted-foreground">
              View raw data from the Supabase PostgreSQL database
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Info Card */}
          <Card className="p-6 bg-blue-50 dark:bg-blue-950/20 border-blue-200">
            <div className="flex gap-3">
              <Eye className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  View actual data stored in Supabase
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Search for stock, products, or any other data by key prefix. This helps debug
                  if data is actually being saved to the database.
                </p>
              </div>
            </div>
          </Card>

          {/* Current Context */}
          <Card className="p-6">
            <h2 className="text-lg mb-4 flex items-center gap-2">
              <Database className="w-5 h-5" />
              Current Context
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Organization ID</p>
                <p className="font-mono text-xs">{appState.orgId || 'Not set'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Branch ID</p>
                <p className="font-mono text-xs">{appState.currentBranchId || 'Not set'}</p>
              </div>
            </div>
          </Card>

          {/* Quick Search Buttons */}
          <Card className="p-6">
            <h3 className="font-medium mb-3">Quick Searches</h3>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickSearch('stock:')}
                disabled={!appState.currentBranchId}
              >
                <Database className="w-4 h-4 mr-2" />
                Current Branch Stock
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickSearch('product:')}
                disabled={!appState.orgId}
              >
                <Database className="w-4 h-4 mr-2" />
                All Products
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickSearch(`org:${appState.orgId}`)}
                disabled={!appState.orgId}
              >
                <Database className="w-4 h-4 mr-2" />
                Organization Data
              </Button>
            </div>
          </Card>

          {/* Search Form */}
          <Card className="p-6">
            <h2 className="text-lg mb-4 flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search Database
            </h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="searchKey">Search Key or Prefix</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="searchKey"
                    placeholder="e.g., stock:, product:, org:"
                    value={searchKey}
                    onChange={(e) => setSearchKey(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchData()}
                  />
                  <Button onClick={searchData} disabled={loading}>
                    {loading ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4 mr-2" />
                    )}
                    Search
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Common prefixes: stock: | product: | org: | user: | transfer: | sale:
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Results */}
          {results.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg mb-4">
                Results ({results.length})
              </h2>
              <div className="space-y-3">
                {results.map((item, index) => (
                  <details key={index} className="border rounded-lg">
                    <summary className="p-4 cursor-pointer hover:bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <code className="text-sm font-mono">{item.key}</code>
                        <span className="text-xs text-muted-foreground">
                          {typeof item.value === 'object' ? 
                            `${Object.keys(item.value).length} fields` : 
                            typeof item.value
                          }
                        </span>
                      </div>
                    </summary>
                    <div className="p-4 pt-0">
                      <pre className="p-4 bg-muted rounded text-xs overflow-auto">
                        {JSON.stringify(item.value, null, 2)}
                      </pre>
                    </div>
                  </details>
                ))}
              </div>
            </Card>
          )}

          {results.length === 0 && !loading && !error && searchKey && (
            <Card className="p-12 text-center">
              <Database className="w-16 h-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground">No results found</p>
              <p className="text-sm text-muted-foreground">
                Try a different search key or check if data exists
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
