import { useState, useEffect } from 'react';
import { AppState, Page } from '../App';
import { getProducts, getInventory, createProduct, updateProduct, upsertInventory, createTransfer, getWarehouses } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import {
  ArrowLeft,
  Search,
  Plus,
  Package,
  Send,
  Edit,
  AlertTriangle,
  Building2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

interface WarehouseInventoryProps {
  appState: AppState;
  onNavigate: (page: Page) => void;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  price: number;
  cost?: number;
  supplier?: string;
  expiry_date?: string;
  description?: string;
  stock?: number;
}

interface Warehouse {
  id: string;
  name: string;
  location: string;
}

export function WarehouseInventory({ appState, onNavigate }: WarehouseInventoryProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    barcode: '',
    category: '',
    price: '',
    cost: '',
    supplier: '',
    expiryDate: '',
    description: '',
    stock: '',
  });
  const [transferData, setTransferData] = useState({
    toBranchId: '',
    quantity: '',
    notes: '',
  });

  useEffect(() => {
    loadWarehouses();
  }, [appState.orgId]);

  useEffect(() => {
    if (selectedWarehouse) {
      loadProducts();
    }
  }, [selectedWarehouse, appState.orgId]);

  async function loadWarehouses() {
    if (!appState.orgId) {
      console.error('❌ Cannot load warehouses: No organization ID');
      return;
    }

    console.log('📦 Loading warehouses for organization:', appState.orgId);

    try {
      const data = await getWarehouses(appState.orgId);
      console.log('✅ Warehouses API response:', data);
      console.log('📊 Number of warehouses:', data?.length || 0);
      
      if (!data || data.length === 0) {
        console.warn('⚠️ No warehouses returned from API');
        console.log('💡 Tip: Create a warehouse first in the Warehouses page');
      }
      
      setWarehouses(data || []);
      
      // Select first warehouse or current warehouse
      if (data && data.length > 0) {
        const warehouseToSelect = appState.currentWarehouseId || data[0].id;
        console.log('✅ Auto-selecting warehouse:', warehouseToSelect);
        setSelectedWarehouse(warehouseToSelect);
      } else {
        console.log('📝 No warehouses available to select');
        setSelectedWarehouse('');
      }
    } catch (error) {
      console.error('❌ Error loading warehouses:', error);
      console.error('Error details:', {
        message: error.message,
        orgId: appState.orgId,
        stack: error.stack
      });
      setWarehouses([]);
      setSelectedWarehouse('');
    }
  }

  async function loadProducts() {
    if (!appState.orgId || !selectedWarehouse) return;

    setLoading(true);
    try {
      // Get all products for organization
      const { products: allProducts } = await getProducts(appState.orgId);
      
      // Get inventory levels for this warehouse
      const inventory = await getInventory(appState.orgId, undefined, selectedWarehouse);
      
      console.log('📦 Products loaded:', allProducts);
      console.log('📦 Warehouse inventory:', inventory);
      
      // Merge products with warehouse inventory
      const productsWithStock = allProducts.map(product => {
        const inventoryItem = inventory.find(inv => inv.product_id === product.id);
        return {
          ...product,
          stock: inventoryItem?.quantity || 0,
        };
      });
      
      setProducts(productsWithStock);
    } catch (error) {
      console.error('Error loading products:', error);
      alert('Failed to load products: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddProduct() {
    // Trim all inputs first
    const trimmedName = newProduct.name.trim();
    const trimmedSku = newProduct.sku.trim();
    const trimmedPrice = newProduct.price.trim();

    // Validate required fields
    if (!trimmedName) {
      alert('❌ Product name is required');
      return;
    }

    if (!trimmedSku) {
      alert('❌ SKU is required');
      return;
    }

    if (!trimmedPrice) {
      alert('❌ Price is required');
      return;
    }

    if (!selectedWarehouse) {
      alert('❌ Please select a warehouse first');
      return;
    }

    try {
      // Validate numeric fields
      const price = parseFloat(trimmedPrice);
      if (isNaN(price) || price <= 0) {
        alert('❌ Please enter a valid price greater than 0');
        return;
      }

      // Validate cost if provided
      let cost = undefined;
      if (newProduct.cost && newProduct.cost.trim()) {
        cost = parseFloat(newProduct.cost.trim());
        if (isNaN(cost) || cost < 0) {
          alert('❌ Cost price must be a valid number');
          return;
        }
      }

      // Validate stock if provided
      let initialStock = 0;
      if (newProduct.stock && newProduct.stock.trim()) {
        initialStock = parseInt(newProduct.stock.trim());
        if (isNaN(initialStock) || initialStock < 0) {
          alert('❌ Initial stock must be a valid number');
          return;
        }
      }

      // Create product data
      const productData = {
        name: trimmedName,
        sku: trimmedSku,
        barcode: newProduct.barcode?.trim() || undefined,
        category: newProduct.category?.trim() || 'General',
        price: price,
        cost: cost,
        supplier: newProduct.supplier?.trim() || undefined,
        expiryDate: newProduct.expiryDate || undefined,
        description: newProduct.description?.trim() || undefined,
      };

      console.log('📦 Creating product with data:', productData);
      const product = await createProduct(appState.orgId, productData);
      console.log('✅ Product created:', product);

      // Add initial stock to warehouse if provided
      if (initialStock > 0) {
        console.log(`📦 Adding ${initialStock} units to warehouse...`);
        await upsertInventory(
          appState.orgId,
          undefined,
          selectedWarehouse,
          product.id,
          initialStock
        );
        console.log('✅ Initial stock added to warehouse');
      }

      alert(`✅ Product "${product.name}" created successfully!\n${initialStock > 0 ? `Initial stock: ${initialStock} units` : 'No initial stock added'}`);

      // Reset form and reload
      setNewProduct({
        name: '',
        sku: '',
        barcode: '',
        category: '',
        price: '',
        cost: '',
        supplier: '',
        expiryDate: '',
        description: '',
        stock: '',
      });
      setShowAddProduct(false);
      await loadProducts();
    } catch (error) {
      console.error('❌ Error adding product:', error);
      alert(`❌ Failed to add product:\n${error.message}`);
    }
  }

  async function handleUpdateStock(productId: string, newStock: number) {
    if (!selectedWarehouse) return;

    try {
      await upsertInventory(appState.orgId, undefined, selectedWarehouse, productId, newStock);
      console.log('✅ Stock updated');
      await loadProducts();
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Failed to update stock: ' + error.message);
    }
  }

  async function handleTransferToBranch() {
    if (!transferData.toBranchId || !transferData.quantity || !selectedProduct) {
      alert('Please fill in all transfer details');
      return;
    }

    const quantity = parseInt(transferData.quantity);
    if (quantity <= 0 || quantity > (selectedProduct.stock || 0)) {
      alert(`Invalid quantity. Available: ${selectedProduct.stock || 0}`);
      return;
    }

    try {
      const transfer = await createTransfer({
        orgId: appState.orgId,
        fromWarehouseId: selectedWarehouse,
        toBranchId: transferData.toBranchId,
        productId: selectedProduct.id,
        quantity: quantity,
        notes: transferData.notes,
      });

      console.log('✅ Transfer initiated:', transfer);
      alert(`Transfer initiated successfully!\n\nTransfer ID: ${transfer.id}\nStatus: Pending Approval\n\nThe receiving branch will need to approve this transfer.`);

      setShowTransferDialog(false);
      setTransferData({ toBranchId: '', quantity: '', notes: '' });
      setSelectedProduct(null);
      await loadProducts();
    } catch (error) {
      console.error('Error creating transfer:', error);
      alert('Failed to create transfer: ' + error.message);
    }
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalValue = products.reduce((sum, p) => sum + ((p.cost || p.price) * (p.stock || 0)), 0);
  const lowStockCount = products.filter(p => (p.stock || 0) < 10).length;

  const currentWarehouse = warehouses.find(w => w.id === selectedWarehouse);

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
              <h1 className="text-xl">Warehouse Inventory</h1>
              <p className="text-sm text-muted-foreground">
                {currentWarehouse?.name || 'Select a warehouse'}
              </p>
            </div>
          </div>
          <Button onClick={() => setShowAddProduct(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>
      </header>

      <div className="p-4 max-w-7xl mx-auto">
        {/* Warehouse Selector */}
        <Card className="p-4 mb-6">
          <Label className="mb-2 block">Select Warehouse</Label>
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background"
          >
            {warehouses.length === 0 && (
              <option value="">No warehouses available</option>
            )}
            {warehouses.map(warehouse => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name} - {warehouse.location}
              </option>
            ))}
          </select>
          {warehouses.length === 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              No warehouses found. <button onClick={() => onNavigate('warehouses')} className="text-primary underline">Create one first</button>
            </p>
          )}
        </Card>

        {selectedWarehouse && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Products</p>
                    <p className="text-2xl font-bold">{products.length}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Inventory Value</p>
                    <p className="text-2xl font-bold">₦{totalValue.toLocaleString()}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Low Stock Items</p>
                    <p className="text-2xl font-bold">{lowStockCount}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Search */}
            <Card className="p-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search products by name, SKU, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </Card>

            {/* Products List */}
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-muted-foreground">Loading inventory...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="mb-2">No products in warehouse</p>
                <p className="text-sm">Add products to start managing warehouse inventory</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map((product) => (
                  <Card key={product.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-medium mb-1">{product.name}</h3>
                        <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                        {product.category && (
                          <span className="inline-block text-xs bg-muted px-2 py-1 rounded mt-1">
                            {product.category}
                          </span>
                        )}
                      </div>
                      <div className={`text-right ${
                        (product.stock || 0) < 10 ? 'text-orange-600' :
                        (product.stock || 0) === 0 ? 'text-red-600' :
                        'text-green-600'
                      }`}>
                        <p className="text-2xl font-bold">{product.stock || 0}</p>
                        <p className="text-xs">in stock</p>
                      </div>
                    </div>

                    <div className="border-t pt-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Price:</span>
                        <span className="font-medium">₦{product.price.toLocaleString()}</span>
                      </div>
                      {product.cost && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cost:</span>
                          <span className="font-medium">₦{product.cost.toLocaleString()}</span>
                        </div>
                      )}
                      {product.supplier && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Supplier:</span>
                          <span className="font-medium">{product.supplier}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          const newStock = prompt(`Update stock for ${product.name}\nCurrent: ${product.stock || 0}`, (product.stock || 0).toString());
                          if (newStock !== null) {
                            const stock = parseInt(newStock);
                            if (!isNaN(stock) && stock >= 0) {
                              handleUpdateStock(product.id, stock);
                            }
                          }
                        }}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Stock
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowTransferDialog(true);
                        }}
                        disabled={(product.stock || 0) === 0}
                      >
                        <Send className="w-3 h-3 mr-1" />
                        Send
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Product Dialog */}
      <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Add Product to Warehouse</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="sku">SKU *</Label>
              <Input
                id="sku"
                value={newProduct.sku}
                onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="barcode">Barcode</Label>
              <Input
                id="barcode"
                value={newProduct.barcode}
                onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="price">Selling Price (₦) *</Label>
              <Input
                id="price"
                type="number"
                value={newProduct.price}
                onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="cost">Cost Price (₦)</Label>
              <Input
                id="cost"
                type="number"
                value={newProduct.cost}
                onChange={(e) => setNewProduct({ ...newProduct, cost: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                value={newProduct.supplier}
                onChange={(e) => setNewProduct({ ...newProduct, supplier: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="stock">Initial Stock</Label>
              <Input
                id="stock"
                type="number"
                value={newProduct.stock}
                onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="expiryDate">Expiry Date</Label>
              <Input
                id="expiryDate"
                type="date"
                value={newProduct.expiryDate}
                onChange={(e) => setNewProduct({ ...newProduct, expiryDate: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-background min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddProduct(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddProduct}>Add Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer to Branch Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer to Branch</DialogTitle>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <p className="font-medium">{selectedProduct.name}</p>
                <p className="text-sm text-muted-foreground">Available: {selectedProduct.stock} units</p>
              </div>

              <div>
                <Label htmlFor="toBranch">Destination Branch *</Label>
                <select
                  id="toBranch"
                  value={transferData.toBranchId}
                  onChange={(e) => setTransferData({ ...transferData, toBranchId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                >
                  <option value="">Select branch...</option>
                  {(appState.branches || []).map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={selectedProduct.stock || 0}
                  value={transferData.quantity}
                  onChange={(e) => setTransferData({ ...transferData, quantity: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  value={transferData.notes}
                  onChange={(e) => setTransferData({ ...transferData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background min-h-[80px]"
                  placeholder="Optional transfer notes..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleTransferToBranch}>
              <Send className="w-4 h-4 mr-2" />
              Initiate Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}