import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Building2, Warehouse, AlertTriangle } from 'lucide-react';

interface BranchWarehouseSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: any[];
  warehouses: any[];
  currentBranchId: string | null;
  currentWarehouseId: string | null;
  companyName: string;
  userRole: string | null;
  onSwitch: (branchId: string, warehouseId: string | null) => void;
}

export function BranchWarehouseSelector({
  open,
  onOpenChange,
  branches,
  warehouses,
  currentBranchId,
  currentWarehouseId,
  companyName,
  userRole,
  onSwitch,
}: BranchWarehouseSelectorProps) {
  // Only allow admin and owner to switch branches
  const canSwitchBranches = userRole === 'owner' || userRole === 'admin';
  const [selectedBranch, setSelectedBranch] = useState(currentBranchId || '');
  const [selectedWarehouse, setSelectedWarehouse] = useState(currentWarehouseId || '');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    setSelectedBranch(currentBranchId || '');
    setSelectedWarehouse(currentWarehouseId || '');
  }, [currentBranchId, currentWarehouseId]);

  const filteredWarehouses = warehouses.filter(
    (w) => !selectedBranch || w.branchId === selectedBranch || !w.branchId
  );

  const handleSwitch = () => {
    if (!selectedBranch) {
      alert('Please select a branch');
      return;
    }

    // Validate that the selected branch exists
    const branchExists = branches.find(b => b.id === selectedBranch);
    if (!branchExists) {
      alert('Selected branch not found. Please select a valid branch.');
      return;
    }

    // Validate warehouse if selected
    if (selectedWarehouse) {
      const warehouseExists = warehouses.find(w => w.id === selectedWarehouse);
      if (!warehouseExists) {
        alert('Selected warehouse not found. Please select a valid warehouse.');
        return;
      }
    }

    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'Switch to new context? Any unsaved changes will be lost.'
      );
      if (!confirmed) return;
    }

    console.log('🔄 Switching context:', {
      branch: branchExists.name,
      warehouse: selectedWarehouse ? warehouses.find(w => w.id === selectedWarehouse)?.name : 'None'
    });

    onSwitch(selectedBranch, selectedWarehouse || null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Switch Branch / Warehouse Context</DialogTitle>
        </DialogHeader>

        {!canSwitchBranches ? (
          <div className="py-6">
            <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="font-medium">Access Restricted</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Only administrators and owners can switch between branches and warehouses.
                  Please contact your administrator if you need access to a different branch.
                </p>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          </div>
        ) : (
        <div className="space-y-6 py-4">
          {/* Company Display */}
          <div className="p-4 bg-accent rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Company</p>
            <p className="font-semibold">{companyName}</p>
          </div>

          {/* Branch Selection */}
          <div className="space-y-2">
            <Label htmlFor="branch-select" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Select Branch *
            </Label>
            <select
              id="branch-select"
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setSelectedWarehouse(''); // Reset warehouse when branch changes
              }}
              className="w-full px-4 py-2 border rounded-lg bg-background"
            >
              <option value="">-- Select a branch --</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} {branch.location ? `- ${branch.location}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Warehouse Selection */}
          <div className="space-y-2">
            <Label htmlFor="warehouse-select" className="flex items-center gap-2">
              <Warehouse className="w-4 h-4" />
              Select Warehouse (Optional)
            </Label>
            <select
              id="warehouse-select"
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg bg-background"
              disabled={!selectedBranch}
            >
              <option value="">-- No warehouse (Branch view) --</option>
              {filteredWarehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name} {warehouse.location ? `- ${warehouse.location}` : ''}
                </option>
              ))}
            </select>
            {!selectedBranch && (
              <p className="text-xs text-muted-foreground">
                Please select a branch first
              </p>
            )}
          </div>

          {/* Warning */}
          {hasUnsavedChanges && (
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                Switching context will reload the dashboard and any unsaved changes will be lost.
              </p>
            </div>
          )}

          {/* Current Context Display */}
          <div className="p-3 bg-muted rounded-lg text-sm">
            <p className="text-muted-foreground mb-1">Currently viewing:</p>
            <p className="font-medium">
              {branches.find((b) => b.id === currentBranchId)?.name || 'No branch selected'}
              {currentWarehouseId && warehouses.find((w) => w.id === currentWarehouseId)
                ? ` → ${warehouses.find((w) => w.id === currentWarehouseId)?.name}`
                : ''}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSwitch}>
              Switch Context
            </Button>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}