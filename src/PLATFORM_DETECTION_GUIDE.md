# 🔍 Platform Detection Guide

This guide explains how your app automatically detects whether it's running on web, Android, or iOS, and adapts features accordingly.

---

## How It Works

The app uses Capacitor's platform detection to determine the runtime environment:

```tsx
import { Capacitor } from '@capacitor/core';

const platform = Capacitor.getPlatform();
// Returns: 'web', 'ios', or 'android'
```

---

## Utility Functions

We've created helper functions in `/lib/capacitor-utils.ts`:

### Basic Platform Detection

```tsx
import { getPlatform, isNativePlatform, isWebPlatform } from '../lib/capacitor-utils';

// Get platform name
const platform = await getPlatform(); // 'web' | 'ios' | 'android'

// Check if mobile
const isMobile = await isNativePlatform(); // true on iOS/Android

// Check if web
const isWeb = await isWebPlatform(); // true on web browsers
```

### Specific Platform Checks

```tsx
import { isIOS, isAndroid } from '../lib/capacitor-utils';

// iOS-specific code
if (await isIOS()) {
  // Use iOS-specific features
}

// Android-specific code
if (await isAndroid()) {
  // Use Android-specific features
}
```

---

## Conditional Features

### Example 1: Show/Hide Barcode Scanner Button

```tsx
import { useState, useEffect } from 'react';
import { isNativePlatform } from '../lib/capacitor-utils';
import { Camera } from 'lucide-react';
import { Button } from '../components/ui/button';

function ProductSearch() {
  const [showScannerButton, setShowScannerButton] = useState(false);

  useEffect(() => {
    // Show scanner button only on mobile
    isNativePlatform().then(setShowScannerButton);
  }, []);

  return (
    <div className="flex gap-2">
      <Input placeholder="Search products..." />
      
      {showScannerButton && (
        <Button onClick={() => setShowScanner(true)}>
          <Camera className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
```

### Example 2: Different Input Methods

```tsx
import { useState, useEffect } from 'react';
import { isNativePlatform } from '../lib/capacitor-utils';

function BarcodeInput({ onBarcode }: { onBarcode: (code: string) => void }) {
  const [isMobile, setIsMobile] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    isNativePlatform().then(setIsMobile);
  }, []);

  if (isMobile) {
    // Mobile: Camera scanner
    return (
      <>
        <Button onClick={() => setShowScanner(true)}>
          <Camera className="h-4 w-4 mr-2" />
          Scan Barcode
        </Button>
        
        <BarcodeScanner
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          onScan={onBarcode}
        />
      </>
    );
  } else {
    // Web: Manual input or USB scanner
    return (
      <Input
        placeholder="Scan or enter barcode..."
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onBarcode(e.currentTarget.value);
            e.currentTarget.value = '';
          }
        }}
      />
    );
  }
}
```

### Example 3: Platform-Specific Styling

```tsx
import { useEffect, useState } from 'react';
import { getPlatform } from '../lib/capacitor-utils';

function ResponsiveLayout({ children }) {
  const [platform, setPlatform] = useState('web');

  useEffect(() => {
    getPlatform().then(setPlatform);
  }, []);

  return (
    <div className={`
      ${platform === 'ios' ? 'safe-area-inset' : ''}
      ${platform === 'android' ? 'android-navbar-space' : ''}
      ${platform === 'web' ? 'max-w-7xl mx-auto' : 'px-4'}
    `}>
      {children}
    </div>
  );
}
```

---

## Feature Adaptation Table

| Feature | Web | iOS | Android |
|---------|-----|-----|---------|
| **Barcode Scanner** | Manual input / USB | Camera | Camera |
| **Haptic Feedback** | None | Available | Available |
| **Status Bar** | Browser default | Customizable | Customizable |
| **File Downloads** | Browser download | Share sheet | Download folder |
| **Notifications** | Web push | Native push | Native push |
| **Biometrics** | Not available | Face ID/Touch ID | Fingerprint |

---

## Enhanced Utilities

### Haptic Feedback (Mobile Only)

```tsx
import { hapticFeedback } from '../lib/capacitor-utils';

// Light tap (selection, toggle)
await hapticFeedback('light');

// Medium impact (button press)
await hapticFeedback('medium');

// Heavy impact (error, success)
await hapticFeedback('heavy');

// Example: Confirm button with haptics
<Button onClick={async () => {
  await hapticFeedback('medium');
  handleConfirm();
}}>
  Confirm
</Button>
```

### Native Toast (Mobile) / Sonner (Web)

```tsx
import { showNativeToast } from '../lib/capacitor-utils';

// Automatically uses native toast on mobile, sonner on web
await showNativeToast('Product added successfully!');
```

### Device Information

```tsx
import { getDeviceInfo } from '../lib/capacitor-utils';

const info = await getDeviceInfo();

console.log(info);
// {
//   platform: 'ios',
//   model: 'iPhone 15 Pro',
//   operatingSystem: 'ios',
//   osVersion: '17.2',
//   manufacturer: 'Apple',
//   isVirtual: false
// }
```

---

## Best Practices

### 1. Progressive Enhancement

Start with web functionality, then enhance for mobile:

```tsx
function ProductLookup() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    isNativePlatform().then(setIsMobile);
  }, []);

  // Base functionality (web)
  const handleSearch = (query: string) => {
    // Search logic works on all platforms
    searchProducts(query);
  };

  return (
    <div>
      {/* Works everywhere */}
      <Input
        placeholder="Search..."
        onChange={(e) => handleSearch(e.target.value)}
      />

      {/* Enhanced for mobile */}
      {isMobile && (
        <Button onClick={() => setShowScanner(true)}>
          <Camera className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
```

### 2. Graceful Degradation

Features should degrade gracefully on platforms that don't support them:

```tsx
import { hapticFeedback, isPluginAvailable } from '../lib/capacitor-utils';

const handleAction = async () => {
  // Attempt haptics, but don't fail if unavailable
  try {
    if (await isPluginAvailable('Haptics')) {
      await hapticFeedback('medium');
    }
  } catch {
    // Silently fail on web
  }

  // Main action always executes
  performAction();
};
```

### 3. Consistent UX

Keep the UI consistent across platforms:

```tsx
// Good: Same button, different action
{isMobile ? (
  <Button onClick={() => setShowScanner(true)}>
    <Camera className="h-4 w-4 mr-2" />
    Scan Barcode
  </Button>
) : (
  <Button onClick={() => setShowManualInput(true)}>
    <Keyboard className="h-4 w-4 mr-2" />
    Enter Barcode
  </Button>
)}

// Bad: Completely different UI
{isMobile ? (
  <MobileOnlyComplexUI />
) : (
  <WebOnlyDifferentUI />
)}
```

### 4. Test on All Platforms

Always test feature detection:

```tsx
// Development helper
useEffect(() => {
  if (import.meta.env.DEV) {
    getPlatform().then(platform => {
      console.log('🔍 Running on:', platform);
    });
  }
}, []);
```

---

## Platform-Specific Code Examples

### iOS Safe Area Handling

```tsx
import { useEffect, useState } from 'react';
import { isIOS } from '../lib/capacitor-utils';

function AppLayout({ children }) {
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    isIOS().then(setIsIOSDevice);
  }, []);

  return (
    <div 
      className={isIOSDevice ? 'pb-safe' : ''}
      style={{
        paddingBottom: isIOSDevice ? 'env(safe-area-inset-bottom)' : undefined
      }}
    >
      {children}
    </div>
  );
}
```

### Android Back Button

```tsx
import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { isAndroid } from '../lib/capacitor-utils';

function useAndroidBackButton(callback: () => void) {
  useEffect(() => {
    let backButtonListener: any;

    isAndroid().then(async (isAndroidDevice) => {
      if (isAndroidDevice) {
        backButtonListener = await App.addListener('backButton', callback);
      }
    });

    return () => {
      backButtonListener?.remove();
    };
  }, [callback]);
}

// Usage
function MyPage({ onNavigate }) {
  useAndroidBackButton(() => {
    onNavigate('dashboard'); // Custom back button behavior
  });

  return <div>My Page Content</div>;
}
```

---

## Testing Platform Detection

### During Development

```tsx
// Add temporary debug component
function PlatformDebug() {
  const [info, setInfo] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      getPlatform(),
      isNativePlatform(),
      getDeviceInfo()
    ]).then(([platform, isNative, device]) => {
      setInfo({ platform, isNative, device });
    });
  }, []);

  if (!info) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded text-xs">
      <div>Platform: {info.platform}</div>
      <div>Native: {info.isNative ? 'Yes' : 'No'}</div>
      <div>OS: {info.device.operatingSystem}</div>
      <div>Version: {info.device.osVersion}</div>
    </div>
  );
}
```

### Simulate Mobile on Web

You can test mobile code paths on web during development:

```tsx
// For testing only - remove in production
const FORCE_MOBILE = import.meta.env.DEV && false; // Toggle to true for testing

export async function isNativePlatform(): Promise<boolean> {
  if (FORCE_MOBILE) return true; // Force mobile mode
  
  const platform = await getPlatform();
  return platform === 'ios' || platform === 'android';
}
```

---

## Common Patterns

### 1. Conditional Import

```tsx
// Only import camera plugin on mobile
const useCameraScanner = () => {
  const [scanner, setScanner] = useState<any>(null);

  useEffect(() => {
    isNativePlatform().then(async (isMobile) => {
      if (isMobile) {
        const { BarcodeScanner } = await import('@capacitor-community/barcode-scanner');
        setScanner({ scan: () => BarcodeScanner.startScan() });
      }
    });
  }, []);

  return scanner;
};
```

### 2. Platform-Aware Hooks

```tsx
function usePlatformFeatures() {
  const [features, setFeatures] = useState({
    hasCamera: false,
    hasHaptics: false,
    platform: 'web'
  });

  useEffect(() => {
    Promise.all([
      getPlatform(),
      isPluginAvailable('BarcodeScanner'),
      isPluginAvailable('Haptics')
    ]).then(([platform, hasCamera, hasHaptics]) => {
      setFeatures({ platform, hasCamera, hasHaptics });
    });
  }, []);

  return features;
}

// Usage
function MyComponent() {
  const { hasCamera, hasHaptics } = usePlatformFeatures();

  return (
    <div>
      {hasCamera && <ScanButton />}
      {hasHaptics && <HapticButton />}
    </div>
  );
}
```

### 3. Platform-Specific Constants

```tsx
import { useEffect, useState } from 'react';
import { getPlatform } from '../lib/capacitor-utils';

const PLATFORM_CONFIG = {
  web: {
    maxUploadSize: 10 * 1024 * 1024, // 10MB
    supportsBarcodeScanner: false,
    defaultView: 'grid'
  },
  ios: {
    maxUploadSize: 50 * 1024 * 1024, // 50MB
    supportsBarcodeScanner: true,
    defaultView: 'list'
  },
  android: {
    maxUploadSize: 50 * 1024 * 1024, // 50MB
    supportsBarcodeScanner: true,
    defaultView: 'list'
  }
};

function useConfig() {
  const [config, setConfig] = useState(PLATFORM_CONFIG.web);

  useEffect(() => {
    getPlatform().then(platform => {
      setConfig(PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG]);
    });
  }, []);

  return config;
}
```

---

## Summary

✅ **Platform detection is automatic** - Built into Capacitor
✅ **Helper functions provided** - Use `/lib/capacitor-utils.ts`
✅ **Progressive enhancement** - Start with web, enhance for mobile
✅ **Graceful degradation** - Features fail safely
✅ **Consistent UX** - Keep interface similar across platforms
✅ **Easy testing** - Can simulate platforms during development

**Your app adapts intelligently to each platform!** 🎯
