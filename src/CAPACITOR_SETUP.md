# Capacitor Mobile App Setup Guide

This guide will help you convert ShopEasy POS to Android and iOS apps using Capacitor **without breaking the web version**.

## Prerequisites

1. Node.js and npm installed
2. For Android: Android Studio installed
3. For iOS: Xcode installed (Mac only)

## Step 1: Install Capacitor Dependencies

Run these commands in your project root:

```bash
# Install Capacitor core and CLI
npm install @capacitor/core @capacitor/cli

# Install platform-specific packages
npm install @capacitor/android @capacitor/ios

# Install useful plugins
npm install @capacitor/splash-screen @capacitor/status-bar @capacitor/keyboard @capacitor/app @capacitor/haptics

# Install barcode scanner plugin
npm install @capacitor-community/barcode-scanner
```

## Step 2: Initialize Capacitor (SAFE - Won't Break Web App)

The `capacitor.config.ts` file is already created in your project root. This tells Capacitor to use the `dist` folder (built web app) for mobile apps.

## Step 3: Build Your Web App

```bash
# Build your React app (this creates the 'dist' folder)
npm run build
```

## Step 4: Add Mobile Platforms

```bash
# Add Android platform
npx cap add android

# Add iOS platform (Mac only)
npx cap add ios
```

This creates `android/` and `ios/` folders containing native projects. **Your web app remains untouched!**

## Step 5: Sync Web Assets to Mobile

Every time you update your web app, sync changes:

```bash
# Build web app first
npm run build

# Sync to mobile platforms
npx cap sync
```

## Step 6: Configure Android Permissions

Edit `android/app/src/main/AndroidManifest.xml` and add these permissions:

```xml
<manifest>
    <!-- Add these permissions before <application> tag -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    
    <application>
        <!-- Your existing application config -->
    </application>
</manifest>
```

## Step 7: Configure iOS Permissions

Edit `ios/App/App/Info.plist` and add these permissions:

```xml
<dict>
    <!-- Add these entries -->
    <key>NSCameraUsageDescription</key>
    <string>ShopEasy needs camera access to scan product barcodes</string>
    
    <key>NSPhotoLibraryUsageDescription</key>
    <string>ShopEasy needs photo library access to save receipts</string>
    
    <!-- Your existing plist entries -->
</dict>
```

## Step 8: Open and Run Mobile Apps

### For Android:

```bash
# Open Android Studio
npx cap open android

# In Android Studio:
# 1. Wait for Gradle sync to complete
# 2. Select a device/emulator
# 3. Click Run (green play button)
```

### For iOS (Mac only):

```bash
# Open Xcode
npx cap open ios

# In Xcode:
# 1. Select a simulator or connected device
# 2. Click Run (play button)
# 3. You may need to sign the app with your Apple Developer account
```

## Step 9: Development Workflow

### Local Development (Web):
```bash
# Continue using your web dev server as normal
npm run dev

# Your web app is NOT affected by Capacitor
```

### Mobile Development:
```bash
# 1. Make changes to your React code
# 2. Build the web app
npm run build

# 3. Sync to mobile
npx cap sync

# 4. Re-run the app in Android Studio or Xcode
# (Hot reload is available with Capacitor Live Reload - see Advanced section)
```

## Step 10: Testing Barcode Scanner

The barcode scanner component has been added to your app with automatic platform detection:
- **Mobile (iOS/Android)**: Uses native camera scanner
- **Web**: Shows a message to use a barcode scanner device or manual entry

Test it:
1. Build and run on a mobile device
2. Navigate to POS or Inventory page
3. Click the barcode scanner button
4. Point camera at a barcode

## Advanced: Live Reload for Mobile Development

To enable live reload on mobile devices:

```bash
# 1. Find your computer's local IP address
# Windows: ipconfig
# Mac/Linux: ifconfig

# 2. Update capacitor.config.ts:
server: {
  url: 'http://YOUR_IP:5173',  // e.g., http://192.168.1.100:5173
  cleartext: true
}

# 3. Sync
npx cap sync

# 4. Run your dev server
npm run dev

# 5. Run mobile app - it will connect to your dev server
```

**Important**: Remove the `server.url` before building for production!

## Building for Production

### Android APK/AAB:

```bash
# 1. Build web app
npm run build

# 2. Sync
npx cap sync

# 3. Open Android Studio
npx cap open android

# 4. In Android Studio:
#    Build > Generate Signed Bundle/APK
#    Follow the wizard to create a release build
```

### iOS IPA:

```bash
# 1. Build web app
npm run build

# 2. Sync
npx cap sync

# 3. Open Xcode
npx cap open ios

# 4. In Xcode:
#    Product > Archive
#    Follow the wizard to submit to App Store
```

## Troubleshooting

### "Cannot find module @capacitor/core"
```bash
npm install @capacitor/core @capacitor/cli
```

### Barcode scanner not working
- Check camera permissions are granted
- Make sure you're testing on a real device (not simulator for camera)
- Check AndroidManifest.xml / Info.plist have camera permissions

### White screen on mobile
```bash
# Rebuild and sync
npm run build
npx cap sync

# Check browser console in Android Studio/Xcode for errors
```

### Changes not appearing
```bash
# Always build and sync after changes
npm run build
npx cap sync
```

## Important Notes

✅ **Your web app is SAFE** - Capacitor only uses the built `dist` folder
✅ **Web version still works** - Continue using `npm run dev` for web development
✅ **Platform detection** - The app automatically detects mobile vs web
✅ **No schema changes** - Database and Supabase work exactly the same
✅ **Progressive enhancement** - Features like barcode scanner gracefully degrade on web

## Package.json Scripts (Add These)

Add these helpful scripts to your `package.json`:

```json
{
  "scripts": {
    "build": "vite build",
    "cap:sync": "npm run build && npx cap sync",
    "cap:android": "npm run cap:sync && npx cap open android",
    "cap:ios": "npm run cap:sync && npx cap open ios",
    "mobile:dev": "npm run build && npx cap sync"
  }
}
```

Then use:
- `npm run cap:android` - Build and open Android Studio
- `npm run cap:ios` - Build and open Xcode
- `npm run cap:sync` - Build and sync to all platforms

## Next Steps

1. Install the npm packages (Step 1)
2. Build your web app (Step 3)
3. Add platforms (Step 4)
4. Configure permissions (Steps 6-7)
5. Open and test (Step 8)

Your web app continues to work normally! 🎉
