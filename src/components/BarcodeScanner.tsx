import { useEffect, useState, useRef } from 'react';
import { Scan, Check, X, Keyboard } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  enabled?: boolean;
}

export function BarcodeScanner({ onScan, enabled = true }: BarcodeScannerProps) {
  const [buffer, setBuffer] = useState('');
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore input if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Clear timeout on each keypress
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Barcode scanners typically send Enter key at the end
      if (e.key === 'Enter' && buffer.length > 0) {
        e.preventDefault();
        console.log('Barcode scanned:', buffer);
        setLastScan(buffer);
        onScan(buffer);
        setBuffer('');
        setScanStatus('success');
        
        // Reset status after 2 seconds
        setTimeout(() => {
          setScanStatus('idle');
          setLastScan(null);
        }, 2000);
      } else if (e.key.length === 1) {
        // Add character to buffer
        setBuffer(prev => prev + e.key);
        
        // Clear buffer after 100ms of inactivity (in case it's manual typing)
        timeoutRef.current = setTimeout(() => {
          setBuffer('');
        }, 100);
      }
    };

    window.addEventListener('keypress', handleKeyPress);

    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [buffer, enabled, onScan]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      onScan(manualBarcode.trim());
      setManualBarcode('');
      setShowManualInput(false);
      setLastScan(manualBarcode.trim());
      setScanStatus('success');
      setTimeout(() => {
        setScanStatus('idle');
        setLastScan(null);
      }, 2000);
    }
  };

  if (!enabled) return null;

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
        <Scan className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground flex-1">
          Barcode Scanner Active
        </span>
        {scanStatus === 'success' && lastScan && (
          <Badge variant="default" className="bg-success">
            <Check className="w-3 h-3 mr-1" />
            {lastScan}
          </Badge>
        )}
        {scanStatus === 'error' && (
          <Badge variant="destructive">
            <X className="w-3 h-3 mr-1" />
            Not Found
          </Badge>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowManualInput(true)}
          className="ml-2"
        >
          <Keyboard className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Manual</span>
        </Button>
      </div>

      {/* Manual Barcode Input Dialog */}
      <Dialog open={showManualInput} onOpenChange={setShowManualInput}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Barcode Manually</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleManualSubmit} className="space-y-4 py-4">
            <div>
              <Input
                placeholder="Enter barcode or SKU"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowManualInput(false);
                  setManualBarcode('');
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!manualBarcode.trim()}>
                Add to Cart
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
