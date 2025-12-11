import { useState, useEffect } from 'react';
import { AppState, Page } from '../App';
import { getTransfers, createTransfer, approveTransfer, markTransferInTransit, receiveTransfer, getBranches, getProducts, getBranchStock } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { ProductSearch } from '../components/ProductSearch';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Textarea } from '../components/ui/textarea';
import {
  ArrowLeft,
  Plus,
  ArrowLeftRight,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Building2,
  User,
  FileText,
  AlertCircle,
} from 'lucide-react';

interface TransfersProps {
  appState: AppState;
  onNavigate: (page: Page) => void;
}

interface TransferItem {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  unitCost: number;
}

export function Transfers({ appState, onNavigate }: TransfersProps) {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTransfer, setShowNewTransfer] = useState(false);
  const [showTransferDetail, setShowTransferDetail] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<any>(null);

  // New transfer state
  const [sourceBranchId, setSourceBranchId] = useState('');
  const [destinationBranchId, setDestinationBranchId] = useState('');
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [transferReason, setTransferReason] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [showQuantityDialog, setShowQuantityDialog] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<any>(null);
  const [pendingQuantity, setPendingQuantity] = useState('1');
  const [branchStock, setBranchStock] = useState<any[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);

  useEffect(() => {
    if (appState.orgId) {
      loadData();
    }
  }, [appState.orgId]);

  async function loadData() {
    if (!appState.orgId) return;

    try {
      const [transfersRes, branchesRes, productsRes] = await Promise.all([
        getTransfers(appState.orgId),
        getBranches(appState.orgId),
        getProducts(appState.orgId),
      ]);

      setTransfers(transfersRes.transfers || []);
      setBranches(branchesRes.branches || []);
      setProducts(productsRes.products || []);
    } catch (error) {
      console.error('Error loading transfers:', error);
    } finally {
      setLoading(false);
    }
  }

  // Load stock when source branch changes
  useEffect(() => {
    if (sourceBranchId) {
      loadBranchStock(sourceBranchId);
    } else {
      setBranchStock([]);
    }
  }, [sourceBranchId]);

  async function loadBranchStock(branchId: string) {
    setLoadingStock(true);
    try {
      console.log('Loading stock for branch:', branchId);
      const response = await getBranchStock(branchId);
      console.log('Branch stock response:', response);
      
      const stockData = response.stock || [];
      console.log('Stock data:', stockData);
      
      setBranchStock(stockData);
    } catch (error) {
      console.error('Error loading branch stock:', error);
      setBranchStock([]);
    } finally {
      setLoadingStock(false);
    }
  }

  function getAvailableStock(productId: string): number {
    console.log('Getting stock for product:', productId);
    console.log('Available stock items:', branchStock);
    
    const stockItem = branchStock.find(s => s.productId === productId);
    console.log('Found stock item:', stockItem);
    
    return stockItem?.quantity || 0;
  }

  function getMaxAvailableQuantity(productId: string): number {
    const availableStock = getAvailableStock(productId);
    const alreadyInTransfer = transferItems.find(item => item.productId === productId)?.quantity || 0;
    return availableStock;
  }

  function handleProductSelect(product: any) {
    // Show quantity dialog instead of adding directly
    setPendingProduct(product);
    setPendingQuantity('1');
    setShowQuantityDialog(true);
  }

  function addTransferItem() {
    if (!pendingProduct) return;

    const quantity = parseInt(pendingQuantity) || 1;
    const availableStock = getMaxAvailableQuantity(pendingProduct.id);
    
    // Validate stock availability
    if (quantity > availableStock) {
      alert(`Cannot transfer ${quantity} units. Only ${availableStock} units available in source branch.`);
      return;
    }

    const existing = transferItems.find((item) => item.productId === pendingProduct.id);
    
    if (existing) {
      const newQuantity = existing.quantity + quantity;
      if (newQuantity > availableStock) {
        alert(`Cannot transfer ${newQuantity} units total. Only ${availableStock} units available in source branch.`);
        return;
      }
      setTransferItems(
        transferItems.map((item) =>
          item.productId === pendingProduct.id
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
    } else {
      setTransferItems([
        ...transferItems,
        {
          productId: pendingProduct.id,
          name: pendingProduct.name,
          sku: pendingProduct.sku,
          quantity: quantity,
          unitCost: pendingProduct.unitCost || 0,
        },
      ]);
    }

    setShowQuantityDialog(false);
    setPendingProduct(null);
    setPendingQuantity('1');
  }

  function updateItemQuantity(productId: string, quantity: number) {
    const availableStock = getMaxAvailableQuantity(productId);
    
    if (quantity > availableStock) {
      alert(`Cannot transfer ${quantity} units. Only ${availableStock} units available in source branch.`);
      return;
    }

    setTransferItems(
      transferItems.map((item) =>
        item.productId === productId ? { ...item, quantity: Math.max(1, Math.min(quantity, availableStock)) } : item
      )
    );
  }

  function removeTransferItem(productId: string) {
    setTransferItems(transferItems.filter((item) => item.productId !== productId));
  }

  async function handleCreateTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!appState.orgId) return;

    try {
      console.log('📤 Creating transfer with items:', transferItems);
      const result = await createTransfer({
        orgId: appState.orgId,
        sourceBranchId,
        destinationBranchId,
        items: transferItems,
        reason: transferReason,
        requiresApproval,
      });
      console.log('✅ Transfer created:', result);

      setShowNewTransfer(false);
      setSourceBranchId('');
      setDestinationBranchId('');
      setTransferItems([]);
      setTransferReason('');
      loadData();
    } catch (error) {
      console.error('Error creating transfer:', error);
      alert('Failed to create transfer');
    }
  }

  async function handleApprove(transferId: string) {
    try {
      await approveTransfer(transferId);
      loadData();
    } catch (error) {
      console.error('Error approving transfer:', error);
      alert('Failed to approve transfer');
    }
  }

  async function handleMarkInTransit(transferId: string) {
    try {
      await markTransferInTransit(transferId);
      loadData();
    } catch (error) {
      console.error('Error marking transfer in transit:', error);
      alert('Failed to mark transfer in transit');
    }
  }

  async function handleReceive(transferId: string, items: any[], notes: string) {
    try {
      await receiveTransfer(transferId, items, notes);
      loadData();
      setShowTransferDetail(false);
    } catch (error: any) {
      console.error('Error receiving transfer:', error);
      const errorMsg = error?.message || error?.toString() || 'Unknown error occurred';
      alert(`Failed to receive transfer: ${errorMsg}`);
    }
  }

  const totalValue = transferItems.reduce(
    (sum, item) => sum + item.quantity * item.unitCost,
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading transfers...</p>
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
              <h1>Transfer Management</h1>
              <p className="text-sm text-muted-foreground">
                Manage inventory transfers between branches
              </p>
            </div>
          </div>

          {(appState.userRole === 'owner' || appState.userRole === 'admin') && (
            <Button onClick={() => setShowNewTransfer(true)}>
              <Plus className="w-5 h-5 mr-2" />
              New Transfer
            </Button>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl">
                  {transfers.filter((t) => t.status === 'pending').length}
                </p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <ArrowLeftRight className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl">
                  {transfers.filter((t) => t.status === 'in_transit').length}
                </p>
                <p className="text-sm text-muted-foreground">In Transit</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl">
                  {transfers.filter((t) => t.status === 'completed' || t.status === 'received').length}
                </p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl">{transfers.length}</p>
                <p className="text-sm text-muted-foreground">Total Transfers</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Transfers Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transfer ID</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <ArrowLeftRight className="w-16 h-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
                    <p className="text-muted-foreground">No transfers yet</p>
                    <p className="text-sm text-muted-foreground">
                      Create your first transfer to move inventory between branches
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                transfers.map((transfer) => {
                  // Support both branch and warehouse transfers
                  const sourceBranch = branches.find((b) => b.id === transfer.sourceBranchId || b.id === transfer.fromBranchId);
                  const destBranch = branches.find((b) => b.id === transfer.destinationBranchId || b.id === transfer.toBranchId);
                  
                  // Get source and destination names (could be warehouse or branch)
                  const sourceName = transfer.sourceWarehouseId || transfer.fromWarehouseId 
                    ? `Warehouse (${transfer.from_warehouse?.name || 'Unknown'})`
                    : (sourceBranch?.name || 'Unknown');
                  
                  const destName = transfer.destinationWarehouseId || transfer.toWarehouseId
                    ? `Warehouse (${transfer.to_warehouse?.name || 'Unknown'})`
                    : (destBranch?.name || 'Unknown');
                  
                  // Calculate value - handle both single transfer and items array
                  const value = transfer.items 
                    ? (transfer.items || []).reduce((sum: number, item: any) => sum + item.quantity * (item.unitCost || 0), 0)
                    : (transfer.quantity || 0) * (transfer.product?.unit_cost || 0);
                  
                  // Count items
                  const itemCount = transfer.items ? transfer.items.length : 1;

                  return (
                    <TableRow key={transfer.id}>
                      <TableCell>
                        <span className="text-sm font-mono">
                          {transfer.id.substring(0, 12)}...
                        </span>
                      </TableCell>
                      <TableCell>{sourceName}</TableCell>
                      <TableCell>{destName}</TableCell>
                      <TableCell>{itemCount} item{itemCount > 1 ? 's' : ''}</TableCell>
                      <TableCell>₦{value.toLocaleString()}</TableCell>
                      <TableCell>
                        <StatusBadge status={transfer.status} />
                      </TableCell>
                      <TableCell>
                        {new Date(transfer.createdAt || transfer.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedTransfer(transfer);
                              setShowTransferDetail(true);
                            }}
                          >
                            View
                          </Button>
                          {/* Manager can approve pending transfers TO their branch */}
                          {transfer.status === 'pending' && 
                           ((transfer.destinationBranchId === appState.currentBranchId || transfer.toBranchId === appState.currentBranchId) &&
                            (appState.userRole === 'owner' || appState.userRole === 'admin' || appState.userRole === 'manager')) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApprove(transfer.id)}
                            >
                              Approve
                            </Button>
                          )}
                          {/* Admin/Owner can mark as in transit */}
                          {transfer.status === 'approved' && 
                           (appState.userRole === 'owner' || appState.userRole === 'admin') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkInTransit(transfer.id)}
                            >
                              In Transit
                            </Button>
                          )}
                          {/* Receiving branch manager can accept in-transit transfers */}
                          {transfer.status === 'in_transit' && 
                           ((transfer.destinationBranchId === appState.currentBranchId || transfer.toBranchId === appState.currentBranchId) &&
                            (appState.userRole === 'owner' || appState.userRole === 'admin' || appState.userRole === 'manager')) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-success hover:text-success"
                              onClick={() => {
                                setSelectedTransfer(transfer);
                                setShowTransferDetail(true);
                              }}
                            >
                              Accept
                            </Button>
                          )}
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

      {/* New Transfer Dialog */}
      <Dialog open={showNewTransfer} onOpenChange={setShowNewTransfer}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Create New Transfer</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateTransfer} className="space-y-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="source">Source Branch *</Label>
                <select
                  id="source"
                  value={sourceBranchId}
                  onChange={(e) => setSourceBranchId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  required
                >
                  <option value="">Select source branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="destination">Destination Branch *</Label>
                <select
                  id="destination"
                  value={destinationBranchId}
                  onChange={(e) => setDestinationBranchId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  required
                >
                  <option value="">Select destination branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label>Add Products</Label>
              {!sourceBranchId ? (
                <div className="p-4 bg-muted/50 border border-dashed rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">
                    Select a source branch first to add products
                  </p>
                </div>
              ) : (
                <ProductSearch products={products} onSelect={handleProductSelect} />
              )}
            </div>

            {transferItems.length > 0 && (
              <div>
                <Label>Transfer Items</Label>
                <div className="border rounded-lg overflow-hidden mt-2">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 text-sm">Product</th>
                        <th className="text-left p-3 text-sm">SKU</th>
                        <th className="text-left p-3 text-sm">Available</th>
                        <th className="text-left p-3 text-sm">Quantity</th>
                        <th className="text-left p-3 text-sm">Unit Cost</th>
                        <th className="text-left p-3 text-sm">Total</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {transferItems.map((item) => {
                        const availableStock = getMaxAvailableQuantity(item.productId);
                        const isOverStock = item.quantity > availableStock;
                        return (
                          <tr key={item.productId} className="border-t">
                            <td className="p-3">{item.name}</td>
                            <td className="p-3 text-sm text-muted-foreground">{item.sku}</td>
                            <td className="p-3">
                              <span className={`text-sm ${isOverStock ? 'text-warning font-medium' : 'text-muted-foreground'}`}>
                                {loadingStock ? '...' : availableStock}
                              </span>
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                min="1"
                                max={availableStock}
                                value={item.quantity}
                                onChange={(e) =>
                                  updateItemQuantity(item.productId, parseInt(e.target.value))
                                }
                                className={`w-20 ${isOverStock ? 'border-warning' : ''}`}
                              />
                            </td>
                            <td className="p-3">₦{item.unitCost.toFixed(2)}</td>
                            <td className="p-3">₦{(item.quantity * item.unitCost).toFixed(2)}</td>
                            <td className="p-3">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeTransferItem(item.productId)}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-muted">
                      <tr>
                        <td colSpan={5} className="p-3 text-right">
                          <strong>Total Value:</strong>
                        </td>
                        <td className="p-3" colSpan={2}>
                          <strong>₦{totalValue.toFixed(2)}</strong>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="reason">Reason for Transfer</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Stock replenishment, branch opening, excess inventory"
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="approval"
                checked={requiresApproval}
                onChange={(e) => setRequiresApproval(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="approval" className="cursor-pointer">
                Requires manager approval before processing
              </Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewTransfer(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={transferItems.length === 0}>
                Create Transfer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quantity Input Dialog */}
      <Dialog open={showQuantityDialog} onOpenChange={setShowQuantityDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Specify Quantity</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Product</p>
              <p className="font-medium">{pendingProduct?.name}</p>
              <p className="text-xs text-muted-foreground">{pendingProduct?.sku}</p>
            </div>

            {/* Available Stock Display */}
            {pendingProduct && sourceBranchId && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Available Stock
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      {branches.find(b => b.id === sourceBranchId)?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    {loadingStock ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xs text-blue-700 dark:text-blue-300">Loading...</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          {getMaxAvailableQuantity(pendingProduct.id)}
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">units</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Warning if no stock */}
            {pendingProduct && sourceBranchId && !loadingStock && getMaxAvailableQuantity(pendingProduct.id) === 0 && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-warning">No Stock Available</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      This product has no available stock in the selected source branch.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={pendingProduct ? getMaxAvailableQuantity(pendingProduct.id) : undefined}
                value={pendingQuantity}
                onChange={(e) => setPendingQuantity(e.target.value)}
                placeholder="Enter quantity"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addTransferItem();
                  }
                }}
              />
              {pendingProduct && parseInt(pendingQuantity) > getMaxAvailableQuantity(pendingProduct.id) && (
                <p className="text-xs text-warning mt-1">
                  Exceeds available stock ({getMaxAvailableQuantity(pendingProduct.id)} units)
                </p>
              )}
            </div>

            {pendingProduct && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Unit Cost:</span>
                  <span>₦{(pendingProduct.unitCost || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Value:</span>
                  <span className="font-medium">
                    ₦{((parseInt(pendingQuantity) || 0) * (pendingProduct.unitCost || 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowQuantityDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={addTransferItem}
              disabled={
                !pendingQuantity || 
                parseInt(pendingQuantity) < 1 ||
                (pendingProduct && parseInt(pendingQuantity) > getMaxAvailableQuantity(pendingProduct.id))
              }
            >
              Add to Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Detail Dialog */}
      {selectedTransfer && (
        <Dialog open={showTransferDetail} onOpenChange={setShowTransferDetail}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto w-[95vw] sm:w-full">
            <DialogHeader>
              <DialogTitle>Transfer Details</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <StatusBadge status={selectedTransfer.status} />
                <span className="text-sm text-muted-foreground">
                  {new Date(selectedTransfer.createdAt || selectedTransfer.created_at).toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Source</span>
                  </div>
                  <p>
                    {selectedTransfer.sourceWarehouseId || selectedTransfer.fromWarehouseId
                      ? `Warehouse: ${selectedTransfer.from_warehouse?.name || 'Unknown'}`
                      : (branches.find((b) => b.id === (selectedTransfer.sourceBranchId || selectedTransfer.fromBranchId))?.name ||
                        'Unknown')}
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Destination</span>
                  </div>
                  <p>
                    {selectedTransfer.destinationWarehouseId || selectedTransfer.toWarehouseId
                      ? `Warehouse: ${selectedTransfer.to_warehouse?.name || 'Unknown'}`
                      : (branches.find((b) => b.id === (selectedTransfer.destinationBranchId || selectedTransfer.toBranchId))?.name ||
                        'Unknown')}
                  </p>
                </Card>
              </div>

              <div>
                <h3 className="mb-3 flex items-center justify-between">
                  <span>Transfer Items</span>
                  <span className="text-sm text-muted-foreground">
                    ID: {selectedTransfer.id?.substring(0, 12)}...
                  </span>
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 text-sm">Product</th>
                        <th className="text-left p-3 text-sm">SKU</th>
                        <th className="text-right p-3 text-sm">Quantity</th>
                        <th className="text-right p-3 text-sm">Unit Cost</th>
                        <th className="text-right p-3 text-sm">Total Value</th>
                        {selectedTransfer.status === 'pending' && 
                         (appState.userRole === 'owner' || appState.userRole === 'admin' || appState.userRole === 'manager') && (
                          <th className="text-left p-3 text-sm">Current Stock</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Handle both single product transfer and multiple items */}
                      {(() => {
                        const items = selectedTransfer.items || [
                          {
                            name: selectedTransfer.product?.name || 'Unknown Product',
                            sku: selectedTransfer.product?.sku || 'N/A',
                            productId: selectedTransfer.productId || selectedTransfer.product_id,
                            quantity: selectedTransfer.quantity || 0,
                            unitCost: selectedTransfer.product?.unit_cost || 0,
                          }
                        ];
                        
                        return items.map((item: any, index: number) => {
                          // Get product info from products array
                          const product = products.find(p => p.id === item.productId);
                          const destBranchId = selectedTransfer.destinationBranchId || selectedTransfer.toBranchId;
                          
                          // Check if product exists in destination branch
                          const existsInDestination = product ? true : false;
                          
                          return (
                            <tr key={index} className="border-t">
                              <td className="p-3">
                                <div>
                                  <div>{item.name}</div>
                                  {!existsInDestination && selectedTransfer.status === 'pending' && (
                                    <span className="text-xs text-warning flex items-center gap-1 mt-1">
                                      <AlertCircle className="w-3 h-3" />
                                      New to destination
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 text-sm text-muted-foreground">{item.sku}</td>
                              <td className="p-3 text-right">{item.quantity}</td>
                              <td className="p-3 text-right">₦{(item.unitCost || 0).toFixed(2)}</td>
                              <td className="p-3 text-right font-medium">
                                ₦{(item.quantity * (item.unitCost || 0)).toFixed(2)}
                              </td>
                              {selectedTransfer.status === 'pending' && 
                               (appState.userRole === 'owner' || appState.userRole === 'admin' || appState.userRole === 'manager') && (
                                <td className="p-3 text-sm">
                                  {product ? (
                                    <span className="text-muted-foreground">
                                      Selling at: ₦{product.price?.toFixed(2)}
                                    </span>
                                  ) : (
                                    <span className="text-warning text-xs">Not in system</span>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                    <tfoot className="bg-muted/50 font-medium">
                      <tr>
                        <td colSpan={4} className="p-3 text-right">Total Transfer Value:</td>
                        <td className="p-3 text-right text-primary">
                          ₦{(() => {
                            const items = selectedTransfer.items || [
                              {
                                quantity: selectedTransfer.quantity || 0,
                                unitCost: selectedTransfer.product?.unit_cost || 0,
                              }
                            ];
                            return items.reduce((sum: number, item: any) => 
                              sum + (item.quantity * (item.unitCost || 0)), 0
                            ).toFixed(2);
                          })()}
                        </td>
                        {selectedTransfer.status === 'pending' && 
                         (appState.userRole === 'owner' || appState.userRole === 'admin' || appState.userRole === 'manager') && (
                          <td></td>
                        )}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {(selectedTransfer.reason || selectedTransfer.notes) && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Transfer Notes
                  </h3>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                    {selectedTransfer.reason || selectedTransfer.notes}
                  </p>
                </div>
              )}

              {selectedTransfer.status === 'pending' && 
               (appState.userRole === 'owner' || appState.userRole === 'admin' || appState.userRole === 'manager') && (
                <div className="p-4 bg-info/10 border border-info/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-info mb-1">Approval Required</p>
                      <p className="text-sm text-muted-foreground mb-3">
                        Review the transfer details above. Approving will deduct stock from the source location.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            if (confirm('Reject this transfer? This cannot be undone.')) {
                              // TODO: Implement rejection
                              alert('Rejection feature coming soon');
                            }
                          }}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={() => {
                            if (confirm('Approve this transfer? Stock will be deducted from the source location.')) {
                              handleApprove(selectedTransfer.id);
                              setShowTransferDetail(false);
                            }
                          }}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve Transfer
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Receiving branch manager can accept the transfer */}
              {selectedTransfer.status === 'in_transit' && 
               ((selectedTransfer.destinationBranchId === appState.currentBranchId || selectedTransfer.toBranchId === appState.currentBranchId) &&
                (appState.userRole === 'owner' || appState.userRole === 'admin' || appState.userRole === 'manager')) && (
                <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                  <div className="flex items-start gap-3 mb-4">
                    <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-success">Ready to Receive</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        This transfer is ready to be received at your branch. Review the items above and confirm receipt to update your inventory.
                      </p>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => {
                      if (confirm('Accept this transfer? This will add the items to your branch inventory.')) {
                        const items = selectedTransfer.items || [
                          {
                            productId: selectedTransfer.productId || selectedTransfer.product_id,
                            quantity: selectedTransfer.quantity || 0,
                          }
                        ];
                        const receivedItems = items.map((item: any) => ({
                          productId: item.productId,
                          receivedQuantity: item.quantity,
                        }));
                        handleReceive(selectedTransfer.id, receivedItems, 'Received and accepted by branch manager');
                      }
                    }}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Accept Transfer & Update Inventory
                  </Button>
                </div>
              )}
              
              {/* Show message if in-transit but not for this branch */}
              {selectedTransfer.status === 'in_transit' && 
               selectedTransfer.destinationBranchId !== appState.currentBranchId && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    This transfer is in transit to another branch. Only the receiving branch manager can accept it.
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}