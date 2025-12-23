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

// Calculate the best call alert time based on remaining time until event
export const getBestCallAlertMinutes = (
  eventDate: string, 
  eventTime: string | null | undefined
): number | null => {
  if (!eventTime) return 60; // For all-day events, 1h before 9:00 AM
  
  const now = new Date();
  const [hours, minutes] = eventTime.split(':').map(Number);
  
  // Parse date components to avoid timezone issues
  const [year, month, day] = eventDate.split('-').map(Number);
  const eventDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
  
  const diffMs = eventDateTime.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  // If already passed or too close (less than 2 minutes), not available
  if (diffMinutes <= 2) return null;
  
  // Choose the best interval based on remaining time
  if (diffMinutes <= 5) return 2;        // Call 2 min before
  if (diffMinutes <= 15) return 5;       // Call 5 min before
  if (diffMinutes <= 30) return 15;      // Call 15 min before
  if (diffMinutes <= 60) return 30;      // Call 30 min before
  if (diffMinutes <= 120) return 60;     // Call 1h before
  return 60;                             // Default: 1h before
};

// Schedule a call alert before the event (dynamic timing)
export const scheduleCallAlert = async (event: EventData): Promise<number | null> => {
  if (!event.id || !event.event_date) {
    console.warn('[CallAlertScheduler] Missing event data:', event);
    return null;
  }

  // Get the best alert time based on remaining time
  const alertMinutes = getBestCallAlertMinutes(event.event_date, event.event_time);
  
  if (alertMinutes === null) {
    console.log('[CallAlertScheduler] Event too close, cannot schedule call alert');
    return null;
  }

  // Calculate notification time
  let notificationDate: Date;
  
  // Parse date components to avoid timezone issues
  const [year, month, day] = event.event_date.split('-').map(Number);
  
  if (event.event_time) {
    // Event has specific time
    const [hours, minutes] = event.event_time.split(':').map(Number);
    notificationDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
    // Subtract the dynamic alert time
    notificationDate.setMinutes(notificationDate.getMinutes() - alertMinutes);
  } else {
    // All-day event - schedule for 9:00 AM minus alertMinutes
    notificationDate = new Date(year, month - 1, day, 9, 0, 0, 0);
    notificationDate.setMinutes(notificationDate.getMinutes() - alertMinutes);
  }

  // Don't schedule if time has already passed
  if (notificationDate <= new Date()) {
    console.log('[CallAlertScheduler] Notification time has passed, skipping');
    return null;
  }

  // Generate unique notification ID from event ID
  const notificationId = generateNotificationId(event.id);
  
  // Format the alert label for logs
  const alertLabel = alertMinutes < 60 
    ? `${alertMinutes} min antes` 
    : `${Math.floor(alertMinutes / 60)} hora${Math.floor(alertMinutes / 60) > 1 ? 's' : ''} antes`;
  
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
    
    console.log(`[CallAlertScheduler] Web: Scheduled for ${notificationDate.toLocaleString()} (${alertLabel}, in ${Math.round(delay/60000)} min)`);
    return notificationId;
  }

  try {
    const scheduleOptions: ScheduleOptions = {
      notifications: [
        {
          id: notificationId,
          title: '📞 Horah - Me Ligue',
          body: `${event.title}${event.event_time ? ` às ${event.event_time}` : ''} (${alertLabel})`,
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
    console.log(`[CallAlertScheduler] Scheduled notification ${notificationId} for ${notificationDate.toLocaleString()} (${alertLabel})`);
    
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

// Get formatted time and label for call alert (dynamic based on remaining time)
export const getCallAlertTime = (
  eventDate: string,
  eventTime?: string | null
): { time: string; label: string; minutesBefore: number } | null => {
  const alertMinutes = getBestCallAlertMinutes(eventDate, eventTime);
  
  if (alertMinutes === null) return null;
  
  // Calculate the actual call time
  let callTime: string;
  
  // Parse date components to avoid timezone issues
  const [year, month, day] = eventDate.split('-').map(Number);
  
  if (eventTime) {
    const [hours, minutes] = eventTime.split(':').map(Number);
    const eventDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
    eventDateTime.setMinutes(eventDateTime.getMinutes() - alertMinutes);
    
    const callHours = eventDateTime.getHours();
    const callMinutes = eventDateTime.getMinutes();
    callTime = `${String(callHours).padStart(2, '0')}:${String(callMinutes).padStart(2, '0')}`;
  } else {
    // All-day event: 9:00 AM - alertMinutes
    const eventDateTime = new Date(year, month - 1, day, 9, 0, 0, 0);
    eventDateTime.setMinutes(eventDateTime.getMinutes() - alertMinutes);
    
    const callHours = eventDateTime.getHours();
    const callMinutes = eventDateTime.getMinutes();
    callTime = `${String(callHours).padStart(2, '0')}:${String(callMinutes).padStart(2, '0')}`;
  }
  
  // Create friendly label
  const label = alertMinutes < 60 
    ? `${alertMinutes} min antes` 
    : `${Math.floor(alertMinutes / 60)} hora${Math.floor(alertMinutes / 60) > 1 ? 's' : ''} antes`;
  
  return {
    time: callTime,
    label,
    minutesBefore: alertMinutes
  };
};
