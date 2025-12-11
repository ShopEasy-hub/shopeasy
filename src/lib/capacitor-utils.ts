/**
 * Capacitor Platform Utilities
 * Helps detect if the app is running on mobile (iOS/Android) or web
 */

let platformCache: string | null = null;

/**
 * Get the current platform
 * @returns 'ios' | 'android' | 'web'
 */
export async function getPlatform(): Promise<string> {
  if (platformCache) {
    return platformCache;
  }

  try {
    const { Capacitor } = await import('@capacitor/core');
    platformCache = Capacitor.getPlatform();
    return platformCache;
  } catch (error) {
    // Capacitor not available
    platformCache = 'web';
    return 'web';
  }
}

/**
 * Check if running on native mobile platform
 */
export async function isNativePlatform(): Promise<boolean> {
  const platform = await getPlatform();
  return platform === 'ios' || platform === 'android';
}

/**
 * Check if running on web
 */
export async function isWebPlatform(): Promise<boolean> {
  const platform = await getPlatform();
  return platform === 'web';
}

/**
 * Check if running on iOS
 */
export async function isIOS(): Promise<boolean> {
  const platform = await getPlatform();
  return platform === 'ios';
}

/**
 * Check if running on Android
 */
export async function isAndroid(): Promise<boolean> {
  const platform = await getPlatform();
  return platform === 'android';
}

/**
 * Check if a Capacitor plugin is available
 */
export async function isPluginAvailable(pluginName: string): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isPluginAvailable(pluginName);
  } catch (error) {
    return false;
  }
}

/**
 * Provide haptic feedback (mobile only)
 */
export async function hapticFeedback(style: 'light' | 'medium' | 'heavy' = 'medium'): Promise<void> {
  try {
    const isNative = await isNativePlatform();
    if (!isNative) return;

    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    
    const impactStyle = style === 'light' ? ImpactStyle.Light :
                       style === 'heavy' ? ImpactStyle.Heavy :
                       ImpactStyle.Medium;
    
    await Haptics.impact({ style: impactStyle });
  } catch (error) {
    // Haptics not available or failed
    console.debug('Haptics not available:', error);
  }
}

/**
 * Show native toast (mobile only, falls back to sonner on web)
 */
export async function showNativeToast(message: string): Promise<void> {
  try {
    const isNative = await isNativePlatform();
    if (!isNative) {
      // Fallback to sonner toast
      const { toast } = await import('sonner@2.0.3');
      toast(message);
      return;
    }

    const { Toast } = await import('@capacitor/toast');
    await Toast.show({
      text: message,
      duration: 'short',
      position: 'bottom'
    });
  } catch (error) {
    console.debug('Native toast not available:', error);
  }
}

/**
 * Get device info
 */
export async function getDeviceInfo() {
  try {
    const { Device } = await import('@capacitor/device');
    return await Device.getInfo();
  } catch (error) {
    return {
      platform: 'web',
      model: 'Unknown',
      operatingSystem: 'web',
      osVersion: 'Unknown',
      manufacturer: 'Unknown',
      isVirtual: false,
      webViewVersion: 'Unknown'
    };
  }
}
