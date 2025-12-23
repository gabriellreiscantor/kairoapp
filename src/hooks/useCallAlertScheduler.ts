import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

interface EventData {
  id: string;
  title: string;
  event_date: string;
  event_time?: string;
  location?: string;
  emoji?: string;
}

// Check if running on native device
const isNative = () => Capacitor.isNativePlatform();

// Request notification permissions
export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (!isNative()) {
    console.log('[CallAlertScheduler] Web platform - skipping native permissions');
    return false;
  }
  
  try {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted';
  } catch (error) {
    console.error('[CallAlertScheduler] Error requesting permissions:', error);
    return false;
  }
};

// Schedule a call alert 1 hour before the event
export const scheduleCallAlert = async (event: EventData): Promise<number | null> => {
  if (!event.id || !event.event_date) {
    console.warn('[CallAlertScheduler] Missing event data:', event);
    return null;
  }

  // Calculate notification time (1 hour before event)
  let notificationDate: Date;
  
  if (event.event_time) {
    // Event has specific time
    const [hours, minutes] = event.event_time.split(':').map(Number);
    notificationDate = new Date(event.event_date);
    notificationDate.setHours(hours, minutes, 0, 0);
    // Subtract 1 hour
    notificationDate.setHours(notificationDate.getHours() - 1);
  } else {
    // All-day event - schedule for 9:00 AM
    notificationDate = new Date(event.event_date);
    notificationDate.setHours(9, 0, 0, 0);
  }

  // Don't schedule if time has already passed
  if (notificationDate <= new Date()) {
    console.log('[CallAlertScheduler] Notification time has passed, skipping');
    return null;
  }

  // Generate unique notification ID from event ID
  const notificationId = generateNotificationId(event.id);
  
  if (!isNative()) {
    // Web fallback - use setTimeout (only works if app is open)
    console.log('[CallAlertScheduler] Web platform - using setTimeout fallback');
    const delay = notificationDate.getTime() - Date.now();
    
    // Store timeout ID for potential cancellation
    const timeoutId = window.setTimeout(() => {
      // Dispatch custom event for web
      window.dispatchEvent(new CustomEvent('kairo-call-alert', { 
        detail: { event } 
      }));
    }, delay);
    
    // Store mapping in localStorage for web
    localStorage.setItem(`call-alert-${event.id}`, String(timeoutId));
    
    console.log(`[CallAlertScheduler] Web: Scheduled for ${notificationDate.toLocaleString()} (in ${Math.round(delay/60000)} min)`);
    return notificationId;
  }

  try {
    const scheduleOptions: ScheduleOptions = {
      notifications: [
        {
          id: notificationId,
          title: '📞 Horah - Me Ligue',
          body: `${event.title}${event.event_time ? ` às ${event.event_time}` : ''}`,
          schedule: { at: notificationDate },
          extra: {
            eventId: event.id,
            eventTitle: event.title,
            eventTime: event.event_time,
            eventLocation: event.location,
            eventEmoji: event.emoji || '📅',
            type: 'call-alert'
          },
          sound: 'default',
          actionTypeId: 'CALL_ALERT',
        }
      ]
    };

    await LocalNotifications.schedule(scheduleOptions);
    console.log(`[CallAlertScheduler] Scheduled notification ${notificationId} for ${notificationDate.toLocaleString()}`);
    
    return notificationId;
  } catch (error) {
    console.error('[CallAlertScheduler] Error scheduling notification:', error);
    return null;
  }
};

// Cancel a scheduled call alert
export const cancelCallAlert = async (eventId: string): Promise<boolean> => {
  const notificationId = generateNotificationId(eventId);
  
  if (!isNative()) {
    // Web fallback - clear timeout
    const timeoutId = localStorage.getItem(`call-alert-${eventId}`);
    if (timeoutId) {
      window.clearTimeout(Number(timeoutId));
      localStorage.removeItem(`call-alert-${eventId}`);
      console.log(`[CallAlertScheduler] Web: Cancelled timeout for ${eventId}`);
    }
    return true;
  }

  try {
    await LocalNotifications.cancel({
      notifications: [{ id: notificationId }]
    });
    console.log(`[CallAlertScheduler] Cancelled notification ${notificationId}`);
    return true;
  } catch (error) {
    console.error('[CallAlertScheduler] Error cancelling notification:', error);
    return false;
  }
};

// Generate a consistent notification ID from event UUID
const generateNotificationId = (eventId: string): number => {
  // Convert UUID to a numeric ID (use hash)
  let hash = 0;
  for (let i = 0; i < eventId.length; i++) {
    const char = eventId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
};

// Get formatted time for tooltip (1 hour before event)
export const getCallAlertTime = (eventTime?: string): string | null => {
  if (!eventTime) return null;
  
  try {
    const [hours, minutes] = eventTime.split(':').map(Number);
    const alertHours = hours - 1;
    
    if (alertHours < 0) {
      return `${23 + alertHours + 1}:${String(minutes).padStart(2, '0')}`;
    }
    
    return `${String(alertHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  } catch {
    return null;
  }
};
