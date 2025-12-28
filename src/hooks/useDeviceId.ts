import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';

const DEVICE_ID_KEY = 'horah_device_id';

/**
 * Gets the native device identifier
 * - iOS: identifierForVendor (IDFV) - permanente, único por vendor
 * - Android: ANDROID_ID - único por app + user + device
 * - Web: localStorage fallback com UUID
 * 
 * NEVER generates random IDs on native - always uses the OS-provided identifier
 */
export async function getOrCreateDeviceId(): Promise<string> {
  // On native platforms, ALWAYS use the native identifier (IDFV on iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      const { identifier } = await Device.getId();
      console.log('[DeviceId] Native IDFV:', identifier.substring(0, 8) + '...');
      return identifier;
    } catch (error) {
      console.error('[DeviceId] Failed to get native ID, this should not happen:', error);
      // This is a critical error on native - log it but still try localStorage
    }
  }
  
  // Web fallback: localStorage with generated UUID
  const existingId = localStorage.getItem(DEVICE_ID_KEY);
  if (existingId) {
    console.log('[DeviceId] Web localStorage ID:', existingId.substring(0, 8) + '...');
    return existingId;
  }
  
  // Generate new UUID for web only
  const newDeviceId = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_KEY, newDeviceId);
  console.log('[DeviceId] Generated new web ID:', newDeviceId.substring(0, 8) + '...');
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
