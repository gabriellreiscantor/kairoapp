import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Convert event time from user's timezone to UTC for comparison
 * This is critical for correct notification timing across all timezones
 */
function convertEventToUTC(
  eventDate: string, 
  eventTime: string, 
  userTimezone: string
): Date {
  // Parse date and time components
  const [year, month, day] = eventDate.split('-').map(Number);
  const [hours, minutes] = (eventTime || '00:00').split(':').map(Number);
  
  // Create a date string in the user's timezone
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
  
  try {
    // Use Intl.DateTimeFormat to get the timezone offset for the user's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    // Get the offset by comparing local time interpretation
    // Create a reference date in UTC
    const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
    
    // Format this UTC date in the user's timezone to find the offset
    const parts = formatter.formatToParts(utcDate);
    const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0');
    
    const tzYear = getPart('year');
    const tzMonth = getPart('month');
    const tzDay = getPart('day');
    const tzHour = getPart('hour');
    const tzMinute = getPart('minute');
    
    // Calculate the difference (this is the timezone offset)
    const tzDate = new Date(Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, 0, 0));
    const offsetMs = tzDate.getTime() - utcDate.getTime();
    
    // The event time in the user's timezone, converted to UTC
    // We need to subtract the offset to get UTC time
    const eventInUserTz = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
    const eventInUTC = new Date(eventInUserTz.getTime() - offsetMs);
    
    return eventInUTC;
  } catch (error) {
    console.error(`Error converting timezone ${userTimezone}:`, error);
    // Fallback: assume the timezone is America/Sao_Paulo (UTC-3)
    const fallbackOffset = -3 * 60 * 60 * 1000;
    const eventLocal = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
    return new Date(eventLocal.getTime() - fallbackOffset);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate time window: events happening in ~1 hour (55-65 minutes from now) in UTC
    const now = new Date();
    const targetTimeMinUTC = new Date(now.getTime() + 55 * 60 * 1000); // 55 minutes from now
    const targetTimeMaxUTC = new Date(now.getTime() + 65 * 60 * 1000); // 65 minutes from now

    console.log(`Server time (UTC): ${now.toISOString()}`);
    console.log(`Checking for events between ${targetTimeMinUTC.toISOString()} and ${targetTimeMaxUTC.toISOString()} (UTC)`);

    // Query events with call_alert_enabled that haven't been notified yet
    // Join with profiles to get user's timezone
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, event_date, event_time, location, user_id, emoji')
      .eq('call_alert_enabled', true)
      .is('call_alert_sent_at', null)
      .not('event_time', 'is', null);

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      throw eventsError;
    }

    console.log(`Found ${events?.length || 0} events with call_alert_enabled`);

    const notificationsSent: string[] = [];
    const errors: string[] = [];

    for (const event of events || []) {
      try {
        // Fetch user profile with notification preferences AND timezone
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('fcm_token, display_name, push_enabled, call_enabled, critical_alerts_enabled, timezone')
          .eq('id', event.user_id)
          .maybeSingle();

        if (profileError) {
          console.error(`Error fetching profile for user ${event.user_id}:`, profileError);
          continue;
        }

        // Get user's timezone (default to America/Sao_Paulo if not set)
        const userTimezone = profile?.timezone || 'America/Sao_Paulo';
        
        // Convert event time from user's timezone to UTC for comparison
        const eventDateTimeUTC = convertEventToUTC(
          event.event_date,
          event.event_time,
          userTimezone
        );
        
        console.log(`Event "${event.title}": ${event.event_date} ${event.event_time} in ${userTimezone} = ${eventDateTimeUTC.toISOString()} UTC`);
        
        // Check if event is within our target window (55-65 minutes from now) in UTC
        if (eventDateTimeUTC >= targetTimeMinUTC && eventDateTimeUTC <= targetTimeMaxUTC) {
          console.log(`Event "${event.title}" is within notification window!`);

          // Check if user has call alerts enabled
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

          // Send VoIP push for iOS CallKit (primary) - only if critical alerts enabled
          // VoIP calls ignore silent mode, so we only send if user wants that behavior
          if (criticalAlertsEnabled) {
            const { error: voipError } = await supabase.functions.invoke('send-voip-push', {
              body: {
                user_id: event.user_id,
                event_id: event.id,
                event_title: event.title,
                event_time: event.event_time,
                event_location: event.location || '',
                event_emoji: '📅',
              },
            });

            if (voipError) {
              console.log(`VoIP push failed for ${event.id}, falling back to regular push:`, voipError);
            }
          } else {
            console.log(`User ${event.user_id} has critical_alerts_enabled=false, skipping VoIP (will use regular push)`);
          }

          // Also send regular push as fallback for Android and web (if push enabled)
          if (pushEnabled && fcmToken) {
            const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
              body: {
                user_id: event.user_id,
                title: '📞 Me Ligue - Horah',
                body: `${event.title} às ${timeDisplay}`,
                data: {
                  type: 'call-alert',
                  event_id: event.id,
                  event_title: event.title,
                  event_time: event.event_time,
                  event_location: event.location || '',
                },
              },
            });

            if (pushError) {
              console.error(`Error sending push for event ${event.id}:`, pushError);
              errors.push(`Event ${event.id}: ${pushError.message}`);
              continue;
            }
          } else {
            console.log(`User ${event.user_id} has push_enabled=false or no FCM token, skipping regular push`);
          }

          // Mark event as notified and increment attempts
          // Get current attempts count first
          const { data: currentEvent } = await supabase
            .from('events')
            .select('call_alert_attempts')
            .eq('id', event.id)
            .maybeSingle();
          
          const currentAttempts = currentEvent?.call_alert_attempts || 0;
          
          const { error: updateError } = await supabase
            .from('events')
            .update({ 
              call_alert_sent_at: new Date().toISOString(),
              call_alert_attempts: currentAttempts + 1,
              call_alert_outcome: 'sent' // Will be updated by client when answered/missed
            })
            .eq('id', event.id);

          if (updateError) {
            console.error(`Error updating event ${event.id}:`, updateError);
            errors.push(`Event ${event.id} update: ${updateError.message}`);
          } else {
            notificationsSent.push(event.id);
            console.log(`Successfully sent notification for event ${event.id}`);
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
