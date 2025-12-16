import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * FERRAMENTA 2 - INTERPRETAÇÃO DE TEXTO (ChatGPT)
 * 
 * Função EXATA:
 * - Entender a intenção do usuário
 * - Extrair informações estruturadas
 * - Retornar APENAS JSON
 * 
 * Regras:
 * - ChatGPT NÃO cria eventos
 * - ChatGPT NÃO acessa banco
 * - ChatGPT NÃO executa lógica
 * - ChatGPT SÓ interpreta linguagem humana
 * 
 * Fluxo: Texto → ChatGPT → JSON → Backend executa
 */

// JSON structure that AI will return - MASTER PROMPT CONTRACT
interface KairoAction {
  acao: 'criar_evento' | 'listar_eventos' | 'editar_evento' | 'deletar_evento' | 'conversar';
  titulo?: string;
  data?: string; // YYYY-MM-DD
  hora?: string; // HH:MM
  local?: string;
  duracao_minutos?: number;
  prioridade?: 'low' | 'medium' | 'high';
  categoria?: string;
  evento_id?: string;
  buscar_titulo?: string;
  limite?: number;
  idioma_detectado?: 'pt' | 'en' | 'es' | 'fr' | 'de' | 'it' | 'ja' | 'ko' | 'zh' | 'outro';
  observacoes?: string;
  resposta_usuario?: string;
}

// Execute action in database - THIS IS THE BACKEND LOGIC
async function executeAction(
  supabase: any, 
  userId: string, 
  action: KairoAction
): Promise<{ success: boolean; data?: any; error?: string; limitReached?: boolean }> {
  console.log(`Backend executing action: ${action.acao}`, action);

  try {
    switch (action.acao) {
      case 'criar_evento': {
        if (!action.titulo || !action.data) {
          return { success: false, error: 'Título e data são obrigatórios' };
        }

        // Check if user can create event (plan limits)
        const { data: canCreate } = await supabase.rpc('can_create_event', {
          _user_id: userId
        });

        if (!canCreate) {
          // Get user's current plan to show appropriate message
          const { data: planData } = await supabase.rpc('get_user_plan', {
            _user_id: userId
          });
          
          const planName = planData || 'free';
          const limits: Record<string, number> = { free: 14, plus: 50, super: 280 };
          const limit = limits[planName] || 14;
          
          return { 
            success: false, 
            limitReached: true,
            error: `Você atingiu o limite de ${limit} eventos do plano ${planName === 'free' ? 'grátis' : planName.toUpperCase()}. Atualize seu plano para criar mais eventos!`
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
        // Conversation doesn't need database action
        return { success: true, data: null };

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
    const { messages, imageAnalysis } = body;
    
    console.log('Received messages count:', messages?.length || 0);
    console.log('Has image analysis:', !!imageAnalysis);
    
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

    // Get user context
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
        
        const { data: events } = await supabase
          .from('events')
          .select('*')
          .eq('user_id', userId)
          .gte('event_date', new Date().toISOString().split('T')[0])
          .order('event_date', { ascending: true })
          .limit(10);
        
        const { data: patterns } = await supabase
          .from('user_patterns')
          .select('*')
          .eq('user_id', userId)
          .order('confidence', { ascending: false })
          .limit(5);
        
        if (profile) {
          userContext += `\n\nContexto do usuário:`;
          userContext += `\n- Nome: ${profile.display_name || 'Não informado'}`;
          
          if (profile.preferred_times && profile.preferred_times.length > 0) {
            userContext += `\n- Horários preferidos: ${JSON.stringify(profile.preferred_times)}`;
          }
        }
        
        if (events && events.length > 0) {
          userContext += `\n\nPróximos eventos do usuário:`;
          events.forEach((e: any) => {
            userContext += `\n- [ID: ${e.id}] ${e.title} em ${e.event_date}${e.event_time ? ' às ' + e.event_time : ''}${e.location ? ' em ' + e.location : ''} (${e.priority})`;
          });
        }
        
        if (patterns && patterns.length > 0) {
          userContext += `\n\nPadrões aprendidos:`;
          patterns.forEach((p: any) => {
            userContext += `\n- ${p.pattern_type}: ${JSON.stringify(p.pattern_data)}`;
          });
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

    // MASTER PROMPT - System prompt for INTERPRETATION ONLY
    const systemPrompt = `Você é Kairo, uma IA de interpretação para um aplicativo de agenda inteligente.

## 🧠 SUA FUNÇÃO ÚNICA
Você existe APENAS para:
- Entender pessoas (em qualquer idioma)
- Organizar intenções
- Devolver dados estruturados em JSON

## ❌ O QUE VOCÊ NUNCA FAZ
- Criar eventos (backend faz isso)
- Editar eventos (backend faz isso)
- Cancelar eventos (backend faz isso)
- Confirmar ações (backend faz isso)
- Dizer que algo foi salvo
- Acessar banco de dados
- Executar lógica de negócio
- Responder perguntas fora do escopo (esportes, notícias, clima, receitas, etc.)

## 🌍 SUPORTE MULTILÍNGUE
- Detecte automaticamente o idioma do usuário
- Entenda datas/horas no idioma original
- Idiomas: pt, en, es, fr, de, it, ja, ko, zh, outro

## 📐 CONTRATO DE RESPOSTA (OBRIGATÓRIO)
Sempre responda APENAS com JSON válido neste formato:

Para CRIAR evento:
{"acao": "criar_evento", "titulo": "...", "data": "YYYY-MM-DD", "hora": "HH:MM", "local": "...", "prioridade": "low|medium|high", "idioma_detectado": "pt|en|es|fr|de|it|ja|ko|zh|outro", "resposta_usuario": "mensagem amigável no idioma do usuário"}

Para LISTAR eventos:
{"acao": "listar_eventos", "data": "YYYY-MM-DD ou null", "limite": 10, "idioma_detectado": "...", "resposta_usuario": "..."}

Para EDITAR evento:
{"acao": "editar_evento", "evento_id": "..." ou "buscar_titulo": "...", "titulo": "...", "data": "...", "hora": "...", "idioma_detectado": "...", "resposta_usuario": "..."}

Para DELETAR evento:
{"acao": "deletar_evento", "evento_id": "..." ou "buscar_titulo": "...", "idioma_detectado": "...", "resposta_usuario": "..."}

Para CONVERSAR (saudações):
{"acao": "conversar", "idioma_detectado": "...", "resposta_usuario": "saudação amigável no idioma do usuário"}

Para FORA DO ESCOPO (esportes, notícias, clima, etc.):
{"acao": "conversar", "idioma_detectado": "...", "resposta_usuario": "Desculpa, só posso ajudar com eventos e lembretes! Quer que eu crie um lembrete?"}

## 📅 CONTEXTO TEMPORAL
Data de hoje: ${todayStr} (${todayISO})
- "hoje/today/hoy" = ${todayISO}
- "amanhã/tomorrow/mañana" = dia seguinte
- Dias da semana = próxima ocorrência

## 🎯 REGRAS DE PRIORIDADE
- médico, hospital, emergência, doctor, emergency = "high"
- trabalho, reunião, meeting, work = "medium"
- café, lazer, coffee, personal = "low"

## 👤 CONTEXTO DO USUÁRIO
${userContext}

${imageAnalysis ? `## 📷 ANÁLISE DE IMAGEM\nImagem analisada: ${JSON.stringify(imageAnalysis)}\nUse para sugerir criação de evento.` : ''}`;

    console.log('Sending to GPT-4o-mini for interpretation...');

    // Call GPT-4o-mini for INTERPRETATION
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
          JSON.stringify({ error: "Muitas requisições. Aguarde um momento." }),
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

    // Parse the JSON from AI
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

    // BACKEND EXECUTES THE ACTION
    let executionResult: { success: boolean; data?: any; error?: string } = { success: true };
    
    if (userId && supabase && action.acao !== 'conversar') {
      executionResult = await executeAction(supabase, userId, action);
      console.log('Execution result:', executionResult);
    }

    // Build response
    let finalResponse = action.resposta_usuario || '';

    // If listing events, append the list
    if (action.acao === 'listar_eventos' && executionResult.success && executionResult.data) {
      const events = executionResult.data as any[];
      if (events.length === 0) {
        finalResponse += '\n\nVocê não tem eventos agendados.';
      } else {
        finalResponse += '\n\n';
        for (const e of events) {
          const emoji = e.priority === 'high' ? '🔴' : e.priority === 'medium' ? '🟡' : '🟢';
          finalResponse += `${emoji} **${e.title}**\n`;
          finalResponse += `   📅 ${e.event_date}${e.event_time ? ' às ' + e.event_time : ''}\n`;
          if (e.location) finalResponse += `   📍 ${e.location}\n`;
          finalResponse += '\n';
        }
      }
    }

    // Return SSE stream format for compatibility
    console.log('Building SSE response with finalResponse:', finalResponse);
    
    const encoder = new TextEncoder();
    
    // Build the complete SSE response as chunks
    const chunks: string[] = [];
    
    // Send action metadata first
    const actionData = {
      action: action.acao,
      success: executionResult.success,
      data: executionResult.data,
      error: executionResult.error
    };
    
    const actionJson = JSON.stringify([actionData]);
    chunks.push(`data: {"choices":[{"delta":{"content":"<!--KAIRO_ACTIONS:${actionJson}-->"}}]}\n\n`);

    // Send response text - escape properly for JSON
    if (finalResponse) {
      const escapedResponse = finalResponse
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
      chunks.push(`data: {"choices":[{"delta":{"content":"${escapedResponse}"}}]}\n\n`);
    }
    
    // Send done marker
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
