import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { fromZonedTime } from 'https://esm.sh/date-fns-tz@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Convert event time from user's timezone to UTC for comparison
 * Uses date-fns-tz for FULL DST support - 100% reliable worldwide
 */
function convertEventToUTC(
  eventDate: string, 
  eventTime: string, 
  userTimezone: string
): Date {
  // Parse date and time components
  const [year, month, day] = eventDate.split('-').map(Number);
  const [hours, minutes] = (eventTime || '00:00').split(':').map(Number);
  
  // Create a Date object representing the local time in the user's timezone
  // Note: This creates a Date as if it were in the local timezone of the server,
  // but fromZonedTime will correctly interpret it as being in userTimezone
  const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
  
  try {
    // fromZonedTime (formerly zonedTimeToUtc in v2) converts a date that represents
    // a time in a specific timezone to the equivalent UTC time
    // This correctly handles DST transitions!
    const utcDate = fromZonedTime(localDate, userTimezone);
    
    console.log(`[date-fns-tz] ${eventDate} ${eventTime} in ${userTimezone} -> ${utcDate.toISOString()} UTC`);
    
    return utcDate;
  } catch (error) {
    console.error(`Error converting timezone ${userTimezone} with date-fns-tz:`, error);
    // Fallback: assume the timezone is America/Sao_Paulo (UTC-3)
    const fallbackOffset = 3 * 60 * 60 * 1000; // UTC-3 means we ADD 3 hours to get UTC
    const utcFallback = new Date(localDate.getTime() + fallbackOffset);
    console.log(`[fallback] ${eventDate} ${eventTime} -> ${utcFallback.toISOString()} UTC (assumed -03:00)`);
    return utcFallback;
  }
}

// Multilingual alert messages for Me Ligue (call alerts)
const alertMessages: Record<string, { startsIn: string; at: string }> = {
  // Portuguese
  'pt-BR': { startsIn: 'Começa em 15 minutos', at: 'às' },
  'pt': { startsIn: 'Começa em 15 minutos', at: 'às' },
  // English
  'en-US': { startsIn: 'Starts in 15 minutes', at: 'at' },
  'en': { startsIn: 'Starts in 15 minutes', at: 'at' },
  // Spanish
  'es-ES': { startsIn: 'Comienza en 15 minutos', at: 'a las' },
  'es': { startsIn: 'Comienza en 15 minutos', at: 'a las' },
  // French
  'fr-FR': { startsIn: 'Commence dans 15 minutes', at: 'à' },
  'fr': { startsIn: 'Commence dans 15 minutes', at: 'à' },
  // German
  'de-DE': { startsIn: 'Beginnt in 15 Minuten', at: 'um' },
  'de': { startsIn: 'Beginnt in 15 Minuten', at: 'um' },
  // Italian
  'it-IT': { startsIn: 'Inizia tra 15 minuti', at: 'alle' },
  'it': { startsIn: 'Inizia tra 15 minuti', at: 'alle' },
  // Japanese - oriental languages don't use "at" preposition
  'ja-JP': { startsIn: '15分後に始まります', at: '' },
  'ja': { startsIn: '15分後に始まります', at: '' },
  // Korean
  'ko-KR': { startsIn: '15분 후 시작', at: '' },
  'ko': { startsIn: '15분 후 시작', at: '' },
  // Chinese (Simplified)
  'zh-CN': { startsIn: '15分钟后开始', at: '' },
  'zh': { startsIn: '15分钟后开始', at: '' },
};

function getAlertMessages(language: string | null): { startsIn: string; at: string } {
  if (!language) return alertMessages['pt-BR'];
  if (alertMessages[language]) return alertMessages[language];
  // Try base language (e.g., 'pt' from 'pt-BR')
  const baseLanguage = language.split('-')[0];
  if (alertMessages[baseLanguage]) return alertMessages[baseLanguage];
  return alertMessages['pt-BR']; // Default fallback
}

// Creative titles for push notifications (Me Notifique)
const pushNotificationTitles: Record<string, string[]> = {
  'pt-BR': [
    'NÃO VÁ SE ATRASAR! ⏰',
    'HORA DE SE PREPARAR! 🚀',
    'LEMBRETE IMPORTANTE! 📢',
    'NÃO ESQUEÇA! 💡',
    'ATENÇÃO! ⚠️',
    'É AGORA! 🔔',
    'PREPARE-SE! 🎯',
  ],
  'en': [
    "DON'T BE LATE! ⏰",
    'TIME TO GET READY! 🚀',
    'IMPORTANT REMINDER! 📢',
    "DON'T FORGET! 💡",
    'HEADS UP! ⚠️',
    "IT'S TIME! 🔔",
    'GET READY! 🎯',
  ],
  'es': [
    '¡NO LLEGUES TARDE! ⏰',
    '¡HORA DE PREPARARTE! 🚀',
    '¡RECORDATORIO IMPORTANTE! 📢',
    '¡NO OLVIDES! 💡',
    '¡ATENCIÓN! ⚠️',
    '¡ES AHORA! 🔔',
    '¡PREPÁRATE! 🎯',
  ],
};

function getRandomPushTitle(language: string | null): string {
  const lang = language?.split('-')[0] || 'pt';
  const titles = pushNotificationTitles[lang] || pushNotificationTitles['pt-BR'];
  return titles[Math.floor(Math.random() * titles.length)];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Time window: check for events where call_alert_scheduled_at is within the next 5 minutes
    const now = new Date();
    const targetTimeMaxUTC = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now

    console.log(`Server time (UTC): ${now.toISOString()}`);
    console.log(`Checking for events with call_alert_scheduled_at <= ${targetTimeMaxUTC.toISOString()} (UTC)`);

    // ===== PART 1: ME LIGUE (Call Alerts) =====
    
    // Query 1: Events with call_alert_scheduled_at set (normal flow)
    const { data: eventsWithSchedule, error: eventsError1 } = await supabase
      .from('events')
      .select('id, title, event_date, event_time, location, user_id, emoji, call_alert_scheduled_at')
      .eq('call_alert_enabled', true)
      .is('call_alert_sent_at', null)
      .not('event_time', 'is', null)
      .not('call_alert_scheduled_at', 'is', null)
      .lte('call_alert_scheduled_at', targetTimeMaxUTC.toISOString());

    if (eventsError1) {
      console.error('Error fetching events with schedule:', eventsError1);
      throw eventsError1;
    }

    // Query 2: Events WITHOUT call_alert_scheduled_at (fallback - legacy events or toggle on frontend)
    // These need dynamic calculation based on event time
    const { data: eventsWithoutSchedule, error: eventsError2 } = await supabase
      .from('events')
      .select('id, title, event_date, event_time, location, user_id, emoji, call_alert_scheduled_at')
      .eq('call_alert_enabled', true)
      .is('call_alert_sent_at', null)
      .not('event_time', 'is', null)
      .is('call_alert_scheduled_at', null);

    if (eventsError2) {
      console.error('Error fetching events without schedule:', eventsError2);
      throw eventsError2;
    }

    // Filter fallback events: calculate their scheduled time and check if within window
    const fallbackEvents: typeof eventsWithSchedule = [];
    
    for (const event of eventsWithoutSchedule || []) {
      // Get user timezone for this event
      const { data: profile } = await supabase
        .from('profiles')
        .select('timezone')
        .eq('id', event.user_id)
        .maybeSingle();
      
      const userTimezone = profile?.timezone || 'America/Sao_Paulo';
      
      // Calculate when the call should happen
      const eventUTC = convertEventToUTC(event.event_date, event.event_time!, userTimezone);
      const diffMinutes = Math.floor((eventUTC.getTime() - now.getTime()) / (1000 * 60));
      
      // Calculate alert minutes (same logic as frontend)
      let alertMinutes: number;
      if (diffMinutes <= 2) continue; // Too close, skip
      else if (diffMinutes <= 5) alertMinutes = 2;
      else if (diffMinutes <= 15) alertMinutes = 5;
      else if (diffMinutes <= 30) alertMinutes = 15;
      else if (diffMinutes <= 60) alertMinutes = 30;
      else if (diffMinutes <= 120) alertMinutes = 60;
      else alertMinutes = 60;
      
      const calculatedScheduledAt = new Date(eventUTC.getTime() - alertMinutes * 60 * 1000);
      
      // Check if this calculated time is within our window
      if (calculatedScheduledAt <= targetTimeMaxUTC && calculatedScheduledAt >= now) {
        console.log(`[fallback] Event "${event.title}" calculated call at ${calculatedScheduledAt.toISOString()} (${alertMinutes}min before event)`);
        
        // Update the event with the calculated scheduled time for future runs
        await supabase
          .from('events')
          .update({ call_alert_scheduled_at: calculatedScheduledAt.toISOString() })
          .eq('id', event.id);
        
        // Add to processing list
        fallbackEvents.push({
          ...event,
          call_alert_scheduled_at: calculatedScheduledAt.toISOString()
        });
      }
    }

    // Combine both lists for Me Ligue
    const callAlertEvents = [...(eventsWithSchedule || []), ...fallbackEvents];

    console.log(`Found ${callAlertEvents?.length || 0} events ready for call alerts (${eventsWithSchedule?.length || 0} scheduled + ${fallbackEvents.length} fallback)`)

    const notificationsSent: string[] = [];
    const errors: string[] = [];

    for (const event of callAlertEvents || []) {
      try {
        // OPTIMISTIC LOCK: Check if already being processed by another instance
        // This prevents race conditions that cause duplicate cards
        const { data: lockCheck, error: lockError } = await supabase
          .from('events')
          .select('call_alert_sent_at')
          .eq('id', event.id)
          .maybeSingle();
        
        if (lockError) {
          console.error(`Error checking lock for event ${event.id}:`, lockError);
          continue;
        }
        
        // If already sent (by another instance), skip
        if (lockCheck?.call_alert_sent_at) {
          console.log(`Event ${event.id} already processed by another instance, skipping`);
          continue;
        }
        
        // IMMEDIATELY mark as being processed to prevent race conditions
        const lockTime = new Date().toISOString();
        const { error: lockSetError } = await supabase
          .from('events')
          .update({ call_alert_sent_at: lockTime })
          .eq('id', event.id)
          .is('call_alert_sent_at', null); // Only update if still null (atomic check)
        
        if (lockSetError) {
          console.error(`Error setting lock for event ${event.id}:`, lockSetError);
          continue;
        }
        
        // Verify lock was acquired (another instance might have gotten it first)
        const { data: lockVerify } = await supabase
          .from('events')
          .select('call_alert_sent_at')
          .eq('id', event.id)
          .maybeSingle();
        
        if (lockVerify?.call_alert_sent_at !== lockTime) {
          console.log(`Event ${event.id} lock acquired by another instance (${lockVerify?.call_alert_sent_at} vs ${lockTime}), skipping`);
          continue;
        }
        
        console.log(`Lock acquired for event ${event.id} at ${lockTime}`);

        // Fetch user profile with notification preferences, timezone and language
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('fcm_token, display_name, push_enabled, call_enabled, critical_alerts_enabled, timezone, font_preference')
          .eq('id', event.user_id)
          .maybeSingle();
        
        // Get user language from chat_messages or use default
        const { data: lastMessage } = await supabase
          .from('chat_messages')
          .select('metadata')
          .eq('user_id', event.user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        const userLanguage = (lastMessage?.metadata as any)?.language || 'pt-BR';

        if (profileError) {
          console.error(`Error fetching profile for user ${event.user_id}:`, profileError);
          continue;
        }

        // Get user's timezone for logging
        const userTimezone = profile?.timezone || 'America/Sao_Paulo';
        
        console.log(`Event "${event.title}": scheduled call at ${event.call_alert_scheduled_at} (event: ${event.event_date} ${event.event_time})`);
        
        // Check if user has call alerts enabled in profile
        const callEnabled = profile?.call_enabled !== false; // Default true if not set
        if (!callEnabled) {
          console.log(`User ${event.user_id} has call_enabled=false, skipping event ${event.id}`);
          // Release lock since we're not processing
          await supabase.from('events').update({ call_alert_sent_at: null }).eq('id', event.id);
          continue;
        }

        const fcmToken = profile?.fcm_token;
        const pushEnabled = profile?.push_enabled !== false; // Default true if not set
        const criticalAlertsEnabled = profile?.critical_alerts_enabled !== false; // Default true if not set
        
        if (!fcmToken && pushEnabled) {
          console.log(`User ${event.user_id} has no FCM token, skipping event ${event.id}`);
          // Release lock since we can't send
          await supabase.from('events').update({ call_alert_sent_at: null }).eq('id', event.id);
          continue;
        }

        console.log(`Sending push for event: ${event.title} at ${event.event_time}`);

        // Format time for display
        const timeDisplay = event.event_time?.slice(0, 5) || '';

        // Track if VoIP was sent successfully
        let voipSentSuccessfully = false;

        // Send VoIP push for iOS CallKit (primary) - only if critical alerts enabled
        if (criticalAlertsEnabled) {
          console.log(`[VoIP] Attempting to send VoIP push for event ${event.id} (${event.title})`);
          
          try {
            const { data: voipResponse, error: voipError } = await supabase.functions.invoke('send-voip-push', {
              body: {
                user_id: event.user_id,
                event_id: event.id,
                event_title: event.title,
                event_time: event.event_time,
                event_location: event.location || '',
                event_emoji: event.emoji || '📅',
              },
            });

            console.log(`[VoIP] Response for ${event.id}:`, JSON.stringify(voipResponse));

            if (voipError) {
              console.log(`[VoIP] Push failed for ${event.id}, will try regular push as fallback:`, voipError);
            } else if (voipResponse?.success === false) {
              console.log(`[VoIP] Push returned failure for ${event.id}:`, voipResponse.error);
            } else {
              voipSentSuccessfully = true;
              console.log(`[VoIP] Push sent successfully for ${event.id}`);
              
              // Update attempts and outcome
              const { data: currentEvent } = await supabase
                .from('events')
                .select('call_alert_attempts')
                .eq('id', event.id)
                .maybeSingle();
              
              const currentAttempts = currentEvent?.call_alert_attempts || 0;
              
              await supabase
                .from('events')
                .update({ 
                  call_alert_attempts: currentAttempts + 1,
                  call_alert_outcome: 'voip_sent'
                })
                .eq('id', event.id);

              notificationsSent.push(event.id);
              
              // Insert chat message to notify user about the call (ONLY HERE - not in push section)
              const callNotificationData = {
                eventId: event.id,
                eventTitle: event.title,
                eventTime: event.event_time,
                callSentAt: lockTime,
                answered: false
              };
              
              const { error: chatError } = await supabase
                .from('chat_messages')
                .insert({
                  user_id: event.user_id,
                  role: 'assistant',
                  content: `📞 Te liguei para lembrar do evento "${event.title}"!`,
                  metadata: {
                    type: 'call_notification',
                    callNotificationData
                  }
                });
              
              if (chatError) {
                console.error(`Error inserting chat message for event ${event.id}:`, chatError);
              } else {
                console.log(`Chat message inserted for call notification of event ${event.id}`);
              }
            }
          } catch (voipErr) {
            console.error(`[VoIP] Exception calling send-voip-push for ${event.id}:`, voipErr);
          }
        } else {
          console.log(`User ${event.user_id} has critical_alerts_enabled=false, skipping VoIP (will use regular push)`);
        }

        // Also send regular push as fallback for Android and web (if push enabled AND VoIP failed)
        // IMPORTANT: Only send push fallback if VoIP was NOT successful (to avoid duplicate notifications)
        if (pushEnabled && fcmToken && !voipSentSuccessfully) {
          // Get localized messages for the user
          const messages = getAlertMessages(userLanguage);
          const eventEmoji = event.emoji || '📅';
          
          // Oriental languages don't use "at" preposition - format differently
          const isOrientalLang = ['ja', 'ko', 'zh'].some(l => userLanguage.startsWith(l));
          const notificationBody = isOrientalLang 
            ? `${messages.startsIn} • ${timeDisplay}`
            : `${messages.startsIn} • ${messages.at} ${timeDisplay}`;
          
          const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
            body: {
              user_id: event.user_id,
              title: `${eventEmoji} ${event.title}`,
              body: notificationBody,
              data: {
                type: 'event-reminder',
                event_id: event.id,
                event_title: event.title,
                event_time: event.event_time,
                event_location: event.location || '',
              },
            },
          });

          if (pushError) {
            console.error(`Error sending regular push for event ${event.id}:`, pushError);
            errors.push(`Event ${event.id}: ${pushError.message}`);
            // Release lock on failure
            await supabase.from('events').update({ call_alert_sent_at: null }).eq('id', event.id);
          } else {
            console.log(`Regular push sent for event ${event.id}`);
            
            const { data: currentEvent } = await supabase
              .from('events')
              .select('call_alert_attempts')
              .eq('id', event.id)
              .maybeSingle();
            
            const currentAttempts = currentEvent?.call_alert_attempts || 0;
            
            await supabase
              .from('events')
              .update({ 
                call_alert_attempts: currentAttempts + 1,
                call_alert_outcome: 'push_sent'
              })
              .eq('id', event.id);

            notificationsSent.push(event.id);
            
            // Insert chat message for push notification (NOT a call - different card type)
            const pushNotificationData = {
              eventId: event.id,
              eventTitle: event.title,
              eventTime: event.event_time,
              notificationSentAt: lockTime
            };
            
            const { error: chatError } = await supabase
              .from('chat_messages')
              .insert({
                user_id: event.user_id,
                role: 'assistant',
                content: `🔔 Te enviei uma notificação para lembrar do evento "${event.title}"!`,
                metadata: {
                  type: 'push_notification',
                  pushNotificationData
                }
              });
            
            if (chatError) {
              console.error(`Error inserting chat message for event ${event.id}:`, chatError);
            } else {
              console.log(`Chat message inserted for push notification of event ${event.id}`);
            }
          }
        } else if (!voipSentSuccessfully && !pushEnabled) {
          console.log(`User ${event.user_id} has push_enabled=false or no FCM token, skipping regular push`);
          
          // If VoIP failed and no regular push, release lock
          if (!voipSentSuccessfully) {
            console.log(`No notification sent for event ${event.id} - no valid delivery method`);
            errors.push(`Event ${event.id}: No valid delivery method (VoIP failed, push disabled)`);
            await supabase.from('events').update({ call_alert_sent_at: null }).eq('id', event.id);
          }
        }
      } catch (eventError) {
        console.error(`Error processing event ${event.id}:`, eventError);
        errors.push(`Event ${event.id}: ${String(eventError)}`);
      }
    }

    // ===== PART 2: ME NOTIFIQUE (Push Notifications - separate from Me Ligue) =====
    
    // Query events with notification_scheduled_at set
    const { data: pushNotifEvents, error: pushNotifError } = await supabase
      .from('events')
      .select('id, title, event_date, event_time, location, user_id, emoji, notification_scheduled_at')
      .eq('notification_enabled', true)
      .is('notification_sent_at', null)
      .not('notification_scheduled_at', 'is', null)
      .lte('notification_scheduled_at', targetTimeMaxUTC.toISOString());

    if (pushNotifError) {
      console.error('Error fetching push notification events:', pushNotifError);
    } else {
      console.log(`Found ${pushNotifEvents?.length || 0} events ready for push notifications (Me Notifique)`);
      
      for (const event of pushNotifEvents || []) {
        try {
          // OPTIMISTIC LOCK for push notifications too
          const { data: lockCheck } = await supabase
            .from('events')
            .select('notification_sent_at')
            .eq('id', event.id)
            .maybeSingle();
          
          if (lockCheck?.notification_sent_at) {
            console.log(`Push notification for event ${event.id} already sent, skipping`);
            continue;
          }
          
          const lockTime = new Date().toISOString();
          await supabase
            .from('events')
            .update({ notification_sent_at: lockTime })
            .eq('id', event.id)
            .is('notification_sent_at', null);
          
          // Fetch user profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('fcm_token, push_enabled')
            .eq('id', event.user_id)
            .maybeSingle();
          
          if (!profile?.fcm_token || profile?.push_enabled === false) {
            console.log(`User ${event.user_id} cannot receive push notifications for event ${event.id}`);
            await supabase.from('events').update({ notification_sent_at: null }).eq('id', event.id);
            continue;
          }
          
          // Get user language
          const { data: lastMessage } = await supabase
            .from('chat_messages')
            .select('metadata')
            .eq('user_id', event.user_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          const userLanguage = (lastMessage?.metadata as any)?.language || 'pt-BR';
          
          // Format time
          const timeDisplay = event.event_time?.slice(0, 5) || '';
          const eventEmoji = event.emoji || '📅';
          
          // Creative title + descriptive body
          const title = getRandomPushTitle(userLanguage);
          const body = `Você tem que ${eventEmoji} ${event.title} às ${timeDisplay}`;
          
          const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
            body: {
              user_id: event.user_id,
              title,
              body,
              data: {
                type: 'event-reminder-push',
                event_id: event.id,
                event_title: event.title,
                event_time: event.event_time,
                event_location: event.location || '',
              },
            },
          });
          
          if (pushError) {
            console.error(`Error sending Me Notifique push for event ${event.id}:`, pushError);
            await supabase.from('events').update({ notification_sent_at: null }).eq('id', event.id);
            errors.push(`Push notification ${event.id}: ${pushError.message}`);
          } else {
            console.log(`Me Notifique push sent for event ${event.id}`);
            notificationsSent.push(`push-${event.id}`);
          }
        } catch (eventError) {
          console.error(`Error processing push notification for event ${event.id}:`, eventError);
          errors.push(`Push notification ${event.id}: ${String(eventError)}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notifications_sent: notificationsSent.length,
        event_ids: notificationsSent,
        errors: errors.length > 0 ? errors : undefined,
        checked_at: now.toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in check-upcoming-alerts:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
