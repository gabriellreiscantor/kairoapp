import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LogRequest {
  user_id?: string;
  event_type: string;
  data?: Record<string, any>;
  device?: string;
  timestamp?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: LogRequest = await req.json();
    
    console.log(`[remote-log] Received log: ${body.event_type}`);
    console.log(`[remote-log] User ID: ${body.user_id}`);
    console.log(`[remote-log] Data:`, JSON.stringify(body.data));

    const { error } = await supabase
      .from('call_logs')
      .insert({
        user_id: body.user_id || null,
        event_type: body.event_type,
        data: {
          ...body.data,
          timestamp: body.timestamp || new Date().toISOString(),
        },
        device: body.device || 'iOS',
      });

    if (error) {
      console.error('[remote-log] Insert error:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[remote-log] ✅ Log saved: ${body.event_type}`);
    
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[remote-log] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
