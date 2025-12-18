import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * KAIRO — ASSISTENTE DE AGENDA INTELIGENTE
 * 
 * Função da IA: INTERPRETAÇÃO EXCLUSIVA
 * - Identifica intenção
 * - Extrai dados estruturados
 * - Detecta informações faltantes
 * - Mantém contexto conversacional
 * 
 * A IA NÃO:
 * - Cria eventos
 * - Edita eventos
 * - Acessa banco de dados
 * - Executa ações de negócio
 * 
 * Toda execução é responsabilidade do backend.
 */

// JSON structure that AI will return - MASTER PROMPT CONTRACT
interface KairoAction {
  acao: 'criar_evento' | 'listar_eventos' | 'editar_evento' | 'deletar_evento' | 'conversar' | 'coletar_informacoes' | 'solicitar_confirmacao' | 'data_passada';
  titulo?: string;
  data?: string; // YYYY-MM-DD
  hora?: string; // HH:MM
  local?: string;
  descricao?: string; // Short AI-generated description
  location_type?: 'commercial' | 'personal';
  location_state?: 'missing_city' | 'missing_place_name' | 'complete';
  duracao_minutos?: number;
  prioridade?: 'low' | 'medium' | 'high';
  categoria?: string;
  evento_id?: string;
  buscar_titulo?: string;
  limite?: number;
  idioma_detectado?: 'pt' | 'en' | 'es' | 'fr' | 'de' | 'it' | 'ja' | 'ko' | 'zh' | 'outro';
  observacoes?: string;
  resposta_usuario?: string;
  informacao_faltante?: 'data' | 'hora' | 'local' | 'cidade' | 'nome_estabelecimento';
  contexto_coletado?: string;
  resumo_evento?: {
    titulo: string;
    data: string;
    hora: string;
    local: string;
    notificacao: string;
  };
  _alreadyExecuted?: boolean; // Flag to skip executeAction when action was already processed
  evento_atualizado?: any; // Full updated event in Supabase format for EventCreatedCard
  evento_deletado?: any; // Full deleted event data for EventDeletedCard
}

interface UserProfile {
  display_name?: string;
  smart_suggestions_enabled?: boolean;
  auto_reschedule_enabled?: boolean;
  context_aware_enabled?: boolean;
  learn_patterns_enabled?: boolean;
  weather_forecast_enabled?: boolean;
  weather_forecast_time?: string;
  preferred_times?: any[];
}

// Save user patterns after event creation
async function saveUserPattern(
  supabase: any,
  userId: string,
  action: KairoAction,
  profile: UserProfile
): Promise<void> {
  if (!profile.learn_patterns_enabled) {
    console.log('Pattern learning disabled for user');
    return;
  }

  try {
    const patterns: Array<{ type: string; data: any }> = [];

    if (action.hora) {
      patterns.push({
        type: 'preferred_time',
        data: { time: action.hora, category: action.categoria || 'geral' }
      });
    }

    if (action.categoria) {
      patterns.push({
        type: 'common_category',
        data: { category: action.categoria }
      });
    }

    if (action.duracao_minutos) {
      patterns.push({
        type: 'common_duration',
        data: { duration: action.duracao_minutos, category: action.categoria || 'geral' }
      });
    }

    if (action.local) {
      patterns.push({
        type: 'common_location',
        data: { location: action.local }
      });
    }

    for (const pattern of patterns) {
      const { data: existing } = await supabase
        .from('user_patterns')
        .select('id, confidence, pattern_data')
        .eq('user_id', userId)
        .eq('pattern_type', pattern.type)
        .maybeSingle();

      if (existing) {
        const newConfidence = Math.min(existing.confidence + 0.1, 1.0);
        const mergedData = { ...existing.pattern_data, ...pattern.data, count: (existing.pattern_data?.count || 1) + 1 };
        
        await supabase
          .from('user_patterns')
          .update({ 
            confidence: newConfidence, 
            pattern_data: mergedData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('user_patterns')
          .insert({
            user_id: userId,
            pattern_type: pattern.type,
            pattern_data: { ...pattern.data, count: 1 },
            confidence: 0.5
          });
      }
    }

    console.log(`Saved ${patterns.length} patterns for user`);
  } catch (error) {
    console.error('Error saving patterns:', error);
  }
}

// Check if date/time is in the past
function isDateInPast(dateStr: string, timeStr?: string, timezone?: string): boolean {
  const tz = timezone || 'America/Sao_Paulo';
  const now = new Date();
  
  // Create event date with time if provided
  let eventDateTime: Date;
  if (timeStr) {
    eventDateTime = new Date(`${dateStr}T${timeStr}:00`);
  } else {
    // If no time, compare just dates (event at end of day)
    eventDateTime = new Date(`${dateStr}T23:59:59`);
  }
  
  console.log(`[isDateInPast] Checking: ${dateStr} ${timeStr || 'all day'} vs now: ${now.toISOString()}`);
  console.log(`[isDateInPast] Event datetime: ${eventDateTime.toISOString()}, is past: ${eventDateTime < now}`);
  
  return eventDateTime < now;
}

// Execute action in database - THIS IS THE BACKEND LOGIC
async function executeAction(
  supabase: any, 
  userId: string, 
  action: KairoAction,
  profile: UserProfile
): Promise<{ success: boolean; data?: any; error?: string; limitReached?: boolean; pastDate?: boolean; attemptedEvent?: any }> {
  console.log(`Backend executing action: ${action.acao}`, action);

  try {
    switch (action.acao) {
      case 'criar_evento': {
        if (!action.titulo || !action.data) {
          return { success: false, error: 'Título e data são obrigatórios' };
        }

        // Check if date is in the past
        if (isDateInPast(action.data, action.hora)) {
          console.log('Event date is in the past - blocking creation');
          return { 
            success: false, 
            pastDate: true,
            error: 'Data/hora no passado',
            attemptedEvent: {
              titulo: action.titulo,
              data: action.data,
              hora: action.hora,
              local: action.local
            }
          };
        }

        const { data: canCreate } = await supabase.rpc('can_create_event', {
          _user_id: userId
        });

        if (!canCreate) {
          const { data: planData } = await supabase.rpc('get_user_plan', {
            _user_id: userId
          });
          
          const planName = planData || 'free';
          const limits: Record<string, number> = { free: 14, plus: 50, super: 280 };
          const limit = limits[planName] || 14;
          
          return { 
            success: false, 
            limitReached: true,
            error: `Você atingiu o limite de ${limit} eventos do plano ${planName === 'free' ? 'grátis' : planName.toUpperCase()}. Atualize seu plano para criar mais eventos.`
          };
        }

        const { data, error } = await supabase
          .from('events')
          .insert({
            user_id: userId,
            title: action.titulo,
            description: action.descricao || null,
            event_date: action.data,
            event_time: action.hora || null,
            location: action.local || null,
            duration_minutes: action.duracao_minutos || 60,
            priority: action.prioridade || 'medium',
            category: action.categoria || 'geral',
            status: 'pending',
            notification_enabled: true
          })
          .select()
          .single();

        if (error) throw error;

        await saveUserPattern(supabase, userId, action, profile);

        return { success: true, data };
      }

      case 'listar_eventos': {
        let query = supabase
          .from('events')
          .select('*')
          .eq('user_id', userId)
          .order('event_date', { ascending: true })
          .order('event_time', { ascending: true });

        if (action.data) {
          query = query.eq('event_date', action.data);
        } else {
          const today = new Date().toISOString().split('T')[0];
          query = query.gte('event_date', today);
        }

        query = query.limit(action.limite || 10);

        const { data, error } = await query;
        if (error) throw error;
        return { success: true, data };
      }

      case 'editar_evento': {
        if (!action.evento_id) {
          return { success: false, error: 'ID do evento é obrigatório' };
        }

        const updates: any = {};
        if (action.titulo) updates.title = action.titulo;
        if (action.data) updates.event_date = action.data;
        if (action.hora) updates.event_time = action.hora;
        if (action.local) updates.location = action.local;
        if (action.prioridade) updates.priority = action.prioridade;

        const { data, error } = await supabase
          .from('events')
          .update(updates)
          .eq('id', action.evento_id)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        return { success: true, data };
      }

      case 'deletar_evento': {
        if (action.evento_id) {
          const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', action.evento_id)
            .eq('user_id', userId);

          if (error) throw error;
          return { success: true, data: { deleted: true } };
        } else if (action.buscar_titulo) {
          const { data: events } = await supabase
            .from('events')
            .select('id, title')
            .eq('user_id', userId)
            .ilike('title', `%${action.buscar_titulo}%`)
            .limit(1);

          if (events && events.length > 0) {
            const { error } = await supabase
              .from('events')
              .delete()
              .eq('id', events[0].id);

            if (error) throw error;
            return { success: true, data: { deleted: true, event: events[0] } };
          }
          return { success: false, error: 'Evento não encontrado' };
        }
        return { success: false, error: 'ID ou título do evento necessário' };
      }

      case 'conversar':
      case 'coletar_informacoes':
      case 'solicitar_confirmacao':
        return { success: true, data: action.resumo_evento || null };

      default:
        return { success: false, error: `Ação desconhecida: ${action.acao}` };
    }
  } catch (error) {
    console.error(`Action error (${action.acao}):`, error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

serve(async (req) => {
  console.log('=== CHAT FUNCTION CALLED ===');
  console.log('Method:', req.method);
  
  if (req.method === "OPTIONS") {
    console.log('Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { messages, imageAnalysis, isOnboarding, onboardingStep, timezone } = body;
    
    // Use user's timezone or fallback to America/Sao_Paulo
    const userTimezone = timezone || 'America/Sao_Paulo';
    console.log('Received messages count:', messages?.length || 0);
    console.log('Has image analysis:', !!imageAnalysis);
    console.log('Is onboarding:', isOnboarding, 'Step:', onboardingStep);
    console.log('User timezone:', userTimezone);
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured');
      throw new Error("OPENAI_API_KEY não configurada");
    }
    
    console.log('OpenAI API key found, length:', OPENAI_API_KEY.length);

    // === SPECIAL HANDLING FOR IMAGE ANALYSIS ===
    // When an image is analyzed and event is detected, CREATE THE EVENT AUTOMATICALLY (optimistic)
    if (imageAnalysis && imageAnalysis.tipo === 'evento_detectado') {
      console.log('Image detected event - creating automatically (optimistic flow)');
      
      const authHeader = req.headers.get('authorization');
      if (!authHeader) {
        throw new Error('Authorization required for event creation');
      }
      
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const imageSupabase = createClient(supabaseUrl, supabaseKey);
      
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await imageSupabase.auth.getUser(token);
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Map detected category to duration defaults
      const categoryDurations: Record<string, number> = {
        cinema: 150,
        show: 180,
        teatro: 120,
        casamento: 300,
        formatura: 180,
        aniversario: 180,
        medico: 60,
        trabalho: 60,
        esporte: 120,
        viagem: 480,
        restaurante: 90,
        festa: 240,
        religioso: 120,
        outro: 60
      };
      
      const detectedCategory = imageAnalysis.categoria_evento || 'outro';
      const defaultDuration = categoryDurations[detectedCategory] || 120;
      
      console.log('Detected category from image:', detectedCategory);

      // ===== PAST DATE VALIDATION FOR IMAGE =====
      if (isDateInPast(imageAnalysis.data_detectada, imageAnalysis.hora_detectada, userTimezone)) {
        console.log('Image event date is in the past - returning warning');
        
        const responseText = `Ops! Essa data e horário já passaram. Por favor, envie uma imagem com um evento no futuro.`;
        
        const actionData = {
          acao: 'data_passada',
          success: false,
          resposta_usuario: responseText,
          titulo: imageAnalysis.titulo || 'Evento',
          data: imageAnalysis.data_detectada,
          hora: imageAnalysis.hora_detectada,
          local: imageAnalysis.local_detectado,
          idioma_detectado: 'pt'
        };

        let ssePayload = `data: {"text": "${responseText.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"}\n\n`;
        ssePayload += `data: {"action": ${JSON.stringify(actionData)}}\n\n`;
        ssePayload += `data: [DONE]\n\n`;

        return new Response(ssePayload, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
        });
      }
      const { data: createdEvent, error: createError } = await imageSupabase
        .from('events')
        .insert({
          user_id: user.id,
          title: imageAnalysis.titulo || 'Evento',
          description: imageAnalysis.descricao || null,
          event_date: imageAnalysis.data_detectada,
          event_time: imageAnalysis.hora_detectada || null,
          location: imageAnalysis.local_detectado || null,
          duration_minutes: defaultDuration,
          priority: 'medium',
          category: detectedCategory,
          status: 'pending',
          notification_enabled: true
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating event from image:', createError);
        throw createError;
      }

      console.log('Event created from image:', createdEvent);

      // Build response text
      const responseText = `Pronto! Criei o evento "${imageAnalysis.titulo}" para ${imageAnalysis.data_detectada}${imageAnalysis.hora_detectada ? ` às ${imageAnalysis.hora_detectada}` : ''}. Se precisar mudar algo, é só me falar!`;

      // Build action with created event data
      const actionData = {
        acao: 'criar_evento',
        success: true,
        resposta_usuario: responseText,
        titulo: createdEvent.title,
        hora: createdEvent.event_time,
        local: createdEvent.location,
        descricao: createdEvent.description,
        prioridade: createdEvent.priority,
        categoria: createdEvent.category,
        duracao_minutos: createdEvent.duration_minutes,
        idioma_detectado: 'pt',
        // Include the full event data for EventCreatedCard
        eventData: {
          id: createdEvent.id,
          title: createdEvent.title,
          event_date: createdEvent.event_date,
          event_time: createdEvent.event_time,
          location: createdEvent.location,
          category: createdEvent.category,
          notification_enabled: createdEvent.notification_enabled,
          call_alert_enabled: createdEvent.call_alert_enabled
        },
        resumo_evento: {
          titulo: createdEvent.title,
          data: createdEvent.event_date,
          hora: createdEvent.event_time || 'Dia inteiro',
          local: createdEvent.location || '',
          notificacao: '30 min antes'
        }
      };

      console.log('Image event action data:', JSON.stringify(actionData));

      // Build SSE response
      let ssePayload = `data: {"text": "${responseText.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"}\n\n`;
      ssePayload += `data: {"action": ${JSON.stringify(actionData)}}\n\n`;
      ssePayload += `data: [DONE]\n\n`;

      return new Response(ssePayload, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // Handle other image analysis types (health, generic, not identified)
    if (imageAnalysis && imageAnalysis.tipo !== 'evento_detectado') {
      console.log('Image analysis type:', imageAnalysis.tipo);
      
      let responseText = imageAnalysis.pergunta_usuario || 'Analisei a imagem. O que você quer lembrar sobre isso?';
      
      if (imageAnalysis.tipo === 'saude') {
        responseText = imageAnalysis.pergunta_usuario || 'Vi que parece ser algo de saúde. Quer que eu crie um lembrete de medicamento?';
      } else if (imageAnalysis.tipo === 'generico') {
        responseText = imageAnalysis.pergunta_usuario || 'O que você quer lembrar sobre essa imagem?';
      } else if (imageAnalysis.tipo === 'nao_identificado') {
        responseText = imageAnalysis.pergunta_usuario || 'Não consegui identificar bem a imagem. Pode me dizer o que quer agendar?';
      }

      const actionData = {
        acao: 'conversar',
        resposta_usuario: responseText,
        idioma_detectado: 'pt'
      };

      let ssePayload = `data: {"text": "${responseText.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"}\n\n`;
      ssePayload += `data: {"action": ${JSON.stringify(actionData)}}\n\n`;
      ssePayload += `data: [DONE]\n\n`;

      return new Response(ssePayload, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });
    }

    const authHeader = req.headers.get('authorization');
    let userContext = "";
    let userId: string | null = null;
    let supabase: any = null;
    let userProfile: UserProfile = {};
    let userName = "";

    if (authHeader) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      supabase = createClient(supabaseUrl, supabaseKey);
      
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        userId = user.id;
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (profile) {
          userProfile = profile;
          userName = profile.display_name || '';
          
          userContext += `\n\nCONTEXTO DO USUARIO`;
          userContext += `\nNome: ${userName || 'Não informado'}`;
          
          if (profile.context_aware_enabled && profile.preferred_times && profile.preferred_times.length > 0) {
            userContext += `\nHorarios preferidos: ${JSON.stringify(profile.preferred_times)}`;
          }
        }
        
        const { data: events } = await supabase
          .from('events')
          .select('*')
          .eq('user_id', userId)
          .gte('event_date', new Date().toISOString().split('T')[0])
          .order('event_date', { ascending: true })
          .limit(10);
        
        if (events && events.length > 0) {
          userContext += `\n\nPROXIMOS EVENTOS`;
          events.forEach((e: any) => {
            userContext += `\n- [ID: ${e.id}] ${e.title} em ${e.event_date}${e.event_time ? ' às ' + e.event_time : ''}${e.location ? ' em ' + e.location : ''} (${e.priority})`;
          });

          if (userProfile.auto_reschedule_enabled) {
            const today = new Date().toISOString().split('T')[0];
            const { data: pastEvents } = await supabase
              .from('events')
              .select('*')
              .eq('user_id', userId)
              .eq('status', 'pending')
              .lt('event_date', today)
              .limit(3);

            if (pastEvents && pastEvents.length > 0) {
              userContext += `\n\nEVENTOS PERDIDOS (sugira reagendamento)`;
              pastEvents.forEach((e: any) => {
                userContext += `\n- [ID: ${e.id}] ${e.title} era em ${e.event_date}`;
              });
            }
          }
        }
        
        if (userProfile.smart_suggestions_enabled) {
          const { data: patterns } = await supabase
            .from('user_patterns')
            .select('*')
            .eq('user_id', userId)
            .order('confidence', { ascending: false })
            .limit(5);
          
          if (patterns && patterns.length > 0) {
            userContext += `\n\nPADROES APRENDIDOS (use para sugestoes inteligentes)`;
            patterns.forEach((p: any) => {
              userContext += `\n- ${p.pattern_type}: ${JSON.stringify(p.pattern_data)} (confianca: ${(p.confidence * 100).toFixed(0)}%)`;
            });
          }
        }
      }
    }

    const today = new Date();
    const todayStr = today.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const todayISO = today.toISOString().split('T')[0];

    const greetingInstruction = userName 
      ? `Cumprimente o usuario pelo nome "${userName}". Exemplo: "E ai ${userName}, o que vamos agendar hoje?"`
      : `Use uma saudacao casual como "E ai, o que vamos agendar hoje?"`;

    const onboardingContext = isOnboarding ? `
MODO ONBOARDING ATIVO
Este e um novo usuario que esta criando seu primeiro evento.
- Seja amigavel e encorajador
- CRIE O EVENTO IMEDIATAMENTE mesmo no onboarding
- NAO pergunte informacoes - use padroes (hoje, dia inteiro)
- Apos criar, o usuario pode corrigir se precisar
` : '';

    // KAIRO EVENT ENGINE v2 — CRIAÇÃO OTIMISTA
    const systemPrompt = `KAIRO EVENT ENGINE v2

Voce e Kairo, um motor de agendamento focado em VELOCIDADE.

=== PRINCIPIO CENTRAL — CRIACAO OTIMISTA ===

Seu objetivo primario e REDUZIR FRICCAO.
Voce opera no modelo CRIACAO PRIMEIRO, CORRECAO DEPOIS.

REGRA DE OURO:
Se o usuario menciona QUALQUER atividade ou compromisso, CRIE O EVENTO IMEDIATAMENTE.

Correcoes acontecem DEPOIS da criacao, nao antes.

=== REGRA DE PADRAO ABSOLUTO (CRITICO) ===

Se o usuario menciona QUALQUER atividade/compromisso sem data nem hora:
- data = HOJE (${todayISO})
- hora = null (dia inteiro)
- CRIAR IMEDIATAMENTE

Exemplos que devem CRIAR evento na hora:
- "lanchonete" → CRIAR "Lanchonete" para HOJE, dia inteiro
- "cinema" → CRIAR "Cinema" para HOJE, dia inteiro  
- "barbearia" → CRIAR "Barbearia" para HOJE, dia inteiro
- "mercado" → CRIAR "Mercado" para HOJE, dia inteiro
- "farmacia" → CRIAR "Farmacia" para HOJE, dia inteiro

NUNCA use "coletar_informacoes" para perguntar data/hora.
SEMPRE crie o evento primeiro. Usuario corrige depois se precisar.

=== INTERPRETACAO DE TEMPO ===

Quando o usuario menciona hora SEM data:
- Assuma HOJE se a hora ainda nao passou
- Assuma AMANHA se a hora ja passou

Hora atual: ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: userTimezone })}

Exemplos:
"as tres da tarde vou na barbearia" (enviado as 14:00) → HOJE as 15:00
"as tres da tarde vou na barbearia" (enviado as 16:00) → AMANHA as 15:00

=== EXEMPLOS CRITICOS — CERTO vs ERRADO ===

ERRADO (NAO FACA ISSO):
User: "lanchonete"
AI: {"acao": "coletar_informacoes", "resposta_usuario": "Quando quer ir?"}

CERTO:
User: "lanchonete"
AI: {"acao": "criar_evento", "titulo": "Lanchonete", "data": "${todayISO}", "hora": null, ...}

ERRADO:
User: "cinema"  
AI: {"acao": "coletar_informacoes", "resposta_usuario": "Que dia?"}

CERTO:
User: "cinema"
AI: {"acao": "criar_evento", "titulo": "Cinema", "data": "${todayISO}", "hora": null, ...}

ERRADO:
User: "vou no shopping"
AI: {"acao": "conversar", "resposta_usuario": "Quando voce quer ir?"}

CERTO:
User: "vou no shopping"
AI: {"acao": "criar_evento", "titulo": "Shopping", "data": "${todayISO}", "hora": null, ...}

=== FLUXO DE CRIACAO RAPIDA ===

Passo 1: Detectar atividade/compromisso na mensagem
Passo 2: Extrair o que existe (titulo, hora, data, local)
Passo 3: CRIAR EVENTO IMEDIATAMENTE com padroes

Dados minimos = apenas TITULO (atividade detectada)

Se nao tem data → usa HOJE
Se nao tem hora → evento dia inteiro (null)
Se nao tem local → null

NAO PERGUNTE. CRIE.

=== COMPORTAMENTO DE CAMPOS ===

titulo: Use o substantivo da atividade exatamente como falado
local: Se mencionado → armazenar. Se nao → null (NAO perguntar)
hora: Se mencionado → usar. Se nao → null (dia inteiro)
duracao: Padrao 60 minutos
notificacao: Padrao "30 min antes"
prioridade:
- medico, hospital, emergencia = high
- trabalho, reuniao = medium
- lazer, cinema, cafe = low

=== CONFIRMACAO POS-CRIACAO (OBRIGATORIO) ===

APOS criar o evento, envie confirmacao com resumo visual.

{"acao": "criar_evento", "titulo": "...", "data": "${todayISO}", "hora": null, "local": null, "prioridade": "low", "categoria": "pessoal", "duracao_minutos": 60, "resumo_evento": {"titulo": "...", "data": "Hoje", "hora": "Dia inteiro", "local": "", "notificacao": "30 min antes"}, "idioma_detectado": "pt", "resposta_usuario": "Criado! Quer editar algo?"}

=== MODO EDICAO (CRITICO) ===

CONTEXTO DE EDICAO TEM VALIDADE DE 2 MINUTOS.
Se passou mais de 2 minutos desde a ultima mensagem do assistant, trate como nova conversa.

DETECTAR MODO EDICAO (SOMENTE SE CONTEXTO ATIVO):
Se a ultima mensagem do sistema foi "Quer editar algo?" ou "Criado! Quer editar algo?"
E o usuario responde "sim", "quero", "vou", "editar", "s":
→ Use edit_event para perguntar O QUE quer mudar
→ NAO crie outro evento!

Se usuario diz "nao", "errado", "muda", "nao e isso", "corrige":
→ Use edit_event para perguntar O QUE quer mudar

Exemplo CORRETO:
Sistema: "Criado! Quer editar algo?"
Usuario: "sim" (dentro de 2 minutos)
→ edit_event com resposta_usuario: "O que voce quer mudar? Titulo, data, hora ou local?"

Exemplo ERRADO (NAO FACA):
Sistema: "Criado! Quer editar algo?"
Usuario: "sim"
→ create_event (ERRADO! NAO crie novo evento!)

=== EDICAO NATURAL DE EVENTOS (update_event) ===

Quando usuario menciona ALTERAR/MUDAR/EDITAR/CANCELAR + nome de evento existente,
use update_event para buscar e modificar o evento.

Exemplos:
- "quero mudar o horario da barbearia pras 16h" → update_event busca="barbearia", novo_horario="16:00"
- "muda a reuniao de amanha para sexta" → update_event busca="reuniao", nova_data="YYYY-MM-DD"
- "altera o dentista pras 14h" → update_event busca="dentista", novo_horario="14:00"
- "muda o local do cinema pro shopping" → update_event busca="cinema", novo_local="shopping"

IMPORTANTE: Palavras como "mudar", "alterar", "editar", "trocar" + nome de evento = SEMPRE edicao!

=== REGRAS DE LOCAL (RELAXADAS) ===

Na criacao: Aceite locais genericos: "cinema", "barbearia", "shopping"
Na edicao: Se usuario pedir precisao, locais comerciais = nome + cidade

=== CONTRATO JSON ===

SEMPRE responda APENAS com JSON valido.

Para CRIAR evento:
{"acao": "criar_evento", "titulo": "Lanchonete", "data": "${todayISO}", "hora": null, "local": null, "prioridade": "low", "categoria": "pessoal", "duracao_minutos": 60, "resumo_evento": {"titulo": "Lanchonete", "data": "Hoje", "hora": "Dia inteiro", "local": "", "notificacao": "30 min antes"}, "idioma_detectado": "pt", "resposta_usuario": "Criado! Quer editar algo?"}

Para LISTAR eventos:
{"acao": "listar_eventos", "data": "YYYY-MM-DD ou null", "limite": 10, "idioma_detectado": "pt", "resposta_usuario": "Seus proximos compromissos:"}

Para EDITAR evento:
{"acao": "editar_evento", "evento_id": "...", "titulo": "...", "data": "...", "hora": "...", "local": "...", "resumo_evento": {...}, "idioma_detectado": "pt", "resposta_usuario": "Atualizado!"}

Para DELETAR evento:
{"acao": "deletar_evento", "evento_id": "...", "idioma_detectado": "pt", "resposta_usuario": "Beleza, removi o evento!"}

Para CONVERSAR (saudacoes):
${greetingInstruction}
{"acao": "conversar", "idioma_detectado": "pt", "resposta_usuario": "saudacao personalizada"}

Para PERGUNTAS FORA DO ESCOPO (quem e voce, noticias, esportes, clima, etc):
VARIE as respostas de forma NATURAL e HUMANA. Voce se chama Kairo, um assistente de agenda.
Exemplos de respostas variadas (escolha uma diferente a cada vez):
- "Ah, isso eu nao sei te dizer... Mas bora agendar algo? 📅"
- "Po, nao e minha praia, haha. Sou o Kairo, focado em te ajudar a nao esquecer das coisas!"
- "Opa, essa eu passo! Minha especialidade e organizar sua agenda. O que quer lembrar?"
- "Haha, queria saber! Mas sou so o Kairo, seu assistente de lembretes. Bora agendar?"
- "Nao manjo disso nao! Mas se quiser marcar algo, to aqui."
- "Eita, foge do meu escopo! Sou seu assistente de agenda, nao um oraculo haha"
- "Quem dera eu soubesse! Mas meu negocio e te ajudar a nao esquecer dos compromissos."
NAO repita a mesma frase. Seja criativo e casual, como se fosse um amigo.

=== HARD RULES ===

- SEMPRE crie primeiro, pergunte depois
- NUNCA use coletar_informacoes para coleta inicial
- NUNCA bloqueie criacao se atividade e detectada
- Uma palavra como "lanchonete" JA E suficiente para criar
- Correcoes sao EDICAO do evento existente
- NUNCA formate resumo como markdown na resposta_usuario

=== CONTEXTO ===

Data de hoje: ${todayStr} (${todayISO})
- "hoje" = ${todayISO}
- "amanha" = dia seguinte
- Dias da semana = proxima ocorrencia

Idiomas suportados: pt, en, es, fr, de, it, ja, ko, zh

=== REGRA ABSOLUTA FINAL ===
SAUDACOES/CONFIRMACOES (NAO sao atividades - use chat_response):
- oi, ola, opa, e ai, fala, hey, blz, beleza, ok, certo, valeu, obrigado, bom dia, boa tarde, boa noite, show, legal

ATIVIDADES (CRIE evento - use create_event):
- lanchonete, cinema, barbearia, shopping, mercado, medico, reuniao, etc
- Qualquer LUGAR ou ACAO especifica = atividade

Se detectar atividade:
- acao DEVE ser "criar_evento"
- Mesmo que informacao esteja incompleta, CRIE com padroes

${onboardingContext}

${userContext}

${imageAnalysis ? `IMAGEM ANALISADA: ${JSON.stringify(imageAnalysis)}` : ''}`;

    console.log('Sending to GPT-4o-mini with Tool Calling...');

    // Define tools to FORCE specific behavior
    const tools = [
      {
        type: "function",
        function: {
          name: "create_event",
          description: "SEMPRE use esta funcao quando usuario mencionar QUALQUER atividade, compromisso ou evento. Exemplos: lanchonete, cinema, barbearia, shopping, medico, reuniao, etc. Use mesmo sem data/hora especificada - use padroes. NAO use se usuario disse 'sim' apos 'Quer editar algo?' - nesse caso use edit_event.",
          parameters: {
            type: "object",
            properties: {
              titulo: { type: "string", description: "Nome da atividade exatamente como usuario falou" },
              data: { type: "string", description: `Data YYYY-MM-DD. Padrao: ${todayISO} (hoje)` },
              hora: { type: ["string", "null"], description: "Hora HH:MM ou null para dia inteiro" },
              local: { type: ["string", "null"], description: "Local se mencionado, senao null" },
              prioridade: { type: "string", enum: ["low", "medium", "high"], description: "low=lazer, medium=trabalho, high=saude/urgente" },
              categoria: { type: "string", description: "pessoal, trabalho, saude, lazer" },
              descricao: { type: "string", description: "Descricao CURTA (max 10 palavras) e amigavel do evento. Ex: 'Hora de cuidar do visual', 'Momento de diversao com a familia', 'Consulta importante de saude'" },
              resposta_usuario: { type: "string", description: "Mensagem curta confirmando criacao. Ex: Pronto! Criei o evento X para hoje." }
            },
            required: ["titulo", "data", "prioridade", "categoria", "descricao", "resposta_usuario"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "edit_event",
          description: "OBRIGATORIO quando usuario responder 'sim', 'quero', 'vou', 'editar' apos mensagem 'Quer editar algo?' ou 'Criado! Quer editar algo?'. Pergunte O QUE deseja mudar. NAO crie novo evento!",
          parameters: {
            type: "object",
            properties: {
              resposta_usuario: { type: "string", description: "Pergunte o que quer mudar. Ex: 'O que voce quer mudar? Titulo, data, hora ou local?'" }
            },
            required: ["resposta_usuario"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "chat_response",
          description: "Use para: saudacoes (oi, ola, opa, e ai, fala, hey, bom dia, boa tarde, boa noite), confirmacoes (ok, certo, blz, beleza, legal, valeu, obrigado), perguntas sobre o sistema (quem e voce, quem te criou), ou temas fora do escopo de eventos (esportes, clima, noticias, politica, etc). IMPORTANTE: Para respostas fora do escopo, seja CRIATIVO e HUMANO, variando as frases como um amigo faria. Voce e o Kairo, assistente de agenda. Use humor leve e linguagem casual brasileira.",
          parameters: {
            type: "object",
            properties: {
              resposta_usuario: { type: "string", description: "Resposta conversacional VARIADA e HUMANA. Para fora do escopo: seja criativo, use humor leve, mencione que voce e o Kairo e sua funcao e ajudar com agenda. NAO repita sempre a mesma frase." }
            },
            required: ["resposta_usuario"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "list_events",
          description: "Use quando usuario perguntar sobre eventos existentes: 'o que tenho hoje', 'meus eventos', 'minha agenda'",
          parameters: {
            type: "object",
            properties: {
              data: { type: ["string", "null"], description: "Data especifica YYYY-MM-DD ou null para todos" },
              limite: { type: "number", description: "Limite de eventos. Padrao: 10" },
              resposta_usuario: { type: "string", description: "Introducao da lista" }
            },
            required: ["resposta_usuario"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_event",
          description: "SOMENTE use quando usuario EXPLICITAMENTE usar palavras de edicao como: 'mudar', 'muda', 'alterar', 'altera', 'editar', 'edita', 'trocar', 'troca' seguido do NOME de um evento existente. NUNCA use para novas atividades! Ex CORRETO: 'muda barbearia pras 16h'. Ex ERRADO: 'vou no salao hoje' (isso e NOVO evento).",
          parameters: {
            type: "object",
            properties: {
              busca_evento: { type: "string", description: "Nome ou parte do titulo do evento a buscar" },
              novo_titulo: { type: ["string", "null"], description: "Novo titulo se usuario quiser mudar" },
              nova_data: { type: ["string", "null"], description: "Nova data YYYY-MM-DD se usuario quiser mudar" },
              novo_horario: { type: ["string", "null"], description: "Novo horario HH:MM se usuario quiser mudar" },
              novo_local: { type: ["string", "null"], description: "Novo local se usuario quiser mudar" },
              resposta_usuario: { type: "string", description: "Confirmacao da alteracao" }
            },
            required: ["busca_evento", "resposta_usuario"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "delete_event",
          description: "Use SOMENTE quando usuario quiser CANCELAR/REMOVER/DELETAR um evento. Palavras-chave: 'cancelar', 'cancela', 'remover', 'remove', 'deletar', 'deleta', 'apagar', 'apaga', 'tirar', 'tira'. Ex: 'cancela a reuniao', 'remove o evento da barbearia', 'apaga o cinema'.",
          parameters: {
            type: "object",
            properties: {
              busca_evento: { type: "string", description: "Nome ou parte do titulo do evento a deletar" },
              resposta_usuario: { type: "string", description: "Confirmacao AMIGAVEL da remocao. Ex: 'Beleza, removi a reuniao das 15h do seu calendario!', 'Pronto, tirei o evento da barbearia pra voce!'" }
            },
            required: ["busca_evento", "resposta_usuario"]
          }
        }
      }
    ];

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
          ...messages,
        ],
        tools: tools,
        tool_choice: "required", // MUST use a tool
        temperature: 0.2,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GPT-4o-mini error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisicoes. Aguarde um momento." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Erro ao processar sua mensagem." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const message = aiResponse.choices?.[0]?.message;
    
    console.log('AI response message:', JSON.stringify(message));

    let action: KairoAction;
    
    // Get last user message to determine context
    const lastUserMessage = messages[messages.length - 1]?.content?.toLowerCase()?.trim() || '';
    
    // Greetings/confirmations that should NEVER create events
    const greetings = ['opa', 'oi', 'ola', 'olá', 'e ai', 'eai', 'fala', 'hey', 'hi', 'hello',
                       'blz', 'beleza', 'ok', 'certo', 'valeu', 'obrigado', 'obg', 'vlw',
                       'bom dia', 'boa tarde', 'boa noite', 'show', 'legal', 'massa',
                       'sim', 'nao', 'não', 's', 'n', 'yes', 'no', 'yeah', 'thanks'];
    
    const isGreeting = greetings.some(g => lastUserMessage === g || lastUserMessage === g + '!');
    
    // Check timestamp of last assistant message for context timeout (2 minutes)
    const previousAssistantMessages = messages.filter((m: any) => m.role === 'assistant');
    const lastAssistantMsg = previousAssistantMessages.slice(-1)[0];
    const lastAssistantTime = lastAssistantMsg?.created_at ? new Date(lastAssistantMsg.created_at) : null;
    const now = new Date();
    const minutesSinceLastAssistant = lastAssistantTime 
      ? (now.getTime() - lastAssistantTime.getTime()) / (1000 * 60) 
      : Infinity;
    
    // Context is only active if less than 1 minute passed
    const contextIsActive = minutesSinceLastAssistant < 1;
    
    // Check if previous AI message asked about editing (only if context is active)
    const recentAssistantMessages = previousAssistantMessages.slice(-2);
    const askedAboutEditing = contextIsActive && recentAssistantMessages.some((m: any) => 
      m.content?.toLowerCase()?.includes('quer editar') || 
      m.content?.toLowerCase()?.includes('quer mudar')
    );
    
    // Words that indicate user wants to edit after being asked
    const editConfirmations = ['sim', 's', 'quero', 'vou', 'editar', 'yes', 'yeah', 'y'];
    const wantsToEdit = askedAboutEditing && editConfirmations.some(e => lastUserMessage === e || lastUserMessage === e + '!');
    
    console.log(`Last user message: "${lastUserMessage}", isGreeting: ${isGreeting}, contextIsActive: ${contextIsActive}, minutesSinceLastAssistant: ${minutesSinceLastAssistant.toFixed(1)}, askedAboutEditing: ${askedAboutEditing}, wantsToEdit: ${wantsToEdit}`);
    
    // Process tool calls
    if (message?.tool_calls && message.tool_calls.length > 0) {
      let toolCall;
      
      // CRITICAL: Detect if message describes a NEW event (not an edit)
      // Patterns like "vou no/na", "tenho", "marcar", "agendar" + place/activity = NEW EVENT
      const newEventPatterns = [
        /\b(vou|vamos|ir)\s+(no|na|ao|à|em|pra|para)\b/i,  // "vou no salão"
        /\b(tenho|temos)\s+(um|uma|que|.*?(às|as|\d))/i,    // "tenho reunião"
        /\b(marcar|agendar|criar)\s+(um|uma)/i,             // "marcar uma consulta"
        /\bhoje\s+(às|as)\s+\d/i,                           // "hoje às 15h"
        /\b(amanhã|amanha)\s+(às|as)\s+\d/i,                // "amanhã às 10h"
      ];
      const isNewEventDescription = newEventPatterns.some(p => p.test(lastUserMessage));
      
      // If user wants to edit, prioritize edit_event tool
      if (wantsToEdit) {
        const editCall = message.tool_calls.find((tc: any) => tc.function.name === 'edit_event');
        const chatCall = message.tool_calls.find((tc: any) => tc.function.name === 'chat_response');
        toolCall = editCall || chatCall || message.tool_calls[0];
        console.log(`Edit mode detected, prioritizing edit_event. Found edit_event: ${editCall ? 'yes' : 'no'}`);
      }
      // CRITICAL FIX: If message describes a NEW event, ALWAYS prioritize create_event
      else if (isNewEventDescription && message.tool_calls.length > 1) {
        const createCall = message.tool_calls.find((tc: any) => tc.function.name === 'create_event');
        if (createCall) {
          toolCall = createCall;
          console.log(`New event description detected: "${lastUserMessage}". Prioritizing create_event over other tools.`);
        } else {
          toolCall = message.tool_calls[0];
        }
      }
      // If last message is greeting and NOT in edit context, prioritize chat_response
      else if (isGreeting && message.tool_calls.length > 1) {
        const chatResponseCall = message.tool_calls.find((tc: any) => tc.function.name === 'chat_response');
        toolCall = chatResponseCall || message.tool_calls[0];
        console.log(`Greeting detected, prioritizing chat_response. Found: ${chatResponseCall ? 'yes' : 'no'}`);
      } else {
        // CRITICAL: Check if first tool is update_event but message has NO explicit edit words
        // Words that indicate editing (NOT deleting)
        const explicitEditWords = /\b(muda|mudar|altera|alterar|edita|editar|troca|trocar)\b/i;
        // Words that indicate deletion
        const explicitDeleteWords = /\b(cancela|cancelar|remove|remover|deleta|deletar|apaga|apagar|tira|tirar)\b/i;
        const hasExplicitEditWord = explicitEditWords.test(lastUserMessage);
        const hasExplicitDeleteWord = explicitDeleteWords.test(lastUserMessage);
        
        const firstTool = message.tool_calls[0];
        // If deletion word detected, prioritize delete_event
        if (hasExplicitDeleteWord) {
          const deleteCall = message.tool_calls.find((tc: any) => tc.function.name === 'delete_event');
          toolCall = deleteCall || firstTool;
          console.log(`Delete word detected in "${lastUserMessage}". Using ${toolCall.function.name}.`);
        } else if (firstTool.function.name === 'update_event' && !hasExplicitEditWord) {
          // AI incorrectly chose update_event - find create_event or chat_response instead
          const createCall = message.tool_calls.find((tc: any) => tc.function.name === 'create_event');
          const chatCall = message.tool_calls.find((tc: any) => tc.function.name === 'chat_response');
          toolCall = createCall || chatCall || firstTool;
          console.log(`Blocked update_event (no explicit edit word in "${lastUserMessage}"). Using ${toolCall.function.name} instead.`);
        } else {
          toolCall = firstTool;
        }
      }
      
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      
      console.log(`Tool called: ${functionName}`, args);
      
      if (functionName === "create_event") {
        action = {
          acao: 'criar_evento',
          titulo: args.titulo,
          data: args.data || todayISO,
          hora: args.hora || null,
          local: args.local || null,
          prioridade: args.prioridade || 'low',
          categoria: args.categoria || 'pessoal',
          duracao_minutos: 60,
          resposta_usuario: args.resposta_usuario,
          resumo_evento: {
            titulo: args.titulo,
            data: args.data === todayISO ? 'Hoje' : args.data,
            hora: args.hora || 'Dia inteiro',
            local: args.local || '',
            notificacao: '30 min antes'
          }
        };
      } else if (functionName === "list_events") {
        action = {
          acao: 'listar_eventos',
          data: args.data || null,
          limite: args.limite || 10,
          resposta_usuario: args.resposta_usuario
        };
      } else if (functionName === "edit_event") {
        // User wants to edit - ask what to change
        action = {
          acao: 'conversar',
          resposta_usuario: args.resposta_usuario || "O que você quer mudar? Título, data, hora ou local?"
        };
        console.log('Edit mode: asking user what to change');
      } else if (functionName === "update_event") {
        // Natural language update - search for event and update it
        // This is handled INLINE and should NOT go through executeAction again
        console.log('Update event requested:', args);
        
        let updateSuccess = false;
        let updatedEventData: any = null;
        
        // Check for direct event ID in user message (e.g., "editar evento id:xxx")
        const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop()?.content || '';
        const idMatch = lastUserMessage.match(/id:([a-f0-9-]+)/i);
        let eventIdToUpdate = idMatch ? idMatch[1] : null;
        
        if (userId && supabase && (args.busca_evento || eventIdToUpdate)) {
          let evento: any = null;
          
          // If we have a direct ID, use it
          if (eventIdToUpdate) {
            console.log('Direct event ID provided:', eventIdToUpdate);
            const { data: eventById } = await supabase
              .from('events')
              .select('*')
              .eq('id', eventIdToUpdate)
              .eq('user_id', userId)
              .single();
            evento = eventById;
          } else {
            // Search for matching event by name
            const { data: eventos } = await supabase
              .from('events')
              .select('*')
              .eq('user_id', userId)
              .ilike('title', `%${args.busca_evento}%`)
              .order('created_at', { ascending: false })
              .limit(1);
            evento = eventos?.[0];
          }
          
          if (evento) {
            const updates: any = {};
            
            if (args.novo_titulo) updates.title = args.novo_titulo;
            if (args.nova_data) updates.event_date = args.nova_data;
            if (args.novo_horario) updates.event_time = args.novo_horario;
            if (args.novo_local) updates.location = args.novo_local;
            
            // Reset call_alert_sent_at when date or time changes so new notification can be sent
            if (args.nova_data || args.novo_horario) {
              updates.call_alert_sent_at = null;
              console.log(`Resetting call_alert_sent_at for event ${evento.id} due to date/time change`);
            }
            
            if (Object.keys(updates).length > 0) {
              const { data: updatedEvent, error } = await supabase
                .from('events')
                .update(updates)
                .eq('id', evento.id)
                .select()
                .single();
              
              if (!error && updatedEvent) {
                updateSuccess = true;
                updatedEventData = updatedEvent;
                
                // Build a human, friendly message describing what changed
                const changes: string[] = [];
                if (args.novo_horario) changes.push(`horário pra ${updatedEvent.event_time}`);
                if (args.nova_data) changes.push(`data pra ${updatedEvent.event_date}`);
                if (args.novo_titulo) changes.push(`nome pra "${updatedEvent.title}"`);
                if (args.novo_local) changes.push(`local pra ${updatedEvent.location}`);
                
                const changesText = changes.length > 0 
                  ? changes.join(' e ') 
                  : 'os detalhes';
                
                const humanResponse = `Pronto, mudei o ${changesText} do "${evento.title}". Tá certinho agora!`;
                
                // Mark action as already executed so executeAction won't be called
                action = {
                  acao: 'editar_evento',
                  evento_id: evento.id,
                  resposta_usuario: humanResponse,
                  resumo_evento: {
                    titulo: updatedEvent.title,
                    data: updatedEvent.event_date,
                    hora: updatedEvent.event_time || 'Dia inteiro',
                    local: updatedEvent.location || '',
                    notificacao: '30 min antes'
                  },
                  // Include full Supabase-format event for EventCreatedCard
                  evento_atualizado: updatedEvent,
                  _alreadyExecuted: true // Flag to skip executeAction
                };
                console.log('Event updated successfully:', updatedEvent);
              } else {
                action = {
                  acao: 'conversar',
                  resposta_usuario: 'Não consegui atualizar o evento. Tente novamente.'
                };
              }
            } else {
              action = {
                acao: 'conversar',
                resposta_usuario: args.resposta_usuario
              };
            }
          } else {
            action = {
              acao: 'conversar',
              resposta_usuario: `Não encontrei nenhum evento com "${args.busca_evento}". Quer que eu liste seus eventos?`
            };
          }
        } else {
          action = {
            acao: 'conversar',
            resposta_usuario: args.resposta_usuario
          };
        }
      } else if (functionName === "delete_event") {
        // Delete event - search and delete
        console.log('Delete event requested:', args);
        
        if (userId && supabase && args.busca_evento) {
          // Search for matching event
          const { data: eventos } = await supabase
            .from('events')
            .select('*')
            .eq('user_id', userId)
            .ilike('title', `%${args.busca_evento}%`)
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (eventos && eventos.length > 0) {
            const eventoParaDeletar = eventos[0];
            
            // Delete the event
            const { error } = await supabase
              .from('events')
              .delete()
              .eq('id', eventoParaDeletar.id);
            
            if (!error) {
              // Build friendly confirmation message
              const timeStr = eventoParaDeletar.event_time 
                ? ` das ${eventoParaDeletar.event_time}` 
                : '';
              const humanResponse = args.resposta_usuario || 
                `Beleza, removi o "${eventoParaDeletar.title}"${timeStr} do seu calendário!`;
              
              action = {
                acao: 'deletar_evento',
                evento_id: eventoParaDeletar.id,
                resposta_usuario: humanResponse,
                evento_deletado: eventoParaDeletar, // Full event data for card
                _alreadyExecuted: true
              };
              console.log('Event deleted successfully:', eventoParaDeletar);
            } else {
              console.error('Delete error:', error);
              action = {
                acao: 'conversar',
                resposta_usuario: 'Ops, não consegui remover o evento. Tenta de novo?'
              };
            }
          } else {
            action = {
              acao: 'conversar',
              resposta_usuario: `Não encontrei nenhum evento com "${args.busca_evento}". Quer que eu liste seus eventos?`
            };
          }
        } else {
          action = {
            acao: 'conversar',
            resposta_usuario: args.resposta_usuario || 'Qual evento você quer remover?'
          };
        }
      } else {
        // chat_response
        action = {
          acao: 'conversar',
          resposta_usuario: args.resposta_usuario
        };
      }
    } else {
      // Fallback if no tool call (shouldn't happen with tool_choice: required)
      const content = message?.content || '';
      console.log('No tool call, fallback to content:', content);
      action = { acao: 'conversar', resposta_usuario: content };
    }

    console.log('Parsed action:', action);

    let executionResult: { success: boolean; data?: any; error?: string; pastDate?: boolean; attemptedEvent?: any } = { success: true };
    
    // Skip executeAction if action was already processed inline (e.g., update_event)
    if (userId && supabase && !action._alreadyExecuted && action.acao !== 'conversar' && action.acao !== 'coletar_informacoes' && action.acao !== 'solicitar_confirmacao') {
      executionResult = await executeAction(supabase, userId, action, userProfile);
      console.log('Execution result:', executionResult);
      
      // Handle past date error - change action to data_passada
      if (executionResult.pastDate && executionResult.attemptedEvent) {
        console.log('Past date detected, changing action to data_passada');
        action = {
          ...action,
          acao: 'data_passada',
          resposta_usuario: 'Ops! Essa data e horário já passaram. Por favor, escolha uma data no futuro.',
          titulo: executionResult.attemptedEvent.titulo,
          data: executionResult.attemptedEvent.data,
          hora: executionResult.attemptedEvent.hora,
          local: executionResult.attemptedEvent.local,
        };
      }
    } else if (action._alreadyExecuted) {
      // Action was already executed inline, mark as success
      executionResult = { success: true, data: action };
      console.log('Action already executed inline, skipping executeAction');
    } else if (action.acao === 'solicitar_confirmacao') {
      // Pass through confirmation data
      executionResult = { success: true, data: action.resumo_evento };
    }

    let finalResponse = action.resposta_usuario || '';

    // Handle list events - include structured data for frontend cards
    let listedEvents: any[] | undefined;
    if (action.acao === 'listar_eventos' && executionResult.success && executionResult.data) {
      const events = executionResult.data as any[];
      if (events.length === 0) {
        finalResponse = action.resposta_usuario || 'Você não tem eventos agendados.';
      } else {
        // Map events to structured format for frontend
        listedEvents = events.map(e => ({
          id: e.id,
          titulo: e.title,
          data: e.event_date,
          hora: e.event_time,
          local: e.location,
          prioridade: e.priority,
          categoria: e.category
        }));
        finalResponse = action.resposta_usuario || `Você tem ${events.length} evento(s):`;
      }
    }

    console.log('Building SSE response with finalResponse:', finalResponse);
    
    const encoder = new TextEncoder();
    
    const chunks: string[] = [];
    
    const actionData = {
      action: action.acao,
      success: executionResult.success,
      data: executionResult.data || action,
      error: executionResult.error,
      resumo_evento: action.resumo_evento,
      evento_atualizado: action.evento_atualizado, // CRITICAL: Include for update card persistence
      evento_deletado: action.evento_deletado, // CRITICAL: Include for delete card persistence
      eventos: listedEvents // Include structured events for list action
    };
    
    const actionJson = JSON.stringify([actionData]);
    const actionContent = `<!--KAIRO_ACTIONS:${actionJson}-->`;
    chunks.push(`data: ${JSON.stringify({choices:[{delta:{content:actionContent}}]})}\n\n`);

    // Don't send text response for confirmation - the card handles the display
    if (finalResponse && action.acao !== 'solicitar_confirmacao') {
      chunks.push(`data: ${JSON.stringify({choices:[{delta:{content:finalResponse}}]})}\n\n`);
    }
    
    chunks.push('data: [DONE]\n\n');
    
    const fullResponse = chunks.join('');
    console.log('SSE Response prepared, total length:', fullResponse.length);

    return new Response(fullResponse, {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      },
    });

  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
