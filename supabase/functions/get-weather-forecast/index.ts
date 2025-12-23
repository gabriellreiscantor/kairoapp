import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Get Weather Forecast
 * 
 * Uses Open-Meteo API (free, no API key required)
 * Returns current weather and hourly forecast for the day
 */

interface WeatherRequest {
  latitude: number;
  longitude: number;
  timezone?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, timezone = 'America/Sao_Paulo' } = await req.json() as WeatherRequest;

    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: 'Latitude and longitude are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[get-weather-forecast] Fetching weather for lat=${latitude}, lon=${longitude}, tz=${timezone}`);

    // Call Open-Meteo API
    const apiUrl = new URL('https://api.open-meteo.com/v1/forecast');
    apiUrl.searchParams.set('latitude', latitude.toString());
    apiUrl.searchParams.set('longitude', longitude.toString());
    apiUrl.searchParams.set('current', 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m');
    apiUrl.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,weather_code');
    apiUrl.searchParams.set('hourly', 'temperature_2m,weather_code');
    apiUrl.searchParams.set('timezone', timezone);
    apiUrl.searchParams.set('forecast_days', '1');

    const weatherResponse = await fetch(apiUrl.toString());

    if (!weatherResponse.ok) {
      console.error('[get-weather-forecast] Open-Meteo API error:', await weatherResponse.text());
      throw new Error('Failed to fetch weather data');
    }

    const weatherData = await weatherResponse.json();
    console.log('[get-weather-forecast] Raw weather data received');

    // Extract current weather
    const current = weatherData.current;
    const daily = weatherData.daily;
    const hourly = weatherData.hourly;

    // Get hourly forecast for remaining hours of the day (next 12 hours)
    const currentHour = new Date().getHours();
    const hourlyForecast = [];
    
    for (let i = 0; i < 12 && (currentHour + i) < 24; i++) {
      const hourIndex = currentHour + i;
      if (hourly.time[hourIndex]) {
        const time = new Date(hourly.time[hourIndex]);
        hourlyForecast.push({
          time: time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false }),
          temperature: hourly.temperature_2m[hourIndex],
          weatherCode: hourly.weather_code[hourIndex]
        });
      }
    }

    // Format response
    const forecast = {
      temperature: current.temperature_2m,
      temperatureMax: daily.temperature_2m_max[0],
      temperatureMin: daily.temperature_2m_min[0],
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      weatherCode: current.weather_code,
      date: new Date().toISOString().split('T')[0],
      hourlyForecast
    };

    console.log('[get-weather-forecast] Formatted forecast:', JSON.stringify(forecast).substring(0, 200));

    return new Response(
      JSON.stringify({ forecast }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[get-weather-forecast] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
