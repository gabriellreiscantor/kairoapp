import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate time window: events happening in ~1 hour (55-65 minutes from now)
    const now = new Date();
    const targetTimeMin = new Date(now.getTime() + 55 * 60 * 1000); // 55 minutes from now
    const targetTimeMax = new Date(now.getTime() + 65 * 60 * 1000); // 65 minutes from now

    console.log(`Checking for events between ${targetTimeMin.toISOString()} and ${targetTimeMax.toISOString()}`);

    // Query events with call_alert_enabled that haven't been notified yet
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, event_date, event_time, location, user_id')
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
        // Combine date and time to create full datetime
        const eventDateTime = new Date(`${event.event_date}T${event.event_time}`);
        
        // Check if event is within our target window (55-65 minutes from now)
        if (eventDateTime >= targetTimeMin && eventDateTime <= targetTimeMax) {
          // Fetch user profile with notification preferences
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('fcm_token, display_name, push_enabled, call_enabled, critical_alerts_enabled')
            .eq('id', event.user_id)
            .maybeSingle();

          if (profileError) {
            console.error(`Error fetching profile for user ${event.user_id}:`, profileError);
            continue;
          }

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
