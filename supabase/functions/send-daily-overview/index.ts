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
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    console.log('[send-daily-overview] Starting daily overview generation...');

    // Get current hour in UTC (CRON runs in UTC)
    const now = new Date();
    const currentHourUTC = now.getUTCHours();
    
    // Find users who have daily overview enabled and it's their preferred hour
    // We need to consider timezone offsets for Brazilian users (UTC-3)
    // If it's 10:00 UTC, it's 07:00 in Brazil, so users with hour=7 should receive
    const { data: eligibleProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, language, timezone')
      .not('id', 'is', null);

    if (profileError) {
      console.error('[send-daily-overview] Error fetching profiles:', profileError);
      throw profileError;
    }

    // Get plan limits to check which plans have daily overview
    const { data: planLimits } = await supabase
      .from('plan_limits')
      .select('plan, has_daily_overview')
      .eq('has_daily_overview', true);

    const plansWithDailyOverview = planLimits?.map(p => p.plan) || ['plus', 'super'];
    console.log('[send-daily-overview] Plans with daily overview:', plansWithDailyOverview);

    let overviewsSent = 0;
    const today = now.toISOString().split('T')[0];

    for (const profile of eligibleProfiles || []) {
      // Check user's subscription
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('plan')
        .eq('user_id', profile.id)
        .maybeSingle();

      const userPlan = subscription?.plan || 'free';
      
      if (!plansWithDailyOverview.includes(userPlan)) {
        console.log(`[send-daily-overview] Skipping user ${profile.id} - plan ${userPlan} doesn't have daily overview`);
        continue; // Skip users without daily overview feature
      }
      
      console.log(`[send-daily-overview] Processing user ${profile.id} with plan ${userPlan} (has daily overview)`);
      

      // Calculate if it's the right hour for this user (default 7:00 AM)
      const userTimezone = profile.timezone || 'America/Sao_Paulo';
      let offsetHours = -3; // Default to Brazil
      
      if (userTimezone.includes('America/Sao_Paulo') || userTimezone.includes('Brazil')) {
        offsetHours = -3;
      } else if (userTimezone.includes('America/New_York')) {
        offsetHours = -5;
      } else if (userTimezone.includes('Europe')) {
        offsetHours = 1;
      }
      
      const userCurrentHour = (currentHourUTC + offsetHours + 24) % 24;
      const preferredHour = 7; // Fixed at 7 AM for daily overview
      
      if (userCurrentHour !== preferredHour) {
        continue; // Not the right hour for this user
      }

      // Get today's events for this user
      const { data: todayEvents, error: eventsError } = await supabase
        .from('events')
        .select('title, event_time, duration_minutes, location, category, emoji')
        .eq('user_id', profile.id)
        .eq('event_date', today)
        .order('event_time', { ascending: true, nullsFirst: false });

      if (eventsError) {
        console.error(`[send-daily-overview] Error fetching events for user ${profile.id}:`, eventsError);
        continue;
      }

      if (!todayEvents || todayEvents.length === 0) {
        console.log(`[send-daily-overview] No events today for user ${profile.id}`);
        continue; // No events, no overview needed
      }

      // Generate personalized overview message
      const language = profile.language || 'pt-BR';
      let overviewMessage = '';

      if (OPENAI_API_KEY && todayEvents.length >= 1) {
        // Use AI to generate a friendly overview
        const eventsText = todayEvents.map((e, i) => {
          const time = e.event_time ? e.event_time.substring(0, 5) : 'Dia inteiro';
          return `${i + 1}. ${time} - ${e.title}${e.location ? ` (${e.location})` : ''}`;
        }).join('\n');

        const systemPrompt = `Você é o Horah, um assistente de agenda amigável. Gere uma mensagem de bom dia com resumo dos eventos do dia.

REGRAS:
- Seja amigável e motivador
- Use linguagem casual brasileira
- Mencione quantos eventos tem no dia
- Liste os eventos com horários
- Termine com uma frase motivacional curta
- Máximo 150 palavras
- Use emojis relacionados aos eventos

Idioma: ${language}`;

        const userPrompt = `Eventos de hoje:\n${eventsText}`;

        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
              ],
            }),
          });

          if (response.ok) {
            const data = await response.json();
            overviewMessage = data.choices?.[0]?.message?.content || '';
          }
        } catch (aiError) {
          console.error('[send-daily-overview] AI error:', aiError);
        }
      }

      // Fallback if AI failed
      if (!overviewMessage) {
        const greetings: Record<string, string> = {
          'pt-BR': `Bom dia! 🌅 Você tem ${todayEvents.length} compromisso${todayEvents.length > 1 ? 's' : ''} hoje:\n\n`,
          'en-US': `Good morning! 🌅 You have ${todayEvents.length} appointment${todayEvents.length > 1 ? 's' : ''} today:\n\n`,
          'es-ES': `¡Buenos días! 🌅 Tienes ${todayEvents.length} compromiso${todayEvents.length > 1 ? 's' : ''} hoy:\n\n`,
        };
        
        overviewMessage = greetings[language] || greetings['pt-BR'];
        
        for (const event of todayEvents) {
          const time = event.event_time ? event.event_time.substring(0, 5) : (language === 'en-US' ? 'All day' : 'Dia inteiro');
          const emoji = event.emoji || '📅';
          overviewMessage += `${emoji} ${time} - ${event.title}\n`;
        }
        
        const motivations: Record<string, string[]> = {
          'pt-BR': ['\n💪 Vai ser um ótimo dia!', '\n✨ Bora arrasar!', '\n🚀 Sucesso nos compromissos!'],
          'en-US': ['\n💪 Have a great day!', '\n✨ Let\'s rock it!', '\n🚀 Good luck!'],
          'es-ES': ['\n💪 ¡Será un gran día!', '\n✨ ¡Vamos!', '\n🚀 ¡Éxito!'],
        };
        const motivList = motivations[language] || motivations['pt-BR'];
        overviewMessage += motivList[Math.floor(Math.random() * motivList.length)];
      }

      // Save the overview as a chat message from assistant
      const { error: chatError } = await supabase
        .from('chat_messages')
        .insert({
          user_id: profile.id,
          role: 'assistant',
          content: overviewMessage,
          metadata: {
            type: 'daily_overview',
            eventsCount: todayEvents.length,
            date: today,
            plan: userPlan,
          }
        });

      if (chatError) {
        console.error(`[send-daily-overview] Error saving chat message for user ${profile.id}:`, chatError);
      } else {
        overviewsSent++;
        console.log(`[send-daily-overview] Sent overview to user ${profile.id} (${userPlan}) with ${todayEvents.length} events`);
      }

      // Also send push notification if user has FCM token
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('fcm_token, display_name')
        .eq('id', profile.id)
        .single();

      if (userProfile?.fcm_token) {
        try {
          const pushTitle = language === 'en-US' ? '📅 Your Day Today' :
                           language === 'es-ES' ? '📅 Tu Día de Hoy' :
                           '📅 Seu Dia Hoje';
          
          const pushBody = language === 'en-US' 
            ? `You have ${todayEvents.length} appointment${todayEvents.length > 1 ? 's' : ''} today. Check your schedule!`
            : language === 'es-ES'
            ? `Tienes ${todayEvents.length} compromiso${todayEvents.length > 1 ? 's' : ''} hoy. ¡Revisa tu agenda!`
            : `Você tem ${todayEvents.length} compromisso${todayEvents.length > 1 ? 's' : ''} hoje. Confira sua agenda!`;

          await supabase.functions.invoke('send-push-notification', {
            body: {
              fcm_token: userProfile.fcm_token,
              title: pushTitle,
              body: pushBody,
              data: { type: 'daily_overview', date: today }
            }
          });
          
          console.log(`[send-daily-overview] Push notification sent to user ${profile.id}`);
        } catch (pushError) {
          console.error(`[send-daily-overview] Error sending push to user ${profile.id}:`, pushError);
        }
      }
    }

    console.log(`[send-daily-overview] Completed. Sent ${overviewsSent} overviews.`);

    return new Response(
      JSON.stringify({ success: true, overviewsSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-daily-overview] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
