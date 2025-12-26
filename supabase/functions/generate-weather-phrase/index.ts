import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeatherPhraseRequest {
  weatherCode: number;
  temperature: number;
  language: string;
  city?: string;
}

// Map weather code to description
function getWeatherCondition(code: number): string {
  if (code === 0) return "clear sky, sunny";
  if (code >= 1 && code <= 3) return "cloudy, partly cloudy";
  if (code >= 45 && code <= 48) return "foggy, misty";
  if (code >= 51 && code <= 55) return "drizzle, light rain";
  if (code >= 56 && code <= 57) return "freezing drizzle";
  if (code >= 61 && code <= 65) return "rain";
  if (code >= 66 && code <= 67) return "freezing rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 82) return "rain showers";
  if (code >= 85 && code <= 86) return "snow showers";
  if (code >= 95 && code <= 99) return "thunderstorm";
  return "mixed conditions";
}

// Get country/culture from language code
function getCultureContext(language: string): { country: string; culture: string } {
  const cultureMap: Record<string, { country: string; culture: string }> = {
    'pt-BR': { country: 'Brazil', culture: 'Brazilian, use gírias brasileiras, memes do Twitter BR, referências a coisas do dia-a-dia brasileiro' },
    'en-US': { country: 'USA', culture: 'American, use Gen-Z slang, TikTok/Twitter memes, pop culture references' },
    'es-ES': { country: 'Spain', culture: 'Spanish, use expresiones españolas, humor mediterráneo' },
    'fr-FR': { country: 'France', culture: 'French, use expressions françaises, humour français' },
    'de-DE': { country: 'Germany', culture: 'German, use deutsche Ausdrücke, typisch deutscher Humor' },
    'it-IT': { country: 'Italy', culture: 'Italian, use espressioni italiane, umorismo italiano' },
    'ja-JP': { country: 'Japan', culture: 'Japanese, use 若者言葉, ネットスラング, アニメ・マンガ参照' },
    'ko-KR': { country: 'South Korea', culture: 'Korean, use 신조어, K-pop/K-drama references, 인터넷 유행어' },
    'zh-CN': { country: 'China', culture: 'Chinese, use 网络流行语, 年轻人用语, 中国梗' },
  };
  
  return cultureMap[language] || { country: 'International', culture: 'casual, friendly' };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { weatherCode, temperature, language, city }: WeatherPhraseRequest = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const weatherCondition = getWeatherCondition(weatherCode);
    const { country, culture } = getCultureContext(language);
    
    // Build the prompt
    const systemPrompt = `You are a funny friend commenting on the weather. You speak ${language} natively and understand ${culture}.
Your responses are:
- Short (max 50 characters, not including emoji)
- Funny, irreverent, playful
- Use current slang, memes, and cultural references from ${country}
- Include ONE relevant emoji at the end
- Never boring or generic
- Like a friend joking about the weather

IMPORTANT: Respond ONLY with the phrase and emoji, nothing else. No quotes, no explanations.`;

    const userPrompt = `Weather: ${weatherCondition}
Temperature: ${temperature}°C
${city ? `City: ${city}` : ''}

Generate a funny phrase about this weather in ${language}.`;

    console.log('Generating weather phrase:', { weatherCode, temperature, language, city });

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 100,
        temperature: 0.9, // Higher for more creative/varied responses
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const generatedPhrase = data.choices?.[0]?.message?.content?.trim() || '';
    
    // Extract emoji from the phrase (usually at the end)
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu;
    const emojis = generatedPhrase.match(emojiRegex) || [];
    const emoji = emojis[emojis.length - 1] || '✨';
    
    // Remove emoji from text if it's at the end
    let text = generatedPhrase.replace(new RegExp(`${emoji}$`), '').trim();
    
    // Clean up any quotes
    text = text.replace(/^["']|["']$/g, '').trim();
    
    console.log('Generated phrase:', { text, emoji });

    return new Response(JSON.stringify({ text, emoji }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating weather phrase:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
