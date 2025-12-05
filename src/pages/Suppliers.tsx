import { useState, useEffect } from 'react';
import { AppState, Page } from '../App';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import {
  ArrowLeft,
  Plus,
  Truck,
  Phone,
  Mail,
  Package,
  Calendar,
  Building2,
  X,
  Check,
  ClipboardList,
} from 'lucide-react';
import { KPICard } from '../components/KPICard';

interface SuppliersProps {
  appState: AppState;
  onNavigate: (page: Page) => void;
}

interface SupplierData {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  productCategories?: string;
  notes: string;
  created_at?: string;
}

interface ProductItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
}

interface SupplyRecordData {
  id: string;
  supplierId: string;
  supplierName: string;
  warehouseId: string;
  warehouseName: string;
  products: ProductItem[];
  totalCost: number;
  date: string;
  status: 'pending' | 'received' | 'cancelled';
  notes?: string;
}

export function Suppliers({ appState, onNavigate }: SuppliersProps) {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'received'>('suppliers');
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [supplyRecords, setSupplyRecords] = useState<SupplyRecordData[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSupplyModal, setShowSupplyModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [productItems, setProductItems] = useState<ProductItem[]>([
    { id: '1', productId: '', productName: '', quantity: 0, unitCost: 0 }
  ]);

  const [formData, setFormData] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    productCategories: '',
    notes: '',
  });

  const [supplyForm, setSupplyForm] = useState({
    warehouseId: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Load data once on mount
  useEffect(() => {
    let mounted = true;
    
    async function loadData() {
      if (!appState.orgId || loading) return;
      
      setLoading(true);
      try {
        // Load suppliers
        const { getSuppliers } = await import('../lib/api-supabase');
        const suppliersData = await getSuppliers(appState.orgId);
        if (mounted) setSuppliers(suppliersData || []);

        // Load warehouses
        const { getWarehouses } = await import('../lib/api-supabase');
        const warehousesData = await getWarehouses(appState.orgId);
        if (mounted) setWarehouses(warehousesData || []);

        // Load products
        const { getProducts } = await import('../lib/api-supabase');
        const productsData = await getProducts(appState.orgId);
        if (mounted) setProducts(productsData || []);

        // Load supply records from localStorage
        const stored = localStorage.getItem(`supply_records_${appState.orgId}`);
        if (stored && mounted) {
          setSupplyRecords(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, []); // Only run once on mount

  function saveSupplyRecords(records: SupplyRecordData[]) {
    if (!appState.orgId) return;
    localStorage.setItem(`supply_records_${appState.orgId}`, JSON.stringify(records));
    setSupplyRecords(records);
  }

  async function handleAddSupplier() {
    if (!formData.name || !formData.company) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      if (!appState.orgId) {
        alert('Organization ID not found');
        return;
      }

      const { createSupplier } = await import('../lib/api-supabase');
      
      // Prepare data - match database schema
      const supplierPayload = {
        name: formData.name,
        company: formData.company,
        phone: formData.phone,
        email: formData.email,
        product_categories: formData.productCategories,
        notes: formData.notes,
        // Also include old field names for backward compatibility
        contact: formData.company, // Fallback
      };
      
      const newSupplier = await createSupplier(appState.orgId, supplierPayload);

      setSuppliers([...suppliers, newSupplier]);
      setShowAddModal(false);
      setFormData({
        name: '',
        company: '',
        phone: '',
        email: '',
        productCategories: '',
        notes: '',
      });

      alert('✅ Supplier created successfully!');
    } catch (error: any) {
      console.error('Failed to create supplier:', error);
      alert(`❌ Failed to create supplier: ${error.message}`);
    }
  }

  function addProductItem() {
    setProductItems([
      ...productItems,
      { id: Date.now().toString(), productId: '', productName: '', quantity: 0, unitCost: 0 }
    ]);
  }

  function removeProductItem(id: string) {
    if (productItems.length === 1) return;
    setProductItems(productItems.filter(item => item.id !== id));
  }

  function updateProductItem(id: string, field: keyof ProductItem, value: any) {
    setProductItems(productItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Auto-fill product name when product is selected
        if (field === 'productId') {
          const product = products.find(p => p.id === value);
          if (product) {
            updated.productName = product.name;
            updated.unitCost = product.unit_cost || 0;
          }
        }
        
        return updated;
      }
      return item;
    }));
  }

  function handleRecordSupply() {
    if (!selectedSupplier || !supplyForm.warehouseId) {
      alert('Please select supplier and warehouse');
      return;
    }

    const validProducts = productItems.filter(item => item.productId && item.quantity > 0);
    
    if (validProducts.length === 0) {
      alert('Please add at least one product with valid quantity');
      return;
    }

    const supplier = suppliers.find((s) => s.id === selectedSupplier);
    const warehouse = warehouses.find((w) => w.id === supplyForm.warehouseId);

    const totalCost = validProducts.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

    const newRecord: SupplyRecordData = {
      id: Date.now().toString(),
      supplierId: selectedSupplier,
      supplierName: supplier?.name || '',
      warehouseId: supplyForm.warehouseId,
      warehouseName: warehouse?.name || '',
      products: validProducts,
      totalCost,
      date: supplyForm.date,
      status: 'pending',
      notes: supplyForm.notes,
    };

    const updatedRecords = [...supplyRecords, newRecord];
    saveSupplyRecords(updatedRecords);

    setShowSupplyModal(false);
    setSupplyForm({
      warehouseId: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setProductItems([
      { id: '1', productId: '', productName: '', quantity: 0, unitCost: 0 }
    ]);

    alert('✅ Supply record created successfully! Check the "Received" tab to add to inventory.');
    setActiveTab('received');
  }

  async function handleReceiveSupply(recordId: string) {
    const record = supplyRecords.find(r => r.id === recordId);
    if (!record) return;

    if (!confirm(`Mark this supply as received and add ${record.products.length} products to warehouse inventory?`)) {
      return;
    }

    try {
      const { upsertInventory, getStockLevel } = await import('../lib/api-supabase');
      
      for (const item of record.products) {
        if (!item.productId) continue;
        
        const currentQty = await getStockLevel(item.productId, undefined, record.warehouseId);
        const newQty = currentQty + item.quantity;
        
        await upsertInventory(
          appState.orgId!,
          item.productId,
          newQty,
          undefined,
          record.warehouseId
        );
      }

      const updatedRecords = supplyRecords.map(r =>
        r.id === recordId ? { ...r, status: 'received' as const } : r
      );
      saveSupplyRecords(updatedRecords);

      alert(`✅ Supply received! Added ${record.products.length} products to warehouse inventory.`);
    } catch (error: any) {
      console.error('Failed to receive supply:', error);
      alert(`❌ Failed to receive supply: ${error.message}`);
    }
  }

  function handleCancelSupply(recordId: string) {
    if (!confirm('Cancel this supply record?')) return;
    
    const updatedRecords = supplyRecords.map(r =>
      r.id === recordId ? { ...r, status: 'cancelled' as const } : r
    );
    saveSupplyRecords(updatedRecords);
  }

  const totalSuppliers = suppliers.length;
  const totalSupplies = supplyRecords.length;
  const pendingSupplies = supplyRecords.filter((r) => r.status === 'pending').length;
  const receivedSupplies = supplyRecords.filter((r) => r.status === 'received').length;
  const totalValue = supplyRecords
    .filter(r => r.status === 'received')
    .reduce((sum, r) => sum + r.totalCost, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-50 animate-pulse" />
          <p className="text-muted-foreground">Loading suppliers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => onNavigate('dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1>Supplier Management</h1>
              <p className="text-sm text-muted-foreground">
                Manage suppliers and track supplies
              </p>
            </div>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-5 h-5 mr-2" />
            Add Supplier
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Total Suppliers"
            value={totalSuppliers}
            icon={Truck}
          />
          <KPICard
            title="Total Supplies"
            value={totalSupplies}
            icon={Package}
          />
          <KPICard
            title="Pending Supplies"
            value={pendingSupplies}
            icon={Calendar}
          />
          <KPICard
            title="Total Value"
            value={`₦${totalValue.toLocaleString()}`}
            icon={Building2}
          />
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`pb-3 border-b-2 transition-colors ${
                activeTab === 'suppliers'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4" />
                <span>Suppliers</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('received')}
              className={`pb-3 border-b-2 transition-colors ${
                activeTab === 'received'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                <span>Received ({receivedSupplies})</span>
              </div>
            </button>
          </div>
        </div>

        {/* Suppliers Tab */}
        {activeTab === 'suppliers' && (
          <Card className="p-6">
            <h2 className="mb-4">Suppliers</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Supplier Name</th>
                    <th className="text-left py-3 px-4">Company</th>
                    <th className="text-left py-3 px-4">Contact</th>
                    <th className="text-left py-3 px-4">Product Categories</th>
                    <th className="text-center py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-muted-foreground">
                        <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No suppliers found</p>
                        <p className="text-sm">Click "Add Supplier" to create one</p>
                      </td>
                    </tr>
                  ) : (
                    suppliers.map((supplier) => (
                      <tr key={supplier.id} className="border-b hover:bg-accent/50">
                        <td className="py-3 px-4 font-medium">{supplier.name}</td>
                        <td className="py-3 px-4">{supplier.company}</td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {supplier.phone && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="w-3 h-3 text-muted-foreground" />
                                {supplier.phone}
                              </div>
                            )}
                            {supplier.email && (
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="w-3 h-3 text-muted-foreground" />
                                {supplier.email}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">{supplier.productCategories}</td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedSupplier(supplier.id);
                              setShowSupplyModal(true);
                            }}
                          >
                            Record Supply
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Received Tab */}
        {activeTab === 'received' && (
          <Card className="p-6">
            <h2 className="mb-4">Pending Supplies - Warehouse Receiving</h2>
            <div className="space-y-4">
              {supplyRecords.filter(r => r.status === 'pending').length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No pending supplies</p>
                  <p className="text-sm">Record a supply to see it here</p>
                </div>
              ) : (
                supplyRecords
                  .filter(r => r.status === 'pending')
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((record) => (
                    <div
                      key={record.id}
                      className="border rounded-lg p-4 space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium">{record.supplierName}</h3>
                          <p className="text-sm text-muted-foreground">
                            To: {record.warehouseName} • {new Date(record.date).toLocaleDateString()}
                          </p>
                          {record.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{record.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:bg-green-50"
                            onClick={() => handleReceiveSupply(record.id)}
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Receive & Add to Inventory
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleCancelSupply(record.id)}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                      
                      <div className="border-t pt-3">
                        <p className="text-sm font-medium mb-2">Products:</p>
                        <div className="space-y-2">
                          {record.products.map((product, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-sm bg-accent/30 rounded px-3 py-2"
                            >
                              <span>{product.productName}</span>
                              <span className="text-muted-foreground">
                                Qty: {product.quantity} × ₦{product.unitCost.toLocaleString()} = ₦{(product.quantity * product.unitCost).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t flex justify-between items-center">
                          <span className="font-medium">Total Cost:</span>
                          <span className="font-medium text-lg">₦{record.totalCost.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Add Supplier Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Supplier Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., John Doe"
              />
            </div>
            <div>
              <Label htmlFor="company">Company Name *</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="e.g., ABC Trading Ltd."
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+234 800 000 0000"
              />
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="supplier@example.com"
              />
            </div>
            <div>
              <Label htmlFor="categories">Product Categories</Label>
              <Input
                id="categories"
                value={formData.productCategories}
                onChange={(e) => setFormData({ ...formData, productCategories: e.target.value })}
                placeholder="e.g., Food & Beverages, Pharmaceuticals"
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional information..."
                rows={3}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleAddSupplier}>
              Add Supplier
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Supply Modal - Multi-Product */}
      <Dialog open={showSupplyModal} onOpenChange={setShowSupplyModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Supply - Multiple Products</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-accent rounded-lg">
              <p className="text-sm text-muted-foreground">From Supplier</p>
              <p className="font-medium">
                {suppliers.find((s) => s.id === selectedSupplier)?.name || 'N/A'}
              </p>
            </div>
            
            <div>
              <Label htmlFor="warehouse">Receiving Warehouse *</Label>
              <select
                id="warehouse"
                value={supplyForm.warehouseId}
                onChange={(e) => setSupplyForm({ ...supplyForm, warehouseId: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg bg-background"
              >
                <option value="">-- Select warehouse --</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Products *</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addProductItem}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </div>
              
              {productItems.map((item, index) => (
                <div key={item.id} className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <Label htmlFor={`product-${item.id}`}>Product {index + 1}</Label>
                      <select
                        id={`product-${item.id}`}
                        value={item.productId}
                        onChange={(e) => updateProductItem(item.id, 'productId', e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg bg-background"
                      >
                        <option value="">-- Select product --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                        ))}
                      </select>
                    </div>
                    {productItems.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeProductItem(item.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`quantity-${item.id}`}>Quantity</Label>
                      <Input
                        id={`quantity-${item.id}`}
                        type="number"
                        min="1"
                        value={item.quantity || ''}
                        onChange={(e) => updateProductItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`cost-${item.id}`}>Unit Cost (₦)</Label>
                      <Input
                        id={`cost-${item.id}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitCost || ''}
                        onChange={(e) => updateProductItem(item.id, 'unitCost', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  
                  {item.quantity > 0 && item.unitCost > 0 && (
                    <div className="text-sm text-muted-foreground">
                      Subtotal: ₦{(item.quantity * item.unitCost).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
              
              <div className="border-t pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Cost:</span>
                  <span className="font-medium text-lg">
                    ₦{productItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="date">Supply Date *</Label>
              <Input
                id="date"
                type="date"
                value={supplyForm.date}
                onChange={(e) => setSupplyForm({ ...supplyForm, date: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="supply-notes">Notes</Label>
              <Textarea
                id="supply-notes"
                value={supplyForm.notes}
                onChange={(e) => setSupplyForm({ ...supplyForm, notes: e.target.value })}
                placeholder="Additional information..."
                rows={3}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowSupplyModal(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleRecordSupply}>
              <Package className="w-4 h-4 mr-2" />
              Record Supply
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}