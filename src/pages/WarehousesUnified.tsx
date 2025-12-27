import { useState, useEffect } from 'react';
import { AppState, Page } from '../App';
import { 
  getWarehouses, 
  createWarehouse, 
  updateWarehouse, 
  deleteWarehouse,
  getProducts, 
  getInventory, 
  upsertInventory, 
  createTransfer,
  getBranches 
} from '../lib/api';
import { canAddWarehouse, getWarehouseLimitMessage, WAREHOUSE_LIMITS } from '../lib/permissions';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import {
  ArrowLeft,
  Plus,
  Warehouse,
  Package,
  Send,
  Edit,
  Trash2,
  Search,
  MapPin,
  User,
  Phone,
  PackagePlus,
} from 'lucide-react';

interface WarehousesUnifiedProps {
  appState: AppState;
  onNavigate: (page: Page) => void;
}

interface WarehouseType {
  id: string;
  name: string;
  location: string;
  manager_name?: string;
  contact_phone?: string;
  capacity?: number;
  current_utilization?: number;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  price: number;
  unit_cost?: number;
  stock?: number;
}

interface Branch {
  id: string;
  name: string;
  location: string;
}

export function WarehousesUnified({ appState, onNavigate }: WarehousesUnifiedProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'inventory' | 'products'>('list');
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string>('');

  // Modals
  const [showAddWarehouse, setShowAddWarehouse] = useState(false);
  const [showEditWarehouse, setShowEditWarehouse] = useState(false);
  const [showAdjustStock, setShowAdjustStock] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseType | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Forms
  const [warehouseForm, setWarehouseForm] = useState({
    name: '',
    location: '',
    manager_name: '',
    contact_phone: '',
    capacity: '1000',
  });

  const [stockForm, setStockForm] = useState({
    quantity: '',
  });

  const [transferForm, setTransferForm] = useState({
    toBranchId: '',
    quantity: '',
    notes: '',
  });

  useEffect(() => {
    console.log('🔧 WarehousesUnified mounted');
    loadInitialData();
  }, [appState.orgId]);

  useEffect(() => {
    if (selectedWarehouse && activeTab === 'inventory') {
      loadInventory();
    }
  }, [selectedWarehouse, activeTab]);

  async function loadInitialData() {
    console.log('📦 Loading initial data, orgId:', appState.orgId);
    
    if (!appState.orgId) {
      console.error('❌ No orgId');
      setError('No organization ID found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      console.log('🔍 Fetching warehouses and branches...');
      
      const warehousesData = await getWarehouses(appState.orgId);
      console.log('✅ Warehouses loaded:', warehousesData);
      
      const branchesResponse = await getBranches(appState.orgId);
      console.log('✅ Branches loaded:', branchesResponse);
      
      // getBranches returns { branches: [...] }
      const branchesData = branchesResponse.branches || branchesResponse || [];

      setWarehouses(warehousesData || []);
      setBranches(branchesData);

      if (warehousesData && warehousesData.length > 0 && !selectedWarehouse) {
        setSelectedWarehouse(warehousesData[0].id);
      }
    } catch (err: any) {
      console.error('❌ Error loading data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function loadInventory() {
    if (!appState.orgId || !selectedWarehouse) return;

    try {
      console.log('📦 Loading inventory for warehouse:', selectedWarehouse);
      
      const { products: allProducts } = await getProducts(appState.orgId);
      const inventory = await getInventory(appState.orgId, undefined, selectedWarehouse);

      const productsWithStock = allProducts.map(product => {
        const inventoryItem = inventory.find(inv => inv.product_id === product.id);
        return {
          ...product,
          stock: inventoryItem?.quantity || 0,
        };
      });

      setProducts(productsWithStock);
      console.log('✅ Inventory loaded:', productsWithStock.length, 'products');
    } catch (err: any) {
      console.error('❌ Error loading inventory:', err);
      alert('Failed to load inventory: ' + err.message);
    }
  }

  async function handleAddWarehouse() {
    if (!appState.orgId) return;
    if (!warehouseForm.name.trim()) {
      alert('Warehouse name is required');
      return;
    }

    try {
      console.log('➕ Creating warehouse:', warehouseForm);
      
      const newWarehouse = await createWarehouse(appState.orgId, {
        name: warehouseForm.name.trim(),
        location: warehouseForm.location.trim(),
        manager_name: warehouseForm.manager_name.trim(),
        contact_phone: warehouseForm.contact_phone.trim(),
        capacity: parseInt(warehouseForm.capacity) || 1000,
        current_utilization: 0,
      });

      console.log('✅ Warehouse created:', newWarehouse);
      
      setWarehouses([...warehouses, newWarehouse]);
      setShowAddWarehouse(false);
      setWarehouseForm({
        name: '',
        location: '',
        manager_name: '',
        contact_phone: '',
        capacity: '1000',
      });
      alert('Warehouse created successfully!');
    } catch (err: any) {
      console.error('❌ Error creating warehouse:', err);
      alert('Failed to create warehouse: ' + err.message);
    }
  }

  async function handleUpdateWarehouse() {
    if (!editingWarehouse) return;

    try {
      const updated = await updateWarehouse(editingWarehouse.id, {
        name: warehouseForm.name.trim(),
        location: warehouseForm.location.trim(),
        manager_name: warehouseForm.manager_name.trim(),
        contact_phone: warehouseForm.contact_phone.trim(),
        capacity: parseInt(warehouseForm.capacity) || 1000,
      });

      setWarehouses(warehouses.map(w => w.id === updated.id ? updated : w));
      setShowEditWarehouse(false);
      setEditingWarehouse(null);
      alert('Warehouse updated successfully!');
    } catch (err: any) {
      console.error('❌ Error updating warehouse:', err);
      alert('Failed to update warehouse: ' + err.message);
    }
  }

  async function handleDeleteWarehouse(warehouseId: string) {
    if (!confirm('Are you sure you want to delete this warehouse?')) return;

    try {
      await deleteWarehouse(warehouseId);
      setWarehouses(warehouses.filter(w => w.id !== warehouseId));
      if (selectedWarehouse === warehouseId) {
        setSelectedWarehouse(warehouses[0]?.id || '');
      }
      alert('Warehouse deleted successfully!');
    } catch (err: any) {
      console.error('❌ Error deleting warehouse:', err);
      alert('Failed to delete warehouse: ' + err.message);
    }
  }

  async function handleAdjustStock() {
    if (!appState.orgId || !selectedWarehouse || !selectedProduct) return;
    
    const quantity = parseInt(stockForm.quantity);
    if (isNaN(quantity) || quantity < 0) {
      alert('Please enter a valid quantity');
      return;
    }

    try {
      await upsertInventory(
        appState.orgId,
        selectedProduct.id,
        quantity,
        undefined,
        selectedWarehouse
      );

      await loadInventory();
      setShowAdjustStock(false);
      setStockForm({ quantity: '' });
      alert('Stock updated successfully!');
    } catch (err: any) {
      console.error('❌ Error updating stock:', err);
      alert('Failed to update stock: ' + err.message);
    }
  }

  async function handleTransferToBranch() {
    if (!appState.orgId || !selectedWarehouse || !selectedProduct) return;
    if (!transferForm.toBranchId || !transferForm.quantity) {
      alert('Please select a branch and enter quantity');
      return;
    }

    const quantity = parseInt(transferForm.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    if (quantity > (selectedProduct.stock || 0)) {
      alert('Insufficient stock for transfer');
      return;
    }

    try {
      await createTransfer({
        orgId: appState.orgId,
        sourceWarehouseId: selectedWarehouse,
        destinationBranchId: transferForm.toBranchId,
        items: [{
          productId: selectedProduct.id,
          name: selectedProduct.name,
          sku: selectedProduct.sku,
          quantity: quantity,
          unitCost: selectedProduct.unit_cost || 0,
        }],
        reason: transferForm.notes || 'Warehouse to Branch Transfer',
        requiresApproval: false,
      });

      await loadInventory();
      setShowTransferDialog(false);
      setTransferForm({ toBranchId: '', quantity: '', notes: '' });
      alert('Transfer initiated successfully!');
    } catch (err: any) {
      console.error('❌ Error creating transfer:', err);
      alert('Failed to create transfer: ' + err.message);
    }
  }

  function openEditWarehouse(warehouse: WarehouseType) {
    setEditingWarehouse(warehouse);
    setWarehouseForm({
      name: warehouse.name,
      location: warehouse.location || '',
      manager_name: warehouse.manager_name || '',
      contact_phone: warehouse.contact_phone || '',
      capacity: warehouse.capacity?.toString() || '1000',
    });
    setShowEditWarehouse(true);
  }

  function openAdjustStock(product: Product) {
    setSelectedProduct(product);
    setStockForm({ quantity: product.stock?.toString() || '0' });
    setShowAdjustStock(true);
  }

  function openTransfer(product: Product) {
    setSelectedProduct(product);
    setTransferForm({ toBranchId: '', quantity: '', notes: '' });
    setShowTransferDialog(true);
  }

  const currentWarehouse = warehouses.find(w => w.id === selectedWarehouse);
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading warehouses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-destructive mb-4">Error: {error}</p>
          <Button onClick={() => onNavigate('dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => onNavigate('dashboard')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
            {activeTab === 'list' && (
              <Button 
                onClick={() => {
                  if (canAddWarehouse(appState.subscriptionPlan || 'starter', warehouses.length)) {
                    setShowAddWarehouse(true);
                  } else {
                    alert(`Warehouse limit reached!\n\n${getWarehouseLimitMessage(appState.subscriptionPlan || 'starter', warehouses.length)}\n\nPlease upgrade your plan to add more warehouses.`);
                  }
                }}
                className="gap-2"
                disabled={!canAddWarehouse(appState.subscriptionPlan || 'starter', warehouses.length)}
              >
                <Plus className="w-4 h-4" />
                Add Warehouse
              </Button>
            )}
            {activeTab === 'products' && (
              <Button onClick={() => onNavigate('inventory')} className="gap-2">
                <PackagePlus className="w-4 h-4" />
                Create Product
              </Button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <Warehouse className="w-8 h-8" />
            <div>
              <h1 className="text-2xl">Warehouse Management</h1>
              <p className="text-sm text-muted-foreground">
                Manage warehouses, inventory, and transfers
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-6 border-b">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 border-b-2 transition-colors ${
                activeTab === 'list'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Warehouses
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-4 py-2 border-b-2 transition-colors ${
                activeTab === 'inventory'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              disabled={warehouses.length === 0}
            >
              Inventory
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`px-4 py-2 border-b-2 transition-colors ${
                activeTab === 'products'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              disabled={warehouses.length === 0}
            >
              Products
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'list' && (
          <>
            {/* Plan Limit Info */}
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                {getWarehouseLimitMessage(appState.subscriptionPlan || 'starter', warehouses.length)}
                {!canAddWarehouse(appState.subscriptionPlan || 'starter', warehouses.length) && (
                  <Button
                    variant="link"
                    size="sm"
                    className="ml-2 h-auto p-0 text-blue-600 dark:text-blue-400"
                    onClick={() => onNavigate('subscribe')}
                  >
                    Upgrade Plan
                  </Button>
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {warehouses.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Warehouse className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="mb-4">No warehouses yet</p>
                <Button onClick={() => setShowAddWarehouse(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Warehouse
                </Button>
              </div>
            ) : (
              warehouses.map(warehouse => (
                <Card key={warehouse.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Warehouse className="w-5 h-5 text-primary" />
                      <h3>{warehouse.name}</h3>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditWarehouse(warehouse)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteWarehouse(warehouse.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    {warehouse.location && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        {warehouse.location}
                      </div>
                    )}
                    {warehouse.manager_name && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="w-4 h-4" />
                        {warehouse.manager_name}
                      </div>
                    )}
                    {warehouse.contact_phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        {warehouse.contact_phone}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setSelectedWarehouse(warehouse.id);
                        setActiveTab('inventory');
                      }}
                    >
                      View Inventory
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
          </>
        )}

        {activeTab === 'inventory' && (
          <div>
            {/* Warehouse Selector */}
            <div className="mb-6">
              <Label>Select Warehouse</Label>
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="w-full mt-2 px-3 py-2 border rounded-md bg-background"
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Products Table */}
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4">Product</th>
                      <th className="text-left p-4">SKU</th>
                      <th className="text-left p-4">Category</th>
                      <th className="text-right p-4">Stock</th>
                      <th className="text-right p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center p-8 text-muted-foreground">
                          No products found
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map(product => (
                        <tr key={product.id} className="border-b hover:bg-muted/50">
                          <td className="p-4">{product.name}</td>
                          <td className="p-4 text-muted-foreground">{product.sku}</td>
                          <td className="p-4 text-muted-foreground">{product.category}</td>
                          <td className="p-4 text-right">
                            <span className={`${
                              (product.stock || 0) === 0 ? 'text-destructive' : ''
                            }`}>
                              {product.stock || 0}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openAdjustStock(product)}
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Adjust
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openTransfer(product)}
                                disabled={(product.stock || 0) === 0}
                              >
                                <Send className="w-4 h-4 mr-1" />
                                Send
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'products' && (
          <div>
            {/* Warehouse Selector */}
            <div className="mb-6">
              <Label>Select Warehouse</Label>
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="w-full mt-2 px-3 py-2 border rounded-md bg-background"
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Products Table */}
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4">Product</th>
                      <th className="text-left p-4">SKU</th>
                      <th className="text-left p-4">Category</th>
                      <th className="text-right p-4">Stock</th>
                      <th className="text-right p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center p-8 text-muted-foreground">
                          No products found
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map(product => (
                        <tr key={product.id} className="border-b hover:bg-muted/50">
                          <td className="p-4">{product.name}</td>
                          <td className="p-4 text-muted-foreground">{product.sku}</td>
                          <td className="p-4 text-muted-foreground">{product.category}</td>
                          <td className="p-4 text-right">
                            <span className={`${
                              (product.stock || 0) === 0 ? 'text-destructive' : ''
                            }`}>
                              {product.stock || 0}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openAdjustStock(product)}
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Adjust
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openTransfer(product)}
                                disabled={(product.stock || 0) === 0}
                              >
                                <Send className="w-4 h-4 mr-1" />
                                Send
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Add Warehouse Modal */}
      <Dialog open={showAddWarehouse} onOpenChange={setShowAddWarehouse}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Warehouse</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Warehouse Name *</Label>
              <Input
                value={warehouseForm.name}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                placeholder="Central Warehouse"
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input
                value={warehouseForm.location}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, location: e.target.value })}
                placeholder="123 Main St, City"
              />
            </div>
            <div>
              <Label>Manager Name</Label>
              <Input
                value={warehouseForm.manager_name}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, manager_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label>Contact Phone</Label>
              <Input
                value={warehouseForm.contact_phone}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, contact_phone: e.target.value })}
                placeholder="+234 800 000 0000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddWarehouse(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddWarehouse}>Create Warehouse</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Warehouse Modal */}
      <Dialog open={showEditWarehouse} onOpenChange={setShowEditWarehouse}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Warehouse</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Warehouse Name *</Label>
              <Input
                value={warehouseForm.name}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input
                value={warehouseForm.location}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, location: e.target.value })}
              />
            </div>
            <div>
              <Label>Manager Name</Label>
              <Input
                value={warehouseForm.manager_name}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, manager_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Contact Phone</Label>
              <Input
                value={warehouseForm.contact_phone}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, contact_phone: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditWarehouse(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateWarehouse}>Update Warehouse</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Modal */}
      <Dialog open={showAdjustStock} onOpenChange={setShowAdjustStock}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Product</Label>
              <Input value={selectedProduct?.name || ''} disabled />
            </div>
            <div>
              <Label>Current Stock</Label>
              <Input value={selectedProduct?.stock || 0} disabled />
            </div>
            <div>
              <Label>New Quantity *</Label>
              <Input
                type="number"
                value={stockForm.quantity}
                onChange={(e) => setStockForm({ quantity: e.target.value })}
                placeholder="Enter new quantity"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjustStock(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdjustStock}>Update Stock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Modal */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer to Branch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Product</Label>
              <Input value={selectedProduct?.name || ''} disabled />
            </div>
            <div>
              <Label>Available Stock</Label>
              <Input value={selectedProduct?.stock || 0} disabled />
            </div>
            <div>
              <Label>Destination Branch *</Label>
              <select
                value={transferForm.toBranchId}
                onChange={(e) => setTransferForm({ ...transferForm, toBranchId: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-background"
              >
                <option value="">Select branch...</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} - {branch.location}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Quantity *</Label>
              <Input
                type="number"
                value={transferForm.quantity}
                onChange={(e) => setTransferForm({ ...transferForm, quantity: e.target.value })}
                placeholder="Enter quantity"
                max={selectedProduct?.stock || 0}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Input
                value={transferForm.notes}
                onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                placeholder="Optional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleTransferToBranch}>Transfer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}