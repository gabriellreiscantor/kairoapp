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

// Multilingual alert messages
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

    // Query events with call_alert_enabled that haven't been notified yet
    // Now uses call_alert_scheduled_at for precise timing
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, event_date, event_time, location, user_id, emoji, call_alert_scheduled_at')
      .eq('call_alert_enabled', true)
      .is('call_alert_sent_at', null)
      .not('event_time', 'is', null)
      .not('call_alert_scheduled_at', 'is', null)
      .lte('call_alert_scheduled_at', targetTimeMaxUTC.toISOString());

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      throw eventsError;
    }

    console.log(`Found ${events?.length || 0} events ready for call alerts`);

    const notificationsSent: string[] = [];
    const errors: string[] = [];

    for (const event of events || []) {
      try {
        // Fetch user profile with notification preferences AND timezone
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
          continue;
        }

        const fcmToken = profile?.fcm_token;
        const pushEnabled = profile?.push_enabled !== false; // Default true if not set
        const criticalAlertsEnabled = profile?.critical_alerts_enabled !== false; // Default true if not set
        
        if (!fcmToken && pushEnabled) {
          console.log(`User ${event.user_id} has no FCM token, skipping event ${event.id}`);
          continue;
        }

        console.log(`Sending push for event: ${event.title} at ${event.event_time}`);

        // Format time for display
        const timeDisplay = event.event_time?.slice(0, 5) || '';

        // Track if VoIP was sent successfully
        let voipSentSuccessfully = false;
        let alreadyMarkedAsSent = false;

        // Send VoIP push for iOS CallKit (primary) - only if critical alerts enabled
        if (criticalAlertsEnabled) {
          const { error: voipError } = await supabase.functions.invoke('send-voip-push', {
            body: {
              user_id: event.user_id,
              event_id: event.id,
              event_title: event.title,
              event_time: event.event_time,
              event_location: event.location || '',
              event_emoji: event.emoji || '📅',
            },
          });

          if (voipError) {
            console.log(`VoIP push failed for ${event.id}, will try regular push as fallback:`, voipError);
          } else {
            voipSentSuccessfully = true;
            console.log(`VoIP push sent successfully for ${event.id}, marking as sent IMMEDIATELY`);
            
            // IMMEDIATELY mark as sent after VoIP success to prevent duplicate calls
            const { data: currentEvent } = await supabase
              .from('events')
              .select('call_alert_attempts')
              .eq('id', event.id)
              .maybeSingle();
            
            const currentAttempts = currentEvent?.call_alert_attempts || 0;
            const callSentAt = new Date().toISOString();
            
            const { error: updateError } = await supabase
              .from('events')
              .update({ 
                call_alert_sent_at: callSentAt,
                call_alert_attempts: currentAttempts + 1,
                call_alert_outcome: 'voip_sent'
              })
              .eq('id', event.id);

            if (updateError) {
              console.error(`Error updating event ${event.id} after VoIP:`, updateError);
              errors.push(`Event ${event.id} update: ${updateError.message}`);
            } else {
              alreadyMarkedAsSent = true;
              notificationsSent.push(event.id);
              console.log(`Successfully marked event ${event.id} as sent after VoIP`);
              
              // Insert chat message to notify user about the call
              const callNotificationData = {
                eventId: event.id,
                eventTitle: event.title,
                eventTime: event.event_time,
                callSentAt,
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
          }
        } else {
          console.log(`User ${event.user_id} has critical_alerts_enabled=false, skipping VoIP (will use regular push)`);
        }

        // Also send regular push as fallback for Android and web (if push enabled)
        // This runs regardless of VoIP success to support non-iOS devices
        if (pushEnabled && fcmToken) {
          // Mark as VoIP fallback if VoIP was attempted but failed
          const isVoipFallback = criticalAlertsEnabled && !voipSentSuccessfully;
          
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
                type: 'call-alert',
                event_id: event.id,
                event_title: event.title,
                event_time: event.event_time,
                event_location: event.location || '',
                // Flag to indicate VoIP failed and this is a fallback
                is_voip_fallback: isVoipFallback ? 'true' : 'false',
              },
            },
          });

          if (pushError) {
            console.error(`Error sending regular push for event ${event.id}:`, pushError);
            // Don't continue here - VoIP might have worked
            if (!voipSentSuccessfully) {
              errors.push(`Event ${event.id}: ${pushError.message}`);
            }
          } else {
            console.log(`Regular push sent for event ${event.id}`);
          }

          // Only mark as sent here if VoIP didn't already mark it
          if (!alreadyMarkedAsSent && !pushError) {
            const { data: currentEvent } = await supabase
              .from('events')
              .select('call_alert_attempts')
              .eq('id', event.id)
              .maybeSingle();
            
            const currentAttempts = currentEvent?.call_alert_attempts || 0;
            const callSentAt = new Date().toISOString();
            
            const { error: updateError } = await supabase
              .from('events')
              .update({ 
                call_alert_sent_at: callSentAt,
                call_alert_attempts: currentAttempts + 1,
                call_alert_outcome: 'push_sent'
              })
              .eq('id', event.id);

            if (updateError) {
              console.error(`Error updating event ${event.id} after push:`, updateError);
              errors.push(`Event ${event.id} update: ${updateError.message}`);
            } else {
              notificationsSent.push(event.id);
              console.log(`Successfully marked event ${event.id} as sent after regular push`);
              
              // Insert chat message to notify user about the push notification
              const callNotificationData = {
                eventId: event.id,
                eventTitle: event.title,
                eventTime: event.event_time,
                callSentAt,
                answered: false
              };
              
              const { error: chatError } = await supabase
                .from('chat_messages')
                .insert({
                  user_id: event.user_id,
                  role: 'assistant',
                  content: `📞 Te enviei uma notificação para lembrar do evento "${event.title}"!`,
                  metadata: {
                    type: 'call_notification',
                    callNotificationData
                  }
                });
              
              if (chatError) {
                console.error(`Error inserting chat message for event ${event.id}:`, chatError);
              } else {
                console.log(`Chat message inserted for push notification of event ${event.id}`);
              }
            }
          }
        } else {
          console.log(`User ${event.user_id} has push_enabled=false or no FCM token, skipping regular push`);
          
          // If VoIP failed and no regular push, mark as failed
          if (!voipSentSuccessfully && !alreadyMarkedAsSent) {
            console.log(`No notification sent for event ${event.id} - no valid delivery method`);
            errors.push(`Event ${event.id}: No valid delivery method (VoIP failed, push disabled)`);
          }
        }
      } catch (eventError) {
        console.error(`Error processing event ${event.id}:`, eventError);
        errors.push(`Event ${event.id}: ${String(eventError)}`);
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
