# Git Configuration for Mobile Apps

## Add to Your `.gitignore`

Add these lines to your `.gitignore` file to properly handle mobile build files:

```gitignore
# Capacitor
android/
ios/
*.xcworkspace
*.xcodeproj

# But keep the config
!capacitor.config.ts

# Android specific
*.apk
*.aab
*.ap_
*.dex
local.properties
.gradle/
build/
captures/
.externalNativeBuild
.cxx

# iOS specific
*.ipa
*.dSYM.zip
*.dSYM
xcuserdata/
DerivedData/
*.moved-aside
*.hmap
*.ipa
*.xccheckout
*.xcscmblueprint

# macOS
.DS_Store
```

## Why Ignore These?

### `android/` and `ios/` folders
- ✅ Generated from your web app
- ✅ Can be recreated with `npx cap add android/ios`
- ✅ Large folders (100+ MB)
- ✅ Binary files that don't belong in Git
- ✅ Rebuild on each developer's machine

### What to Commit

**DO commit:**
- ✅ `capacitor.config.ts` - Configuration file
- ✅ `/components/BarcodeScanner.tsx` - Shared component
- ✅ `/lib/capacitor-utils.ts` - Utility functions
- ✅ All documentation files

**DON'T commit:**
- ❌ `android/` folder
- ❌ `ios/` folder
- ❌ `.apk` or `.ipa` files
- ❌ Build artifacts

## Team Workflow

### Developer A (creates mobile setup):
```bash
# 1. Install packages
npm install

# 2. Add platforms
npx cap add android
npx cap add ios

# 3. Commit only config
git add capacitor.config.ts components/ lib/
git commit -m "Add mobile support with Capacitor"
git push
```

### Developer B (joins project):
```bash
# 1. Pull latest code
git pull

# 2. Install packages
npm install

# 3. Rebuild platforms
npm run build
npx cap add android
npx cap add ios

# Ready to develop!
```

## CI/CD Pipeline

If you use CI/CD (GitHub Actions, GitLab CI, etc.), add this to your pipeline:

```yaml
# Example for GitHub Actions
- name: Build Web App
  run: npm run build

- name: Setup Android
  run: npx cap add android
  
- name: Sync to Android
  run: npx cap sync android

- name: Build APK
  run: cd android && ./gradlew assembleRelease
```

---

**Bottom Line**: Only commit source code and configuration. Build folders are regenerated locally. ✅
