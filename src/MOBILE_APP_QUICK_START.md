# 🚀 ShopEasy Mobile App - Quick Start Guide

This guide will help you build Android and iOS apps from your existing ShopEasy POS web app **without breaking anything**.

## ✅ Safety Guarantee

- ✅ Your web app will continue working normally
- ✅ No database schema changes needed
- ✅ No Supabase configuration changes needed
- ✅ All existing functionality preserved
- ✅ You can test mobile without affecting production web app

---

## 📋 Step 1: Install Required Packages

Copy and paste this **entire command** into your terminal:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios @capacitor/splash-screen @capacitor/status-bar @capacitor/keyboard @capacitor/app @capacitor/haptics @capacitor/device @capacitor/toast @capacitor-community/barcode-scanner
```

**Wait for installation to complete** before proceeding to Step 2.

---

## 📦 Step 2: Build Your Web App

```bash
npm run build
```

This creates a `dist` folder with your compiled web app. Mobile apps will use this.

---

## 📱 Step 3: Add Mobile Platforms

### For Android:
```bash
npx cap add android
```

This creates an `android/` folder with a complete Android Studio project.

### For iOS (Mac only):
```bash
npx cap add ios
```

This creates an `ios/` folder with a complete Xcode project.

**Note**: Your web app is still untouched! These are separate mobile projects.

---

## 🔐 Step 4: Configure Permissions

### Android Permissions

1. Open `android/app/src/main/AndroidManifest.xml`
2. Add these permissions **before** the `<application>` tag:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

**Full example:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Add permissions here -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

    <application
        android:allowBackup="true"
        ...
```

### iOS Permissions

1. Open `ios/App/App/Info.plist`
2. Add these entries **inside** the `<dict>` tag:

```xml
<key>NSCameraUsageDescription</key>
<string>ShopEasy needs camera access to scan product barcodes</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>ShopEasy needs photo library access to save receipts</string>
```

---

## 🎯 Step 5: Test on Mobile

### Android Testing:

```bash
# Open Android Studio
npx cap open android
```

**In Android Studio:**
1. Wait for Gradle sync (bottom right corner - can take 2-5 minutes first time)
2. Click the device dropdown and select a device or create emulator
3. Click the green ▶️ **Run** button
4. App will launch on device/emulator

### iOS Testing (Mac only):

```bash
# Open Xcode
npx cap open ios
```

**In Xcode:**
1. Select a simulator from the device dropdown (e.g., "iPhone 15")
2. Click the ▶️ **Play** button
3. App will launch on simulator

---

## 🎥 Step 6: Test Barcode Scanner

The barcode scanner component is already integrated! Here's how to use it:

### Where it's available:
- **POS Page**: When adding products
- **Inventory Page**: When searching products

### How to test:

1. Launch app on a **real device** (camera doesn't work on simulators)
2. Navigate to POS or Inventory page
3. Look for the **Camera/Barcode icon** button
4. Click it and grant camera permission
5. Point camera at any barcode (product barcode, QR code, etc.)
6. Scanner will automatically detect and input the barcode

**Note**: On web version, it will show a message to use a USB scanner instead.

---

## 🔄 Development Workflow

### Making Changes to Your App:

```bash
# 1. Make your code changes in React files

# 2. Build the web app
npm run build

# 3. Sync to mobile platforms
npx cap sync

# 4. Re-run in Android Studio or Xcode
# (Just click Run again, no need to reopen)
```

### Continue Web Development:

```bash
# Your normal web dev workflow is unchanged!
npm run dev

# Open http://localhost:5173 in browser
```

---

## 🚀 Advanced: Live Reload (Optional)

For faster mobile development, enable live reload:

**1. Find your computer's IP address:**
```bash
# Windows
ipconfig

# Mac/Linux
ifconfig | grep "inet "
```

Look for something like `192.168.1.100`

**2. Edit `capacitor.config.ts`:**
```typescript
const config: CapacitorConfig = {
  appId: 'com.shopeasy.pos',
  appName: 'ShopEasy POS',
  webDir: 'dist',
  server: {
    url: 'http://192.168.1.100:5173',  // ← Your IP here
    cleartext: true
  },
  // ... rest of config
};
```

**3. Sync and run:**
```bash
npx cap sync
npm run dev
# Run app in Android Studio/Xcode
```

Now changes in your code will hot-reload on the mobile device!

**⚠️ IMPORTANT**: Remove the `server.url` line before building for production!

---

## 📲 Building for Production

### Android APK/AAB:

1. Build and sync:
```bash
npm run build
npx cap sync
```

2. Open Android Studio:
```bash
npx cap open android
```

3. In Android Studio:
   - **Build** → **Generate Signed Bundle/APK**
   - Follow wizard to create release build
   - You'll need to create a keystore (Android Studio will guide you)

### iOS IPA:

1. Build and sync:
```bash
npm run build
npx cap sync
```

2. Open Xcode:
```bash
npx cap open ios
```

3. In Xcode:
   - **Product** → **Archive**
   - Follow wizard to upload to App Store
   - You'll need an Apple Developer account ($99/year)

---

## 🛠️ Troubleshooting

### "Cannot find module @capacitor/core"
```bash
npm install @capacitor/core @capacitor/cli
```

### White screen on app launch
```bash
# Rebuild and sync
npm run build
npx cap sync
```

Check console in Android Studio/Xcode for errors.

### Barcode scanner not working
- ✅ Test on **real device** (camera doesn't work on emulators)
- ✅ Check camera permissions are granted in device settings
- ✅ Verify AndroidManifest.xml / Info.plist have camera permissions

### Changes not appearing
```bash
# Always build and sync after changes!
npm run build
npx cap sync
```

### Gradle sync failed (Android)
- Make sure you have Android Studio installed
- Open Android Studio → SDK Manager → Install latest Android SDK
- Retry

### App doesn't connect to Supabase
- ✅ Check internet permission is in AndroidManifest.xml
- ✅ Supabase URL should be HTTPS
- ✅ Test on real device, not emulator (emulators sometimes have network issues)

---

## 📚 Useful Commands

```bash
# Build web app
npm run build

# Sync to all platforms
npx cap sync

# Open Android Studio
npx cap open android

# Open Xcode
npx cap open ios

# Update Capacitor
npx cap update

# Check Capacitor doctor
npx cap doctor
```

---

## 🎉 What's Been Added

### New Files Created:
- ✅ `/capacitor.config.ts` - Capacitor configuration
- ✅ `/components/BarcodeScanner.tsx` - Barcode scanner component
- ✅ `/lib/capacitor-utils.ts` - Platform detection utilities
- ✅ `/CAPACITOR_SETUP.md` - Detailed setup guide
- ✅ `/MOBILE_APP_QUICK_START.md` - This file

### Enhanced Files:
- ✅ `/styles/globals.css` - Added scanner overlay styles

### NOT Modified:
- ✅ All your existing pages
- ✅ Database schema
- ✅ Supabase configuration
- ✅ API functions
- ✅ Web app functionality

---

## 🎯 Next Steps

1. **Test the barcode scanner** on a real mobile device
2. **Add app icons and splash screens** (see `android/app/src/main/res` and `ios/App/App/Assets.xcassets`)
3. **Test all features** on mobile to ensure everything works
4. **Build production versions** when ready to release
5. **Publish to Google Play Store** (Android) and **App Store** (iOS)

---

## 📞 Need Help?

If you encounter issues:

1. Run `npx cap doctor` to check your setup
2. Check the console in Android Studio/Xcode for error messages
3. Refer to the detailed `CAPACITOR_SETUP.md` file
4. Visit [Capacitor Documentation](https://capacitorjs.com/docs)

---

## ✨ Key Benefits

- 🚀 **Same codebase** for web, Android, and iOS
- 📱 **Native features** like camera, haptics, native dialogs
- 🔄 **Automatic sync** - changes to web app = changes to mobile
- 🎯 **No framework learning** - just React as you know it
- 💾 **Same database** - Supabase works identically on all platforms
- 🔐 **Same authentication** - users can use web or mobile seamlessly

---

**Your web app is safe! Start with Step 1 and follow along.** 🎉
