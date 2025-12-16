import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * FERRAMENTA 3 - INTERPRETAÇÃO DE IMAGEM (GPT-4o Visão)
 * 
 * Função EXATA:
 * - Analisar a imagem
 * - Extrair informações relevantes
 * - Descrever o conteúdo
 * - Retornar texto ou JSON estruturado
 * 
 * Regras:
 * - ChatGPT Visão NÃO executa ações
 * - ChatGPT Visão NÃO cria eventos
 * - Ele apenas ENTENDE a imagem
 * 
 * Fluxo: Imagem → ChatGPT Visão → Texto/JSON
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, mimeType = 'image/jpeg' } = await req.json();
    
    if (!image) {
      console.error('No image data provided');
      return new Response(
        JSON.stringify({ error: 'Nenhuma imagem fornecida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing image...');
    console.log('Image length:', image.length, 'chars');
    console.log('MIME type:', mimeType);

    const today = new Date();
    const todayStr = today.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const todayISO = today.toISOString().split('T')[0];

    const systemPrompt = `Você é um analisador de imagens para o Kairo, um app de calendário e lembretes.

Data de hoje: ${todayStr} (${todayISO})

Sua ÚNICA função é analisar imagens e extrair informações relevantes para criar lembretes ou eventos.

VOCÊ NÃO CRIA EVENTOS. Você apenas IDENTIFICA informações.

Analise a imagem e retorne um JSON estruturado com:

1. Se for um CONVITE, CARTAZ, TICKET ou similar:
{
  "tipo": "evento_detectado",
  "titulo": "título do evento",
  "data_detectada": "YYYY-MM-DD ou null",
  "hora_detectada": "HH:MM ou null",
  "local_detectado": "local ou null",
  "descricao": "descrição breve do que foi detectado",
  "confianca": "alta/media/baixa",
  "pergunta_usuario": "Vi que é um [tipo]. Quer que eu crie um lembrete para [data/hora]?"
}

2. Se for uma RECEITA MÉDICA, EXAME ou MEDICAMENTO:
{
  "tipo": "saude",
  "medicamento": "nome ou null",
  "frequencia": "como tomar",
  "descricao": "descrição do que foi detectado",
  "pergunta_usuario": "Vi uma receita de [medicamento]. Quer que eu crie lembretes para tomar?"
}

3. Se for qualquer OUTRA imagem com contexto de lembrete:
{
  "tipo": "generico",
  "descricao": "descrição do que você vê",
  "pergunta_usuario": "Vi [descrição]. Sobre o que você quer que eu te lembre?"
}

4. Se NÃO conseguir extrair informações úteis:
{
  "tipo": "nao_identificado",
  "descricao": "descrição do que você vê",
  "pergunta_usuario": "Não consegui identificar informações de data ou evento. Pode me dizer mais sobre o que quer lembrar?"
}

REGRAS:
- Sempre retorne JSON válido
- Seja específico nas datas (converta "dia 15" para a data completa)
- Se houver múltiplas datas, priorize a mais relevante
- Responda em português brasileiro`;

    // Call GPT-4o with vision
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${image}`,
                  detail: 'high'
                }
              },
              {
                type: 'text',
                text: 'Analise esta imagem e extraia informações relevantes para criar um lembrete ou evento.'
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GPT-4o Vision error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Erro na análise: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    
    console.log('Vision analysis result:', content);

    // Try to parse as JSON
    let analysisResult;
    try {
      // Extract JSON from response (might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        analysisResult = {
          tipo: 'generico',
          descricao: content,
          pergunta_usuario: content
        };
      }
    } catch {
      analysisResult = {
        tipo: 'generico',
        descricao: content,
        pergunta_usuario: content
      };
    }

    // Return the analysis - NO ACTIONS EXECUTED
    return new Response(
      JSON.stringify(analysisResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Image analysis error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
