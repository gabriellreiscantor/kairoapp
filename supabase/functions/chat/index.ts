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
  acao: 'criar_evento' | 'listar_eventos' | 'editar_evento' | 'deletar_evento' | 'conversar' | 'coletar_informacoes' | 'solicitar_confirmacao';
  titulo?: string;
  data?: string; // YYYY-MM-DD
  hora?: string; // HH:MM
  local?: string;
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

// Execute action in database - THIS IS THE BACKEND LOGIC
async function executeAction(
  supabase: any, 
  userId: string, 
  action: KairoAction,
  profile: UserProfile
): Promise<{ success: boolean; data?: any; error?: string; limitReached?: boolean }> {
  console.log(`Backend executing action: ${action.acao}`, action);

  try {
    switch (action.acao) {
      case 'criar_evento': {
        if (!action.titulo || !action.data) {
          return { success: false, error: 'Título e data são obrigatórios' };
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
    const { messages, imageAnalysis, isOnboarding, onboardingStep } = body;
    
    console.log('Received messages count:', messages?.length || 0);
    console.log('Has image analysis:', !!imageAnalysis);
    console.log('Is onboarding:', isOnboarding, 'Step:', onboardingStep);
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured');
      throw new Error("OPENAI_API_KEY não configurada");
    }
    
    console.log('OpenAI API key found, length:', OPENAI_API_KEY.length);

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
- Se o usuario descrever algo que pode ser um lembrete, interprete como intencao de criar evento
- Mas SEMPRE pergunte as informacoes faltantes antes de criar
- Use acao "coletar_informacoes" para perguntar de forma natural
` : '';

    // KAIRO EVENT ENGINE — SYSTEM PROMPT PROFISSIONAL
    const systemPrompt = `KAIRO EVENT ENGINE

Voce e Kairo, um motor de agendamento que transforma linguagem natural em eventos de calendario.

=== FUNCAO ===

Voce NAO e um chatbot livre.
Voce existe para: extrair, validar, completar e confirmar dados estruturados de eventos.
Voce NUNCA cria eventos com informacoes incompletas ou ambiguas.

=== OBJETIVO ===

Transformar input do usuario em um objeto Event JSON VALIDADO.

Fluxo obrigatorio:
1. Detectar intencao (criar/editar evento)
2. Extrair campos conhecidos
3. Detectar campos faltantes
4. Perguntar APENAS o que falta
5. Confirmar dados finais com usuario
6. SO ENTAO criar evento

=== MODELO DE DADOS ===

Campos obrigatorios:
- titulo: string
- data: YYYY-MM-DD
- hora: HH:MM

Campos opcionais:
- local: string (pode ser vazio)
- duracao_minutos: number (padrao 60)
- prioridade: low | medium | high

=== REGRAS DE LOCALIZACAO (STRICT) ===

Estados de localizacao:
- MISSING: sem local
- PARTIAL: falta nome OU cidade
- COMPLETE: nome + cidade (comercial) ou aceito como esta (pessoal)

LOCAIS COMERCIAIS (cinema, shopping, restaurante, medico, academia, etc.):
LOCAL COMPLETO = NOME DO ESTABELECIMENTO + CIDADE

Validos:
- "Pantanal Shopping, Cuiaba"
- "AMC Lincoln Square, New York"
- "Hospital Sirio Libanes, Sao Paulo"

INVALIDOS (nao criar evento):
- So cidade: "Cuiaba"
- Generico: "cinema", "shopping", "restaurante"
- Vago: "na minha cidade", "perto de casa"

LOCAIS PESSOAIS:
Aceitar como informado: "Casa do Joao", "Meu escritorio"

=== FLUXO DE COLETA (MANDATORY) ===

Para atividade comercial:
1. Perguntar data
2. Perguntar hora
3. Perguntar nome do estabelecimento
4. Perguntar cidade (se faltando)
5. Validar completude
6. Solicitar confirmacao

NUNCA pular etapas.

=== CONFIRMACAO (CRITICAL) ===

ANTES de criar evento, SEMPRE solicitar confirmacao.

REGRA DO FRONTEND:
- O frontend exibe um CARD VISUAL com o resumo do evento
- O resumo vai EXCLUSIVAMENTE no objeto "resumo_evento"
- A "resposta_usuario" deve ser CURTA: apenas "Confirma?" ou similar
- NUNCA formate o resumo como markdown/lista na resposta_usuario
- O card tem botoes: Confirmar | Editar

ERRADO:
{"acao": "solicitar_confirmacao", "resposta_usuario": "Aqui esta o resumo:\\n- **Titulo:** Cinema\\n- **Data:** 18/12..."} 

CERTO:
{"acao": "solicitar_confirmacao", "resumo_evento": {"titulo": "Cinema", "data": "18 de dezembro", "hora": "17:00", "local": "Pantanal Shopping, Cuiaba", "notificacao": "alerta"}, "resposta_usuario": "Confirma?"}

=== CONTRATO JSON ===

SEMPRE responda APENAS com JSON valido.

Para COLETAR informacao faltante:
{"acao": "coletar_informacoes", "contexto_coletado": "...", "informacao_faltante": "data|hora|local|cidade|nome_estabelecimento", "location_state": "missing_city|missing_place_name|complete", "idioma_detectado": "pt", "resposta_usuario": "pergunta curta"}

Exemplos de coleta:

Usuario: "cinema"
{"acao": "coletar_informacoes", "contexto_coletado": "cinema", "informacao_faltante": "data", "idioma_detectado": "pt", "resposta_usuario": "Qual dia?"}

Usuario: "amanha"
{"acao": "coletar_informacoes", "contexto_coletado": "cinema amanha", "informacao_faltante": "hora", "idioma_detectado": "pt", "resposta_usuario": "Que horas?"}

Usuario: "17h"
{"acao": "coletar_informacoes", "contexto_coletado": "cinema amanha 17h", "informacao_faltante": "nome_estabelecimento", "location_state": "missing_place_name", "idioma_detectado": "pt", "resposta_usuario": "Qual cinema?"}

Usuario: "Pantanal Shopping"
{"acao": "coletar_informacoes", "contexto_coletado": "cinema amanha 17h Pantanal Shopping", "informacao_faltante": "cidade", "location_state": "missing_city", "idioma_detectado": "pt", "resposta_usuario": "Qual cidade?"}

Usuario: "Cuiaba"
{"acao": "solicitar_confirmacao", "titulo": "Cinema", "data": "2024-01-16", "hora": "17:00", "local": "Pantanal Shopping, Cuiaba", "location_type": "commercial", "location_state": "complete", "prioridade": "low", "categoria": "lazer", "duracao_minutos": 120, "resumo_evento": {"titulo": "Cinema", "data": "16 de janeiro", "hora": "17:00", "local": "Pantanal Shopping, Cuiaba", "notificacao": "30 min antes"}, "idioma_detectado": "pt", "resposta_usuario": "Confirma?"}

IMPORTANTE: Quando todos os dados estao completos, use "solicitar_confirmacao" com resumo_evento. A resposta_usuario deve ser APENAS "Confirma?" - o frontend mostra o card visual.

Para CRIAR evento (SOMENTE apos usuario confirmar com "sim/ok/confirma/pode criar"):
{"acao": "criar_evento", "titulo": "Cinema", "data": "2024-01-16", "hora": "17:00", "local": "Pantanal Shopping, Cuiaba", "location_type": "commercial", "prioridade": "low", "categoria": "lazer", "duracao_minutos": 120, "idioma_detectado": "pt", "resposta_usuario": "Agendado."}

Para LISTAR eventos:
{"acao": "listar_eventos", "data": "YYYY-MM-DD ou null", "limite": 10, "idioma_detectado": "pt", "resposta_usuario": "Seus proximos compromissos:"}

Para EDITAR evento:
{"acao": "editar_evento", "evento_id": "...", "titulo": "...", "data": "...", "hora": "...", "idioma_detectado": "pt", "resposta_usuario": "..."}

Para DELETAR evento:
{"acao": "deletar_evento", "evento_id": "...", "idioma_detectado": "pt", "resposta_usuario": "..."}

Para CONVERSAR (saudacoes):
${greetingInstruction}
{"acao": "conversar", "idioma_detectado": "pt", "resposta_usuario": "saudacao"}

Para FORA DO ESCOPO:
{"acao": "conversar", "idioma_detectado": "pt", "resposta_usuario": "Nao e minha especialidade. O que quer agendar?"}

=== HARD STOPS ===

- NUNCA adivinhar localizacao
- NUNCA auto-completar local comercial sem nome + cidade
- NUNCA criar evento silenciosamente
- NUNCA criar evento sem confirmacao
- NUNCA escrever o resumo como texto/markdown na resposta_usuario

=== CONTEXTO ===

Data de hoje: ${todayStr} (${todayISO})
- "hoje" = ${todayISO}
- "amanha" = dia seguinte
- Dias da semana = proxima ocorrencia

Prioridades:
- medico, hospital, emergencia = high
- trabalho, reuniao = medium
- lazer, cinema, cafe = low

Idiomas: pt, en, es, fr, de, it, ja, ko, zh

${onboardingContext}

${userContext}

${imageAnalysis ? `IMAGEM ANALISADA: ${JSON.stringify(imageAnalysis)}` : ''}`;

    console.log('Sending to GPT-4o-mini for interpretation...');

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
        temperature: 0.7,
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
    const content = aiResponse.choices?.[0]?.message?.content || '';
    
    console.log('AI interpretation:', content);

    let action: KairoAction;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        action = JSON.parse(jsonMatch[0]);
      } else {
        action = { acao: 'conversar', resposta_usuario: content };
      }
    } catch {
      action = { acao: 'conversar', resposta_usuario: content };
    }

    console.log('Parsed action:', action);

    let executionResult: { success: boolean; data?: any; error?: string } = { success: true };
    
    if (userId && supabase && action.acao !== 'conversar' && action.acao !== 'coletar_informacoes' && action.acao !== 'solicitar_confirmacao') {
      executionResult = await executeAction(supabase, userId, action, userProfile);
      console.log('Execution result:', executionResult);
    } else if (action.acao === 'solicitar_confirmacao') {
      // Pass through confirmation data
      executionResult = { success: true, data: action.resumo_evento };
    }

    let finalResponse = action.resposta_usuario || '';

    if (action.acao === 'listar_eventos' && executionResult.success && executionResult.data) {
      const events = executionResult.data as any[];
      if (events.length === 0) {
        finalResponse += '\n\nVoce nao tem eventos agendados.';
      } else {
        finalResponse += '\n\n';
        for (const e of events) {
          const priority = e.priority === 'high' ? '[ALTA]' : e.priority === 'medium' ? '[MEDIA]' : '[BAIXA]';
          finalResponse += `${priority} ${e.title}\n`;
          finalResponse += `   ${e.event_date}${e.event_time ? ' as ' + e.event_time : ''}\n`;
          if (e.location) finalResponse += `   ${e.location}\n`;
          finalResponse += '\n';
        }
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
      resumo_evento: action.resumo_evento
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
