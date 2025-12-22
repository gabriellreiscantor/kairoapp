import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Converter números para palavras em português (1-12)
const HOURS_WORDS: Record<number, string> = {
  1: 'uma', 2: 'duas', 3: 'três', 4: 'quatro', 5: 'cinco', 6: 'seis',
  7: 'sete', 8: 'oito', 9: 'nove', 10: 'dez', 11: 'onze', 12: 'doze'
};

// Converter minutos para palavras em português
function minutesToWords(minutes: number): string {
  if (minutes === 0) return '';
  if (minutes === 15) return 'e quinze';
  if (minutes === 30) return 'e meia';
  if (minutes === 45) return 'e quarenta e cinco';
  
  // Números 1-9 (usando formas corretas para minutos)
  const units = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  // Números 10-19
  const teens = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  // Dezenas 20-50
  const tens = ['zero', 'dez', 'vinte', 'trinta', 'quarenta', 'cinquenta'];
  
  if (minutes >= 1 && minutes <= 9) {
    return `e ${units[minutes]}`;
  }
  if (minutes >= 10 && minutes <= 19) {
    return `e ${teens[minutes - 10]}`;
  }
  
  const ten = Math.floor(minutes / 10);
  const unit = minutes % 10;
  
  if (unit === 0) {
    return `e ${tens[ten]}`;
  }
  
  return `e ${tens[ten]} e ${units[unit]}`;
}

// Formatar horário para fala natural em português
function formatTimeForSpeech(time: string, language: string): string {
  if (!time || language !== 'pt-BR') return time || '';
  
  try {
    const [hoursStr, minutesStr] = time.split(':');
    const hours24 = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    
    if (isNaN(hours24) || isNaN(minutes)) return time;
    
    // Converter para 12 horas
    let hours12 = hours24 % 12;
    if (hours12 === 0) hours12 = 12;
    
    // Determinar período do dia
    let period = '';
    if (hours24 >= 0 && hours24 < 6) period = 'da madrugada';
    else if (hours24 >= 6 && hours24 < 12) period = 'da manhã';
    else if (hours24 >= 12 && hours24 < 18) period = 'da tarde';
    else period = 'da noite';
    
    // Formatar hora
    const hourWord = HOURS_WORDS[hours12];
    let hourText = hours12 === 1 ? 'uma hora' : `${hourWord} horas`;
    
    // Caso especial: meia-noite e meio-dia
    if (hours24 === 0 && minutes === 0) return 'meia-noite';
    if (hours24 === 12 && minutes === 0) return 'meio-dia';
    
    // Formatar minutos
    const minuteText = minutesToWords(minutes);
    
    // Combinar: "três e meia da tarde"
    if (minuteText) {
      // Se for "e meia", "e quinze", etc, não precisa de "horas"
      if (minutes === 30 || minutes === 15 || minutes === 45) {
        return `${hourWord} ${minuteText} ${period}`.trim();
      }
      return `${hourText} ${minuteText} ${period}`.trim();
    }
    
    return `${hourText} ${period}`.trim();
  } catch (e) {
    console.error('Error formatting time:', e);
    return time;
  }
}

// TTS message templates for all supported languages
const TTS_TEMPLATES: Record<string, string> = {
  'pt-BR': 'Olá, aqui é o Kairo. Você tem um compromisso: {titulo}, às {hora}',
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
  // Formatar o horário para fala natural
  const horaFormatada = formatTimeForSpeech(hora, language);
  console.log('[TTS] Building message - titulo:', titulo, 'hora:', hora, 'formatted:', horaFormatada);
  return template.replace('{titulo}', titulo).replace('{hora}', horaFormatada);
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

    console.log('Generating TTS for:', ttsText.substring(0, 100) + '...', 'Language:', language, 'Voice:', selectedVoice);

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
