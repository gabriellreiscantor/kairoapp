import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TTS message templates for all supported languages
const TTS_TEMPLATES: Record<string, string> = {
  'pt-BR': 'Olá, aqui é o Kairo. Você tem um compromisso em {titulo}, às {hora}',
  'en-US': 'Hi, this is Kairo. You have an appointment at {titulo}, at {hora}',
  'es-ES': 'Hola, soy Kairo. Tienes una cita en {titulo}, a las {hora}',
  'fr-FR': 'Bonjour, ici Kairo. Vous avez un rendez-vous à {titulo}, à {hora}',
  'de-DE': 'Hallo, hier ist Kairo. Sie haben einen Termin bei {titulo}, um {hora}',
  'it-IT': 'Ciao, sono Kairo. Hai un appuntamento a {titulo}, alle {hora}',
  'ja-JP': 'こんにちは、カイロです。{titulo}で{hora}に予定があります',
  'ko-KR': '안녕하세요, 카이로입니다. {titulo}에서 {hora}에 약속이 있습니다',
  'zh-CN': '你好，这里是Kairo。你在{titulo}有一个{hora}的约会',
};

// Voice mapping for different languages (OpenAI TTS voices)
// alloy, echo, fable, onyx, nova, shimmer
// Using 'echo' (male, neutral) for all languages - consistent with "Kairo" male identity
const VOICE_BY_LANGUAGE: Record<string, string> = {
  'pt-BR': 'echo',
  'en-US': 'echo',
  'es-ES': 'echo',
  'fr-FR': 'echo',
  'de-DE': 'echo',
  'it-IT': 'echo',
  'ja-JP': 'echo',
  'ko-KR': 'echo',
  'zh-CN': 'echo',
};

// Build the TTS message from template
function buildTTSMessage(language: string, titulo: string, hora: string): string {
  const template = TTS_TEMPLATES[language] || TTS_TEMPLATES['pt-BR'];
  return template.replace('{titulo}', titulo).replace('{hora}', hora || '');
}

// Process base64 encoding in chunks to prevent stack overflow
function encodeBase64Chunked(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 32768; // 32KB chunks
  let result = '';
  
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    result += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(result);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice, language = 'pt-BR', titulo, hora } = await req.json();

    // If titulo is provided, build the message from template
    let ttsText = text;
    if (titulo) {
      ttsText = buildTTSMessage(language, titulo, hora || '');
    }

    if (!ttsText) {
      throw new Error('Text or titulo is required');
    }

    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // Get the appropriate voice for the language
    const selectedVoice = voice || VOICE_BY_LANGUAGE[language] || 'nova';

    console.log('Generating TTS for:', ttsText.substring(0, 80) + '...', 'Language:', language, 'Voice:', selectedVoice);

    // Generate speech from text using OpenAI TTS
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: ttsText,
        voice: selectedVoice,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI TTS error:', response.status, errorText);
      throw new Error(`OpenAI TTS error: ${response.status}`);
    }

    // Convert audio buffer to base64 using chunked encoding
    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = encodeBase64Chunked(arrayBuffer);

    console.log('TTS generated successfully, audio length:', base64Audio.length);

    return new Response(
      JSON.stringify({ audioContent: base64Audio }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('TTS error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
