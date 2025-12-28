import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';

const DEVICE_ID_KEY = 'horah_device_id';

/**
 * Gets the native device identifier
 * - iOS: identifierForVendor (IDFV) - permanent, unique per vendor
 * - Android: ANDROID_ID - unique per app + user + device
 * - Web: localStorage fallback with UUID
 * 
 * NEVER generates random IDs on native - always uses the OS-provided identifier
 */
export async function getOrCreateDeviceId(): Promise<string> {
  const platform = Capacitor.getPlatform();
  const isNative = Capacitor.isNativePlatform();
  
  console.log('[DeviceId] ====== getOrCreateDeviceId CALLED ======');
  console.log('[DeviceId] Platform:', platform);
  console.log('[DeviceId] isNativePlatform():', isNative);
  
  // On native platforms, ALWAYS use the native identifier (IDFV on iOS)
  if (isNative) {
    console.log('[DeviceId] ✅ Native platform detected, getting OS identifier...');
    try {
      const deviceInfo = await Device.getId();
      const identifier = deviceInfo.identifier;
      console.log('[DeviceId] ✅ Native IDFV obtained:', identifier.substring(0, 8) + '...');
      console.log('[DeviceId] Full IDFV length:', identifier.length);
      
      // Also store in localStorage for debugging/comparison
      const storedId = localStorage.getItem(DEVICE_ID_KEY);
      if (storedId && storedId !== identifier) {
        console.log('[DeviceId] ⚠️ localStorage has DIFFERENT ID:', storedId.substring(0, 8) + '...');
        console.log('[DeviceId] This is expected - localStorage had old JS-UUID, now using native IDFV');
      }
      
      // Update localStorage to match native ID (for consistency in debugging)
      localStorage.setItem(DEVICE_ID_KEY, identifier);
      
      return identifier;
    } catch (error) {
      console.error('[DeviceId] ❌ CRITICAL: Failed to get native ID:', error);
      console.error('[DeviceId] This should NOT happen on native platforms!');
      // This is a critical error on native - log it but still try localStorage
      // DO NOT generate a random ID here - fallback to localStorage only
      const fallbackId = localStorage.getItem(DEVICE_ID_KEY);
      if (fallbackId) {
        console.log('[DeviceId] Using localStorage fallback:', fallbackId.substring(0, 8) + '...');
        return fallbackId;
      }
      // Last resort - should never happen
      console.error('[DeviceId] No localStorage fallback either!');
      throw new Error('Failed to get device ID on native platform');
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
