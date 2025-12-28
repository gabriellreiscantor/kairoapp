import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';

const DEVICE_ID_KEY = 'horah_device_id';
const DEVICE_ID_TIMEOUT_MS = 5000;

/**
 * Helper to add timeout to any promise
 */
function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(errorMsg)), ms)
    )
  ]);
}

/**
 * Gets the native device identifier
 * - iOS: identifierForVendor (IDFV) - permanent, unique per vendor
 * - Android: ANDROID_ID - unique per app + user + device
 * - Web: localStorage fallback with UUID
 * 
 * Has a 5 second timeout - falls back to localStorage if native call hangs
 */
export async function getOrCreateDeviceId(): Promise<string> {
  const platform = Capacitor.getPlatform();
  const isNative = Capacitor.isNativePlatform();
  
  console.log('[DeviceId] ====== getOrCreateDeviceId CALLED ======');
  console.log('[DeviceId] Platform:', platform);
  console.log('[DeviceId] isNativePlatform():', isNative);
  
  // PRIORITY 1: Always check localStorage FIRST (contains the correct IDFV from previous successful calls)
  const existingId = localStorage.getItem(DEVICE_ID_KEY);
  if (existingId) {
    console.log('[DeviceId] ✅ Using existing localStorage ID:', existingId.substring(0, 8) + '...');
    console.log('[DeviceId] (Skipping Device.getId() - localStorage is source of truth)');
    return existingId;
  }
  
  console.log('[DeviceId] No ID in localStorage, need to obtain one...');
  
  // PRIORITY 2: On native platforms, try to get the native identifier
  if (isNative) {
    console.log('[DeviceId] 📱 Native platform - attempting Device.getId() with', DEVICE_ID_TIMEOUT_MS, 'ms timeout...');
    
    try {
      const deviceInfo = await withTimeout(
        Device.getId(),
        DEVICE_ID_TIMEOUT_MS,
        'Device.getId() timeout after ' + DEVICE_ID_TIMEOUT_MS + 'ms'
      );
      const identifier = deviceInfo.identifier;
      console.log('[DeviceId] ✅ Native IDFV obtained:', identifier.substring(0, 8) + '...');
      
      // Save to localStorage for future calls (this becomes the source of truth)
      localStorage.setItem(DEVICE_ID_KEY, identifier);
      console.log('[DeviceId] 💾 Saved IDFV to localStorage');
      
      return identifier;
    } catch (error) {
      console.warn('[DeviceId] ⚠️ Device.getId() failed or timed out:', error);
      console.log('[DeviceId] Generating fallback UUID as last resort...');
    }
  }
  
  // PRIORITY 3: Last resort - generate UUID (web platform OR native timeout with empty localStorage)
  const newId = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_KEY, newId);
  console.log('[DeviceId] 🆕 Generated new UUID:', newId.substring(0, 8) + '...');
  console.log('[DeviceId] (This should only happen on first launch or web)');
  return newId;
}

/**
 * Clears the device ID (DEBUG ONLY - should never be used in production)
 * Note: On native, this only clears localStorage, the IDFV is permanent
 */
export async function clearDeviceId(): Promise<void> {
  localStorage.removeItem(DEVICE_ID_KEY);
  console.log('[DeviceId] Web device ID cleared (DEBUG ONLY)');
}
