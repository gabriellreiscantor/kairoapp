import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Emojis for categories
const CATEGORY_EMOJIS: Record<string, string> = {
  'saude': '🏥',
  'trabalho': '💼',
  'lazer': '🎮',
  'pessoal': '👤',
  'fitness': '🏋️',
  'financeiro': '💰',
  'educacao': '📚',
  'social': '👥',
  'viagem': '✈️',
  'compras': '🛒',
};

// Title-specific emojis
const TITLE_EMOJIS: Record<string, string> = {
  'dentista': '🦷',
  'medico': '🩺',
  'academia': '💪',
  'barbearia': '✂️',
  'mercado': '🛒',
  'reuniao': '📋',
  'cinema': '🎬',
  'aniversario': '🎂',
  'almoco': '🍽️',
  'jantar': '🍝',
  'cafe': '☕',
  'farmacia': '💊',
  'banco': '🏦',
  'carro': '🚗',
  'pet': '🐾',
  'gato': '🐱',
  'cachorro': '🐕',
  'yoga': '🧘',
  'corrida': '🏃',
  'natacao': '🏊',
  'pilates': '🤸',
  'igreja': '⛪',
  'culto': '🙏',
  'missa': '🙏',
  'terapia': '🧠',
  'psicologo': '💭',
};

function getEmojiForEvent(title: string, category?: string): string {
  const titleLower = title.toLowerCase();
  
  // Check title-specific emojis first
  for (const [keyword, emoji] of Object.entries(TITLE_EMOJIS)) {
    if (titleLower.includes(keyword)) {
      return emoji;
    }
  }
  
  // Fall back to category emoji
  if (category && CATEGORY_EMOJIS[category]) {
    return CATEGORY_EMOJIS[category];
  }
  
  return '📅';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, language = 'pt-BR' } = await req.json();
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's plan to determine how many events to analyze
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('plan')
      .eq('user_id', userId)
      .maybeSingle();
    
    const plan = subscription?.plan || 'free';
    
    // Get user profile preferences
    const { data: profile } = await supabase
      .from('profiles')
      .select('smart_suggestions_enabled, learn_patterns_enabled')
      .eq('id', userId)
      .single();
    
    // If smart suggestions are disabled, return default suggestions
    if (!profile?.smart_suggestions_enabled) {
      const defaultSuggestions = getDefaultSuggestions(language);
      return new Response(
        JSON.stringify({ suggestions: defaultSuggestions, source: 'default' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Determine number of events to analyze based on plan
    // FREE: 10 events, PLUS: 50 events (5x), SUPER: 100 events (20x)
    const eventsLimit = plan === 'super' ? 100 : plan === 'plus' ? 50 : 10;
    
    // Fetch user's past events
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('title, category, event_date, event_time, created_at, status')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(eventsLimit);
    
    if (eventsError) {
      console.error('[generate-smart-suggestions] Error fetching events:', eventsError);
      throw eventsError;
    }
    
    // If no events, return starter suggestions
    if (!events || events.length === 0) {
      const starterSuggestions = getStarterSuggestions(language);
      return new Response(
        JSON.stringify({ suggestions: starterSuggestions, source: 'starter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Fetch user patterns if learn_patterns is enabled (PLUS/SUPER only)
    let patterns: any[] = [];
    if (profile?.learn_patterns_enabled && (plan === 'plus' || plan === 'super')) {
      const { data: userPatterns } = await supabase
        .from('user_patterns')
        .select('pattern_type, pattern_data, confidence')
        .eq('user_id', userId)
        .gte('confidence', 0.6)
        .order('confidence', { ascending: false })
        .limit(10);
      
      patterns = userPatterns || [];
    }
    
    // Use AI to generate smart suggestions based on events and patterns
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      console.warn('[generate-smart-suggestions] No OPENAI_API_KEY, using pattern-based suggestions');
      const patternSuggestions = generatePatternBasedSuggestions(events, patterns, language);
      return new Response(
        JSON.stringify({ suggestions: patternSuggestions, source: 'patterns' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Prepare context for AI
    const eventsSummary = events.slice(0, 20).map(e => ({
      title: e.title,
      category: e.category,
      date: e.event_date,
    }));
    
    const patternsSummary = patterns.map(p => ({
      type: p.pattern_type,
      data: p.pattern_data,
    }));
    
    const currentDate = new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date().toLocaleDateString(language, { weekday: 'long' });
    
    const systemPrompt = `Você é o assistente de calendário Horah. Analise os eventos passados do usuário e gere 4 sugestões personalizadas e relevantes.

REGRAS:
- Cada sugestão deve ter no máximo 6 palavras
- Sugira coisas que o usuário REALMENTE faz (baseado nos eventos)
- Considere padrões de recorrência (barbearia a cada 3 semanas, dentista a cada 6 meses, etc)
- Considere o dia da semana atual (${dayOfWeek})
- Seja específico e útil
- NÃO sugira coisas genéricas demais

FORMATO DE RESPOSTA (JSON):
{
  "suggestions": [
    { "text": "Marcar dentista (6 meses)" },
    { "text": "Academia às 7h" },
    { "text": "Reunião com time" },
    { "text": "Barbearia esta semana" }
  ]
}`;

    const userPrompt = `Data atual: ${currentDate} (${dayOfWeek})
Idioma: ${language}

Últimos eventos do usuário:
${JSON.stringify(eventsSummary, null, 2)}

${patternsSummary.length > 0 ? `Padrões identificados:\n${JSON.stringify(patternsSummary, null, 2)}` : ''}

Gere 4 sugestões personalizadas baseadas nesses dados. Retorne APENAS JSON válido.`;

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
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error('[generate-smart-suggestions] AI API error:', response.status);
      const patternSuggestions = generatePatternBasedSuggestions(events, patterns, language);
      return new Response(
        JSON.stringify({ suggestions: patternSuggestions, source: 'patterns_fallback' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse AI response
    let aiSuggestions: Array<{ text: string }> = [];
    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        aiSuggestions = parsed.suggestions || [];
      }
    } catch (parseError) {
      console.error('[generate-smart-suggestions] Parse error:', parseError);
    }
    
    // If AI failed, fall back to pattern-based suggestions
    if (aiSuggestions.length === 0) {
      const patternSuggestions = generatePatternBasedSuggestions(events, patterns, language);
      return new Response(
        JSON.stringify({ suggestions: patternSuggestions, source: 'patterns_fallback' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Add emojis to AI suggestions
    const suggestionsWithEmojis = aiSuggestions.slice(0, 4).map(s => {
      const emoji = getEmojiForEvent(s.text);
      return { emoji, text: s.text };
    });
    
    console.log('[generate-smart-suggestions] Generated AI suggestions:', suggestionsWithEmojis);
    
    return new Response(
      JSON.stringify({ suggestions: suggestionsWithEmojis, source: 'ai', plan }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[generate-smart-suggestions] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getDefaultSuggestions(language: string): Array<{ emoji: string; text: string }> {
  const suggestions: Record<string, Array<{ emoji: string; text: string }>> = {
    'pt-BR': [
      { emoji: '🍖', text: 'Churrasco no domingo' },
      { emoji: '🩺', text: 'Consulta médica' },
      { emoji: '☕', text: 'Café com amigo' },
      { emoji: '🏆', text: 'Treino na academia' },
    ],
    'en-US': [
      { emoji: '🍖', text: 'BBQ on Sunday' },
      { emoji: '🩺', text: 'Doctor appointment' },
      { emoji: '☕', text: 'Coffee with friend' },
      { emoji: '🏆', text: 'Gym workout' },
    ],
    'es-ES': [
      { emoji: '🍖', text: 'Parrilla el domingo' },
      { emoji: '🩺', text: 'Cita médica' },
      { emoji: '☕', text: 'Café con amigo' },
      { emoji: '🏆', text: 'Entrenamiento' },
    ],
  };
  return suggestions[language] || suggestions['pt-BR'];
}

function getStarterSuggestions(language: string): Array<{ emoji: string; text: string }> {
  const suggestions: Record<string, Array<{ emoji: string; text: string }>> = {
    'pt-BR': [
      { emoji: '🦷', text: 'Lembrete de dentista' },
      { emoji: '💊', text: 'Tomar remédio' },
      { emoji: '📞', text: 'Ligar para alguém' },
      { emoji: '🏃', text: 'Exercício físico' },
    ],
    'en-US': [
      { emoji: '🦷', text: 'Dentist reminder' },
      { emoji: '💊', text: 'Take medicine' },
      { emoji: '📞', text: 'Call someone' },
      { emoji: '🏃', text: 'Exercise' },
    ],
    'es-ES': [
      { emoji: '🦷', text: 'Recordatorio dentista' },
      { emoji: '💊', text: 'Tomar medicina' },
      { emoji: '📞', text: 'Llamar a alguien' },
      { emoji: '🏃', text: 'Ejercicio' },
    ],
  };
  return suggestions[language] || suggestions['pt-BR'];
}

function generatePatternBasedSuggestions(
  events: any[],
  patterns: any[],
  language: string
): Array<{ emoji: string; text: string }> {
  const suggestions: Array<{ emoji: string; text: string }> = [];
  
  // Analyze event frequency
  const titleCounts: Record<string, { count: number; lastDate: string; category?: string }> = {};
  
  for (const event of events) {
    const titleLower = event.title.toLowerCase();
    // Normalize similar titles
    const normalizedTitle = titleLower
      .replace(/\s+\d+.*$/, '') // Remove trailing numbers/dates
      .replace(/\s+(hoje|amanha|segunda|terca|quarta|quinta|sexta|sabado|domingo).*$/i, '')
      .trim();
    
    if (!titleCounts[normalizedTitle]) {
      titleCounts[normalizedTitle] = { count: 0, lastDate: event.event_date, category: event.category };
    }
    titleCounts[normalizedTitle].count++;
    if (event.event_date > titleCounts[normalizedTitle].lastDate) {
      titleCounts[normalizedTitle].lastDate = event.event_date;
    }
  }
  
  // Sort by frequency and suggest top recurring events
  const sortedTitles = Object.entries(titleCounts)
    .filter(([_, data]) => data.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 4);
  
  for (const [title, data] of sortedTitles) {
    const daysSinceLast = Math.floor(
      (Date.now() - new Date(data.lastDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    let suggestionText = title.charAt(0).toUpperCase() + title.slice(1);
    
    if (daysSinceLast > 7) {
      const weeks = Math.floor(daysSinceLast / 7);
      suggestionText += language === 'en-US' 
        ? ` (${weeks} weeks ago)`
        : ` (${weeks} semanas)`;
    }
    
    suggestions.push({
      emoji: getEmojiForEvent(title, data.category),
      text: suggestionText.substring(0, 30), // Max 30 chars
    });
  }
  
  // If we don't have enough suggestions, add defaults
  if (suggestions.length < 4) {
    const defaults = getDefaultSuggestions(language);
    for (const def of defaults) {
      if (suggestions.length >= 4) break;
      if (!suggestions.some(s => s.text.toLowerCase().includes(def.text.toLowerCase().split(' ')[0]))) {
        suggestions.push(def);
      }
    }
  }
  
  return suggestions.slice(0, 4);
}
