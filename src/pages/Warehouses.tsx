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
  Warehouse,
  MapPin,
  User,
  Package,
  Send,
  TrendingUp,
  TrendingDown,
  Menu,
  X,
} from 'lucide-react';
import { KPICard } from '../components/KPICard';

interface WarehousesProps {
  appState: AppState;
  onNavigate: (page: Page) => void;
}

interface WarehouseData {
  id: string;
  name: string;
  location: string;
  branchId: string | null;
  branchName?: string;
  manager: string;
  phone: string;
  notes: string;
  totalProducts: number;
  createdAt: string;
}

interface DispatchData {
  id: string;
  warehouseId: string;
  warehouseName: string;
  branchId: string;
  branchName: string;
  productId: string;
  productName: string;
  quantity: number;
  date: string;
  status: 'pending' | 'in_transit' | 'delivered';
  dispatchedBy: string;
}

export function Warehouses({ appState, onNavigate }: WarehousesProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [dispatches, setDispatches] = useState<DispatchData[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    branchId: '',
    manager: '',
    phone: '',
    notes: '',
  });

  const [dispatchForm, setDispatchForm] = useState({
    productName: '',
    quantity: '',
    branchId: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadWarehouses();
    loadDispatches();
  }, []);

  function loadWarehouses() {
    // Mock data - replace with actual API call
    const mockWarehouses: WarehouseData[] = [
      {
        id: '1',
        name: 'Central Warehouse',
        location: 'Lagos Mainland',
        branchId: null,
        manager: 'John Doe',
        phone: '+234 800 000 0001',
        notes: 'Main distribution center',
        totalProducts: 450,
        createdAt: '2024-01-15',
      },
      {
        id: '2',
        name: 'Ikeja Storage',
        location: 'Ikeja, Lagos',
        branchId: appState.branches?.[0]?.id || null,
        branchName: appState.branches?.[0]?.name,
        manager: 'Jane Smith',
        phone: '+234 800 000 0002',
        notes: 'Branch-specific warehouse',
        totalProducts: 280,
        createdAt: '2024-02-10',
      },
    ];
    setWarehouses(mockWarehouses);
  }

  function loadDispatches() {
    // Mock data - replace with actual API call
    const mockDispatches: DispatchData[] = [
      {
        id: '1',
        warehouseId: '1',
        warehouseName: 'Central Warehouse',
        branchId: appState.branches?.[0]?.id || '1',
        branchName: appState.branches?.[0]?.name || 'Main Branch',
        productId: '1',
        productName: 'Sample Product A',
        quantity: 50,
        date: '2024-10-18',
        status: 'in_transit',
        dispatchedBy: 'John Doe',
      },
    ];
    setDispatches(mockDispatches);
  }

  function handleAddWarehouse() {
    if (!formData.name || !formData.location) {
      alert('Please fill in all required fields');
      return;
    }

    const newWarehouse: WarehouseData = {
      id: Date.now().toString(),
      name: formData.name,
      location: formData.location,
      branchId: formData.branchId || null,
      branchName: appState.branches?.find((b) => b.id === formData.branchId)?.name,
      manager: formData.manager,
      phone: formData.phone,
      notes: formData.notes,
      totalProducts: 0,
      createdAt: new Date().toISOString(),
    };

    setWarehouses([...warehouses, newWarehouse]);
    setShowAddModal(false);
    setFormData({
      name: '',
      location: '',
      branchId: '',
      manager: '',
      phone: '',
      notes: '',
    });

    alert('Warehouse created successfully!');
  }

  function handleDispatchToBranch() {
    if (!selectedWarehouse || !dispatchForm.productName || !dispatchForm.quantity || !dispatchForm.branchId) {
      alert('Please fill in all required fields');
      return;
    }

    const warehouse = warehouses.find((w) => w.id === selectedWarehouse);
    const branch = appState.branches?.find((b) => b.id === dispatchForm.branchId);

    const newDispatch: DispatchData = {
      id: Date.now().toString(),
      warehouseId: selectedWarehouse,
      warehouseName: warehouse?.name || '',
      branchId: dispatchForm.branchId,
      branchName: branch?.name || '',
      productId: Date.now().toString(),
      productName: dispatchForm.productName,
      quantity: parseInt(dispatchForm.quantity),
      date: dispatchForm.date,
      status: 'pending',
      dispatchedBy: appState.user?.name || 'Unknown',
    };

    setDispatches([...dispatches, newDispatch]);
    setShowDispatchModal(false);
    setDispatchForm({
      productName: '',
      quantity: '',
      branchId: '',
      date: new Date().toISOString().split('T')[0],
    });

    alert('Product dispatched to branch successfully!');
  }

  const totalWarehouses = warehouses.length;
  const totalProducts = warehouses.reduce((sum, w) => sum + w.totalProducts, 0);
  const outgoingRequests = dispatches.filter((d) => d.status === 'pending').length;
  const incomingShipments = dispatches.filter((d) => d.status === 'in_transit').length;

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
              <h1>Warehouse Management</h1>
              <p className="text-sm text-muted-foreground">
                Manage warehouses and stock distribution
              </p>
            </div>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-5 h-5 mr-2" />
            Add Warehouse
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Total Warehouses"
            value={totalWarehouses}
            icon={Warehouse}
          />
          <KPICard
            title="Total Items in All Warehouses"
            value={totalProducts}
            icon={Package}
          />
          <KPICard
            title="Outgoing Requests"
            value={outgoingRequests}
            icon={TrendingUp}
          />
          <KPICard
            title="Incoming Shipments"
            value={incomingShipments}
            icon={TrendingDown}
          />
        </div>

        {/* Warehouses Table */}
        <Card className="p-6 mb-6">
          <h2 className="mb-4">Warehouses</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Location</th>
                  <th className="text-left py-3 px-4">Assigned Branch</th>
                  <th className="text-right py-3 px-4">Total Products</th>
                  <th className="text-left py-3 px-4">Manager</th>
                  <th className="text-center py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {warehouses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      <Warehouse className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No warehouses found</p>
                      <p className="text-sm">Click "Add Warehouse" to create one</p>
                    </td>
                  </tr>
                ) : (
                  warehouses.map((warehouse) => (
                    <tr key={warehouse.id} className="border-b hover:bg-accent/50">
                      <td className="py-3 px-4 font-medium">{warehouse.name}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          {warehouse.location}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {warehouse.branchName || <span className="text-muted-foreground">Not assigned</span>}
                      </td>
                      <td className="py-3 px-4 text-right">{warehouse.totalProducts}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          {warehouse.manager}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedWarehouse(warehouse.id);
                            setShowDispatchModal(true);
                          }}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Send to Branch
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Recent Dispatches */}
        <Card className="p-6">
          <h2 className="mb-4">Recent Dispatches</h2>
          <div className="space-y-3">
            {dispatches.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Send className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No dispatches yet</p>
              </div>
            ) : (
              dispatches.map((dispatch) => (
                <div
                  key={dispatch.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${
                      dispatch.status === 'delivered' ? 'bg-green-500' :
                      dispatch.status === 'in_transit' ? 'bg-amber-500' : 'bg-gray-400'
                    }`} />
                    <div>
                      <p className="font-medium">{dispatch.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        {dispatch.warehouseName} → {dispatch.branchName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">Qty: {dispatch.quantity}</p>
                    <p className="text-sm text-muted-foreground capitalize">{dispatch.status.replace('_', ' ')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Add Warehouse Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Warehouse</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Warehouse Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Central Warehouse"
              />
            </div>
            <div>
              <Label htmlFor="location">Location/Address *</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., 123 Main Street, Lagos"
              />
            </div>
            <div>
              <Label htmlFor="branch">Linked Branch (Optional)</Label>
              <select
                id="branch"
                value={formData.branchId}
                onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg bg-background"
              >
                <option value="">-- No specific branch --</option>
                {appState.branches?.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="manager">Manager Name</Label>
              <Input
                id="manager"
                value={formData.manager}
                onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                placeholder="e.g., John Doe"
              />
            </div>
            <div>
              <Label htmlFor="phone">Contact Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+234 800 000 0000"
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
            <Button className="flex-1" onClick={handleAddWarehouse}>
              Create Warehouse
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dispatch Modal */}
      <Dialog open={showDispatchModal} onOpenChange={setShowDispatchModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send to Branch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-accent rounded-lg">
              <p className="text-sm text-muted-foreground">From Warehouse</p>
              <p className="font-medium">
                {warehouses.find((w) => w.id === selectedWarehouse)?.name || 'N/A'}
              </p>
            </div>
            <div>
              <Label htmlFor="product">Product Name *</Label>
              <Input
                id="product"
                value={dispatchForm.productName}
                onChange={(e) => setDispatchForm({ ...dispatchForm, productName: e.target.value })}
                placeholder="e.g., Product XYZ"
              />
            </div>
            <div>
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                value={dispatchForm.quantity}
                onChange={(e) => setDispatchForm({ ...dispatchForm, quantity: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="dest-branch">Destination Branch *</Label>
              <select
                id="dest-branch"
                value={dispatchForm.branchId}
                onChange={(e) => setDispatchForm({ ...dispatchForm, branchId: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg bg-background"
              >
                <option value="">-- Select branch --</option>
                {appState.branches?.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="date">Dispatch Date *</Label>
              <Input
                id="date"
                type="date"
                value={dispatchForm.date}
                onChange={(e) => setDispatchForm({ ...dispatchForm, date: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowDispatchModal(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleDispatchToBranch}>
              Dispatch
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
