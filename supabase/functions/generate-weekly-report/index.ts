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
    'evento': 'Eventos',
    'casamento': 'Celebrações',
    'saúde': 'Saúde',
    'fitness': 'Fitness',
    'estudos': 'Estudos',
    'família': 'Família',
    'social': 'Social',
    'default': 'Outros'
  },
  'en-US': {
    'pessoal': 'Self-care',
    'trabalho': 'Work',
    'lazer': 'Leisure',
    'evento': 'Events',
    'casamento': 'Celebrations',
    'saúde': 'Health',
    'fitness': 'Fitness',
    'estudos': 'Studies',
    'família': 'Family',
    'social': 'Social',
    'default': 'Other'
  },
  'es-ES': {
    'pessoal': 'Autocuidado',
    'trabalho': 'Trabajo',
    'lazer': 'Ocio',
    'evento': 'Eventos',
    'casamento': 'Celebraciones',
    'saúde': 'Salud',
    'fitness': 'Fitness',
    'estudos': 'Estudios',
    'família': 'Familia',
    'social': 'Social',
    'default': 'Otros'
  },
  'fr-FR': {
    'pessoal': 'Bien-être',
    'trabalho': 'Travail',
    'lazer': 'Loisirs',
    'evento': 'Événements',
    'casamento': 'Célébrations',
    'saúde': 'Santé',
    'fitness': 'Fitness',
    'estudos': 'Études',
    'família': 'Famille',
    'social': 'Social',
    'default': 'Autres'
  },
  'ja-JP': {
    'pessoal': 'セルフケア',
    'trabalho': '仕事',
    'lazer': '趣味',
    'evento': 'イベント',
    'casamento': 'お祝い',
    'saúde': '健康',
    'fitness': 'フィットネス',
    'estudos': '勉強',
    'família': '家族',
    'social': '交流',
    'default': 'その他'
  },
  'ko-KR': {
    'pessoal': '셀프케어',
    'trabalho': '업무',
    'lazer': '여가',
    'evento': '이벤트',
    'casamento': '축하',
    'saúde': '건강',
    'fitness': '운동',
    'estudos': '공부',
    'família': '가족',
    'social': '모임',
    'default': '기타'
  },
  'zh-CN': {
    'pessoal': '自我关爱',
    'trabalho': '工作',
    'lazer': '休闲',
    'evento': '活动',
    'casamento': '庆典',
    'saúde': '健康',
    'fitness': '健身',
    'estudos': '学习',
    'família': '家庭',
    'social': '社交',
    'default': '其他'
  }
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
    'ja-JP': 'のんびりした一週間だったね',
    'ko-KR': '조용한 한 주였네요~',
    'zh-CN': '悠闲的一周呀~',
  };
  return headlines[language] || headlines['pt-BR'];
}

function getEmptyWeekDescription(language: string): string {
  const descriptions: Record<string, string> = {
    'pt-BR': 'Você não teve eventos registrados na semana passada. Que tal planejar algo especial para essa semana?',
    'en-US': 'You had no events registered last week. How about planning something special for this week?',
    'es-ES': 'No tuviste eventos registrados la semana pasada. ¿Qué tal planificar algo especial para esta semana?',
    'fr-FR': 'Vous n\'avez eu aucun événement enregistré la semaine dernière. Que diriez-vous de planifier quelque chose de spécial pour cette semaine?',
    'ja-JP': '先週はイベントがなかったみたい。今週は何か特別なことを計画してみる？',
    'ko-KR': '지난주에는 등록된 일정이 없었어요. 이번 주에는 특별한 걸 계획해볼까요?',
    'zh-CN': '上周没有登记活动哦。这周计划点特别的事情吧？',
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

    'ja-JP': `あなたはクリエイティブな日本語アシスタントです。ユーザーの一週間を要約する短くてカジュアルなフレーズ（最大8語）を作成してください。
ユーザーは${totalEvents}件のイベントと${totalHours}時間の予定がありました。
主なカテゴリー: ${categoryList}

現代の日本語スラングやカジュアルな表現を使ってください。スタイル例:
- "仕事も遊びもバッチリこなした週"
- "推し活から自分磨きまで、充実した一週間"
- "忙しかったけど、まじ最高の週だった"
- "ワークもプライベートもいい感じ"

フレーズのみを回答してください。引用符や説明は不要です。`,

    'ko-KR': `당신은 창의적인 한국어 어시스턴트입니다. 사용자의 한 주를 요약하는 짧고 캐주얼한 문구(최대 8단어)를 만들어주세요.
사용자는 ${totalEvents}개의 일정과 ${totalHours}시간의 활동이 있었습니다.
주요 카테고리: ${categoryList}

현대 한국어 슬랭과 편안한 톤을 사용하세요. 스타일 예시:
- "일도 놀기도 열심히, 갓생 살았지"
- "바빴지만 뿌듯한 한 주"
- "워라밸 완벽하게 맞춘 주간"
- "덕질부터 자기관리까지 알찬 한 주"

문구만 답변해주세요. 따옴표나 설명은 필요 없습니다.`,

    'zh-CN': `你是一个有创意的中文助手。请创建一个简短、随意的短语（最多8个词）来总结用户的一周。
用户有${totalEvents}个活动和${totalHours}小时的安排。
主要类别: ${categoryList}

使用现代中文网络用语和轻松的语气。风格示例:
- "工作生活两不误，这周绝绝子"
- "忙碌但充实，妥妥的卷王"
- "从健身到社交，满满的正能量"
- "事业爱情双丰收，人生赢家"

只回复短语，不需要引号或解释。`,
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
    'es-ES': `Escribe una descripción breve (2 frases) sobre la semana del usuario.
Eventos: ${totalEvents}, Horas: ${totalHours}
Categorías: ${categoryList}
Tono: informal, positivo, sin clichés. Máximo 50 palabras.`,
    'fr-FR': `Écrivez une brève description (2 phrases) de la semaine de l'utilisateur.
Événements: ${totalEvents}, Heures: ${totalHours}
Catégories: ${categoryList}
Ton: informel, positif, pas de clichés. Maximum 50 mots.`,
    'ja-JP': `ユーザーの一週間について簡潔な説明（2文）を書いてください。
イベント: ${totalEvents}件、時間: ${totalHours}時間
カテゴリー: ${categoryList}
トーン: カジュアル、ポジティブ、クリシェなし。最大50語。`,
    'ko-KR': `사용자의 한 주에 대한 짧은 설명(2문장)을 작성해주세요.
일정: ${totalEvents}개, 시간: ${totalHours}시간
카테고리: ${categoryList}
톤: 캐주얼하고 긍정적으로, 진부한 표현 없이. 최대 50단어.`,
    'zh-CN': `写一段关于用户一周的简短描述（2句话）。
活动: ${totalEvents}个，时间: ${totalHours}小时
类别: ${categoryList}
语气: 轻松、积极、不要陈词滥调。最多50个词。`,
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
