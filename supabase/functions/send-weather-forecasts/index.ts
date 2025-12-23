import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/**
 * Send Weather Forecasts Cron Job
 * 
 * This function is called by a cron job every hour.
 * It checks all users with weather_forecast_enabled=true and:
 * 1. Checks if the current hour matches the user's configured weather_forecast_hour
 * 2. Gets the user's location (lat/lon from profile)
 * 3. Fetches weather data
 * 4. Creates a chat message with the forecast
 * 5. Sends a push notification
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('[send-weather-forecasts] Starting cron job at', new Date().toISOString());

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all users with weather forecast enabled and location configured
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, timezone, weather_forecast_hour, last_weather_forecast_at, fcm_token, user_latitude, user_longitude, user_city')
      .eq('weather_forecast_enabled', true)
      .not('user_latitude', 'is', null)
      .not('user_longitude', 'is', null);

    if (usersError) {
      console.error('[send-weather-forecasts] Error fetching users:', usersError);
      throw usersError;
    }

    console.log(`[send-weather-forecasts] Found ${users?.length || 0} users with forecasts enabled`);

    const now = new Date();
    const processedUsers: string[] = [];
    const errors: { userId: string; error: string }[] = [];

    for (const user of users || []) {
      try {
        const userTimezone = user.timezone || 'America/Sao_Paulo';
        
        // Get current time in user's timezone
        const userLocalTime = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
        const userHour = userLocalTime.getHours();

        // Check if current hour matches user's configured hour
        const userConfiguredHour = user.weather_forecast_hour ?? 7;
        if (userHour !== userConfiguredHour) {
          continue;
        }

        // Check if forecast was already sent today
        if (user.last_weather_forecast_at) {
          const lastForecastDate = new Date(user.last_weather_forecast_at);
          const lastForecastLocalDate = new Date(lastForecastDate.toLocaleString('en-US', { timeZone: userTimezone }));
          
          // If last forecast was sent today, skip
          if (
            lastForecastLocalDate.getFullYear() === userLocalTime.getFullYear() &&
            lastForecastLocalDate.getMonth() === userLocalTime.getMonth() &&
            lastForecastLocalDate.getDate() === userLocalTime.getDate()
          ) {
            console.log(`[send-weather-forecasts] User ${user.id} already received forecast today, skipping`);
            continue;
          }
        }

        console.log(`[send-weather-forecasts] Generating forecast for user ${user.id}`);

        // Detect user's language from their chat messages
        const { data: lastMessage } = await supabase
          .from('chat_messages')
          .select('metadata')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const language = lastMessage?.metadata?.language || 'pt-BR';

        // Fetch weather data
        const weatherResponse = await fetch(`${SUPABASE_URL}/functions/v1/get-weather-forecast`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ 
            latitude: user.user_latitude,
            longitude: user.user_longitude,
            timezone: userTimezone
          }),
        });

        if (!weatherResponse.ok) {
          const errorText = await weatherResponse.text();
          console.error(`[send-weather-forecasts] Failed to get weather for ${user.id}:`, errorText);
          errors.push({ userId: user.id, error: errorText });
          continue;
        }

        const weatherData = await weatherResponse.json();
        
        if (!weatherData.forecast) {
          console.error(`[send-weather-forecasts] No forecast data for ${user.id}`);
          continue;
        }

        console.log(`[send-weather-forecasts] Weather fetched for ${user.id}:`, weatherData.forecast.temperature);

        // Add city to forecast data
        const forecastWithCity = {
          ...weatherData.forecast,
          city: user.user_city || 'Sua cidade'
        };

        // Create chat message with the forecast
        const assistantMessage = getForecastArrivalMessage(language);
        
        const messageMetadata = {
          language,
          action: 'previsao_tempo',
          weatherData: forecastWithCity
        };

        // Insert assistant message
        const { error: messageError } = await supabase
          .from('chat_messages')
          .insert({
            user_id: user.id,
            role: 'assistant',
            content: assistantMessage,
            metadata: messageMetadata
          });

        if (messageError) {
          console.error(`[send-weather-forecasts] Failed to create chat message for ${user.id}:`, messageError);
        }

        // Send push notification if user has FCM token
        if (user.fcm_token) {
          const notificationTitle = getNotificationTitle(language);
          const notificationBody = getNotificationBody(language, forecastWithCity);

          try {
            await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({
                fcmToken: user.fcm_token,
                title: notificationTitle,
                body: notificationBody,
                data: { type: 'weather_forecast' }
              }),
            });
            console.log(`[send-weather-forecasts] Push notification sent to ${user.id}`);
          } catch (pushError) {
            console.error(`[send-weather-forecasts] Failed to send push to ${user.id}:`, pushError);
          }
        }

        // Update last_weather_forecast_at
        await supabase
          .from('profiles')
          .update({ last_weather_forecast_at: now.toISOString() })
          .eq('id', user.id);

        processedUsers.push(user.id);
        console.log(`[send-weather-forecasts] Successfully processed user ${user.id}`);

      } catch (userError) {
        console.error(`[send-weather-forecasts] Error processing user ${user.id}:`, userError);
        errors.push({ 
          userId: user.id, 
          error: userError instanceof Error ? userError.message : 'Unknown error' 
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[send-weather-forecasts] Completed in ${duration}ms. Processed: ${processedUsers.length}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedUsers.length,
        errors: errors.length,
        duration 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-weather-forecasts] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getForecastArrivalMessage(language: string): string {
  const messages: Record<string, string> = {
    'pt-BR': '🌤️ Bom dia! Aqui está a previsão do tempo para hoje:',
    'en-US': '🌤️ Good morning! Here\'s today\'s weather forecast:',
    'es-ES': '🌤️ ¡Buenos días! Aquí está el pronóstico del tiempo para hoy:',
    'fr-FR': '🌤️ Bonjour ! Voici la météo du jour :',
    'ja-JP': '🌤️ おはようございます！今日の天気予報です：',
    'ko-KR': '🌤️ 좋은 아침이에요! 오늘 날씨 예보입니다:',
    'zh-CN': '🌤️ 早上好！这是今天的天气预报：',
  };
  return messages[language] || messages['pt-BR'];
}

function getNotificationTitle(language: string): string {
  const titles: Record<string, string> = {
    'pt-BR': '🌤️ Previsão do tempo',
    'en-US': '🌤️ Weather forecast',
    'es-ES': '🌤️ Pronóstico del tiempo',
    'fr-FR': '🌤️ Météo du jour',
    'ja-JP': '🌤️ 天気予報',
    'ko-KR': '🌤️ 날씨 예보',
    'zh-CN': '🌤️ 天气预报',
  };
  return titles[language] || titles['pt-BR'];
}

function getNotificationBody(language: string, forecast: any): string {
  const temp = Math.round(forecast.temperature);
  const max = Math.round(forecast.temperatureMax);
  const min = Math.round(forecast.temperatureMin);
  
  const bodies: Record<string, string> = {
    'pt-BR': `${temp}°C agora • Máx ${max}° / Mín ${min}°`,
    'en-US': `${temp}°C now • High ${max}° / Low ${min}°`,
    'es-ES': `${temp}°C ahora • Máx ${max}° / Mín ${min}°`,
    'fr-FR': `${temp}°C maintenant • Max ${max}° / Min ${min}°`,
    'ja-JP': `現在${temp}°C • 最高${max}° / 最低${min}°`,
    'ko-KR': `현재 ${temp}°C • 최고 ${max}° / 최저 ${min}°`,
    'zh-CN': `现在${temp}°C • 最高${max}° / 最低${min}°`,
  };
  return bodies[language] || bodies['pt-BR'];
}
