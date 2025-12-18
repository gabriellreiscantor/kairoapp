import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProfileData {
  fcm_token: string | null;
  display_name: string | null;
}

interface EventRow {
  id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  location: string | null;
  user_id: string;
  profiles: ProfileData | ProfileData[] | null;
}

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
      .select(`
        id,
        title,
        event_date,
        event_time,
        location,
        user_id,
        profiles!events_user_id_fkey (
          fcm_token,
          display_name
        )
      `)
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

    for (const event of (events as EventRow[]) || []) {
      try {
        // Combine date and time to create full datetime
        const eventDateTime = new Date(`${event.event_date}T${event.event_time}`);
        
        // Check if event is within our target window (55-65 minutes from now)
        if (eventDateTime >= targetTimeMin && eventDateTime <= targetTimeMax) {
          // Handle profiles being array or single object from Supabase join
          const profile = Array.isArray(event.profiles) ? event.profiles[0] : event.profiles;
          const fcmToken = profile?.fcm_token;
          
          if (!fcmToken) {
            console.log(`User ${event.user_id} has no FCM token, skipping event ${event.id}`);
            continue;
          }

          console.log(`Sending push for event: ${event.title} at ${event.event_time}`);

          // Format time for display
          const timeDisplay = event.event_time?.slice(0, 5) || '';

          // Send push notification via send-push-notification function
          const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
            body: {
              user_id: event.user_id,
              title: '📞 Me Ligue - Kairo',
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

          // Mark event as notified
          const { error: updateError } = await supabase
            .from('events')
            .update({ call_alert_sent_at: new Date().toISOString() })
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
