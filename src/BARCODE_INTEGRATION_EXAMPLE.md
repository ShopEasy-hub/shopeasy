# 📸 Barcode Scanner Integration Examples

This guide shows how to integrate the barcode scanner component into your pages.

## Basic Usage

```tsx
import { useState } from 'react';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { Button } from '../components/ui/button';
import { Camera } from 'lucide-react';

function YourComponent() {
  const [showScanner, setShowScanner] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');

  const handleBarcodeScanned = (barcode: string) => {
    console.log('Scanned barcode:', barcode);
    setScannedBarcode(barcode);
    
    // Use the barcode (e.g., search for product)
    searchProductByBarcode(barcode);
  };

  return (
    <div>
      <Button onClick={() => setShowScanner(true)}>
        <Camera className="h-4 w-4 mr-2" />
        Scan Barcode
      </Button>

      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScanned}
      />
    </div>
  );
}
```

---

## Example 1: POS Integration

Add barcode scanning to your POS page for quick product lookup:

```tsx
// In your POS page component

const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

// Handler for barcode scan
const handleBarcodeScan = (barcode: string) => {
  // Search for product by barcode
  const product = products.find(p => p.barcode === barcode);
  
  if (product) {
    // Add to cart
    addToCart(product);
    toast.success(`Added ${product.name} to cart`);
  } else {
    toast.error('Product not found with barcode: ' + barcode);
  }
};

// In your JSX:
<div className="flex gap-2">
  <Input
    placeholder="Search or scan barcode..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
  />
  
  <Button 
    onClick={() => setShowBarcodeScanner(true)}
    variant="outline"
    size="icon"
  >
    <Camera className="h-4 w-4" />
  </Button>
</div>

<BarcodeScanner
  isOpen={showBarcodeScanner}
  onClose={() => setShowBarcodeScanner(false)}
  onScan={handleBarcodeScan}
/>
```

---

## Example 2: Inventory Management

Add barcode scanning for stock adjustments:

```tsx
// In your Inventory page component

const [showScanner, setShowScanner] = useState(false);
const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

const handleInventoryScan = (barcode: string) => {
  // Find product by barcode
  const product = products.find(p => p.barcode === barcode);
  
  if (product) {
    setSelectedProduct(product);
    setShowAdjustStockDialog(true);
  } else {
    toast.error('Product not found');
  }
};

// In your JSX:
<Button onClick={() => setShowScanner(true)}>
  <Camera className="h-4 w-4 mr-2" />
  Scan Product
</Button>

<BarcodeScanner
  isOpen={showScanner}
  onClose={() => setShowScanner(false)}
  onScan={handleInventoryScan}
/>
```

---

## Example 3: Product Search with Auto-fill

Automatically fill search field with scanned barcode:

```tsx
const [searchQuery, setSearchQuery] = useState('');
const [showScanner, setShowScanner] = useState(false);

const handleBarcodeScanned = (barcode: string) => {
  // Set search query to scanned barcode
  setSearchQuery(barcode);
  
  // Trigger search
  performSearch(barcode);
};

<div className="relative">
  <Input
    placeholder="Search products..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="pr-10"
  />
  
  <Button
    variant="ghost"
    size="icon"
    className="absolute right-0 top-0"
    onClick={() => setShowScanner(true)}
  >
    <Camera className="h-4 w-4" />
  </Button>
</div>

<BarcodeScanner
  isOpen={showScanner}
  onClose={() => setShowScanner(false)}
  onScan={handleBarcodeScanned}
/>
```

---

## Example 4: Transfer Items with Barcode

Scan to add items to transfer:

```tsx
const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
const [showScanner, setShowScanner] = useState(false);

const handleTransferScan = (barcode: string) => {
  const product = products.find(p => p.barcode === barcode);
  
  if (product) {
    // Check if already in transfer
    const existing = transferItems.find(item => item.product_id === product.id);
    
    if (existing) {
      // Increment quantity
      setTransferItems(prev => prev.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
      toast.success(`Increased ${product.name} quantity`);
    } else {
      // Add new item
      setTransferItems(prev => [...prev, {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.price
      }]);
      toast.success(`Added ${product.name} to transfer`);
    }
  } else {
    toast.error('Product not found');
  }
};

<Button onClick={() => setShowScanner(true)}>
  <Camera className="h-4 w-4 mr-2" />
  Scan Item
</Button>

<BarcodeScanner
  isOpen={showScanner}
  onClose={() => setShowScanner(false)}
  onScan={handleTransferScan}
/>
```

---

## Example 5: Receiving Shipment

Scan products during receiving:

```tsx
const [receivedItems, setReceivedItems] = useState<Map<string, number>>(new Map());
const [showScanner, setShowScanner] = useState(false);

const handleReceivingScan = (barcode: string) => {
  const product = products.find(p => p.barcode === barcode);
  
  if (product) {
    setReceivedItems(prev => {
      const newMap = new Map(prev);
      const currentQty = newMap.get(product.id) || 0;
      newMap.set(product.id, currentQty + 1);
      return newMap;
    });
    
    // Haptic feedback on mobile
    import('../lib/capacitor-utils').then(({ hapticFeedback }) => {
      hapticFeedback('light');
    });
    
    toast.success(`Scanned: ${product.name} (${(receivedItems.get(product.id) || 0) + 1})`);
  }
};
```

---

## Advanced: Platform Detection

Check if running on mobile to show/hide scanner button:

```tsx
import { useEffect, useState } from 'react';
import { isNativePlatform } from '../lib/capacitor-utils';

function YourComponent() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    isNativePlatform().then(setIsMobile);
  }, []);

  return (
    <div>
      {/* Only show scanner button on mobile */}
      {isMobile && (
        <Button onClick={() => setShowScanner(true)}>
          <Camera className="h-4 w-4 mr-2" />
          Scan Barcode
        </Button>
      )}
      
      {/* Alternative input for web */}
      {!isMobile && (
        <Input
          placeholder="Enter barcode manually..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleBarcodeScanned(e.currentTarget.value);
            }
          }}
        />
      )}
    </div>
  );
}
```

---

## Advanced: Continuous Scanning

Scan multiple items in succession:

```tsx
const [showScanner, setShowScanner] = useState(false);
const [scannedItems, setScannedItems] = useState<string[]>([]);
const [continuousMode, setContinuousMode] = useState(true);

const handleContinuousScan = (barcode: string) => {
  // Add to list
  setScannedItems(prev => [...prev, barcode]);
  
  // Process barcode
  processBarcode(barcode);
  
  // In continuous mode, don't close scanner
  if (!continuousMode) {
    setShowScanner(false);
  }
  
  toast.success(`Scanned ${scannedItems.length + 1} items`);
};

<div className="space-y-2">
  <div className="flex gap-2">
    <Button onClick={() => setShowScanner(true)}>
      <Camera className="h-4 w-4 mr-2" />
      Start Scanning
    </Button>
    
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={continuousMode}
        onChange={(e) => setContinuousMode(e.target.checked)}
      />
      Continuous Mode
    </label>
  </div>
  
  <div>Scanned: {scannedItems.length} items</div>
</div>
```

---

## Tips & Best Practices

### 1. Always provide feedback
```tsx
const handleScan = (barcode: string) => {
  // Haptic feedback on mobile
  hapticFeedback('medium');
  
  // Visual feedback
  toast.success('Barcode scanned!');
  
  // Audio feedback (optional)
  new Audio('/beep.mp3').play();
};
```

### 2. Handle errors gracefully
```tsx
const handleScan = (barcode: string) => {
  try {
    const product = findProduct(barcode);
    
    if (!product) {
      toast.error('Product not found', {
        description: `Barcode: ${barcode}`,
        action: {
          label: 'Add Product',
          onClick: () => openAddProductDialog(barcode)
        }
      });
      return;
    }
    
    // Process product
    processProduct(product);
  } catch (error) {
    toast.error('Error processing barcode');
  }
};
```

### 3. Show what was scanned
```tsx
<BarcodeScanner
  isOpen={showScanner}
  onClose={() => setShowScanner(false)}
  onScan={(barcode) => {
    // Show the barcode
    setLastScanned(barcode);
    handleScan(barcode);
  }}
/>

{lastScanned && (
  <div className="text-sm text-muted-foreground">
    Last scanned: {lastScanned}
  </div>
)}
```

### 4. Debounce rapid scans
```tsx
import { useRef } from 'react';

const lastScanTime = useRef(0);
const SCAN_COOLDOWN = 1000; // 1 second

const handleScan = (barcode: string) => {
  const now = Date.now();
  
  if (now - lastScanTime.current < SCAN_COOLDOWN) {
    // Ignore rapid duplicate scans
    return;
  }
  
  lastScanTime.current = now;
  processBarcode(barcode);
};
```

---

## Supported Barcode Formats

The scanner supports these formats:
- **EAN-13** (most common for products)
- **UPC-A** (North American products)
- **Code 128** (shipping/logistics)
- **QR Code** (for URLs, complex data)
- **Code 39**
- **EAN-8**
- **UPC-E**
- **ITF** (Interleaved 2 of 5)

---

## Testing Barcodes

Use these test barcodes to test your scanner:

- **Amazon**: `9780596529321` (EAN-13)
- **Coca-Cola**: `5449000000996` (EAN-13)
- **Generic**: `012345678905` (UPC-A)

Or generate your own at: https://www.free-barcode-generator.net/

---

**The BarcodeScanner component is ready to use!** Just import and integrate as shown above. 🎉
