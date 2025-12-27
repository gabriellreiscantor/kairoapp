import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import * as Sentry from '@sentry/react';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export type LogCategory = 
  | 'app_lifecycle'    // App start, background, foreground
  | 'auth'             // Login, logout, session
  | 'push'             // Push notifications
  | 'voip'             // VoIP/CallKit
  | 'audio'            // Audio recording
  | 'geolocation'      // Location
  | 'network'          // Online/offline
  | 'chat'             // Chat interactions
  | 'events'           // Event CRUD
  | 'navigation'       // Route changes
  | 'error';           // Unhandled errors

interface LogEntry {
  category: LogCategory;
  event: string;
  level?: LogLevel;
  data?: Record<string, any>;
}

interface QueuedLog extends LogEntry {
  timestamp: string;
  userId: string | null;
  device: 'iOS' | 'Android' | 'Web';
}

class RemoteLogger {
  private userId: string | null = null;
  private device: 'iOS' | 'Android' | 'Web' = 'Web';
  private queue: QueuedLog[] = [];
  private isProcessing = false;
  private isEnabled = true;

  constructor() {
    this.device = this.detectDevice();
    console.log(`[RemoteLogger] Initialized for device: ${this.device}`);
  }

  private detectDevice(): 'iOS' | 'Android' | 'Web' {
    if (Capacitor.getPlatform() === 'ios') return 'iOS';
    if (Capacitor.getPlatform() === 'android') return 'Android';
    return 'Web';
  }

  setUserId(userId: string | null) {
    const previousId = this.userId;
    this.userId = userId;
    
    if (userId && userId !== previousId) {
      this.log({ category: 'app_lifecycle', event: 'user_identified', data: { userId: userId.substring(0, 8) + '...' } });
    }
  }

  getUserId(): string | null {
    return this.userId;
  }

  getDevice(): 'iOS' | 'Android' | 'Web' {
    return this.device;
  }

  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
  }

  async log(entry: LogEntry) {
    // Always console log locally
    const prefix = `[${entry.category}:${entry.event}]`;
    const logData = entry.data ? JSON.stringify(entry.data) : '';
    
    switch (entry.level) {
      case 'error':
        console.error(prefix, logData);
        break;
      case 'warn':
        console.warn(prefix, logData);
        break;
      case 'debug':
        console.debug(prefix, logData);
        break;
      default:
        console.log(prefix, logData);
    }

    // ALWAYS send to Sentry (works on ALL platforms including iOS native!)
    try {
      const message = `[${entry.category}:${entry.event}]`;
      const sentryData = {
        category: entry.category,
        event: entry.event,
        device: this.device,
        userId: this.userId?.substring(0, 8) || 'anonymous',
        ...entry.data,
      };

      if (entry.level === 'error') {
        Sentry.captureMessage(message, {
          level: 'error',
          extra: sentryData,
        });
      } else if (entry.level === 'warn') {
        Sentry.logger.warn(message, sentryData);
      } else {
        Sentry.logger.info(message, sentryData);
      }
    } catch (sentryError) {
      // Silently fail Sentry logging to avoid infinite loops
      console.debug('[RemoteLogger] Sentry logging failed:', sentryError);
    }
    
    // Only send to Supabase remote-log if enabled and on native platform
    if (!this.isEnabled || !Capacitor.isNativePlatform()) return;

    const queuedLog: QueuedLog = {
      ...entry,
      timestamp: new Date().toISOString(),
      userId: this.userId,
      device: this.device,
    };

    this.queue.push(queuedLog);
    this.processQueue();
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.queue.length > 0) {
      const entry = this.queue.shift()!;

      try {
        await supabase.functions.invoke('remote-log', {
          body: {
            user_id: entry.userId,
            event_type: `${entry.category}:${entry.event}`,
            data: {
              ...entry.data,
              level: entry.level || 'info',
            },
            device: entry.device,
            timestamp: entry.timestamp,
          }
        });
      } catch (err) {
        // Don't log the error to avoid infinite loop
        console.error('[RemoteLogger] Failed to send log:', err);
      }
    }

    this.isProcessing = false;
  }

  // Convenience methods for common log patterns
  info(category: LogCategory, event: string, data?: Record<string, any>) {
    this.log({ category, event, level: 'info', data });
  }

  warn(category: LogCategory, event: string, data?: Record<string, any>) {
    this.log({ category, event, level: 'warn', data });
  }

  error(category: LogCategory, event: string, data?: Record<string, any>) {
    this.log({ category, event, level: 'error', data });
  }

  debug(category: LogCategory, event: string, data?: Record<string, any>) {
    this.log({ category, event, level: 'debug', data });
  }
}

// Singleton instance
export const remoteLog = new RemoteLogger();
