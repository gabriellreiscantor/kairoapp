import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kairo.android',
  appName: 'Kairo',
  webDir: 'dist',
  server: {
    url: 'https://c22861fc-467c-41aa-89f7-0d5fb35a5ac2.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  ios: {
    // iOS uses different bundle ID
    // Set in Xcode: com.kairo
  },
  android: {
    // Android package: com.kairo.android
  }
};

export default config;
