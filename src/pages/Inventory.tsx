import { useState, useEffect } from 'react';
import { AppState, Page } from '../App';
import { getProducts, deleteProduct, updateProduct, createProduct, getBranchStock, updateStock } from '../lib/api';
import { canDeleteFeature } from '../lib/permissions';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  ArrowLeft,
  Plus,
  Search,
  Edit,
  Package,
  AlertTriangle,
  CheckCircle2,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  Trash2,
  Camera,
} from 'lucide-react';

interface InventoryProps {
  appState: AppState;
  onNavigate: (page: Page) => void;
}

export function Inventory({ appState, onNavigate }: InventoryProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [stockLevels, setStockLevels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState(false);
  const [showAdjustStock, setShowAdjustStock] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const [stockAdjustment, setStockAdjustment] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    barcode: '',
    category: '',
    price: '',
    unitCost: '',
    reorderLevel: '',
    taxRate: '',
    expiryDate: '',
    initialStock: '',
  });

  useEffect(() => {
    if (appState.orgId && appState.currentBranchId) {
      console.log('Loading inventory for branch:', appState.currentBranchId);
      loadData();
    } else if (appState.orgId && !appState.currentBranchId) {
      // Org exists but no branch selected
      console.warn('⚠️ Organization exists but no branch selected');
      setLoading(false);
    }
  }, [appState.orgId, appState.currentBranchId, appState.currentWarehouseId]);

  async function loadData() {
    if (!appState.orgId) return;

    try {
      const prods = await getProducts(appState.orgId);
      console.log('📦 RAW PRODUCTS from API:', prods);
      console.log('📦 Products array:', prods?.products);
      setProducts(prods?.products || []);

      if (appState.currentBranchId) {
        const { stock } = await getBranchStock(appState.currentBranchId);
        console.log('📦 RAW STOCK from API:', stock);
        
        // Deduplicate stock entries - keep only latest for each product
        const stockMap = new Map();
        (stock || []).forEach((item: any) => {
          const existing = stockMap.get(item.productId);
          if (!existing || new Date(item.lastUpdated || 0) > new Date(existing.lastUpdated || 0)) {
            stockMap.set(item.productId, item);
          }
        });
        
        const uniqueStock = Array.from(stockMap.values());
        console.log('📦 DEDUPLICATED STOCK:', uniqueStock);
        console.log('📦 Stock by ProductID:', Object.fromEntries(uniqueStock.map(s => [s.productId, s.quantity])));
        setStockLevels(uniqueStock);
      } else {
        setStockLevels([]);
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
      alert('Failed to load inventory: ' + (error.message || error));
    } finally {
      setLoading(false);
    }
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!appState.orgId || !appState.currentBranchId) return;

    try {
      console.log('Creating product with initial stock:', newProduct.initialStock);
      
      // Create the product first
      const result = await createProduct(appState.orgId, {
        name: newProduct.name,
        sku: newProduct.sku,
        barcode: newProduct.barcode,
        category: newProduct.category,
        price: parseFloat(newProduct.price),
        unitCost: parseFloat(newProduct.unitCost),
        reorderLevel: parseInt(newProduct.reorderLevel),
        taxRate: parseFloat(newProduct.taxRate || '0'),
        expiryDate: newProduct.expiryDate || null,
      });

      console.log('Product created:', result);

      // If initial stock is provided, add it to the current branch
      const initialStock = parseInt(newProduct.initialStock || '0');
      if (initialStock > 0 && result.product?.id) {
        console.log('Adding initial stock:', initialStock, 'to branch:', appState.currentBranchId);
        
        const stockResult = await updateStock(
          appState.currentBranchId,
          result.product.id,
          initialStock,
          'set'
        );
        
        console.log('Initial stock added:', stockResult);
      }

      setShowAddProduct(false);
      setNewProduct({
        name: '',
        sku: '',
        barcode: '',
        category: '',
        price: '',
        unitCost: '',
        reorderLevel: '',
        taxRate: '',
        expiryDate: '',
        initialStock: '',
      });
      
      // Reload data to show new product with stock
      await loadData();
      
      alert(`Product created successfully!${initialStock > 0 ? ` Initial stock of ${initialStock} added.` : ''}`);
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Failed to create product: ' + (error.message || 'Unknown error'));
    }
  }

  async function handleEditProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      console.log('Updating product:', selectedProduct);
      
      const result = await updateProduct(selectedProduct.id, {
        name: selectedProduct.name,
        sku: selectedProduct.sku,
        barcode: selectedProduct.barcode,
        category: selectedProduct.category,
        price: parseFloat(selectedProduct.price),
        unitCost: parseFloat(selectedProduct.unitCost),
        reorderLevel: parseInt(selectedProduct.reorderLevel),
        taxRate: parseFloat(selectedProduct.taxRate || '0'),
        expiryDate: selectedProduct.expiryDate || null,
      });

      console.log('Product update result:', result);

      setShowEditProduct(false);
      setSelectedProduct(null);
      await loadData();
      
      alert('Product updated successfully!');
    } catch (error) {
      console.error('Error updating product:', error);
      alert(`Failed to update product: ${error.message || error}`);
    }
  }

  async function handleAdjustStock(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProduct || !appState.currentBranchId) {
      alert('Missing required information');
      return;
    }

    const adjustment = parseInt(stockAdjustment);
    if (isNaN(adjustment)) {
      alert('Please enter a valid number');
      return;
    }

    try {
      console.log('🔧 === STOCK ADJUSTMENT START ===');
      console.log('📍 Branch ID:', appState.currentBranchId);
      console.log('📦 Product ID:', selectedProduct.id);
      console.log('📝 Product Name:', selectedProduct.name);
      console.log('🔢 Adjustment:', adjustment);
      console.log('⚙️ Operation:', adjustment >= 0 ? 'add' : 'subtract');
      console.log('🔢 Absolute Quantity:', Math.abs(adjustment));
      
      // Get current stock first
      const currentStock = getStockForProduct(selectedProduct.id);
      console.log('📊 Current Stock (from UI):', currentStock);

      // Perform stock update
      console.log('🚀 Calling updateStock API...');
      const result = await updateStock(
        appState.currentBranchId,
        selectedProduct.id,
        Math.abs(adjustment),
        adjustment >= 0 ? 'add' : 'subtract'
      );

      console.log('✅ API Response:', result);

      if (!result || !result.success) {
        console.error('❌ Stock update failed - no success in response');
        throw new Error('Stock update failed');
      }

      console.log('📦 New quantity from API:', result.stock?.quantity);
      console.log('🔧 === STOCK ADJUSTMENT END ===');
      
      // Close dialog FIRST to prevent re-renders
      const productId = selectedProduct.id;
      const newQuantity = result.stock?.quantity || 0;
      
      setShowAdjustStock(false);
      setSelectedProduct(null);
      setStockAdjustment('');
      setAdjustmentReason('');
      
      // Update the specific stock item in state
      setStockLevels(prevStock => {
        const filtered = prevStock.filter(s => s.productId !== productId);
        const newStock = [...filtered, {
          branchId: appState.currentBranchId,
          productId: productId,
          quantity: newQuantity,
          lastUpdated: new Date().toISOString()
        }];
        console.log('🔄 Updated local state, new stock array length:', newStock.length);
        return newStock;
      });
      
      // Verify the update by fetching from API
      console.log('🔍 Verifying stock update...');
      setTimeout(async () => {
        try {
          const { getStock } = await import('../lib/api');
          const verifyResult = await getStock(appState.currentBranchId!, productId);
          console.log('✅ Verification result:', verifyResult.stock);
          if (verifyResult.stock?.quantity !== newQuantity) {
            console.error('⚠️ WARNING: Stock in database does not match expected quantity!');
            console.error('Expected:', newQuantity);
            console.error('Actual:', verifyResult.stock?.quantity);
          } else {
            console.log('✅ Stock verified successfully in database');
          }
        } catch (error) {
          console.error('❌ Failed to verify stock:', error);
        }
      }, 1000);
      
      alert(`✅ Stock adjusted successfully!\n\nProduct: ${selectedProduct.name}\nNew quantity: ${newQuantity}\n\nCheck browser console for detailed logs.`);
    } catch (error) {
      console.error('Error adjusting stock:', error);
      alert(`Failed to adjust stock: ${error.message || error}`);
    }
  }

  function initiateDeleteProduct(product: any) {
    // Check role-based access using the permission system
    if (!canDeleteFeature(appState.userRole, 'product_delete')) {
      alert(`❌ Access Denied: You do not have permission to delete products.\n\nYour role: ${appState.userRole || 'Unknown'}\n\nOnly Owners, Admins, and Managers can delete products.`);
      return;
    }

    // Show delete confirmation dialog
    setProductToDelete(product);
    setShowDeleteDialog(true);
  }

  async function confirmDeleteProduct() {
    if (!productToDelete) return;

    try {
      console.log('Deleting product:', productToDelete.id);
      const result = await deleteProduct(productToDelete.id);
      console.log('Delete result:', result);

      // Close dialog first
      setShowDeleteDialog(false);
      setProductToDelete(null);

      // Reload data to reflect changes
      await loadData();
      
      alert(`✅ Success: Product "${productToDelete.name}" deleted successfully!\n${result.stockDeleted > 0 ? `Removed stock from ${result.stockDeleted} branch(es).` : ''}`);
    } catch (error) {
      console.error('Error deleting product:', error);
      setShowDeleteDialog(false);
      setProductToDelete(null);
      alert(`❌ Failed to delete product: ${error.message || error}`);
    }
  }

  const filteredProducts = products.filter((product) => {
    if (!product) return false; // Safety check
    const query = searchQuery.toLowerCase();
    return (
      product.name?.toLowerCase().includes(query) ||
      product.sku?.toLowerCase().includes(query) ||
      (product.barcode && product.barcode.toLowerCase().includes(query))
    );
  });

  function handleBarcodeScan(barcode: string) {
    console.log('Barcode scanned in Inventory:', barcode);
    
    // Find product by barcode or SKU
    const product = products.find(
      (p) => p.barcode === barcode || p.sku === barcode
    );
    
    if (product) {
      console.log('Product found:', product);
      // Set search query to the product name to filter the table
      setSearchQuery(product.name);
      // Optionally scroll to the product or highlight it
    } else {
      console.log('Product not found for barcode:', barcode);
      alert(`Product not found for barcode: ${barcode}\n\nWould you like to create a new product with this barcode?`);
      // Optionally pre-fill the barcode in the add product form
      setNewProduct(prev => ({ ...prev, barcode }));
      setShowAddProduct(true);
    }
  }

  function getStockForProduct(productId: string) {
    // Handle potential duplicates by taking the most recent
    const matchingStocks = stockLevels.filter((s) => s.productId === productId);
    if (matchingStocks.length === 0) return 0;
    
    // If multiple entries, take the one with latest timestamp or first one
    const stock = matchingStocks.length > 1 
      ? matchingStocks.sort((a, b) => {
          const timeA = new Date(a.lastUpdated || 0).getTime();
          const timeB = new Date(b.lastUpdated || 0).getTime();
          return timeB - timeA;
        })[0]
      : matchingStocks[0];
    
    return stock?.quantity || 0;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => onNavigate('dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1>Inventory Management</h1>
              <p className="text-sm text-muted-foreground">
                Manage products and stock levels across branches
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={async () => {
                if (!appState.currentBranchId) {
                  alert('No branch selected');
                  return;
                }
                
                const confirmed = confirm(
                  'Clean up duplicate stock entries?\n\n' +
                  'This will remove any duplicate stock records and keep only the latest entry for each product.\n\n' +
                  'This is safe and recommended if you\'re seeing stock issues.'
                );
                
                if (!confirmed) return;
                
                try {
                  setLoading(true);
                  const { cleanupStockDuplicates } = await import('../lib/api');
                  const result = await cleanupStockDuplicates(appState.currentBranchId);
                  await loadData();
                  alert(`✅ Cleanup successful!\n\nDeleted: ${result.deleted} entries\nWrote: ${result.written} clean entries`);
                } catch (error: any) {
                  console.error('Cleanup error:', error);
                  alert('Cleanup failed: ' + error.message);
                } finally {
                  setLoading(false);
                }
              }}
            >
              🧹 Clean Duplicates
            </Button>
            <Button 
              variant="outline" 
              onClick={async () => {
                setLoading(true);
                await loadData();
                setLoading(false);
                alert('Inventory refreshed!');
              }}
            >
              <TrendingUp className="w-5 h-5 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setShowAddProduct(true)}>
              <Plus className="w-5 h-5 mr-2" />
              Add Product
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Search and Filters */}
        <div className="mb-6 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by name, SKU, or barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowScanner(true)}
          >
            <Camera className="w-5 h-5" />
          </Button>
        </div>

        {/* Products Table */}
        <Card className="overflow-x-auto relative">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <Package className="w-16 h-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
                    <p className="text-muted-foreground">No products found</p>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? 'Try a different search' : 'Add your first product to get started'}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => {
                  const stock = getStockForProduct(product.id);
                  const isLowStock = stock <= (product.reorderLevel || 0);
                  const isOutOfStock = stock === 0;
                  
                  // Debug logging for role check
                  if (product === filteredProducts[0]) {
                    console.log('User role:', appState.user?.role);
                    console.log('User role lowercase:', appState.user?.role?.toLowerCase());
                    console.log('Should show delete?', ['owner', 'manager', 'auditor'].includes(appState.user?.role?.toLowerCase()));
                  }
                  
                  // Check if product is expiring soon
                  const isExpiringSoon = product.expiryDate ? (() => {
                    const today = new Date();
                    const expiryDate = new Date(product.expiryDate);
                    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    return daysUntilExpiry <= 90 && daysUntilExpiry >= 0;
                  })() : false;
                  
                  const isExpired = product.expiryDate ? new Date(product.expiryDate) < new Date() : false;

                  return (
                    <TableRow key={product.id} className={isExpired ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                      <TableCell>
                        <div>
                          <div className="flex items-center gap-2">
                            <p>{product.name}</p>
                            {isExpired && (
                              <span className="text-xs px-2 py-0.5 bg-red-600 text-white rounded">
                                EXPIRED
                              </span>
                            )}
                            {!isExpired && isExpiringSoon && stock > 0 && (
                              <span className="text-xs px-2 py-0.5 bg-warning text-warning-foreground rounded">
                                SHORT DATED
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Cost: ₦{(product.unitCost || 0).toFixed(2)}
                            {product.expiryDate && (
                              <span className="ml-2">
                                • Exp: {new Date(product.expiryDate).toLocaleDateString()}
                              </span>
                            )}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{product.sku}</TableCell>
                      <TableCell>
                        {product.barcode || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {product.category || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>₦{(product.price || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={isOutOfStock ? 'text-error' : isLowStock ? 'text-warning' : ''}>
                          {stock}
                        </span>
                      </TableCell>
                      <TableCell>
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 text-xs text-error">
                            <AlertTriangle className="w-3 h-3" />
                            Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 text-xs text-warning">
                            <AlertTriangle className="w-3 h-3" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-success">
                            <CheckCircle2 className="w-3 h-3" />
                            In Stock
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => {
                              console.log('Edit product clicked:', product);
                              setSelectedProduct({
                                ...product,
                                price: (product.price || 0).toString(),
                                unitCost: (product.unitCost || 0).toString(),
                                reorderLevel: (product.reorderLevel || 0).toString(),
                                taxRate: (product.taxRate || 0).toString(),
                              });
                              setShowEditProduct(true);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => {
                              console.log('Adjust stock clicked:', product);
                              if (!appState.currentBranchId) {
                                alert('Please select a branch first');
                                return;
                              }
                              setSelectedProduct(product);
                              setShowAdjustStock(true);
                            }}
                          >
                            <TrendingUp className="w-4 h-4 mr-1" />
                            <span className="hidden sm:inline">Stock</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => initiateDeleteProduct(product)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            <span className="hidden sm:inline">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Add Product Dialog */}
      <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddProduct} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Paracetamol 500mg"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  placeholder="e.g., PARA500"
                  value={newProduct.sku}
                  onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  placeholder="Product barcode"
                  value={newProduct.barcode}
                  onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  placeholder="e.g., Medicine"
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="price">Selling Price (₦) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="unitCost">Unit Cost (₦) *</Label>
                <Input
                  id="unitCost"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newProduct.unitCost}
                  onChange={(e) => setNewProduct({ ...newProduct, unitCost: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="reorderLevel">Reorder Level *</Label>
                <Input
                  id="reorderLevel"
                  type="number"
                  placeholder="e.g., 10"
                  value={newProduct.reorderLevel}
                  onChange={(e) => setNewProduct({ ...newProduct, reorderLevel: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newProduct.taxRate}
                  onChange={(e) => setNewProduct({ ...newProduct, taxRate: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={newProduct.expiryDate}
                  onChange={(e) => setNewProduct({ ...newProduct, expiryDate: e.target.value })}
                  placeholder="Select expiry date"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  For tracking short-dated products
                </p>
              </div>

              <div>
                <Label htmlFor="initialStock">Initial Stock (for current branch)</Label>
                <Input
                  id="initialStock"
                  type="number"
                  min="0"
                  placeholder="e.g., 100"
                  value={newProduct.initialStock}
                  onChange={(e) => setNewProduct({ ...newProduct, initialStock: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Stock quantity for {appState.currentBranchId ? 'current branch' : 'selected branch'}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddProduct(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Product</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={showEditProduct} onOpenChange={setShowEditProduct}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>

          {selectedProduct && (
            <form onSubmit={handleEditProduct} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Product Name *</Label>
                  <Input
                    id="edit-name"
                    placeholder="e.g., Paracetamol 500mg"
                    value={selectedProduct.name}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="edit-sku">SKU *</Label>
                  <Input
                    id="edit-sku"
                    placeholder="e.g., PARA500"
                    value={selectedProduct.sku}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, sku: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="edit-barcode">Barcode</Label>
                  <Input
                    id="edit-barcode"
                    placeholder="Product barcode"
                    value={selectedProduct.barcode}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, barcode: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-category">Category</Label>
                  <Input
                    id="edit-category"
                    placeholder="e.g., Medication"
                    value={selectedProduct.category}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, category: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-price">Price (₦) *</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={selectedProduct.price}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, price: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="edit-unitCost">Unit Cost (₦) *</Label>
                  <Input
                    id="edit-unitCost"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={selectedProduct.unitCost}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, unitCost: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="edit-reorderLevel">Reorder Level *</Label>
                  <Input
                    id="edit-reorderLevel"
                    type="number"
                    placeholder="e.g., 10"
                    value={selectedProduct.reorderLevel}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, reorderLevel: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="edit-taxRate">Tax Rate (%)</Label>
                  <Input
                    id="edit-taxRate"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={selectedProduct.taxRate}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, taxRate: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-expiryDate">Expiry Date (Optional)</Label>
                  <Input
                    id="edit-expiryDate"
                    type="date"
                    value={selectedProduct.expiryDate || ''}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, expiryDate: e.target.value })}
                    placeholder="Select expiry date"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    For tracking short-dated products
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowEditProduct(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={showAdjustStock} onOpenChange={setShowAdjustStock}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock Level</DialogTitle>
          </DialogHeader>

          {selectedProduct && (
            <form onSubmit={handleAdjustStock} className="space-y-4 py-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Product</p>
                <p className="font-medium">{selectedProduct.name}</p>
                <p className="text-sm text-muted-foreground mt-2">SKU: {selectedProduct.sku}</p>
                <p className="text-sm mt-2">
                  Current Stock: <span className="font-semibold">{getStockForProduct(selectedProduct.id)}</span>
                </p>
              </div>

              <div>
                <Label htmlFor="adjustment">Stock Adjustment *</Label>
                <Input
                  id="adjustment"
                  type="number"
                  placeholder="Enter positive to add, negative to subtract"
                  value={stockAdjustment}
                  onChange={(e) => setStockAdjustment(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use positive numbers to add stock (e.g., +50) or negative to subtract (e.g., -10)
                </p>
              </div>

              <div>
                <Label htmlFor="reason">Reason</Label>
                <Input
                  id="reason"
                  placeholder="e.g., Restocking, Damaged goods, etc."
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                />
              </div>

              {stockAdjustment && (
                <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                  <p className="text-sm">
                    New Stock Level: {' '}
                    <span className="font-semibold">
                      {getStockForProduct(selectedProduct.id) + parseInt(stockAdjustment || '0')}
                    </span>
                  </p>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setShowAdjustStock(false);
                  setStockAdjustment('');
                  setAdjustmentReason('');
                }}>
                  Cancel
                </Button>
                <Button type="submit">
                  {parseInt(stockAdjustment || '0') >= 0 ? (
                    <>
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Add Stock
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-4 h-4 mr-2" />
                      Reduce Stock
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete Product?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              {productToDelete && (
                <>
                  <p>
                    You are about to delete <strong>{productToDelete.name}</strong> (SKU: {productToDelete.sku}).
                  </p>
                  <div className="bg-destructive/10 border border-destructive/20 rounded p-3 text-sm space-y-1">
                    <p className="font-medium text-destructive">This action will:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Delete the product from the system</li>
                      <li>Remove all stock from ALL branches</li>
                      <li>Cannot be undone</li>
                    </ul>
                  </div>
                  <p className="text-sm font-medium">
                    Are you absolutely sure you want to continue?
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteDialog(false);
              setProductToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteProduct}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Delete Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Barcode Scanner Dialog */}
      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScan}
      />
    </div>
  );
}