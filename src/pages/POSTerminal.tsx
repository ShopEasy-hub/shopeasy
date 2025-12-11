import { useState, useEffect } from 'react';
import { AppState, Page } from '../App';
import { getProducts, getBranchStock, createSale } from '../lib/api';
import { ProductSearch } from '../components/ProductSearch';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { Receipt } from '../components/Receipt';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import {
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  DollarSign,
  Percent,
  CheckCircle,
  User,
  Phone,
  Package,
  Wallet,
  ArrowRightLeft,
  Calendar,
  Camera,
} from 'lucide-react';

interface POSTerminalProps {
  appState: AppState;
  onNavigate: (page: Page) => void;
}

interface CartItem {
  productId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  discount: number;
}

export function POSTerminal({ appState, onNavigate }: POSTerminalProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [stockLevels, setStockLevels] = useState<Record<string, number>>({});
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartDiscount, setCartDiscount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showConfirmSale, setShowConfirmSale] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'pos' | 'transfer'>('cash');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerBirthMonth, setCustomerBirthMonth] = useState('');
  const [customerBirthDay, setCustomerBirthDay] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    if (appState.orgId && appState.currentBranchId) {
      loadProducts();
    }
  }, [appState.orgId, appState.currentBranchId]);

  async function loadProducts() {
    if (!appState.orgId || !appState.currentBranchId) {
      console.log('No orgId or branchId available');
      return;
    }

    try {
      console.log('Loading products for org:', appState.orgId);
      const productsResponse = await getProducts(appState.orgId);
      console.log('Loaded products response:', productsResponse);
      
      // Handle both direct array and wrapped response
      const productsArray = productsResponse?.products || productsResponse || [];
      console.log('Loaded products array:', productsArray?.length || 0);
      setProducts(productsArray);

      // Load stock levels for current branch (using bulk method like Inventory)
      console.log('🛒 POS: Loading stock levels for branch:', appState.currentBranchId);
      const { stock } = await getBranchStock(appState.currentBranchId);
      console.log('🛒 POS: RAW STOCK from API:', stock);
      
      // Deduplicate stock entries - keep only latest for each product
      const stockMap = new Map();
      (stock || []).forEach((item: any) => {
        const existing = stockMap.get(item.productId);
        if (!existing || new Date(item.lastUpdated || item.updatedAt || 0) > new Date(existing.lastUpdated || existing.updatedAt || 0)) {
          stockMap.set(item.productId, item);
        }
      });
      
      // Convert to Record format for POS
      const stockData: Record<string, number> = {};
      stockMap.forEach((item, productId) => {
        stockData[productId] = item.quantity || 0;
      });
      
      console.log('🛒 POS: DEDUPLICATED STOCK:', stockData);
      setStockLevels(stockData);
    } catch (error) {
      console.error('Error loading products:', error);
      alert(`Error loading products: ${error?.message || error}`);
    } finally {
      setLoading(false);
    }
  }

  function handleBarcodeScan(barcode: string) {
    console.log('Barcode scanned:', barcode);
    
    // Find product by barcode or SKU
    const product = products.find(
      (p) => p.barcode === barcode || p.sku === barcode
    );
    
    if (product) {
      console.log('Product found:', product);
      addToCart(product);
    } else {
      console.log('Product not found for barcode:', barcode);
      alert(`Product not found for barcode: ${barcode}`);
    }
  }

  function addToCart(product: any) {
    const availableStock = stockLevels[product.id] || 0;
    
    // Check if product exists in cart already
    const existing = cart.find((item) => item.productId === product.id);
    const cartQuantity = existing ? existing.quantity : 0;
    const newTotalQuantity = cartQuantity + 1;
    
    // Only enforce stock validation if stock data has loaded
    if (product.id in stockLevels) {
      // Warn if stock is 0 (allow override)
      if (availableStock === 0) {
        const proceed = confirm(
          `${product.name} shows 0 stock. This might mean:\n\n` +
          `• Stock hasn't been initialized yet\n` +
          `• Product is genuinely out of stock\n\n` +
          `Do you want to add it to cart anyway?`
        );
        if (!proceed) return;
      } 
      // Check if trying to add more than available
      else if (newTotalQuantity > availableStock) {
        alert(`Only ${availableStock} units available in stock (${cartQuantity} already in cart)`);
        return;
      }
    }
    
    // Add or update cart
    if (existing) {
      setCart(
        cart.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          price: product.price || 0,
          quantity: 1,
          discount: 0,
        },
      ]);
    }
  }

  function updateQuantity(productId: string, delta: number) {
    const availableStock = stockLevels[productId] || 0;
    
    setCart(
      cart
        .map((item) => {
          if (item.productId === productId) {
            const newQuantity = item.quantity + delta;
            
            // Only check stock if data has loaded and we're increasing quantity
            if (productId in stockLevels && delta > 0) {
              if (availableStock === 0) {
                // Allow with confirmation
                const proceed = confirm(
                  `This product shows 0 stock. Add more anyway?`
                );
                if (!proceed) return item;
              } else if (newQuantity > availableStock) {
                alert(`Only ${availableStock} units available in stock`);
                return item;
              }
            }
            
            return { ...item, quantity: Math.max(0, newQuantity) };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(productId: string) {
    setCart(cart.filter((item) => item.productId !== productId));
  }

  function updateItemDiscount(productId: string, discount: number) {
    setCart(
      cart.map((item) =>
        item.productId === productId ? { ...item, discount } : item
      )
    );
  }

  function clearCart() {
    setCart([]);
    setCartDiscount(0);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerBirthMonth('');
    setCustomerBirthDay('');
    setPaymentMethod('cash');
  }

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const itemDiscounts = cart.reduce(
    (sum, item) => sum + (item.price * item.quantity * item.discount) / 100,
    0
  );
  const cartDiscountAmount = (subtotal - itemDiscounts) * (cartDiscount / 100);
  const total = subtotal - itemDiscounts - cartDiscountAmount;

  async function handleConfirmSale() {
    if (!appState.orgId || !appState.currentBranchId) return;

    setProcessing(true);

    // Validate stock before completing sale (warnings only, not blockers)
    const stockWarnings: string[] = [];
    for (const item of cart) {
      const availableStock = stockLevels[item.productId] || 0;
      if (item.productId in stockLevels && item.quantity > availableStock) {
        stockWarnings.push(`${item.name}: Selling ${item.quantity}, only ${availableStock} in stock`);
      }
    }

    // Show warnings if any, but allow user to proceed
    if (stockWarnings.length > 0) {
      const proceed = confirm(
        'Stock Warnings:\n\n' + 
        stockWarnings.join('\n') + 
        '\n\nDo you want to proceed with the sale anyway?'
      );
      if (!proceed) {
        setProcessing(false);
        return;
      }
    }

    try {
      const saleData = {
        orgId: appState.orgId,
        branchId: appState.currentBranchId,
        customer: customerName || 'Walk-in Customer',
        customerPhone: customerPhone || '',
        customerBirthDate: customerBirthMonth && customerBirthDay 
          ? `${customerBirthMonth} ${customerBirthDay}` 
          : '',
        items: cart.map((item) => ({
          productId: item.productId,
          name: item.name,
          sku: item.sku,
          price: item.price,
          quantity: item.quantity,
          discount: item.discount,
        })),
        subtotal,
        discount: itemDiscounts + cartDiscountAmount,
        total,
        paymentMethod,
        amountPaid: total,
        change: 0,
      };

      const result = await createSale(saleData);

      console.log('✅ Sale completed successfully:', result);

      // Reload stock levels to reflect the sale
      console.log('🔄 Reloading stock levels after sale...');
      await loadProducts();

      // Prepare receipt data
      const receiptData = {
        id: result.sale?.id || Date.now().toString(),
        receiptNumber: result.sale?.receipt_number || `#${Date.now().toString().slice(-6)}`, // Use receipt_number from database
        date: new Date().toISOString(),
        customer: saleData.customer,
        customerPhone: saleData.customerPhone,
        customerBirthDate: saleData.customerBirthDate,
        cashierName: appState.user?.name || 'Cashier',
        items: cart.map(item => ({
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity
        })),
        subtotal: saleData.subtotal,
        discount: saleData.discount,
        total: saleData.total,
        paymentMethod: saleData.paymentMethod
      };

      console.log('📄 Receipt data prepared:', receiptData);
      setLastSale(receiptData);

      // Update local stock levels to reflect the sale
      const updatedStockLevels = { ...stockLevels };
      cart.forEach(item => {
        updatedStockLevels[item.productId] = (updatedStockLevels[item.productId] || 0) - item.quantity;
      });
      setStockLevels(updatedStockLevels);

      // Clear everything
      clearCart();
      setShowConfirmSale(false);

      // Show receipt
      setShowReceipt(true);
    } catch (error) {
      console.error('Error processing sale:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // Show more specific error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to process sale: ${errorMessage}\n\nCheck console for details.`);
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading POS terminal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => onNavigate('dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-xl">POS Terminal</h1>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Process sales and transactions</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm text-muted-foreground">
              {appState.branches?.find(b => b.id === appState.currentBranchId)?.name || 'Branch'}
            </p>
            <p className="text-xs text-muted-foreground">
              {appState.user?.name || 'User'}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Product Search */}
        <div className="flex-1 p-4 overflow-auto">
          <div className="mb-4 space-y-3">
            {/* Barcode Scanner Button */}
            <Button
              onClick={() => setShowScanner(true)}
              disabled={showConfirmSale || showReceipt}
              variant="outline"
              className="w-full"
            >
              <Camera className="w-4 h-4 mr-2" />
              Scan Barcode
            </Button>
            
            <ProductSearch
              products={products}
              onSelect={addToCart}
            />
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.slice(0, 12).map((product) => {
              const stock = stockLevels[product.id];
              const hasStockData = product.id in stockLevels;
              const stockLevel = stock || 0;
              
              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-card border rounded-lg p-3 hover:border-primary transition-colors text-left relative"
                >
                  {hasStockData && (
                    <div className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full ${
                      stockLevel === 0 
                        ? 'bg-warning/10 text-warning' 
                        : stockLevel <= 5 
                        ? 'bg-error/10 text-error' 
                        : 'bg-success/10 text-success'
                    }`}>
                      {stockLevel} in stock
                    </div>
                  )}
                  <div className="flex items-center justify-center h-20 mb-2 bg-muted rounded">
                    <Package className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium line-clamp-2 mb-1">
                    {product.name}
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    {product.sku}
                  </p>
                  <p className="text-primary">
                    ₦{(product.price || 0).toLocaleString()}
                  </p>
                </button>
              );
            })}
          </div>

          {products.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No products available</p>
            </div>
          )}
        </div>

        {/* Right: Cart */}
        <div className="w-full lg:w-[450px] bg-card border-l flex flex-col">
          {/* Cart Items */}
          <div className="flex-1 overflow-auto p-4">
            <h2 className="text-lg mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Cart ({cart.length} items)
            </h2>

            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <ShoppingCart className="w-16 h-16 mb-4 opacity-50" />
                <p>Cart is empty</p>
                <p className="text-sm">Add items to start</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => {
                  const availableStock = stockLevels[item.productId] ?? 0;
                  const remainingStock = availableStock - item.quantity;
                  const hasStockData = item.productId in stockLevels;
                  
                  return (
                    <div key={item.productId} className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.sku}</p>
                          {hasStockData ? (
                            <p className="text-xs text-muted-foreground mt-1">
                              Stock: {availableStock} | Remaining: <span className={remainingStock <= 0 ? 'text-error font-medium' : remainingStock <= 5 ? 'text-warning font-medium' : 'text-success'}>{remainingStock}</span>
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              Loading stock...
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="text-destructive hover:bg-destructive/10 p-1 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.productId, -1)}
                            className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-accent"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, 1)}
                            className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={item.quantity >= availableStock}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-sm font-medium">
                          ₦{(item.price * item.quantity).toLocaleString()}
                        </p>
                      </div>

                      {item.discount > 0 && (
                        <div className="mt-2 text-xs text-green-600">
                          {item.discount}% discount applied
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart Summary */}
          {cart.length > 0 && (
            <div className="border-t p-4 space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₦{subtotal.toLocaleString()}</span>
                </div>
                {(itemDiscounts > 0 || cartDiscount > 0) && (
                  <>
                    {itemDiscounts > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Item Discounts</span>
                        <span>-₦{itemDiscounts.toLocaleString()}</span>
                      </div>
                    )}
                    {cartDiscount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Cart Discount ({cartDiscount}%)</span>
                        <span>-₦{cartDiscountAmount.toLocaleString()}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-lg font-medium">Total</span>
                <span className="text-2xl text-primary font-bold">
                  ₦{total.toLocaleString()}
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const discount = prompt('Enter cart discount percentage:');
                    if (discount) {
                      setCartDiscount(Math.max(0, Math.min(100, parseFloat(discount))));
                    }
                  }}
                >
                  <Percent className="w-4 h-4 mr-2" />
                  Discount
                </Button>
                <Button
                  className="flex-1"
                  size="lg"
                  onClick={() => setShowConfirmSale(true)}
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Complete Sale
                </Button>
              </div>

              <Button
                variant="ghost"
                className="w-full"
                onClick={clearCart}
              >
                Clear Cart
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Sale Dialog */}
      <Dialog open={showConfirmSale} onOpenChange={setShowConfirmSale}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Confirm Sale</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            {/* Total Amount */}
            <div className="bg-primary/10 p-4 rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
              <p className="text-3xl text-primary font-bold">₦{total.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {cart.length} item{cart.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Payment Method */}
            <div>
              <Label className="text-sm mb-2 block">
                How did the customer pay? *
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    paymentMethod === 'cash'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Wallet className="w-6 h-6 mx-auto mb-1" />
                  <p className="text-sm font-medium">Cash</p>
                </button>
                <button
                  onClick={() => setPaymentMethod('pos')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    paymentMethod === 'pos'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <CreditCard className="w-6 h-6 mx-auto mb-1" />
                  <p className="text-sm font-medium">POS</p>
                </button>
                <button
                  onClick={() => setPaymentMethod('transfer')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    paymentMethod === 'transfer'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <ArrowRightLeft className="w-6 h-6 mx-auto mb-1" />
                  <p className="text-sm font-medium">Transfer</p>
                </button>
              </div>
            </div>

            {/* Customer Details (Optional) */}
            <div className="space-y-3 pt-3 border-t">
              <p className="text-sm text-muted-foreground">
                Customer details (optional)
              </p>
              
              <div>
                <Label htmlFor="customerName" className="text-sm">
                  <User className="w-3 h-3 inline mr-1" />
                  Customer Name
                </Label>
                <Input
                  id="customerName"
                  placeholder="e.g., John Doe"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="customerPhone" className="text-sm">
                  <Phone className="w-3 h-3 inline mr-1" />
                  Phone Number
                </Label>
                <Input
                  id="customerPhone"
                  placeholder="e.g., +234 800 000 0000"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm mb-2 block">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  Date of Birth (Day & Month)
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <select
                      value={customerBirthMonth}
                      onChange={(e) => setCustomerBirthMonth(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                    >
                      <option value="">Month</option>
                      <option value="January">January</option>
                      <option value="February">February</option>
                      <option value="March">March</option>
                      <option value="April">April</option>
                      <option value="May">May</option>
                      <option value="June">June</option>
                      <option value="July">July</option>
                      <option value="August">August</option>
                      <option value="September">September</option>
                      <option value="October">October</option>
                      <option value="November">November</option>
                      <option value="December">December</option>
                    </select>
                  </div>
                  <div>
                    <select
                      value={customerBirthDay}
                      onChange={(e) => setCustomerBirthDay(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                    >
                      <option value="">Day</option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Track repeat customers and identify top buyers
              </p>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmSale(false)} 
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSale}
              disabled={processing}
            >
              {processing ? 'Processing...' : 'Confirm Sale'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      {lastSale && (
        <Receipt
          open={showReceipt}
          onOpenChange={setShowReceipt}
          onBackToHome={() => {
            setShowReceipt(false);
            onNavigate('dashboard');
          }}
          sale={lastSale}
          branch={appState.branches?.find(b => b.id === appState.currentBranchId)}
          receiptType="thermal"
        />
      )}

      {/* Barcode Scanner Dialog */}
      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScan}
      />
    </div>
  );
}