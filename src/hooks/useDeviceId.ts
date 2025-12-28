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
  
  // On native platforms, try to use the native identifier (IDFV on iOS)
  if (isNative) {
    console.log('[DeviceId] ✅ Native platform detected, getting OS identifier...');
    console.log('[DeviceId] Calling Device.getId() with', DEVICE_ID_TIMEOUT_MS, 'ms timeout...');
    
    try {
      const deviceInfo = await withTimeout(
        Device.getId(),
        DEVICE_ID_TIMEOUT_MS,
        'Device.getId() timeout after ' + DEVICE_ID_TIMEOUT_MS + 'ms'
      );
      const identifier = deviceInfo.identifier;
      console.log('[DeviceId] ✅ Native IDFV obtained:', identifier.substring(0, 8) + '...');
      console.log('[DeviceId] Full IDFV length:', identifier.length);
      
      // Store in localStorage for fallback
      localStorage.setItem(DEVICE_ID_KEY, identifier);
      
      return identifier;
    } catch (error) {
      console.warn('[DeviceId] ⚠️ Device.getId() failed or timed out:', error);
      
      // Fallback to localStorage
      const fallbackId = localStorage.getItem(DEVICE_ID_KEY);
      if (fallbackId) {
        console.log('[DeviceId] 🔄 Using localStorage fallback:', fallbackId.substring(0, 8) + '...');
        return fallbackId;
      }
      
      // Last resort: generate new UUID (only if localStorage is empty)
      const newId = crypto.randomUUID();
      localStorage.setItem(DEVICE_ID_KEY, newId);
      console.log('[DeviceId] 🆕 Generated fallback UUID:', newId.substring(0, 8) + '...');
      return newId;
    }
  }
  
  // Web fallback: localStorage with generated UUID
  console.log('[DeviceId] 🌐 Web platform detected, using localStorage...');
  const existingId = localStorage.getItem(DEVICE_ID_KEY);
  if (existingId) {
    console.log('[DeviceId] Web localStorage ID exists:', existingId.substring(0, 8) + '...');
    return existingId;
  }
  
  // Generate new UUID for web only
  const newDeviceId = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_KEY, newDeviceId);
  console.log('[DeviceId] 🆕 Generated new web ID:', newDeviceId.substring(0, 8) + '...');
  return newDeviceId;
}

/**
 * Clears the device ID (DEBUG ONLY - should never be used in production)
 * Note: On native, this only clears localStorage, the IDFV is permanent
 */
export async function clearDeviceId(): Promise<void> {
  localStorage.removeItem(DEVICE_ID_KEY);
  console.log('[DeviceId] Web device ID cleared (DEBUG ONLY)');
}
