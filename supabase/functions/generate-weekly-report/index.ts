import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Category mapping for user-friendly labels
const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  'pt-BR': {
    'pessoal': 'Autocuidado',
    'trabalho': 'Trabalho',
    'lazer': 'Lazer',
    'evento': 'Eventos Especiais',
    'casamento': 'Eventos Especiais',
    'geral': 'Rotina',
    'saude': 'Saúde',
    'fitness': 'Fitness',
    'social': 'Conexões',
    'familia': 'Família',
    'estudo': 'Estudos',
  },
  'en-US': {
    'pessoal': 'Self-care',
    'trabalho': 'Work',
    'lazer': 'Leisure',
    'evento': 'Special Events',
    'casamento': 'Special Events',
    'geral': 'Routine',
    'saude': 'Health',
    'fitness': 'Fitness',
    'social': 'Connections',
    'familia': 'Family',
    'estudo': 'Studies',
  },
  'es-ES': {
    'pessoal': 'Autocuidado',
    'trabalho': 'Trabajo',
    'lazer': 'Ocio',
    'evento': 'Eventos Especiales',
    'casamento': 'Eventos Especiales',
    'geral': 'Rutina',
    'saude': 'Salud',
    'fitness': 'Fitness',
    'social': 'Conexiones',
    'familia': 'Familia',
    'estudo': 'Estudios',
  },
  'fr-FR': {
    'pessoal': 'Bien-être',
    'trabalho': 'Travail',
    'lazer': 'Loisirs',
    'evento': 'Événements',
    'casamento': 'Événements',
    'geral': 'Routine',
    'saude': 'Santé',
    'fitness': 'Fitness',
    'social': 'Connexions',
    'familia': 'Famille',
    'estudo': 'Études',
  },
};

// Category colors for charts
const CATEGORY_COLORS: Record<string, string> = {
  'Autocuidado': '#4CAF50',
  'Self-care': '#4CAF50',
  'Lazer': '#EC407A',
  'Leisure': '#EC407A',
  'Ocio': '#EC407A',
  'Loisirs': '#EC407A',
  'Trabalho': '#2196F3',
  'Work': '#2196F3',
  'Trabajo': '#2196F3',
  'Travail': '#2196F3',
  'Conexões': '#00BCD4',
  'Connections': '#00BCD4',
  'Conexiones': '#00BCD4',
  'Connexions': '#00BCD4',
  'Rotina': '#9C27B0',
  'Routine': '#9C27B0',
  'Rutina': '#9C27B0',
  'Eventos Especiais': '#FF9800',
  'Special Events': '#FF9800',
  'Eventos Especiales': '#FF9800',
  'Événements': '#FF9800',
  'Saúde': '#8BC34A',
  'Health': '#8BC34A',
  'Salud': '#8BC34A',
  'Santé': '#8BC34A',
  'Família': '#E91E63',
  'Family': '#E91E63',
  'Familia': '#E91E63',
  'Famille': '#E91E63',
  'Estudos': '#673AB7',
  'Studies': '#673AB7',
  'Estudios': '#673AB7',
  'Études': '#673AB7',
  'Fitness': '#FF5722',
  'Outros': '#607D8B',
  'Others': '#607D8B',
  'Otros': '#607D8B',
  'Autres': '#607D8B',
};

interface CategoryDistribution {
  category: string;
  originalCategory: string;
  count: number;
  percentage: number;
  color: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, language = 'pt-BR', forceGenerate = false } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get the start and end of last week (Sunday to Saturday)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const lastSunday = new Date(now);
    lastSunday.setDate(now.getDate() - dayOfWeek - 7);
    lastSunday.setHours(0, 0, 0, 0);
    
    const lastSaturday = new Date(lastSunday);
    lastSaturday.setDate(lastSunday.getDate() + 6);
    lastSaturday.setHours(23, 59, 59, 999);

    const weekNumber = getWeekNumber(lastSunday);
    const year = lastSunday.getFullYear();

    console.log(`[generate-weekly-report] Generating report for user ${userId}, week ${weekNumber}, year ${year}`);
    console.log(`[generate-weekly-report] Date range: ${lastSunday.toISOString()} to ${lastSaturday.toISOString()}`);

    // Check if report already exists for this week
    if (!forceGenerate) {
      const { data: existingReport } = await supabase
        .from('weekly_reports')
        .select('*')
        .eq('user_id', userId)
        .eq('week_number', weekNumber)
        .gte('week_start', `${year}-01-01`)
        .lte('week_start', `${year}-12-31`)
        .maybeSingle();

      if (existingReport) {
        console.log(`[generate-weekly-report] Report already exists for week ${weekNumber}`);
        return new Response(
          JSON.stringify({ report: existingReport, cached: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch events for the week
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .gte('event_date', lastSunday.toISOString().split('T')[0])
      .lte('event_date', lastSaturday.toISOString().split('T')[0])
      .order('event_date', { ascending: true });

    if (eventsError) {
      console.error('[generate-weekly-report] Error fetching events:', eventsError);
      throw eventsError;
    }

    console.log(`[generate-weekly-report] Found ${events?.length || 0} events`);

    // If no events, create empty report
    if (!events || events.length === 0) {
      const emptyReport = {
        user_id: userId,
        week_number: weekNumber,
        week_start: lastSunday.toISOString().split('T')[0],
        week_end: lastSaturday.toISOString().split('T')[0],
        total_events: 0,
        total_hours: 0,
        category_distribution: [],
        headline: getEmptyWeekHeadline(language),
        description: getEmptyWeekDescription(language),
        language,
      };

      const { data: savedReport, error: saveError } = await supabase
        .from('weekly_reports')
        .insert(emptyReport)
        .select()
        .single();

      if (saveError) {
        console.error('[generate-weekly-report] Error saving empty report:', saveError);
        throw saveError;
      }

      return new Response(
        JSON.stringify({ report: savedReport, cached: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate statistics
    const totalEvents = events.length;
    const totalMinutes = events.reduce((sum, e) => sum + (e.duration_minutes || 60), 0);
    const totalHours = Math.round(totalMinutes / 60 * 10) / 10;

    // Calculate category distribution
    const categoryLabels = CATEGORY_LABELS[language] || CATEGORY_LABELS['pt-BR'];
    const categoryMap = new Map<string, { count: number; originalCategory: string }>();

    for (const event of events) {
      const originalCategory = event.category || 'geral';
      const label = categoryLabels[originalCategory] || categoryLabels['geral'] || 'Outros';
      
      if (categoryMap.has(label)) {
        categoryMap.get(label)!.count++;
      } else {
        categoryMap.set(label, { count: 1, originalCategory });
      }
    }

    const categoryDistribution: CategoryDistribution[] = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        originalCategory: data.originalCategory,
        count: data.count,
        percentage: Math.round((data.count / totalEvents) * 100),
        color: CATEGORY_COLORS[category] || '#607D8B',
      }))
      .sort((a, b) => b.count - a.count);

    console.log('[generate-weekly-report] Category distribution:', categoryDistribution);

    // Generate creative headline using Lovable AI
    let headline = getDefaultHeadline(categoryDistribution, language);
    let description = '';

    if (LOVABLE_API_KEY) {
      try {
        const aiResponse = await generateCreativeContent(
          categoryDistribution,
          totalEvents,
          totalHours,
          language
        );
        headline = aiResponse.headline || headline;
        description = aiResponse.description || '';
      } catch (aiError) {
        console.error('[generate-weekly-report] AI generation failed, using default:', aiError);
      }
    }

    // Save the report
    const report = {
      user_id: userId,
      week_number: weekNumber,
      week_start: lastSunday.toISOString().split('T')[0],
      week_end: lastSaturday.toISOString().split('T')[0],
      total_events: totalEvents,
      total_hours: totalHours,
      category_distribution: categoryDistribution,
      headline,
      description,
      language,
    };

    const { data: savedReport, error: saveError } = await supabase
      .from('weekly_reports')
      .insert(report)
      .select()
      .single();

    if (saveError) {
      console.error('[generate-weekly-report] Error saving report:', saveError);
      throw saveError;
    }

    // Update user's last report timestamp
    await supabase
      .from('profiles')
      .update({ last_weekly_report_at: new Date().toISOString() })
      .eq('id', userId);

    console.log('[generate-weekly-report] Report saved successfully');

    return new Response(
      JSON.stringify({ report: savedReport, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-weekly-report] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

function getEmptyWeekHeadline(language: string): string {
  const headlines: Record<string, string> = {
    'pt-BR': 'Semana tranquila, né?',
    'en-US': 'A quiet week, huh?',
    'es-ES': '¿Semana tranquila?',
    'fr-FR': 'Semaine tranquille, hein?',
  };
  return headlines[language] || headlines['pt-BR'];
}

function getEmptyWeekDescription(language: string): string {
  const descriptions: Record<string, string> = {
    'pt-BR': 'Você não teve eventos registrados na semana passada. Que tal planejar algo especial para essa semana?',
    'en-US': 'You had no events registered last week. How about planning something special for this week?',
    'es-ES': 'No tuviste eventos registrados la semana pasada. ¿Qué tal planificar algo especial para esta semana?',
    'fr-FR': 'Vous n\'avez eu aucun événement enregistré la semaine dernière. Que diriez-vous de planifier quelque chose de spécial pour cette semaine?',
  };
  return descriptions[language] || descriptions['pt-BR'];
}

function getDefaultHeadline(categories: CategoryDistribution[], language: string): string {
  const topCategories = categories.slice(0, 3).map(c => c.category);
  
  if (language === 'pt-BR') {
    if (topCategories.length === 1) {
      return `Semana focada em ${topCategories[0].toLowerCase()}`;
    }
    return `Entre ${topCategories.slice(0, -1).map(c => c.toLowerCase()).join(', ')} e ${topCategories[topCategories.length - 1].toLowerCase()}`;
  }
  
  if (language === 'en-US') {
    if (topCategories.length === 1) {
      return `A week focused on ${topCategories[0].toLowerCase()}`;
    }
    return `Between ${topCategories.slice(0, -1).map(c => c.toLowerCase()).join(', ')} and ${topCategories[topCategories.length - 1].toLowerCase()}`;
  }
  
  return topCategories.join(', ');
}

async function generateCreativeContent(
  categories: CategoryDistribution[],
  totalEvents: number,
  totalHours: number,
  language: string
): Promise<{ headline: string; description: string }> {
  const topCategories = categories.slice(0, 3);
  const categoryList = topCategories.map(c => `${c.category} (${c.percentage}%)`).join(', ');

  const prompts: Record<string, string> = {
    'pt-BR': `Você é um assistente brasileiro criativo. Crie uma frase curta e informal (máximo 8 palavras) que resuma a semana do usuário.
O usuário teve ${totalEvents} eventos e ${totalHours} horas ocupadas.
Categorias principais: ${categoryList}

Use gírias brasileiras modernas e tom descontraído. Exemplos de estilo:
- "Entre rolês, cuidados e alguns lembretes"
- "Semana cheia, na correria mas de boa"
- "Do shape à social, mandou bem!"
- "Equilibrando o trampo e os momentos de lazer"

Responda APENAS com a frase, sem aspas ou explicações.`,

    'en-US': `You are a creative American assistant. Create a short, casual phrase (max 8 words) summarizing the user's week.
The user had ${totalEvents} events and ${totalHours} hours occupied.
Main categories: ${categoryList}

Use modern American slang and a relaxed tone. Style examples:
- "From hustle to hangouts, you nailed it"
- "Crushing it between work and play"
- "A balanced mix of grind and vibes"

Reply ONLY with the phrase, no quotes or explanations.`,

    'es-ES': `Eres un asistente español creativo. Crea una frase corta e informal (máximo 8 palabras) que resuma la semana del usuario.
El usuario tuvo ${totalEvents} eventos y ${totalHours} horas ocupadas.
Categorías principales: ${categoryList}

Usa jerga española moderna y un tono relajado. Ejemplos de estilo:
- "Entre el curro y el rollo, todo bien"
- "Semana intensa pero con onda"
- "Equilibrando el trabajo y el ocio"

Responde SOLO con la frase, sin comillas ni explicaciones.`,

    'fr-FR': `Vous êtes un assistant français créatif. Créez une phrase courte et informelle (max 8 mots) résumant la semaine de l'utilisateur.
L'utilisateur a eu ${totalEvents} événements et ${totalHours} heures occupées.
Catégories principales: ${categoryList}

Utilisez un argot français moderne et un ton décontracté. Exemples de style:
- "Entre boulot et détente, t'as géré"
- "Une semaine bien remplie mais cool"
- "Du taf aux loisirs, bien joué"

Répondez UNIQUEMENT avec la phrase, sans guillemets ni explications.`,
  };

  const prompt = prompts[language] || prompts['pt-BR'];

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: 100,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI request failed: ${response.status}`);
  }

  const data = await response.json();
  const headline = data.choices?.[0]?.message?.content?.trim() || getDefaultHeadline(categories, language);

  // Generate description
  const descPrompts: Record<string, string> = {
    'pt-BR': `Escreva uma descrição breve (2 frases) sobre a semana do usuário.
Eventos: ${totalEvents}, Horas: ${totalHours}
Categorias: ${categoryList}
Tom: informal, positivo, sem clichês. Máximo 50 palavras.`,
    'en-US': `Write a brief description (2 sentences) about the user's week.
Events: ${totalEvents}, Hours: ${totalHours}
Categories: ${categoryList}
Tone: informal, positive, no clichés. Max 50 words.`,
  };

  const descPrompt = descPrompts[language] || descPrompts['pt-BR'];
  
  const descResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'user', content: descPrompt }
      ],
      max_tokens: 150,
    }),
  });

  let description = '';
  if (descResponse.ok) {
    const descData = await descResponse.json();
    description = descData.choices?.[0]?.message?.content?.trim() || '';
  }

  return { headline, description };
}
