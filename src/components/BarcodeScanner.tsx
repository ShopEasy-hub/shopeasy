import { useState, useEffect } from 'react';
import { Camera, X, Smartphone, Monitor, Keyboard } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner@2.0.3';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, isOpen, onClose }: BarcodeScannerProps) {
  const [isCapacitor, setIsCapacitor] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);

  useEffect(() => {
    // Detect if running in Capacitor (mobile app)
    checkPlatform();
  }, []);

  const checkPlatform = async () => {
    try {
      // Check if Capacitor is available
      const { Capacitor } = await import('@capacitor/core');
      const platform = Capacitor.getPlatform();
      setIsCapacitor(platform === 'ios' || platform === 'android');
    } catch (error) {
      // Capacitor not available, running on web
      setIsCapacitor(false);
    }
  };

  const startScan = async () => {
    if (!isCapacitor) {
      // Web fallback - show message
      toast.info('Barcode scanning requires a physical scanner device on web', {
        description: 'On mobile apps, you can use the camera to scan barcodes'
      });
      return;
    }

    try {
      // Import barcode scanner plugin
      const { BarcodeScanner } = await import('@capacitor-community/barcode-scanner');
      
      // Check/request permission
      const status = await BarcodeScanner.checkPermission({ force: true });
      
      if (status.granted) {
        setHasPermission(true);
        setScanning(true);

        // Make background transparent for camera preview
        document.body.classList.add('scanner-active');
        await BarcodeScanner.hideBackground();

        // Start scanning
        const result = await BarcodeScanner.startScan();

        // Stop scanning
        stopScan();

        if (result.hasContent) {
          onScan(result.content || '');
          toast.success('Barcode scanned successfully!');
          onClose();
        }
      } else if (status.denied) {
        setHasPermission(false);
        toast.error('Camera permission denied', {
          description: 'Please enable camera access in your device settings'
        });
      } else {
        // Permission not determined, ask again
        setHasPermission(null);
        toast.info('Camera permission required to scan barcodes');
      }
    } catch (error) {
      console.error('Barcode scan error:', error);
      toast.error('Failed to scan barcode', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
      stopScan();
    }
  };

  const stopScan = async () => {
    setScanning(false);
    
    try {
      const { BarcodeScanner } = await import('@capacitor-community/barcode-scanner');
      await BarcodeScanner.showBackground();
      await BarcodeScanner.stopScan();
      document.body.classList.remove('scanner-active');
    } catch (error) {
      console.error('Error stopping scan:', error);
    }
  };

  const handleClose = () => {
    if (scanning) {
      stopScan();
    }
    onClose();
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (scanning) {
        stopScan();
      }
    };
  }, [scanning]);

  // Render scanning overlay when actively scanning (outside of dialog)
  if (scanning) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/95">
        {/* Header with close button */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black to-transparent">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              <div>
                <h3 className="font-medium">Scan Barcode</h3>
                <p className="text-xs text-white/70">Point camera at barcode</p>
              </div>
            </div>
            <Button 
              onClick={stopScan} 
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Scanner frame indicator */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-72 h-48 border-2 border-white/50 rounded-lg">
            {/* Corner indicators */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary"></div>
          </div>
        </div>
        
        {/* Instructions */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black to-transparent">
          <div className="text-center text-white space-y-3">
            <p className="text-sm">Position the barcode inside the frame</p>
            <p className="text-xs text-white/60">
              Supported: UPC, EAN, Code128, Code39, QR codes
            </p>
            <Button 
              onClick={stopScan} 
              variant="secondary"
              size="lg"
              className="w-full max-w-xs mx-auto"
            >
              Cancel Scanning
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Barcode Scanner
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Platform indicator */}
          <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg">
            {isCapacitor ? (
              <>
                <Smartphone className="h-4 w-4 text-green-600" />
                <span className="text-sm">Mobile App - Camera Available</span>
              </>
            ) : (
              <>
                <Monitor className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Web Version - Use Scanner Device</span>
              </>
            )}
          </div>

          {/* Instructions */}
          {isCapacitor ? (
            <div className="space-y-3">
              <Alert>
                <Camera className="h-4 w-4" />
                <AlertDescription>
                  Click {'\"'}Start Scanning{'\"'} to use your device camera to scan barcodes.
                  Point your camera at a barcode and it will be detected automatically.
                </AlertDescription>
              </Alert>

              {hasPermission === false && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Camera permission denied. Please enable camera access in your device settings.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col gap-2">
                <Button 
                  onClick={startScan} 
                  disabled={hasPermission === false}
                  size="lg"
                  className="w-full"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Start Scanning
                </Button>
              </div>
            </div>
          ) : (
            <Alert>
              <Monitor className="h-4 w-4" />
              <AlertDescription>
                On the web version, please use a USB barcode scanner device or enter the barcode manually.
                Camera scanning is available on the mobile app version.
              </AlertDescription>
            </Alert>
          )}

          {showManualEntry && (
            <div className="space-y-2">
              <Label htmlFor="barcode">Enter Barcode Manually</Label>
              <Input 
                id="barcode" 
                value={manualInput} 
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Enter barcode"
                className="w-full"
              />
              <Button 
                onClick={() => {
                  onScan(manualInput);
                  toast.success('Barcode entered successfully!');
                  onClose();
                }}
                size="lg"
                className="w-full"
              >
                Submit
              </Button>
            </div>
          )}

          {!showManualEntry && (
            <Button 
              onClick={() => setShowManualEntry(true)}
              size="lg"
              className="w-full"
            >
              <Keyboard className="h-4 w-4 mr-2" />
              Enter Barcode Manually
            </Button>
          )}

          <Button variant="outline" onClick={handleClose} className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}