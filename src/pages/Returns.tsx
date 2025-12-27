import { useState, useEffect } from 'react';
import { AppState, Page } from '../App';
import { getSales, updateStock, createReturn } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import {
  ArrowLeft,
  Search,
  RotateCcw,
  Package,
  Calendar,
  User,
  CreditCard,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';

interface ReturnsProps {
  appState: AppState;
  onNavigate: (page: Page) => void;
}

interface Sale {
  id: string;
  receiptNumber: string;
  date: string;
  customer: string;
  customerPhone: string;
  items: Array<{
    productId: string;
    name: string;
    sku: string;
    price: number;
    quantity: number;
    discount: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  branchId: string;
}

interface ReturnItem {
  productId: string;
  name: string;
  sku: string;
  soldQuantity: number;
  returnQuantity: number;
  price: number;
  selected: boolean;
}

export function Returns({ appState, onNavigate }: ReturnsProps) {
  const [receiptNumber, setReceiptNumber] = useState('');
  const [searching, setSearching] = useState(false);
  const [sale, setSale] = useState<Sale | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [returnReason, setReturnReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [returnedReceiptNumber, setReturnedReceiptNumber] = useState('');

  async function handleSearchReceipt() {
    if (!receiptNumber.trim()) {
      alert('Please enter a receipt number');
      return;
    }

    if (!appState.orgId) {
      alert('Organization not found');
      return;
    }

    setSearching(true);
    setSale(null);
    setReturnItems([]);

    try {
      console.log('🔍 RETURNS: Searching for receipt:', receiptNumber);
      console.log('🔍 RETURNS: Organization ID:', appState.orgId);
      
      const { sales } = await getSales(appState.orgId);
      
      console.log('📊 RETURNS: Sales data received:', sales);
      console.log('📊 RETURNS: Total sales found:', sales?.length || 0);
      
      // Log first sale structure to see what fields are available
      if (sales && sales.length > 0) {
        console.log('📋 RETURNS: First sale structure:', {
          id: sales[0].id,
          receipt_number: sales[0].receipt_number,
          receiptNumber: sales[0].receiptNumber,
          created_at: sales[0].created_at,
          allKeys: Object.keys(sales[0])
        });
      }
      
      if (!sales || sales.length === 0) {
        alert('No sales records found for this organization. Please make sure you have completed sales.');
        return;
      }
      
      // Normalize receipt number for comparison
      const normalizedInput = receiptNumber.trim().toUpperCase().replace(/^#/, '').replace(/^RCP-/, '');
      console.log('🔍 RETURNS: Searching for normalized input:', normalizedInput);
      
      // Find sale by receipt number or ID (case-insensitive, with/without #)
      const foundSale = sales.find((s: any) => {
        const receiptNum = s.receipt_number || s.receiptNumber || '';
        const normalizedReceipt = receiptNum.toString().toUpperCase().replace(/^#/, '').replace(/^RCP-/, '');
        const normalizedId = (s.id || '').toString().toUpperCase();
        
        const matches = normalizedReceipt === normalizedInput || 
                       normalizedId === normalizedInput ||
                       receiptNum === receiptNumber ||
                       receiptNum === `#${receiptNumber}` ||
                       receiptNum === `RCP-${receiptNumber}` ||
                       s.id === receiptNumber;
        
        if (matches) {
          console.log('✅ RETURNS: MATCH FOUND!', { 
            id: s.id, 
            receiptNumber: receiptNum,
            inputWas: receiptNumber
          });
        }
        
        return matches;
      });

      if (!foundSale) {
        const availableReceipts = sales
          .map((s: any) => s.receipt_number || s.receiptNumber || s.id)
          .filter(Boolean)
          .slice(0, 10)
          .join(', ');
        console.log('❌ RETURNS: No match found. Available receipts:', availableReceipts);
        alert(`No sale found with receipt number: ${receiptNumber}\n\nAvailable receipts/IDs:\n${availableReceipts || 'None'}\n\nTip: You can search by receipt number (e.g., RCP-20250122-00001) or sale ID.`);
        return;
      }

      console.log('✅ RETURNS: Found sale:', foundSale);
      
      // Check if sale has items
      if (!foundSale.items || foundSale.items.length === 0) {
        alert('This sale has no items. Cannot process return.');
        return;
      }
      
      // Normalize the sale data structure
      const normalizedSale = {
        id: foundSale.id,
        receiptNumber: foundSale.receipt_number || foundSale.receiptNumber,
        date: foundSale.created_at || foundSale.createdAt || foundSale.date,
        customer: foundSale.customer_name || foundSale.customerName || foundSale.customer || 'Walk-in Customer',
        customerPhone: foundSale.customer_phone || foundSale.customerPhone || '',
        items: foundSale.items.map((item: any) => ({
          productId: item.product_id || item.productId,
          name: item.product?.name || item.name,
          sku: item.product?.sku || item.sku,
          price: item.price,
          quantity: item.quantity,
          discount: item.discount || 0,
        })),
        subtotal: foundSale.subtotal,
        discount: foundSale.discount || 0,
        total: foundSale.total,
        paymentMethod: foundSale.payment_method || foundSale.paymentMethod,
        branchId: foundSale.branch_id || foundSale.branchId,
      };
      
      console.log('Normalized sale:', normalizedSale);
      setSale(normalizedSale);

      // Initialize return items
      const items: ReturnItem[] = normalizedSale.items.map((item: any) => ({
        productId: item.productId,
        name: item.name,
        sku: item.sku,
        soldQuantity: item.quantity,
        returnQuantity: item.quantity, // Default to full quantity
        price: item.price,
        selected: false,
      }));

      console.log('Return items initialized:', items);
      setReturnItems(items);
    } catch (error: any) {
      console.error('Error searching receipt:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      alert(`Error searching for receipt: ${error.message || 'Unknown error'}\n\nPlease check the console for more details and try again.`);
    } finally {
      setSearching(false);
    }
  }

  function toggleItemSelection(index: number) {
    setReturnItems(items => 
      items.map((item, i) => 
        i === index ? { ...item, selected: !item.selected } : item
      )
    );
  }

  function updateReturnQuantity(index: number, quantity: number) {
    setReturnItems(items => 
      items.map((item, i) => 
        i === index 
          ? { ...item, returnQuantity: Math.max(0, Math.min(quantity, item.soldQuantity)) } 
          : item
      )
    );
  }

  async function handleProcessReturn() {
    const selectedItems = returnItems.filter(item => item.selected && item.returnQuantity > 0);
    
    if (selectedItems.length === 0) {
      alert('Please select at least one item to return');
      return;
    }

    if (!returnReason.trim()) {
      alert('Please provide a reason for the return');
      return;
    }

    if (!sale || !appState.currentBranchId) {
      alert('Invalid sale or branch information');
      return;
    }

    // Confirm return
    const confirmMessage = `Process return for ${selectedItems.length} item(s)?\n\n` +
      selectedItems.map(item => `${item.name}: ${item.returnQuantity} unit(s)`).join('\n') +
      `\n\nTotal Refund: ₦${selectedItems.reduce((sum, item) => sum + (item.price * item.returnQuantity), 0).toLocaleString()}`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setProcessing(true);

    try {
      // Add stock back for returned items
      for (const item of selectedItems) {
        try {
          await updateStock(appState.currentBranchId, item.productId, item.returnQuantity, 'add');
          console.log(`Added ${item.returnQuantity} units back to stock for ${item.name}`);
        } catch (error) {
          console.error(`Error updating stock for ${item.name}:`, error);
          throw new Error(`Failed to update stock for ${item.name}`);
        }
      }

      // Record the return transaction - create one return record per item
      console.log('Creating return records for each item...');
      
      for (const item of selectedItems) {
        const returnData = {
          orgId: appState.orgId,
          branchId: appState.currentBranchId,
          productId: item.productId,
          quantity: item.returnQuantity,
          reason: returnReason,
          refundAmount: item.price * item.returnQuantity,
          saleId: sale.id,
        };
        
        try {
          await createReturn(returnData);
          console.log(`✅ Return record created for ${item.name}`);
        } catch (error) {
          console.error(`❌ Error creating return record for ${item.name}:`, error);
          throw new Error(`Failed to create return record for ${item.name}`);
        }
      }
      
      console.log('✅ All return records created successfully');
      
      // Generate return receipt number
      const returnReceiptNum = `R${sale.receiptNumber.replace('#', '').replace('RCP-', '')}`;
      setReturnedReceiptNumber(returnReceiptNum);

      // Clear form and show success
      setShowSuccess(true);
      setSale(null);
      setReturnItems([]);
      setReceiptNumber('');
      setReturnReason('');
    } catch (error) {
      console.error('Error processing return:', error);
      alert(`Error processing return: ${error.message || error}`);
    } finally {
      setProcessing(false);
    }
  }

  const selectedItems = returnItems.filter(item => item.selected && item.returnQuantity > 0);
  const totalRefund = selectedItems.reduce((sum, item) => sum + (item.price * item.returnQuantity), 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => onNavigate('dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl">Product Returns</h1>
            <p className="text-sm text-muted-foreground">Process customer returns and refunds</p>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-4xl mx-auto">
        {/* Search Section */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5 text-primary" />
            <h2 className="text-lg">Search Receipt</h2>
          </div>
          
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="receiptNumber" className="text-sm mb-2 block">
                Receipt Number
              </Label>
              <Input
                id="receiptNumber"
                placeholder="Enter receipt number (e.g., #123456 or 123456)"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchReceipt()}
                className="text-base"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleSearchReceipt}
                disabled={searching || !receiptNumber.trim()}
              >
                {searching ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>

          {sale && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Receipt Number</p>
                  <p className="font-medium">{sale.receiptNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">{new Date(sale.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-medium">{sale.customer}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Amount</p>
                  <p className="font-medium">₦{sale.total.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Return Items Section */}
        {sale && returnItems.length > 0 && (
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <RotateCcw className="w-5 h-5 text-primary" />
              <h2 className="text-lg">Select Items to Return</h2>
            </div>

            <div className="space-y-3 mb-6">
              {returnItems.map((item, index) => (
                <div 
                  key={index}
                  className={`border rounded-lg p-4 transition-colors ${
                    item.selected ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={item.selected}
                      onCheckedChange={() => toggleItemSelection(index)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">{item.sku}</p>
                        </div>
                        <p className="text-sm font-medium">
                          ₦{(item.price * item.returnQuantity).toLocaleString()}
                        </p>
                      </div>

                      {item.selected && (
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <Label className="text-xs text-muted-foreground mb-1 block">
                              Return Quantity (Max: {item.soldQuantity})
                            </Label>
                            <Input
                              type="number"
                              min="1"
                              max={item.soldQuantity}
                              value={item.returnQuantity}
                              onChange={(e) => updateReturnQuantity(index, parseInt(e.target.value) || 0)}
                              className="w-24"
                            />
                          </div>
                          <div className="text-sm text-muted-foreground">
                            of {item.soldQuantity} sold
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Return Reason */}
            <div className="mb-4">
              <Label htmlFor="returnReason" className="mb-2 block">
                Reason for Return *
              </Label>
              <textarea
                id="returnReason"
                placeholder="e.g., Defective product, Wrong item, Customer changed mind..."
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-background min-h-[80px]"
              />
            </div>

            {/* Summary */}
            {selectedItems.length > 0 && (
              <div className="bg-primary/10 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Refund</p>
                    <p className="text-2xl text-primary font-bold">
                      ₦{totalRefund.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Items</p>
                    <p className="text-xl font-medium">{selectedItems.length}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setSale(null);
                  setReturnItems([]);
                  setReturnReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleProcessReturn}
                disabled={processing || selectedItems.length === 0 || !returnReason.trim()}
              >
                {processing ? 'Processing...' : `Process Return (₦${totalRefund.toLocaleString()})`}
              </Button>
            </div>
          </Card>
        )}

        {/* Empty State */}
        {!sale && !searching && (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="mb-2">Search for a receipt to begin processing returns</p>
            <p className="text-sm">Enter the receipt number in the search box above</p>
          </div>
        )}
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-success">
              <CheckCircle className="w-6 h-6" />
              Return Processed Successfully
            </DialogTitle>
          </DialogHeader>

          <div className="py-6 text-center">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <RotateCcw className="w-8 h-8 text-success" />
            </div>
            <p className="text-lg font-medium mb-2">Return Completed</p>
            <p className="text-sm text-muted-foreground mb-4">
              Stock has been updated and refund has been recorded
            </p>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Return Receipt Number</p>
              <p className="text-lg font-bold text-primary">{returnedReceiptNumber}</p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowSuccess(false)} className="w-full">
              Process Another Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}