import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[check-missed-events] Starting missed events check...');

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().substring(0, 5); // HH:MM

    // Find events that:
    // 1. Have event_date = yesterday OR (event_date = today AND event_time has passed)
    // 2. Status is still 'pending' (not completed or cancelled)
    // 3. User has auto_reschedule_enabled
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Get users with auto_reschedule enabled
    const { data: eligibleProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, language, auto_reschedule_enabled')
      .eq('auto_reschedule_enabled', true);

    if (profileError) {
      console.error('[check-missed-events] Error fetching profiles:', profileError);
      throw profileError;
    }

    let suggestionsCreated = 0;

    for (const profile of eligibleProfiles || []) {
      // Find missed events for this user
      // Events from yesterday that weren't completed
      const { data: missedEvents, error: eventsError } = await supabase
        .from('events')
        .select('id, title, event_date, event_time, category, emoji, description')
        .eq('user_id', profile.id)
        .eq('status', 'pending')
        .or(`event_date.eq.${yesterdayStr},and(event_date.eq.${today},event_time.lt.${currentTime})`)
        .order('event_date', { ascending: false })
        .limit(3); // Max 3 suggestions at a time

      if (eventsError) {
        console.error(`[check-missed-events] Error fetching events for user ${profile.id}:`, eventsError);
        continue;
      }

      if (!missedEvents || missedEvents.length === 0) {
        continue; // No missed events
      }

      // Check if we already sent a reschedule suggestion recently (last 24h)
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentSuggestions } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('user_id', profile.id)
        .eq('role', 'assistant')
        .gte('created_at', oneDayAgo)
        .contains('metadata', { type: 'reschedule_suggestion' })
        .limit(1);

      if (recentSuggestions && recentSuggestions.length > 0) {
        console.log(`[check-missed-events] Already sent suggestion to user ${profile.id} recently`);
        continue;
      }

      // Generate reschedule suggestion message
      const language = profile.language || 'pt-BR';
      const event = missedEvents[0]; // Focus on the most recent missed event
      
      const messages: Record<string, string> = {
        'pt-BR': `Opa! Vi que "${event.title}" ficou para trás ${event.event_date === yesterdayStr ? 'ontem' : 'mais cedo'}. Quer que eu reagende para amanhã no mesmo horário? 📅`,
        'en-US': `Hey! I noticed "${event.title}" was missed ${event.event_date === yesterdayStr ? 'yesterday' : 'earlier'}. Want me to reschedule it for tomorrow at the same time? 📅`,
        'es-ES': `¡Ey! Vi que "${event.title}" quedó atrás ${event.event_date === yesterdayStr ? 'ayer' : 'más temprano'}. ¿Quieres que lo reprograme para mañana a la misma hora? 📅`,
      };

      const suggestionMessage = messages[language] || messages['pt-BR'];

      // Save the suggestion as a chat message
      const { error: chatError } = await supabase
        .from('chat_messages')
        .insert({
          user_id: profile.id,
          role: 'assistant',
          content: suggestionMessage,
          metadata: {
            type: 'reschedule_suggestion',
            missedEventId: event.id,
            missedEventTitle: event.title,
            originalDate: event.event_date,
            originalTime: event.event_time,
          }
        });

      if (chatError) {
        console.error(`[check-missed-events] Error saving chat message for user ${profile.id}:`, chatError);
      } else {
        suggestionsCreated++;
        console.log(`[check-missed-events] Sent reschedule suggestion to user ${profile.id} for event "${event.title}"`);
      }

      // Mark the event as 'missed' so we don't suggest it again
      await supabase
        .from('events')
        .update({ status: 'missed' })
        .eq('id', event.id);
    }

    console.log(`[check-missed-events] Completed. Created ${suggestionsCreated} reschedule suggestions.`);

    return new Response(
      JSON.stringify({ success: true, suggestionsCreated }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[check-missed-events] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
