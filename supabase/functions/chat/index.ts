import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get auth token from request
    const authHeader = req.headers.get('authorization');
    let userContext = "";

    if (authHeader) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        const userId = user.id;
        
        // Fetch user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        // Fetch recent events
        const { data: events } = await supabase
          .from('events')
          .select('*')
          .eq('user_id', userId)
          .gte('event_date', new Date().toISOString().split('T')[0])
          .order('event_date', { ascending: true })
          .limit(10);
        
        // Fetch user patterns
        const { data: patterns } = await supabase
          .from('user_patterns')
          .select('*')
          .eq('user_id', userId)
          .order('confidence', { ascending: false })
          .limit(5);
        
        // Build context
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
            userContext += `\n- ${e.title} em ${e.event_date}${e.event_time ? ' às ' + e.event_time : ''}${e.location ? ' em ' + e.location : ''}`;
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

    const today = new Date().toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const systemPrompt = `Você é Kairo, um assistente inteligente de calendário e lembretes. Você é amigável, eficiente e direto.

Data de hoje: ${today}

Suas capacidades:
1. Criar eventos e lembretes a partir de linguagem natural
2. Sugerir horários baseados no histórico do usuário
3. Reagendar eventos perdidos automaticamente
4. Entender contexto (localização, duração)
5. Aprender padrões do usuário

Quando o usuário quiser criar um evento, extraia:
- Título do evento
- Data (converta "amanhã", "próxima semana" etc.)
- Horário (se mencionado)
- Localização (se mencionada)
- Duração estimada

Responda sempre em português brasileiro de forma concisa e amigável.
Use emojis ocasionalmente para tornar a conversa mais leve.
Você está aqui para ajudar o usuário a nunca esquecer nada importante!
${userContext}`;

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
        stream: true,
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

    return new Response(response.body, {
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
