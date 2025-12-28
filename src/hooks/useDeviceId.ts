import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const DEVICE_ID_KEY = 'horah_device_id';

/**
 * Generates a UUID v4 for device identification
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Gets or creates a unique device ID
 * - Uses Capacitor Preferences on native (persists in Keychain/SharedPreferences)
 * - Falls back to localStorage on web
 * - NEVER regenerates on login/logout - device ID is permanent
 */
export async function getOrCreateDeviceId(): Promise<string> {
  // On native, use Capacitor Preferences (secure storage)
  if (Capacitor.isNativePlatform()) {
    try {
      const { value } = await Preferences.get({ key: DEVICE_ID_KEY });
      
      if (value) {
        console.log('[DeviceId] Found existing device_id:', value.substring(0, 8) + '...');
        return value;
      }
      
      // Generate new device ID
      const newDeviceId = generateUUID();
      await Preferences.set({ key: DEVICE_ID_KEY, value: newDeviceId });
      console.log('[DeviceId] Generated new device_id:', newDeviceId.substring(0, 8) + '...');
      return newDeviceId;
    } catch (error) {
      console.error('[DeviceId] Preferences error, falling back to localStorage:', error);
    }
  }
  
  // Fallback: localStorage (for web or if Preferences fails)
  const existingId = localStorage.getItem(DEVICE_ID_KEY);
  if (existingId) {
    console.log('[DeviceId] Found existing device_id in localStorage:', existingId.substring(0, 8) + '...');
    return existingId;
  }
  
  const newDeviceId = generateUUID();
  localStorage.setItem(DEVICE_ID_KEY, newDeviceId);
  console.log('[DeviceId] Generated new device_id (localStorage):', newDeviceId.substring(0, 8) + '...');
  return newDeviceId;
}

/**
 * Clears the device ID (should NEVER be called in normal operation)
 * Only for debugging/testing purposes
 */
export async function clearDeviceId(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Preferences.remove({ key: DEVICE_ID_KEY });
  }
  localStorage.removeItem(DEVICE_ID_KEY);
  console.log('[DeviceId] Device ID cleared (DEBUG ONLY)');
}
