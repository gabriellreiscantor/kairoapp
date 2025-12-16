import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tool definitions for event management
const tools = [
  {
    type: "function",
    function: {
      name: "create_event",
      description: "Criar um novo evento ou lembrete no calendário do usuário. Use quando o usuário quiser agendar algo.",
      parameters: {
        type: "object",
        properties: {
          title: { 
            type: "string", 
            description: "Título descritivo do evento" 
          },
          event_date: { 
            type: "string", 
            description: "Data do evento no formato YYYY-MM-DD" 
          },
          event_time: { 
            type: "string", 
            description: "Horário no formato HH:MM (24h). Opcional." 
          },
          location: { 
            type: "string", 
            description: "Local do evento. Opcional." 
          },
          duration_minutes: { 
            type: "number", 
            description: "Duração em minutos. Padrão: 60" 
          },
          priority: { 
            type: "string", 
            enum: ["low", "medium", "high"],
            description: "Prioridade do evento. Padrão: medium" 
          },
          category: {
            type: "string",
            description: "Categoria do evento (trabalho, saúde, pessoal, etc). Padrão: geral"
          }
        },
        required: ["title", "event_date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_events",
      description: "Listar os eventos do usuário. Use quando o usuário perguntar sobre sua agenda.",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Data específica para buscar (YYYY-MM-DD). Se não informado, retorna eventos futuros."
          },
          limit: {
            type: "number",
            description: "Número máximo de eventos a retornar. Padrão: 10"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_event",
      description: "Atualizar um evento existente. Use quando o usuário quiser editar detalhes de um evento.",
      parameters: {
        type: "object",
        properties: {
          event_id: {
            type: "string",
            description: "ID do evento a ser atualizado"
          },
          title: { type: "string" },
          event_date: { type: "string" },
          event_time: { type: "string" },
          location: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high"] }
        },
        required: ["event_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_event",
      description: "Cancelar/deletar um evento. Use quando o usuário quiser remover um evento da agenda.",
      parameters: {
        type: "object",
        properties: {
          event_id: {
            type: "string",
            description: "ID do evento a ser removido"
          },
          search_title: {
            type: "string",
            description: "Título do evento para buscar e deletar (se ID não for conhecido)"
          }
        },
        required: []
      }
    }
  }
];

// Execute tool calls
async function executeToolCall(
  supabase: any, 
  userId: string, 
  toolName: string, 
  args: any
): Promise<{ success: boolean; data?: any; error?: string }> {
  console.log(`Executing tool: ${toolName}`, args);

  try {
    switch (toolName) {
      case "create_event": {
        const { data, error } = await supabase
          .from('events')
          .insert({
            user_id: userId,
            title: args.title,
            event_date: args.event_date,
            event_time: args.event_time || null,
            location: args.location || null,
            duration_minutes: args.duration_minutes || 60,
            priority: args.priority || 'medium',
            category: args.category || 'geral',
            status: 'pending',
            notification_enabled: true
          })
          .select()
          .single();

        if (error) throw error;
        return { success: true, data };
      }

      case "list_events": {
        let query = supabase
          .from('events')
          .select('*')
          .eq('user_id', userId)
          .order('event_date', { ascending: true })
          .order('event_time', { ascending: true });

        if (args.date) {
          query = query.eq('event_date', args.date);
        } else {
          // Future events
          const today = new Date().toISOString().split('T')[0];
          query = query.gte('event_date', today);
        }

        query = query.limit(args.limit || 10);

        const { data, error } = await query;
        if (error) throw error;
        return { success: true, data };
      }

      case "update_event": {
        const updates: any = {};
        if (args.title) updates.title = args.title;
        if (args.event_date) updates.event_date = args.event_date;
        if (args.event_time) updates.event_time = args.event_time;
        if (args.location) updates.location = args.location;
        if (args.priority) updates.priority = args.priority;

        const { data, error } = await supabase
          .from('events')
          .update(updates)
          .eq('id', args.event_id)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        return { success: true, data };
      }

      case "delete_event": {
        if (args.event_id) {
          const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', args.event_id)
            .eq('user_id', userId);

          if (error) throw error;
          return { success: true, data: { deleted: true } };
        } else if (args.search_title) {
          // Find and delete by title
          const { data: events } = await supabase
            .from('events')
            .select('id, title')
            .eq('user_id', userId)
            .ilike('title', `%${args.search_title}%`)
            .limit(1);

          if (events && events.length > 0) {
            const { error } = await supabase
              .from('events')
              .delete()
              .eq('id', events[0].id);

            if (error) throw error;
            return { success: true, data: { deleted: true, event: events[0] } };
          }
          return { success: false, error: "Evento não encontrado" };
        }
        return { success: false, error: "ID ou título do evento necessário" };
      }

      default:
        return { success: false, error: `Tool desconhecida: ${toolName}` };
    }
  } catch (error) {
    console.error(`Tool error (${toolName}):`, error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const authHeader = req.headers.get('authorization');
    let userContext = "";
    let userId: string | null = null;
    let supabase: any = null;

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

    const systemPrompt = `Você é Kairo, um assistente inteligente de calendário e lembretes. Você é amigável, eficiente e direto.

Data de hoje: ${todayStr} (${todayISO})

IMPORTANTE: Você pode EXECUTAR ações, não apenas conversar!

Suas capacidades (use as tools quando apropriado):
1. CRIAR eventos - Use create_event quando o usuário quiser agendar algo
2. LISTAR eventos - Use list_events para mostrar a agenda
3. EDITAR eventos - Use update_event para modificar eventos
4. DELETAR eventos - Use delete_event para cancelar eventos

Regras para interpretar datas:
- "hoje" = ${todayISO}
- "amanhã" = data de hoje + 1 dia
- "segunda/terça/etc" = próximo dia da semana
- "próxima semana" = 7 dias a partir de hoje
- Sempre converta para formato YYYY-MM-DD

Quando criar eventos:
- Extraia título, data, horário, local se mencionados
- Infira prioridade pelo contexto (médico = high, café = low, reunião = medium)
- Confirme a criação com detalhes do evento

Ao listar eventos:
- Formate de forma clara e legível
- Agrupe por data se houver muitos

Responda sempre em português brasileiro de forma concisa e amigável.
Use emojis ocasionalmente para tornar a conversa mais leve.
${userContext}`;

    // First call to get potential tool calls
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools,
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Aguarde um momento." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Entre em contato com o suporte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Erro ao processar sua mensagem. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const assistantMessage = aiResponse.choices?.[0]?.message;

    // Check if there are tool calls
    if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0 && userId && supabase) {
      console.log("Tool calls detected:", assistantMessage.tool_calls);
      
      const toolResults: any[] = [];
      const executedActions: any[] = [];

      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        
        const result = await executeToolCall(supabase, userId, toolName, args);
        
        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          content: JSON.stringify(result)
        });

        executedActions.push({
          action: toolName,
          success: result.success,
          data: result.data,
          error: result.error
        });
      }

      // Second call to get final response with tool results
      const finalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
            assistantMessage,
            ...toolResults
          ],
          stream: true,
        }),
      });

      if (!finalResponse.ok) {
        const errorText = await finalResponse.text();
        console.error("Final response error:", errorText);
        throw new Error("Erro ao gerar resposta final");
      }

      // Add action metadata to the stream
      const actionHeader = `<!--KAIRO_ACTIONS:${JSON.stringify(executedActions)}-->\n`;
      const encoder = new TextEncoder();
      
      const transformedStream = new ReadableStream({
        async start(controller) {
          // Send action metadata first
          controller.enqueue(encoder.encode(`data: {"choices":[{"delta":{"content":"${actionHeader}"}}]}\n\n`));
          
          const reader = finalResponse.body!.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
          controller.close();
        }
      });

      return new Response(transformedStream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // No tool calls - stream regular response
    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    return new Response(streamResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
