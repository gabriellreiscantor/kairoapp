import { useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { remoteLog } from '@/lib/remoteLogger';

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
        remoteLog.warn('push', 'token_save_skipped', { reason: 'no_user' });
        return;
      }

      // Detect platform - iOS returns APNs tokens, Android returns FCM tokens
      // APNs tokens are 64 hex chars, FCM tokens are much longer with colons
      const platform = Capacitor.getPlatform();
      const tokenType = platform === 'ios' ? 'ios' : 'android';
      
      remoteLog.info('push', 'saving_token', { 
        platform, 
        tokenType,
        tokenLength: token.length,
        tokenPreview: token.substring(0, 20) + '...' 
      });

      const { error } = await supabase
        .from('profiles')
        .update({
          fcm_token: token,
          fcm_token_updated_at: new Date().toISOString(),
          fcm_token_platform: tokenType
        })
        .eq('id', user.id);

      if (error) {
        remoteLog.error('push', 'token_save_error', { error: error.message });
      } else {
        remoteLog.info('push', 'token_saved', { 
          tokenType,
          tokenPreview: token.substring(0, 20) + '...' 
        });
      }
    } catch (err) {
      remoteLog.error('push', 'token_save_exception', { error: String(err) });
    }
  }, []);

  const registerPushNotifications = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      remoteLog.debug('push', 'registration_skipped', { reason: 'not_native' });
      return false;
    }

    if (isRegistered.current) {
      remoteLog.debug('push', 'registration_skipped', { reason: 'already_registered' });
      return true;
    }

    try {
      remoteLog.info('push', 'registration_started');
      
      // Check current permission status
      let permStatus = await PushNotifications.checkPermissions();
      remoteLog.info('push', 'permission_status', { status: permStatus.receive });

      // Request permission if not granted
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
        remoteLog.info('push', 'permission_requested', { result: permStatus.receive });
      }

      if (permStatus.receive !== 'granted') {
        remoteLog.warn('push', 'permission_denied');
        return false;
      }

      // Register with FCM/APNs
      await PushNotifications.register();
      remoteLog.info('push', 'registration_initiated');

      isRegistered.current = true;
      return true;
    } catch (err) {
      remoteLog.error('push', 'registration_error', { error: String(err) });
      return false;
    }
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Listener for registration success
    const registrationListener = PushNotifications.addListener('registration', async (token: Token) => {
      remoteLog.info('push', 'token_received', { tokenPreview: token.value?.substring(0, 20) + '...' });
      await saveFCMToken(token.value);
    });

    // Listener for registration errors
    const errorListener = PushNotifications.addListener('registrationError', (error) => {
      remoteLog.error('push', 'registration_listener_error', { error: JSON.stringify(error) });
    });

    // Listener for push notifications received (app in foreground)
    const notificationListener = PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      remoteLog.info('push', 'notification_received', { 
        title: notification.title,
        body: notification.body?.substring(0, 50),
        id: notification.id,
      });
      onNotificationReceived?.(notification);
    });

    // Listener for notification actions (user tapped notification)
    const actionListener = PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      remoteLog.info('push', 'notification_tapped', { 
        actionId: action.actionId,
        notificationId: action.notification.id,
        title: action.notification.title,
      });
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
