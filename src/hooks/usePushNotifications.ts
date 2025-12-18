import { useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';

interface UsePushNotificationsOptions {
  onNotificationReceived?: (notification: PushNotificationSchema) => void;
  onNotificationAction?: (action: ActionPerformed) => void;
}

export const usePushNotifications = (options: UsePushNotificationsOptions = {}) => {
  const { onNotificationReceived, onNotificationAction } = options;
  const isRegistered = useRef(false);

  const saveFCMToken = useCallback(async (token: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[Push] No user logged in, skipping token save');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          fcm_token: token,
          fcm_token_updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('[Push] Error saving FCM token:', error);
      } else {
        console.log('[Push] FCM token saved successfully');
      }
    } catch (err) {
      console.error('[Push] Exception saving FCM token:', err);
    }
  }, []);

  const registerPushNotifications = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      console.log('[Push] Not a native platform, skipping registration');
      return false;
    }

    if (isRegistered.current) {
      console.log('[Push] Already registered');
      return true;
    }

    try {
      // Check current permission status
      let permStatus = await PushNotifications.checkPermissions();
      console.log('[Push] Current permission status:', permStatus.receive);

      // Request permission if not granted
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
        console.log('[Push] Permission after request:', permStatus.receive);
      }

      if (permStatus.receive !== 'granted') {
        console.log('[Push] Permission not granted');
        return false;
      }

      // Register with FCM/APNs
      await PushNotifications.register();
      console.log('[Push] Registration initiated');

      isRegistered.current = true;
      return true;
    } catch (err) {
      console.error('[Push] Registration error:', err);
      return false;
    }
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Listener for registration success
    const registrationListener = PushNotifications.addListener('registration', async (token: Token) => {
      console.log('[Push] Registration success, token:', token.value?.substring(0, 20) + '...');
      await saveFCMToken(token.value);
    });

    // Listener for registration errors
    const errorListener = PushNotifications.addListener('registrationError', (error) => {
      console.error('[Push] Registration error:', error);
    });

    // Listener for push notifications received (app in foreground)
    const notificationListener = PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('[Push] Notification received:', notification);
      onNotificationReceived?.(notification);
    });

    // Listener for notification actions (user tapped notification)
    const actionListener = PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('[Push] Notification action performed:', action);
      onNotificationAction?.(action);
    });

    // Auto-register on mount
    registerPushNotifications();

    return () => {
      registrationListener.then(l => l.remove());
      errorListener.then(l => l.remove());
      notificationListener.then(l => l.remove());
      actionListener.then(l => l.remove());
    };
  }, [registerPushNotifications, saveFCMToken, onNotificationReceived, onNotificationAction]);

  return {
    registerPushNotifications
  };
};
