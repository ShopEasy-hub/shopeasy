import { useState, useEffect } from 'react';
import { AppState, Page } from '../App';
import { getProducts, getBranchStock } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  ArrowLeft,
  AlertTriangle,
  Calendar,
  Package,
  Clock,
} from 'lucide-react';

interface ShortDatedProps {
  appState: AppState;
  onNavigate: (page: Page) => void;
}

interface ProductWithExpiry {
  id: string;
  name: string;
  sku: string;
  category: string;
  expiryDate: string;
  stock: number;
  daysUntilExpiry: number;
  price: number;
  unitCost: number;
}

export function ShortDated({ appState, onNavigate }: ShortDatedProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [stockLevels, setStockLevels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [warningDays, setWarningDays] = useState(90); // Default 90 days
  const [shortDatedProducts, setShortDatedProducts] = useState<ProductWithExpiry[]>([]);

  useEffect(() => {
    if (appState.orgId) {
      loadData();
    }
  }, [appState.orgId, appState.currentBranchId]);

  useEffect(() => {
    calculateShortDatedProducts();
  }, [products, stockLevels, warningDays]);

  async function loadData() {
    if (!appState.orgId) return;

    try {
      const { products: prods } = await getProducts(appState.orgId);
      console.log('📦 SHORT DATED: Loaded products:', prods);
      console.log('📦 Products with expiry dates:', prods?.filter(p => p.expiryDate).map(p => ({ name: p.name, expiry: p.expiryDate })));
      setProducts(prods || []);

      if (appState.currentBranchId) {
        const { stock } = await getBranchStock(appState.currentBranchId);
        
        // Deduplicate stock entries - keep only latest for each product
        const stockMap = new Map();
        (stock || []).forEach((item: any) => {
          const existing = stockMap.get(item.productId);
          if (!existing || new Date(item.lastUpdated || item.updatedAt || 0) > new Date(existing.lastUpdated || existing.updatedAt || 0)) {
            stockMap.set(item.productId, item);
          }
        });
        
        const uniqueStock = Array.from(stockMap.values());
        console.log('Short Dated - Stock loaded:', uniqueStock.length, 'unique items');
        setStockLevels(uniqueStock);
      } else {
        setStockLevels([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculateShortDatedProducts() {
    console.log('Calculating short dated products...');
    console.log('Total products:', products.length);
    console.log('Stock levels:', stockLevels.length);
    console.log('Warning days:', warningDays);
    
    const today = new Date();
    const warningDate = new Date();
    warningDate.setDate(today.getDate() + warningDays);
    
    console.log('Today:', today.toISOString());
    console.log('Warning date:', warningDate.toISOString());

    const shortDated: ProductWithExpiry[] = [];
    let productsWithExpiry = 0;
    let productsWithStock = 0;
    let productsWithinPeriod = 0;

    products.forEach((product) => {
      if (!product.expiryDate) {
        return;
      }
      
      productsWithExpiry++;
      console.log(`Product ${product.name} (${product.sku}) expires: ${product.expiryDate}`);

      // Parse expiry date - handle both ISO format and simple date strings
      let expiryDate: Date;
      try {
        expiryDate = new Date(product.expiryDate);
        // Check if date is valid
        if (isNaN(expiryDate.getTime())) {
          console.log(`  ⚠️ Invalid date format: ${product.expiryDate}`);
          return;
        }
      } catch (error) {
        console.log(`  ⚠️ Error parsing date: ${product.expiryDate}`, error);
        return;
      }

      // Get stock - handle potential duplicates by taking latest
      const matchingStocks = stockLevels.filter((s) => s.productId === product.id);
      let stock = 0;
      
      if (matchingStocks.length > 0) {
        // If multiple entries, take the one with latest timestamp
        const latestStock = matchingStocks.length > 1 
          ? matchingStocks.sort((a, b) => {
              const timeA = new Date(a.lastUpdated || a.updatedAt || 0).getTime();
              const timeB = new Date(b.lastUpdated || b.updatedAt || 0).getTime();
              return timeB - timeA;
            })[0]
          : matchingStocks[0];
        stock = latestStock?.quantity || 0;
      }
      
      console.log(`  Stock: ${stock}, Expiry date: ${expiryDate.toISOString()}`);

      // Only include products with stock and expiry within warning period
      if (stock > 0) {
        productsWithStock++;
        
        if (expiryDate <= warningDate) {
          productsWithinPeriod++;
          
          const daysUntilExpiry = Math.ceil(
            (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          console.log(`  ✅ SHORT DATED: ${daysUntilExpiry} days until expiry`);

          shortDated.push({
            id: product.id,
            name: product.name,
            sku: product.sku,
            category: product.category || 'Uncategorized',
            expiryDate: product.expiryDate,
            stock,
            daysUntilExpiry,
            price: product.price || 0,
            unitCost: product.unitCost || 0,
          });
        } else {
          console.log(`  ❌ Expiry is beyond warning period (${Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))} days)`);
        }
      } else {
        console.log(`  ❌ No stock available`);
      }
    });

    console.log(`Summary: ${productsWithExpiry} with expiry, ${productsWithStock} with stock, ${productsWithinPeriod} within warning period`);
    console.log(`Found ${shortDated.length} short dated products`);

    // Sort by days until expiry (most urgent first)
    shortDated.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
    setShortDatedProducts(shortDated);
  }

  function getUrgencyColor(days: number): string {
    if (days < 0) return 'text-red-600 dark:text-red-400'; // Expired
    if (days <= 30) return 'text-red-500 dark:text-red-400'; // Critical
    if (days <= 60) return 'text-orange-500 dark:text-orange-400'; // Warning
    return 'text-yellow-600 dark:text-yellow-500'; // Caution
  }

  function getUrgencyBadge(days: number): string {
    if (days < 0) return 'EXPIRED';
    if (days <= 30) return 'CRITICAL';
    if (days <= 60) return 'WARNING';
    return 'CAUTION';
  }

  function getUrgencyBgColor(days: number): string {
    if (days < 0) return 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200';
    if (days <= 30) return 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300';
    if (days <= 60) return 'bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300';
    return 'bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300';
  }

  const totalValue = shortDatedProducts.reduce(
    (sum, p) => sum + p.stock * p.unitCost,
    0
  );

  const expiredCount = shortDatedProducts.filter((p) => p.daysUntilExpiry < 0).length;
  const criticalCount = shortDatedProducts.filter(
    (p) => p.daysUntilExpiry >= 0 && p.daysUntilExpiry <= 30
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading short-dated products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => onNavigate('dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1>Short-Dated Products</h1>
              <p className="text-sm text-muted-foreground">
                Products expiring within {warningDays} days
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-950 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expired</p>
                <p className="text-2xl font-bold">{expiredCount}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-950 rounded-lg">
                <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Critical (≤30d)</p>
                <p className="text-2xl font-bold">{criticalCount}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
                <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{shortDatedProducts.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-950 rounded-lg">
                <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">₦{totalValue.toLocaleString()}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Settings */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <Label htmlFor="warningDays">Warning Period (Days):</Label>
            <Input
              id="warningDays"
              type="number"
              min="1"
              max="365"
              value={warningDays}
              onChange={(e) => setWarningDays(parseInt(e.target.value) || 90)}
              className="w-32"
            />
            <p className="text-sm text-muted-foreground">
              Show products expiring within this many days
            </p>
          </div>
        </Card>

        {/* Products Table */}
        <Card className="overflow-hidden">
          {shortDatedProducts.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex p-4 bg-green-100 dark:bg-green-950 rounded-full mb-4">
                <Package className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-medium mb-2">No Short-Dated Products</h3>
              <p className="text-muted-foreground">
                Great! No products are expiring within the next {warningDays} days
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Days Left</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Total Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shortDatedProducts.map((product) => (
                    <TableRow key={product.id} className={product.daysUntilExpiry < 0 ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                      <TableCell>
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs ${getUrgencyBgColor(
                            product.daysUntilExpiry
                          )}`}
                        >
                          {getUrgencyBadge(product.daysUntilExpiry)}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-muted-foreground">{product.sku}</TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell>{product.stock}</TableCell>
                      <TableCell>
                        {new Date(product.expiryDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <span className={getUrgencyColor(product.daysUntilExpiry)}>
                          {product.daysUntilExpiry < 0
                            ? `${Math.abs(product.daysUntilExpiry)} days ago`
                            : `${product.daysUntilExpiry} days`}
                        </span>
                      </TableCell>
                      <TableCell>₦{product.unitCost.toFixed(2)}</TableCell>
                      <TableCell>
                        ₦{(product.stock * product.unitCost).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        {/* Action Recommendations */}
        {shortDatedProducts.length > 0 && (
          <Card className="p-6">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Recommended Actions
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>
                  <strong>Expired products ({expiredCount}):</strong> Remove from inventory immediately for safety compliance
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>
                  <strong>Critical products ({criticalCount}):</strong> Offer discounts or promotions to clear stock
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>
                  <strong>Transfer:</strong> Move short-dated items to high-traffic branches
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>
                  <strong>Purchasing:</strong> Adjust reorder quantities to prevent future waste
                </span>
              </li>
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
